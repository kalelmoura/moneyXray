import Anthropic from '@anthropic-ai/sdk';
import { parseStatement, detectCurrency } from './lib/parse.js';
import { classifyTransactions, extractFromPdf, writeSummary } from './lib/classify.js';
import { aggregate } from './lib/aggregate.js';
import { isDemoMode } from './lib/demo.js';

// Orchestrator only. The real work lives in lib/:
//   parse (code)  ->  classify (AI, labels only)  ->  aggregate (code, all maths)
// The AI never totals anything; every figure is computed in aggregate().
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // On the public demo deployment, real analysis is disabled so the demo's
  // API key can't be spent. Own-copy deploys (DEMO_MODE unset) are unaffected.
  if (isDemoMode()) {
    return res.status(403).json({ error: 'This is a demo deployment — real uploads are disabled. Deploy your own copy with your own API key to analyse real statements.' });
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

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 1. PARSE — structured formats in code, PDF via AI extraction.
    const transactions = isPdf
      ? await extractFromPdf(client, pdf, mediaType)
      : parseStatement(statementText);
    const currency = isPdf ? '£' : detectCurrency(statementText);

    if (!transactions.length) {
      return res.status(422).json({ error: 'No transactions could be read from that file.' });
    }

    // 2. CLASSIFY — AI labels each transaction (no sums).
    const classifications = await classifyTransactions(client, transactions);

    // 3. AGGREGATE — all arithmetic happens here, in code.
    const result = aggregate(transactions, classifications, currency);

    // 4. SUMMARY — AI phrases the final numbers (still no maths).
    result.summary = await writeSummary(client, result);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[analyze] error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Analysis failed' });
  }
}
