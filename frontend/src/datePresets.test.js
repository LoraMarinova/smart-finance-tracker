import { describe, expect, it } from 'vitest'
import { DATE_PRESETS, presetRange } from './datePresets.js'

const today = new Date(2026, 5, 15) // 2026-06-15 (month is 0-indexed)

describe('presetRange', () => {
  it('this month spans from the 1st to today', () => {
    expect(presetRange('month', today)).toEqual({
      from: '2026-06-01',
      to: '2026-06-15',
    })
  })

  it('last 30 days spans 29 days back through today inclusive', () => {
    expect(presetRange('30days', today)).toEqual({
      from: '2026-05-17',
      to: '2026-06-15',
    })
  })

  it('this year spans from Jan 1 to today', () => {
    expect(presetRange('year', today)).toEqual({
      from: '2026-01-01',
      to: '2026-06-15',
    })
  })

  it('all time clears the range', () => {
    expect(presetRange('all', today)).toEqual({ from: '', to: '' })
  })

  it('unknown preset clears the range', () => {
    expect(presetRange('nope', today)).toEqual({ from: '', to: '' })
  })

  it('exposes selectable presets', () => {
    expect(DATE_PRESETS.map((p) => p.id)).toEqual([
      'month',
      '30days',
      'year',
      'all',
    ])
  })
})
