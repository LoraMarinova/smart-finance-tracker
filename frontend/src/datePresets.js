function toIso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const DATE_PRESETS = [
  { id: 'month', label: 'This month' },
  { id: '30days', label: 'Last 30 days' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
]

/**
 * Returns `{ from, to }` as YYYY-MM-DD strings for a named preset.
 * `today` is injectable for deterministic tests.
 */
export function presetRange(preset, today = new Date()) {
  switch (preset) {
    case 'month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: toIso(from), to: toIso(today) }
    }
    case '30days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { from: toIso(from), to: toIso(today) }
    }
    case 'year': {
      const from = new Date(today.getFullYear(), 0, 1)
      return { from: toIso(from), to: toIso(today) }
    }
    case 'all':
    default:
      return { from: '', to: '' }
  }
}
