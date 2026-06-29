import { describe, expect, it } from 'vitest'
import {
  EMPTY_FORM,
  toFormState,
  validate,
  validateBudget,
  validateGoal,
  validateGoalContribution,
  validateRecurring,
} from './validation.js'

const categories = {
  income: ['Salary', 'Freelance'],
  expense: ['Groceries', 'Rent'],
  all: ['Salary', 'Freelance', 'Groceries', 'Rent'],
}

describe('toFormState', () => {
  it('returns empty defaults for a new form', () => {
    expect(toFormState(null)).toEqual(EMPTY_FORM)
  })

  it('maps a transaction into editable form fields', () => {
    expect(
      toFormState({
        type: 'income',
        amount: '120.5',
        category: 'Salary',
        description: 'Pay',
        date: '2026-03-15T14:30:00',
      }),
    ).toEqual({
      type: 'income',
      amount: '120.5',
      category: 'Salary',
      description: 'Pay',
      date: '2026-03-15',
    })
  })
})

describe('validate', () => {
  it('accepts valid expense', () => {
    const errors = validate(
      {
        type: 'expense',
        amount: '25.50',
        category: 'Groceries',
        description: '',
        date: '',
      },
      categories,
    )
    expect(errors).toEqual({})
  })

  it('accepts valid income', () => {
    const errors = validate(
      { type: 'income', amount: '100', category: 'Salary' },
      categories,
    )
    expect(errors).toEqual({})
  })

  it('rejects missing amount', () => {
    const errors = validate(
      { type: 'expense', amount: '', category: 'Groceries' },
      categories,
    )
    expect(errors.amount).toBe('Enter an amount.')
  })

  it('rejects non-positive amount', () => {
    const errors = validate(
      { type: 'expense', amount: '0', category: 'Groceries' },
      categories,
    )
    expect(errors.amount).toBe('Amount must be greater than 0.')
  })

  it('rejects invalid transaction type', () => {
    const errors = validate(
      { type: 'transfer', amount: '10', category: 'Groceries' },
      categories,
    )
    expect(errors.type).toBe('Choose income or expense.')
  })

  it('rejects income category on expense', () => {
    const errors = validate(
      { type: 'expense', amount: '10', category: 'Salary' },
      categories,
    )
    expect(errors.category).toBe('Choose a category from the list.')
  })

  it('requires category', () => {
    const errors = validate(
      { type: 'income', amount: '100', category: '  ' },
      categories,
    )
    expect(errors.category).toBe('Category is required.')
  })
})

describe('validateBudget', () => {
  it('accepts a valid budget', () => {
    expect(
      validateBudget({ category: 'Groceries', amount: '200' }, categories),
    ).toEqual({})
  })

  it('requires a category', () => {
    expect(validateBudget({ category: '', amount: '200' }, categories).category).toBe(
      'Category is required.',
    )
  })

  it('requires a limit', () => {
    const errors = validateBudget({ category: 'Groceries', amount: '' }, categories)
    expect(errors.amount).toBe('Enter a limit.')
  })

  it('rejects a non-positive limit', () => {
    expect(
      validateBudget({ category: 'Groceries', amount: '0' }, categories).amount,
    ).toBe('Limit must be greater than 0.')
  })
})

describe('validateGoal', () => {
  it('accepts a valid goal', () => {
    expect(validateGoal({ name: 'Car', target: '5000' })).toEqual({})
  })

  it('requires a name', () => {
    const errors = validateGoal({ name: '  ', target: '100' })
    expect(errors.name).toBe('Name is required.')
  })

  it('requires a target amount', () => {
    const errors = validateGoal({ name: 'Car', target: '' })
    expect(errors.target).toBe('Enter a target amount.')
  })

  it('rejects a non-positive target', () => {
    const errors = validateGoal({ name: 'Car', target: '0' })
    expect(errors.target).toBe('Target must be greater than 0.')
  })

  it('reports multiple missing fields at once', () => {
    const errors = validateGoal({ name: '', target: '' })
    expect(errors.name).toBeTruthy()
    expect(errors.target).toBeTruthy()
  })
})

describe('validateGoalContribution', () => {
  it('accepts a positive amount', () => {
    expect(validateGoalContribution('25')).toEqual({})
  })

  it('requires an amount', () => {
    expect(validateGoalContribution('').amount).toBe('Enter an amount.')
  })

  it('rejects a non-positive amount', () => {
    expect(validateGoalContribution('-10').amount).toBe(
      'Amount must be greater than 0.',
    )
    expect(validateGoalContribution('0').amount).toBe('Amount must be greater than 0.')
  })
})

describe('validateRecurring', () => {
  it('accepts a valid recurring template', () => {
    expect(
      validateRecurring(
        {
          type: 'expense',
          amount: '500',
          category: 'Rent',
          frequency: 'monthly',
          next_date: '2026-07-01',
        },
        categories,
      ),
    ).toEqual({})
  })

  it('requires a category', () => {
    const errors = validateRecurring(
      {
        type: 'expense',
        amount: '500',
        category: '',
        frequency: 'monthly',
        next_date: '2026-07-01',
      },
      categories,
    )
    expect(errors.category).toBe('Category is required.')
  })

  it('requires amount and next date', () => {
    const errors = validateRecurring(
      {
        type: 'expense',
        amount: '',
        category: 'Rent',
        frequency: 'monthly',
        next_date: '',
      },
      categories,
    )
    expect(errors.amount).toBe('Enter an amount.')
    expect(errors.next_date).toBe('Choose the next date.')
  })
})
