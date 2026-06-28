/** @typedef {{ color: string, background: string }} CategoryChipStyle */

const CATEGORY_PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#64748b',
  '#9333ea',
  '#e11d48',
  '#0d9488',
  '#4f46e5',
]

const KNOWN_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Gifts',
  'Other Income',
  'Groceries',
  'Rent',
  'Mortgage',
  'Utilities',
  'Transport',
  'Dining Out',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Subscriptions',
  'Other Expense',
]

/** @type {Map<string, string>} */
const colorByCategory = new Map(
  KNOWN_CATEGORIES.map((name, index) => [name, CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]]),
)

/**
 * Stable accent color for a category name (charts, chips, budget bars).
 * @param {string} category
 * @returns {string}
 */
export function getCategoryColor(category) {
  if (!category) return CATEGORY_PALETTE[0]
  const known = colorByCategory.get(category)
  if (known) return known

  let hash = 0
  for (let i = 0; i < category.length; i += 1) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length]
}

/**
 * Inline styles for a category chip badge.
 * @param {string} category
 * @returns {CategoryChipStyle}
 */
export function getCategoryChipStyle(category) {
  const color = getCategoryColor(category)
  return { color, background: `${color}22` }
}

export { CATEGORY_PALETTE }
