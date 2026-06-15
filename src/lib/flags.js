export const FLAG_KEYS = Object.freeze({
  NATIVE_CALLS_ENABLED:     'native_calls_enabled',
  RECORDING_ENABLED:        'recording_enabled',
  RECORDINGS_VISIBLE_TO:    'recordings_visible_to',
  RECORDING_RETENTION_DAYS: 'recording_retention_days'
})

export function isOn(value) {
  return value === true
}

export function includesRole(value, role) {
  return Array.isArray(value) && value.includes(role)
}

export function asNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
