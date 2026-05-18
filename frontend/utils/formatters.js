// ── Centralized display formatters ────────────────────────────────────────────
// Raw DB values must never be rendered directly. Import named functions here.

// Roman numeral tokens that must stay fully uppercase after title-casing.
const ROMAN = /^(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)$/i;

/**
 * Underscore-separated string → Title Case with spaces.
 * "valentinian_i" → "Valentinian I"
 * "theodosius_ii" → "Theodosius II"
 * "silver" → "Silver"
 */
export const fmt = (str) => {
  if (!str) return str;
  return String(str)
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => ROMAN.test(word) ? word.toUpperCase() : word.replace(/^\w/, c => c.toUpperCase()))
    .join(' ');
};

/**
 * RIC series code → uppercase display string.
 * "ric_ix" → "RIC IX" | "ric_x" → "RIC X"
 */
export const fmtSeries = (series) => {
  if (!series) return series;
  return String(series).replace(/^ric_/i, 'RIC ').toUpperCase();
};

/**
 * Single year number → human-readable string.
 * -364 → "364 BC" | 364 → "364 AD"
 */
export const fmtYear = (y) => {
  if (y == null) return null;
  return y < 0 ? `${Math.abs(y)} BC` : `${y} AD`;
};

/**
 * Coinage date object → em-dash range string.
 * { from: 364, to: 367 } → "364–367 AD"
 * { from: -27, to: 14 }  → "27 BC – 14 AD"
 * { from: 79 }           → "79 AD"
 */
export const fmtPeriod = (date) => {
  if (!date) return null;
  const from = fmtYear(date.from);
  const to   = fmtYear(date.to);
  if (!from) return null;
  if (!to || to === from) return from;
  // Same era: compact form "364–367 AD"; different eras: explicit "27 BC – 14 AD"
  const fromEra = date.from < 0 ? 'BC' : 'AD';
  const toEra   = date.to   < 0 ? 'BC' : 'AD';
  if (fromEra === toEra) {
    return `${Math.abs(date.from)}–${Math.abs(date.to)} ${toEra}`;
  }
  return `${from} – ${to}`;
};

/**
 * Reference object → formatted citation string.
 * { system: "RIC", series: "ric_ix", number: 12, suffix: "A" } → "RIC IX 12A"
 */
export const fmtReference = (ref) => {
  if (!ref) return null;
  const parts = [];
  if (ref.system)  parts.push(ref.system.toUpperCase());
  if (ref.series)  parts.push(fmtSeries(ref.series).replace(/^RIC\s*/i, '').trim());
  if (ref.number != null) parts.push(`${ref.number}${ref.suffix || ''}`);
  return parts.join(' ') || null;
};

/**
 * Subjects array → comma-separated Title Case string.
 * ["victory", "bust"] → "Victory, Bust"
 */
export const fmtSubjects = (subjects) => {
  if (!subjects?.length) return null;
  return subjects.map(fmt).join(', ');
};

/**
 * Image source identifier → proper institution name.
 * "ans"            → "American Numismatic Society"
 * "berlin"         → "Münzkabinett der Staatlichen Museen"
 * "british_museum" → "The Trustees of the British Museum"
 * Anything else    → Title Case fallback
 */
const SOURCE_NAMES = {
  ans:            'American Numismatic Society',
  berlin:         'Münzkabinett der Staatlichen Museen',
  british_museum: 'The Trustees of the British Museum',
  bnf:            'Bibliothèque nationale de France',
  vienna:         'Kunsthistorisches Museum Wien',
  paris:          'Bibliothèque nationale de France',
};

export const fmtSource = (source) => {
  if (!source) return null;
  return SOURCE_NAMES[source.toLowerCase()] ?? fmt(source);
};

/**
 * Null-check helper — returns true when a value is worth displaying.
 */
export const hasVal = (v) => v != null && v !== '' && v !== 'N/A' && v !== 'n/a';
