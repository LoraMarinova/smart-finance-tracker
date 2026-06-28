import { describe, expect, it } from 'vitest'
import { EMPTY_FORM, toFormState, validate, validateGoal } from './validation.js'

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
