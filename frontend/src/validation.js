/**
 * @typedef {Object} Categories
 * @property {string[]} income
 * @property {string[]} expense
 * @property {string[]} [all]
 */

/**
 * @typedef {Object} TransactionFormValues
 * @property {string} type
 * @property {string} amount
 * @property {string} category
 * @property {string} [description]
 * @property {string} [date]
 */

export const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  date: '',
}

/**
 * Map a transaction (or null) into editable form field values.
 * @param {Record<string, any> | null | undefined} transaction
 * @returns {TransactionFormValues}
 */
export function toFormState(transaction) {
  if (!transaction) return EMPTY_FORM
  return {
    type: transaction.type ?? 'expense',
    amount: transaction.amount != null ? String(transaction.amount) : '',
    category: transaction.category ?? '',
    description: transaction.description ?? '',
    date: transaction.date ? String(transaction.date).slice(0, 10) : '',
  }
}

/**
 * Validate the savings-goal form.
 * @param {{ name?: string, target?: string | number }} values
 * @returns {Record<string, string>}
 */
export function validateGoal(values) {
  /** @type {Record<string, string>} */
  const errors = {}
  if (!values.name || !values.name.trim()) {
    errors.name = 'Name is required.'
  }
  const target = Number(values.target)
  if (values.target === '' || values.target === undefined || Number.isNaN(target)) {
    errors.target = 'Enter a target amount.'
  } else if (target <= 0) {
    errors.target = 'Target must be greater than 0.'
  }
  return errors
}

/**
 * Validate a savings-goal contribution amount.
 * @param {string | number | undefined} value
 * @returns {Record<string, string>}
 */
export function validateGoalContribution(value) {
  /** @type {Record<string, string>} */
  const errors = {}
  const amount = Number(value)
  if (value === '' || value === undefined || Number.isNaN(amount)) {
    errors.amount = 'Enter an amount.'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than 0.'
  }
  return errors
}

/**
 * Validate the budget form.
 * @param {{ category?: string, amount?: string | number }} values
 * @param {Categories} [categories]
 * @returns {Record<string, string>}
 */
export function validateBudget(values, categories) {
  /** @type {Record<string, string>} */
  const errors = {}
  if (!values.category?.trim()) {
    errors.category = 'Category is required.'
  } else if (categories?.expense && !categories.expense.includes(values.category)) {
    errors.category = 'Choose a category from the list.'
  }
  const amount = Number(values.amount)
  if (values.amount === '' || values.amount === undefined || Number.isNaN(amount)) {
    errors.amount = 'Enter a limit.'
  } else if (amount <= 0) {
    errors.amount = 'Limit must be greater than 0.'
  }
  return errors
}

/**
 * Validate the transaction form.
 * @param {TransactionFormValues} values
 * @param {Categories} [categories]
 * @returns {Record<string, string>}
 */
export function validate(values, categories) {
  /** @type {Record<string, string>} */
  const errors = {}
  if (values.type !== 'income' && values.type !== 'expense') {
    errors.type = 'Choose income or expense.'
  }
  const amount = Number(values.amount)
  if (values.amount === '' || Number.isNaN(amount)) {
    errors.amount = 'Enter an amount.'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than 0.'
  }
  if (!values.category.trim()) {
    errors.category = 'Category is required.'
  } else if (categories) {
    const allowed = values.type === 'income' ? categories.income : categories.expense
    if (allowed && !allowed.includes(values.category)) {
      errors.category = 'Choose a category from the list.'
    }
  }
  return errors
}

/**
 * Validate the recurring template form.
 * @param {TransactionFormValues & { frequency?: string, next_date?: string }} values
 * @param {Categories} [categories]
 * @returns {Record<string, string>}
 */
export function validateRecurring(values, categories) {
  const errors = validate(values, categories)
  if (!values.next_date?.trim()) {
    errors.next_date = 'Choose the next date.'
  }
  if (values.frequency !== 'weekly' && values.frequency !== 'monthly') {
    errors.frequency = 'Choose weekly or monthly.'
  }
  return errors
}
