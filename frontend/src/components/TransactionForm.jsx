import { useState } from 'react'

const EMPTY = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  date: '',
}

// Normalizes a transaction (or undefined) into form field strings. Used as lazy
// state init; the parent remounts this form via `key` to reset between targets.
function toFormState(transaction) {
  if (!transaction) return EMPTY
  return {
    type: transaction.type ?? 'expense',
    amount: transaction.amount != null ? String(transaction.amount) : '',
    category: transaction.category ?? '',
    description: transaction.description ?? '',
    date: transaction.date ? String(transaction.date).slice(0, 10) : '',
  }
}

function validate(values) {
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
  }
  return errors
}

function TransactionForm({ editing, onSubmit, onCancel, submitting, serverError }) {
  const [values, setValues] = useState(() => toFormState(editing))
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)

  const isEdit = Boolean(editing)
  const errorMessages = touched ? Object.values(errors) : []

  function handleChange(event) {
    const { name, value } = event.target
    const next = { ...values, [name]: value }
    setValues(next)
    // Once the user has attempted to submit, keep errors in sync as they type.
    if (touched) setErrors(validate(next))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const payload = {
      type: values.type,
      amount: Number(values.amount),
      category: values.category.trim(),
      description: values.description.trim() || null,
    }
    if (values.date) payload.date = values.date

    onSubmit(payload)
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <h2 className="form-title">{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>

      {errorMessages.length > 0 ? (
        <div className="form-error" role="alert">
          <strong>Could not save this transaction:</strong>
          <ul className="form-error-list">
            {errorMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="form-grid">
        <label className="field">
          <span>Type</span>
          <select name="type" value={values.type} onChange={handleChange}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>

        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={values.amount}
            onChange={handleChange}
            aria-invalid={touched && Boolean(errors.amount)}
          />
          {touched && errors.amount ? (
            <span className="field-error">{errors.amount}</span>
          ) : null}
        </label>

        <label className="field">
          <span>Category</span>
          <input
            type="text"
            name="category"
            placeholder="e.g. Groceries, Salary"
            value={values.category}
            onChange={handleChange}
            aria-invalid={touched && Boolean(errors.category)}
          />
          {touched && errors.category ? (
            <span className="field-error">{errors.category}</span>
          ) : null}
        </label>

        <label className="field">
          <span>Date</span>
          <input
            type="date"
            name="date"
            value={values.date}
            onChange={handleChange}
          />
        </label>

        <label className="field field--wide">
          <span>Description <em>(optional)</em></span>
          <input
            type="text"
            name="description"
            placeholder="Notes"
            value={values.description}
            onChange={handleChange}
          />
        </label>
      </div>

      {serverError ? <p className="form-error" role="alert">{serverError}</p> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Transaction'}
        </button>
        {isEdit ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}

export default TransactionForm
