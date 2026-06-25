// Reconciliation tests. No AI, no network: parse (real code) -> stub classify
// (deterministic) -> aggregate (real code). Run with: node --test
//
// The headline assertion is the invariant the whole refactor exists to
// guarantee: the per-category totals sum EXACTLY to total spend, for every
// supported file type. Each fixture also checks a hand-computed known answer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseStatement } from '../api/lib/parse.js';
import { aggregate } from '../api/lib/aggregate.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (f) => readFileSync(join(here, 'fixtures', f), 'utf8');

// Compare money in integer pence — the only exactness that matters.
const cents = (n) => Math.round(n * 100);

// Deterministic stand-in for the AI classifier (keyword + direction rules).
function ruleStub(transactions) {
  return transactions.map((t) => {
    const d = t.description.toLowerCase();
    if (t.direction === 'in') return { category: 'Income', isSpending: false, isSubscription: false };
    if (/transfer|saving/.test(d)) return { category: 'Transfers & Savings', isSpending: false, isSubscription: false };

    const isSubscription = /netflix|spotify|prime|disney|gym|vodafone|\bee\b|apple/.test(d);
    let category = 'Other';
    if (/tesco|sainsbury|grocer|stores|aldi|lidl/.test(d)) category = 'Groceries';
    else if (/costa|coffee|pret|greggs|starbucks|deliveroo|uber eats/.test(d)) category = 'Eating Out & Takeaway';
    else if (/tfl|uber|travel|train|transport|rail/.test(d)) category = 'Transport';
    else if (/netflix|spotify|disney|cinema|vue/.test(d)) category = 'Entertainment';
    else if (/book|waterstones|amazon|asos|sports|gymshark/.test(d)) category = 'Shopping';
    else if (/vodafone|\bee\b|apple|bill/.test(d)) category = 'Bills & Utilities';
    return { category, isSpending: true, isSubscription };
  });
}

const cases = [
  { file: 'lloyds.csv',    txnCount: 5, totalSpend: 60.00, totalIncome: 2015.00, subsCount: 1, subAnnual: 120.00 },
  { file: 'simple.tsv',    txnCount: 3, totalSpend: 23.50, totalIncome: 1500.00, subsCount: 0 },
  { file: 'statement.ofx', txnCount: 3, totalSpend: 20.00, totalIncome: 500.00,  subsCount: 1, subAnnual: 96.00 },
];

for (const c of cases) {
  test(`${c.file}: parses and reconciles`, () => {
    const txns = parseStatement(fixture(c.file));
    assert.equal(txns.length, c.txnCount, 'transaction count');

    const result = aggregate(txns, ruleStub(txns), '£');

    // THE invariant.
    const catSum = result.categories.reduce((s, cat) => s + cat.total, 0);
    assert.equal(cents(catSum), cents(result.totalSpend), 'categories must sum to total spend');

    // Known answers.
    assert.equal(cents(result.totalSpend), cents(c.totalSpend), 'total spend');
    assert.equal(cents(result.totalIncome), cents(c.totalIncome), 'total income');
    assert.equal(result.subscriptions.length, c.subsCount, 'subscription count');
    if (c.subAnnual != null) {
      assert.equal(cents(result.subscriptions[0].annualCost), cents(c.subAnnual), 'subscription annual cost');
    }
  });
}

// Pure aggregate check with explicit classifications (no parsing, no stub) —
// proves reconciliation holds and the per-bucket maths is correct to the penny.
test('aggregate: explicit classifications reconcile to the penny', () => {
  const txns = [
    { date: '01/05/2026', description: 'Shop A', amount: 10.10, direction: 'out' },
    { date: '02/05/2026', description: 'Shop B', amount: 20.20, direction: 'out' },
    { date: '03/05/2026', description: 'Bus',    amount: 5.05,  direction: 'out' },
    { date: '04/05/2026', description: 'Payday', amount: 100.00, direction: 'in' },
  ];
  const classifications = [
    { category: 'Groceries', isSpending: true,  isSubscription: false },
    { category: 'Groceries', isSpending: true,  isSubscription: false },
    { category: 'Transport', isSpending: true,  isSubscription: false },
    { category: 'Income',    isSpending: false, isSubscription: false },
  ];

  const r = aggregate(txns, classifications, '£');
  const catSum = r.categories.reduce((s, cat) => s + cat.total, 0);

  assert.equal(cents(catSum), cents(r.totalSpend), 'categories sum to total spend');
  assert.equal(cents(r.totalSpend), cents(35.35), 'total spend = 10.10 + 20.20 + 5.05');
  assert.equal(cents(r.totalIncome), cents(100.00), 'total income');
  const groceries = r.categories.find((cat) => cat.name === 'Groceries');
  assert.equal(cents(groceries.total), cents(30.30), 'grocery bucket = 10.10 + 20.20');
});
