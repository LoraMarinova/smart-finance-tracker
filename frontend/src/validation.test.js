import { describe, expect, it } from 'vitest'
import { validate } from './validation.js'

const categories = {
  income: ['Salary', 'Freelance'],
  expense: ['Groceries', 'Rent'],
  all: ['Salary', 'Freelance', 'Groceries', 'Rent'],
}

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

  it('rejects non-positive amount', () => {
    const errors = validate(
      { type: 'expense', amount: '0', category: 'Groceries' },
      categories,
    )
    expect(errors.amount).toBeTruthy()
  })

  it('rejects income category on expense', () => {
    const errors = validate(
      { type: 'expense', amount: '10', category: 'Salary' },
      categories,
    )
    expect(errors.category).toBeTruthy()
  })

  it('requires category', () => {
    const errors = validate(
      { type: 'income', amount: '100', category: '  ' },
      categories,
    )
    expect(errors.category).toBeTruthy()
  })
})
