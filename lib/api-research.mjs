export const categories = ['api_schema_request', 'api_authentication_request', 'api_data_request',
  'api_configuration_request', 'api_other_request', 'configuration_repository_probe',
  'cms_probe', 'administration_probe', 'application_probe', 'other_request'];
export const methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'CONNECT', 'TRACE', 'OTHER'];
export const outcomes = ['2xx', '3xx', '4xx', '5xx'];
export const families = ['legacy_unknown', 'missing', 'curl', 'python_requests', 'go_http_client',
  'masscan', 'zgrab', 'nikto', 'nmap', 'other'];
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e9;
const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000Z','Z') === value;
const validGroup = (group, keys, total) => exact(group, keys) && keys.every(key => count(group[key]))
  && keys.reduce((sum, key) => sum + group[key], 0) === total;
export const runDepths = ['one', 'two_to_four', 'five_or_more'];

export function validBehavior(value, total, categoryCounts) {
  return exact(value, ['gap_minutes', 'runs', 'depth', 'last_categories',
    'api_route_runs', 'mixed_category_runs'])
    && value.gap_minutes === 30 && count(value.runs) && value.runs <= total
    && validGroup(value.depth, runDepths, value.runs)
    && validGroup(value.last_categories, categories, value.runs)
    && count(value.api_route_runs) && value.api_route_runs <= value.runs
    && value.api_route_runs <= categories.filter(key => key.startsWith('api_'))
      .reduce((sum, key) => sum + categoryCounts[key], 0)
    && categories.every(key => value.last_categories[key] <= categoryCounts[key])
    && count(value.mixed_category_runs)
    && value.mixed_category_runs <= value.depth.two_to_four + value.depth.five_or_more;
}

export function validApiResearch(value) {
  const keys = ['version', 'sensor', 'published_at', 'window_start', 'window_end',
    'window_hours', 'total_requests', 'categories', 'methods', 'outcomes', 'families'];
  if (value?.version === 2) keys.push('behavior');
  if (!exact(value, keys)
    || ![1, 2].includes(value.version) || value.sensor !== 'api-http' || value.window_hours !== 24
    || !timestamp(value.published_at) || !timestamp(value.window_start) || !timestamp(value.window_end)
    || !count(value.total_requests)) return false;
  const published = Date.parse(value.published_at), start = Date.parse(value.window_start), end = Date.parse(value.window_end);
  if (end % 3600000 !== 0 || end - start !== 86400000
    || end !== Math.floor(published / 3600000) * 3600000 - 3600000) return false;
  return validGroup(value.categories, categories, value.total_requests)
    && validGroup(value.methods, methods, value.total_requests)
    && validGroup(value.outcomes, outcomes, value.total_requests)
    && validGroup(value.families, families, value.total_requests)
    && (value.version === 1 || validBehavior(value.behavior, value.total_requests, value.categories));
}
