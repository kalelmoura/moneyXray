// Pure, deterministic parsers. No AI, no network, no maths beyond reading
// numbers off the page. Every parser emits the SAME Transaction shape:
//
//   { date: string, description: string, amount: number (>= 0), direction: 'in' | 'out' }
//
// `amount` is always a positive magnitude; `direction` carries the sign.

/* ── Low-level helpers ─────────────────────────────────────────── */

// Split one delimited line, honouring "quoted, fields" and "" escapes.
// Works for both CSV (',') and TSV ('\t').
function splitLine(line, delim) {
  const out = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === delim && !quoted) {
      out.push(field); field = '';
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

// Turn "£1,234.50", "(50.00)", "50.00 DR" etc. into a JS number (or NaN).
function parseAmount(raw) {
  if (raw == null) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;
  const negativeParens = /^\(.*\)$/.test(s);          // (50.00) = negative
  s = s.replace(/[£$€,\s]/g, '').replace(/[()]/g, '');
  s = s.replace(/(DR|CR)$/i, '');                       // trailing debit/credit marks
  let n = parseFloat(s);
  if (isNaN(n)) return NaN;
  if (negativeParens) n = -Math.abs(n);
  return n;
}

// Parse the handful of date layouts banks actually use into a Date.
// Returns null when unrecognised (aggregation just ignores those for the span).
function parseDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  let m;
  if ((m = /^(\d{4})(\d{2})(\d{2})/.exec(str)))                 // OFX: 20260502
    return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str)))               // ISO: 2026-05-02
    return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/.exec(str))) { // UK: 02/05/2026
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(year, +m[2] - 1, +m[1]);                   // day-first
  }
  const t = Date.parse(str);
  return isNaN(t) ? null : new Date(t);
}

// Find the first header whose text contains any of the given needles.
function findCol(headers, needles) {
  for (const needle of needles) {
    const i = headers.findIndex((h) => h.includes(needle));
    if (i >= 0) return i;
  }
  return -1;
}

/* ── Format detection ──────────────────────────────────────────── */

export function detectFormat(text) {
  return /<OFX>|<STMTTRN>/i.test(text) ? 'ofx' : 'delimited';
}

export function detectCurrency(text) {
  if (text.includes('£')) return '£';
  if (text.includes('€')) return '€';
  if (text.includes('$')) return '$';
  return '£';
}

/* ── Delimited parser (CSV / TSV / TXT / Excel-exported-as-CSV) ─── */

export function parseDelimited(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Sniff the delimiter from the header row: more tabs than commas => TSV.
  const head = lines[0];
  const delim = (head.split('\t').length - 1) > (head.split(',').length - 1) ? '\t' : ',';

  const headers = splitLine(head, delim).map((h) => h.toLowerCase().trim());
  const dateIdx = findCol(headers, ['date', 'posted']);
  const descIdx = findCol(headers, ['description', 'desc', 'narrative', 'details', 'payee', 'memo', 'reference', 'narration', 'name']);

  // Two shapes: separate debit/credit columns, OR one signed amount column.
  const outIdx = findCol(headers, ['money out', 'paid out', 'debit', 'withdrawal', 'outgoing']);
  const inIdx = findCol(headers, ['money in', 'paid in', 'credit', 'deposit', 'incoming']);
  const amtIdx = findCol(headers, ['amount', 'value', 'transaction amount']);

  const txns = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delim);
    const date = (cols[dateIdx] || '').trim();
    const description = (cols[descIdx >= 0 ? descIdx : 1] || '').trim();

    let amount, direction;
    if (outIdx >= 0 || inIdx >= 0) {
      const out = outIdx >= 0 ? parseAmount(cols[outIdx]) : NaN;
      const inc = inIdx >= 0 ? parseAmount(cols[inIdx]) : NaN;
      if (!isNaN(out) && out !== 0) { amount = Math.abs(out); direction = 'out'; }
      else if (!isNaN(inc) && inc !== 0) { amount = Math.abs(inc); direction = 'in'; }
      else continue;                                  // e.g. "STARTING BALANCE" rows
    } else if (amtIdx >= 0) {
      const v = parseAmount(cols[amtIdx]);
      if (isNaN(v) || v === 0) continue;
      amount = Math.abs(v);
      direction = v < 0 ? 'out' : 'in';
    } else {
      continue;                                       // no usable amount column
    }

    txns.push({ date, description, amount: Math.round(amount * 100) / 100, direction });
  }
  return txns;
}

/* ── OFX / QFX parser ──────────────────────────────────────────── */

export function parseOFX(text) {
  const txns = [];
  // OFX is SGML and often omits closing tags, so read each tag value up to
  // the next '<' or line break rather than relying on </TAG>.
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || [];
  const tag = (block, name) => {
    const m = new RegExp(`<${name}>([^<\\r\\n]+)`, 'i').exec(block);
    return m ? m[1].trim() : '';
  };
  for (const block of blocks) {
    const v = parseAmount(tag(block, 'TRNAMT'));
    if (isNaN(v) || v === 0) continue;
    txns.push({
      date: tag(block, 'DTPOSTED'),
      description: tag(block, 'NAME') || tag(block, 'MEMO'),
      amount: Math.round(Math.abs(v) * 100) / 100,
      direction: v < 0 ? 'out' : 'in',
    });
  }
  return txns;
}

/* ── Public entry point ────────────────────────────────────────── */

export function parseStatement(text) {
  return detectFormat(text) === 'ofx' ? parseOFX(text) : parseDelimited(text);
}

export { parseDate, parseAmount };
