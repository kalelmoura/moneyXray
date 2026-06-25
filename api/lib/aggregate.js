// Pure, deterministic aggregation. This is the ONLY place totals are computed.
// The AI never sums anything — it only labels transactions (see classify.js).
//
// All money is summed as integer pence so floating-point drift can never make
// the category buckets disagree with the headline total. `totalSpend` is, by
// construction, the sum of the per-category buckets — they cannot diverge.

import { parseDate } from './parse.js';

// Fixed category taxonomy: the AI must classify into one of these labels, and
// the emoji is looked up here in code (never invented by the model).
export const TAXONOMY = {
  'Groceries': '🛒',
  'Eating Out & Takeaway': '🍽️',
  'Transport': '🚌',
  'Bills & Utilities': '📱',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Health & Fitness': '💪',
  'Travel': '✈️',
  'Cash & ATM': '💵',
  'Income': '💰',
  'Transfers & Savings': '🏦',
  'Other': '📦',
};

export const CATEGORY_NAMES = Object.keys(TAXONOMY);

const pence = (n) => Math.round((Number(n) || 0) * 100);
const pounds = (p) => p / 100;
const round1 = (n) => Math.round(n * 10) / 10;

// "SPOTIFY P11ABC23DE" -> "Spotify";  "EE LIMITED" -> "EE Limited".
// Drops reference-code tokens (those containing digits) and tidies casing.
function cleanMerchantName(desc) {
  const tokens = String(desc).trim().split(/\s+/);
  const words = tokens.filter((t) => !/\d/.test(t));
  const picked = (words.length ? words : tokens).map((w) => {
    if (/^[A-Z]{1,3}$/.test(w)) return w;               // acronyms: EE, TFL
    if (w.includes('.')) return w.toLowerCase();        // domains: netflix.com
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
  return picked.join(' ') || String(desc).trim();
}

// Number of whole months the statement spans (>= 1).
function periodMonths(transactions) {
  const dates = transactions.map((t) => parseDate(t.date)).filter(Boolean);
  if (dates.length < 2) return 1;
  const span = Math.max(...dates) - Math.min(...dates);
  return Math.max(1, Math.round(span / (1000 * 60 * 60 * 24 * 30.44)));
}

/**
 * Merge transactions with their AI classifications and compute every figure.
 * @param transactions   Transaction[] from a parser or PDF extraction
 * @param classifications array aligned by index: { category, isSpending, isSubscription }
 * @param currency       symbol string, e.g. '£'
 * @returns the result object the frontend's paint() consumes (minus `summary`,
 *          which the orchestrator fills via a separate AI call)
 */
export function aggregate(transactions, classifications, currency = '£') {
  const items = transactions.map((t, i) => {
    const c = classifications[i] || {};
    const category = TAXONOMY[c.category] ? c.category : 'Other';
    // Default isSpending only if the model didn't say: out-flows are spending.
    const isSpending = typeof c.isSpending === 'boolean' ? c.isSpending : t.direction === 'out';
    return { ...t, category, isSpending, isSubscription: !!c.isSubscription, p: pence(t.amount) };
  });

  // Totals (pence).
  let totalSpendP = 0, totalIncomeP = 0;
  for (const it of items) {
    if (it.isSpending) totalSpendP += it.p;
    if (it.direction === 'in') totalIncomeP += it.p;
  }

  // Per-category buckets — only genuine spending counts.
  const buckets = new Map();
  for (const it of items) {
    if (!it.isSpending) continue;
    const b = buckets.get(it.category) || { p: 0, count: 0 };
    b.p += it.p;
    b.count += 1;
    buckets.set(it.category, b);
  }
  const categories = [...buckets.entries()]
    .map(([name, b]) => ({
      name,
      emoji: TAXONOMY[name] || '📌',
      total: pounds(b.p),
      transactionCount: b.count,
      percentage: totalSpendP > 0 ? round1((b.p / totalSpendP) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Subscriptions: AI-flagged rows, grouped by cleaned merchant. Maths in code.
  const months = periodMonths(transactions);
  const subMap = new Map();
  for (const it of items) {
    if (!it.isSubscription) continue;
    const name = cleanMerchantName(it.description);
    const s = subMap.get(name) || { p: 0, category: it.category };
    s.p += it.p;
    subMap.set(name, s);
  }
  const subscriptions = [...subMap.entries()]
    .map(([name, s]) => {
      const monthlyP = Math.round(s.p / months);
      return {
        name,
        emoji: TAXONOMY[s.category] || '📌',
        monthlyAmount: pounds(monthlyP),
        annualCost: pounds(monthlyP * 12),
      };
    })
    .sort((a, b) => b.annualCost - a.annualCost);

  return {
    currency,
    totalSpend: pounds(totalSpendP),
    totalIncome: pounds(totalIncomeP),
    avgMonthlySpend: pounds(Math.round(totalSpendP / months)),
    periodMonths: months,
    categories,
    subscriptions,
    summary: '',                 // filled in by the orchestrator's summary call
  };
}

export { cleanMerchantName, periodMonths };
