import { describe, expect, it } from 'vitest'
import { getCategoryColor, getCategoryChipStyle } from './categoryColors.js'

describe('getCategoryColor', () => {
  it('returns stable colors for known categories', () => {
    expect(getCategoryColor('Groceries')).toBe(getCategoryColor('Groceries'))
    expect(getCategoryColor('Groceries')).not.toBe(getCategoryColor('Rent'))
  })

  it('returns a palette color for unknown categories', () => {
    expect(getCategoryColor('Custom Category')).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('builds chip styles from the category color', () => {
    const style = getCategoryChipStyle('Transport')
    expect(style.color).toBe(getCategoryColor('Transport'))
    expect(style.background).toContain(style.color.slice(1))
  })
})
