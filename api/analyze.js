import Anthropic from '@anthropic-ai/sdk';

const PRIMARY_MODEL = 'claude-haiku-4-5';
const PDF_FALLBACK_MODEL = 'claude-sonnet-4-6';

const SCHEMA_EXAMPLE = JSON.stringify({
  currency: '£',
  totalSpend: 2867.54,
  totalIncome: 8550.00,
  avgMonthlySpend: 955.85,
  periodMonths: 3,
  categories: [
    { name: 'Groceries', emoji: '🛒', total: 735.56, percentage: 25.7, transactionCount: 18 },
  ],
  subscriptions: [
    { name: 'Netflix', emoji: '📺', monthlyAmount: 15.99, annualCost: 191.88 },
  ],
  summary: 'Your top expense is groceries at 26%. Seven subscriptions cost £1,308/year — review any unused ones. You\'re saving well each month.',
}, null, 2);

function buildPrompt(inlineText) {
  const dataSection = inlineText
    ? `\n\nSTATEMENT DATA:\n${inlineText.slice(0, 15000)}`
    : '';
  return `Analyse this bank statement data and respond with ONLY a valid JSON object. No markdown fences, no explanation — just the raw JSON.${dataSection}

ANALYSIS RULES:
- Negative amounts = spending. Positive = income (salary/wages).
- If all amounts are positive, look for salary/wages keywords; everything else is spending.
- Group transactions into 5–10 meaningful spending categories with appropriate emojis.
- Identify recurring subscriptions: same merchant, consistent amount (≤£150/month), regular cadence.
- CRITICAL: Every transaction must appear in exactly ONE category. Category totals must sum to exactly totalSpend. Do not count any transaction twice.
- The subscriptions array is metadata only — do NOT create a separate "Subscriptions" spending category. Each subscription belongs under its natural category (e.g. EE Mobile → Bills & Utilities, Netflix → Entertainment). Its amount is counted there and nowhere else.
- Write a friendly, specific 2–3 sentence summary with ONE actionable financial tip.

RESPOND WITH THIS EXACT JSON STRUCTURE (every field required, no extra fields):
${SCHEMA_EXAMPLE}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, csv, pdf, mediaType } = req.body || {};
  const statementText =
    (typeof text === 'string' && text.trim().length > 0 && text) ||
    (typeof csv === 'string' && csv.trim().length > 0 && csv) ||
    null;
  const isPdf = typeof pdf === 'string' && pdf.length > 0;

  if (!statementText && !isPdf) {
    return res.status(400).json({ error: 'Provide statement data as "text", or a base64 "pdf" with its "mediaType"' });
  }

  const content = isPdf
    ? [
        {
          type: 'document',
          source: { type: 'base64', media_type: mediaType || 'application/pdf', data: pdf },
        },
        { type: 'text', text: buildPrompt() },
      ]
    : buildPrompt(statementText);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let message;
    try {
      message = await client.messages.create({
        model: PRIMARY_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content }],
      });
    } catch (err) {
      if (!isPdf) throw err;
      message = await client.messages.create({
        model: PDF_FALLBACK_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content }],
      });
    }

    const raw = (message.content[0]?.text ?? '').trim();
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const result = JSON.parse(cleaned);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[analyze] error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Analysis failed' });
  }
}
