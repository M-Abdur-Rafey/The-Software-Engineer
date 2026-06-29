'use strict';
/**
 * Token discipline helpers.
 *
 * Database rows and API/contract bodies become input tokens the moment they are
 * serialized into an agent prompt. These helpers cap that data at the boundary
 * (db-cli output) so a large query result can't balloon context.
 */

/** Truncate a string to `max` chars with a marker showing how much was dropped. */
function truncate(str, max = 2000) {
  if (str == null) return str;
  const s = String(str);
  return s.length <= max ? s : `${s.slice(0, max)}…[+${s.length - max} chars truncated]`;
}

/**
 * Cap a result set by row count AND total serialized size.
 * Returns { rows, json, truncated, total } — `json` is JSON.stringify of the
 * capped rows, safe to print directly (shape stays an array).
 */
function capRows(rows, { maxRows = 50, maxChars = 8000 } = {}) {
  const total = Array.isArray(rows) ? rows.length : 0;
  let out = Array.isArray(rows) ? rows.slice(0, maxRows) : [];
  let json = JSON.stringify(out);
  while (out.length > 1 && json.length > maxChars) {
    out = out.slice(0, Math.ceil(out.length / 2));
    json = JSON.stringify(out);
  }
  if (json.length > maxChars && out.length === 1) {
    json = truncate(json, maxChars);
  }
  return { rows: out, json, truncated: total > out.length, total };
}

module.exports = { truncate, capRows };
