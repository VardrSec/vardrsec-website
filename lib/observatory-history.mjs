// Count-only lifetime contract shared by ingestion, public GET and the browser.
const metrics = ['connections','auth_events','command_events','file_events'];
const keys = (v, names) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v,k));
const count = n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
const hour = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().replace('.000Z','Z') === v;

export function validHistory(value, end) {
  if (!keys(value,['started_at','as_of','totals','months']) || !hour(value.started_at) || !hour(value.as_of)) return false;
  const at = Date.parse(value.as_of);
  if (!(Date.parse(value.started_at) < at && at <= end && at >= end - 3 * 3_600_000)) return false;
  const names = [...metrics,'unique_sources','unique_captured_hashes'];
  if (!keys(value.totals,names) || !names.every(k=>count(value.totals[k]))) return false;
  if (value.totals.unique_sources > value.totals.connections || value.totals.unique_captured_hashes > value.totals.file_events) return false;
  if (!Array.isArray(value.months) || value.months.length < 1 || value.months.length > 12) return false;
  let previous = '';
  for (const row of value.months) {
    if (!keys(row,['month','partial',...metrics]) || typeof row.partial !== 'boolean'
        || typeof row.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)
        || row.month <= previous || row.month < value.started_at.slice(0,7) || row.month > value.as_of.slice(0,7)
        || !metrics.every(k=>count(row[k])) || (row.month === value.as_of.slice(0,7) && !row.partial)) return false;
    previous = row.month;
  }
  return metrics.every(k => value.months.reduce((n,row)=>n+row[k],0) <= value.totals[k]);
}
