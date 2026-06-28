export const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  date: '',
}

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

export function validateGoal(values) {
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

export function validate(values, categories) {
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
    const allowed =
      values.type === 'income' ? categories.income : categories.expense
    if (allowed && !allowed.includes(values.category)) {
      errors.category = 'Choose a category from the list.'
    }
  }
  return errors
}
