// The ONLY module that calls the AI. It does three narrow jobs and never does
// arithmetic:
//   1. extractFromPdf  – read transactions off a PDF into the shared shape
//   2. classifyTransactions – label each transaction (category + two booleans)
//   3. writeSummary    – phrase already-computed numbers into prose
//
// Stages 1 and 3 exist only because the document/prose tasks aren't code-able;
// all totals still come from aggregate.js.

import { CATEGORY_NAMES } from './aggregate.js';

const PRIMARY_MODEL = 'claude-haiku-4-5';
const PDF_FALLBACK_MODEL = 'claude-sonnet-4-6';

// Strip ```json fences and parse. Throws if the body isn't JSON.
function parseJsonLoose(raw) {
  const cleaned = String(raw)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function ask(client, { content, model = PRIMARY_MODEL, maxTokens = 4096 }) {
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content }],
  });
  return (message.content[0]?.text ?? '').trim();
}

/* ── 1. PDF extraction (AI reads the layout, nothing more) ─────── */

export async function extractFromPdf(client, pdfBase64, mediaType) {
  const prompt = `Extract EVERY transaction from this bank statement as a JSON array.
Each element: {"date": string, "description": string, "amount": number, "direction": "in" | "out"}.
- amount is a POSITIVE number (the magnitude only).
- direction is "out" for money leaving the account, "in" for money received.
Do NOT categorise, summarise, total, or add any other fields. Respond with ONLY the JSON array.`;

  const content = [
    { type: 'document', source: { type: 'base64', media_type: mediaType || 'application/pdf', data: pdfBase64 } },
    { type: 'text', text: prompt },
  ];

  let raw;
  try {
    raw = await ask(client, { content });
  } catch {
    raw = await ask(client, { content, model: PDF_FALLBACK_MODEL });
  }

  const rows = parseJsonLoose(raw);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      date: String(r.date || '').trim(),
      description: String(r.description || '').trim(),
      amount: Math.abs(parseFloat(r.amount) || 0),
      direction: r.direction === 'in' ? 'in' : 'out',
    }))
    .filter((r) => r.amount > 0);
}

/* ── 2. Classification (category + isSpending + isSubscription) ── */

export async function classifyTransactions(client, transactions) {
  const list = transactions
    .map((t, i) => `${i}\t${t.direction}\t${t.amount}\t${t.description}`)
    .join('\n');

  const prompt = `You are a bank-transaction classifier. For EACH transaction below, decide three things. Do NOT sum, total, or do any arithmetic.

Return a JSON array; one object per transaction, in the same order:
{"i": <index>, "category": <one label from the list>, "isSpending": <boolean>, "isSubscription": <boolean>}

category MUST be exactly one of: ${CATEGORY_NAMES.join(', ')}.
isSpending = false for income/salary, refunds, transfers between accounts, and savings movements; true for genuine purchases/bills.
isSubscription = true only for recurring paid services (streaming, gym, phone/mobile, software, memberships); false otherwise.

TRANSACTIONS (index, direction, amount, description):
${list}

Respond with ONLY the JSON array.`;

  const raw = await ask(client, { content: prompt });
  const parsed = parseJsonLoose(raw);
  const arr = Array.isArray(parsed) ? parsed : [];

  // Re-align by explicit index where present, else by position, so a dropped
  // or reordered row can't shift everyone's labels.
  const byIndex = new Map();
  arr.forEach((o, pos) => {
    const i = Number.isInteger(o?.i) ? o.i : pos;
    byIndex.set(i, o);
  });

  return transactions.map((t, i) => {
    const o = byIndex.get(i) || {};
    return {
      category: o.category,
      isSpending: typeof o.isSpending === 'boolean' ? o.isSpending : t.direction === 'out',
      isSubscription: !!o.isSubscription,
    };
  });
}

/* ── 3. Summary (phrases final numbers; performs no maths) ─────── */

export async function writeSummary(client, result) {
  const net = result.totalIncome - result.totalSpend;
  const subYear = result.subscriptions.reduce((s, x) => s + x.annualCost, 0);
  const top = result.categories.slice(0, 3)
    .map((c) => `${c.name} ${result.currency}${c.total.toFixed(2)} (${c.percentage}%)`)
    .join(', ');

  const facts = `These figures are FINAL and correct — use them exactly, do not recalculate or change any number:
- Currency: ${result.currency}
- Total spend: ${result.currency}${result.totalSpend.toFixed(2)} over ${result.periodMonths} month(s)
- Total income: ${result.currency}${result.totalIncome.toFixed(2)}
- Net change: ${result.currency}${net.toFixed(2)} (${net >= 0 ? 'saved' : 'overspent'})
- Top categories: ${top || 'n/a'}
- Subscriptions: ${result.subscriptions.length} costing ${result.currency}${subYear.toFixed(2)} per year`;

  const prompt = `${facts}

Write a friendly, specific 2-3 sentence financial summary for this person, with ONE actionable tip. Use the numbers above exactly as given. Respond with plain text only — no markdown, no JSON.`;

  try {
    return await ask(client, { content: prompt, maxTokens: 512 });
  } catch {
    // Resilient fallback so the field is never empty.
    const verb = net >= 0 ? `saved ${result.currency}${net.toFixed(2)}` : `overspent by ${result.currency}${Math.abs(net).toFixed(2)}`;
    return `You spent ${result.currency}${result.totalSpend.toFixed(2)} and ${verb} this period. Your biggest category is ${result.categories[0]?.name || 'n/a'}. Review your ${result.subscriptions.length} subscriptions (${result.currency}${subYear.toFixed(2)}/yr) for anything unused.`;
  }
}
