export const sessionStages = ['connect_only', 'auth_failed_only', 'login_no_command',
  'command_no_file', 'file_transfer'];

export function validSessionBehavior(value, sessions) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join(',') !==
        ['furthest_observed_stage','command_result_events','forwarding_requests'].sort().join(',')) return false;
  const stages = value.furthest_observed_stage;
  const results = value.command_result_events;
  return stages && typeof stages === 'object' && !Array.isArray(stages)
    && Object.keys(stages).sort().join(',') === [...sessionStages].sort().join(',')
    && sessionStages.every(key => Number.isSafeInteger(stages[key]) && stages[key] >= 0 && stages[key] <= 1e9)
    && sessionStages.reduce((sum, key) => sum + stages[key], 0) === sessions
    && results && typeof results === 'object' && !Array.isArray(results)
    && Object.keys(results).sort().join(',') === 'reported_failure,reported_success'
    && ['reported_success','reported_failure','forwarding_requests'].every(key => {
      const count = key === 'forwarding_requests' ? value[key] : results[key];
      return Number.isSafeInteger(count) && count >= 0 && count <= 1e9;
    });
}
