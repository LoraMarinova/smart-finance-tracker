import { useState } from 'react'
import { validateRecurring } from '../validation.js'
import { ListSkeleton } from './Skeleton.jsx'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString()
}

function RecurringPanel({
  items,
  categories,
  onCreate,
  onDelete,
  onPost,
  busyId,
  loading = false,
  actionError = null,
  onClearActionError,
}) {
  const [values, setValues] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    frequency: 'monthly',
    next_date: '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState('')

  const categoryOptions =
    values.type === 'income' ? categories.income : categories.expense

  function handleChange(event) {
    const { name, value } = event.target
    const next = {
      ...values,
      [name]: value,
      ...(name === 'type' ? { category: '' } : {}),
    }
    setValues(next)
    if (touched) setErrors(validateRecurring(next, categories))
    if (serverError) setServerError('')
    onClearActionError?.()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    const validationErrors = validateRecurring(values, categories)
    setErrors(validationErrors)
    setServerError('')
    if (Object.keys(validationErrors).length > 0) return

    try {
      await onCreate({
        type: values.type,
        amount: Number(values.amount),
        category: values.category,
        description: values.description.trim() || null,
        frequency: values.frequency,
        next_date: values.next_date,
      })
      setValues((curr) => ({
        ...curr,
        amount: '',
        description: '',
      }))
      setErrors({})
      setTouched(false)
    } catch (err) {
      setServerError(err.message)
    }
  }

  const panelError = serverError || actionError

  return (
    <section className="panel" aria-label="Recurring transactions">
      <h2 className="section-title">Recurring templates</h2>
      <p className="panel-hint">
        Save repeating entries and post them when due — no background scheduler needed.
      </p>

      {panelError ? (
        <p className="form-error" role="alert">
          {panelError}
        </p>
      ) : null}

      <form className="recurring-form" onSubmit={handleSubmit} noValidate>
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
          <select
            name="category"
            value={values.category}
            onChange={handleChange}
            aria-invalid={touched && Boolean(errors.category)}
          >
            <option value="">Select…</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {touched && errors.category ? (
            <span className="field-error">{errors.category}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Frequency</span>
          <select
            name="frequency"
            value={values.frequency}
            onChange={handleChange}
            aria-invalid={touched && Boolean(errors.frequency)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          {touched && errors.frequency ? (
            <span className="field-error">{errors.frequency}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Next date</span>
          <input
            type="date"
            name="next_date"
            value={values.next_date}
            onChange={handleChange}
            aria-invalid={touched && Boolean(errors.next_date)}
          />
          {touched && errors.next_date ? (
            <span className="field-error">{errors.next_date}</span>
          ) : null}
        </label>
        <label className="field field--wide">
          <span>Description</span>
          <input
            type="text"
            name="description"
            value={values.description}
            onChange={handleChange}
            placeholder="Optional"
          />
        </label>
        <button type="submit" className="btn btn--primary">
          Add recurring
        </button>
      </form>

      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <p className="empty-hint">No recurring templates yet.</p>
      ) : (
        <ul className="recurring-list">
          {items.map((item) => (
            <li key={item.id} className="recurring-item">
              <div>
                <strong>{item.category}</strong>
                <span className="recurring-meta">
                  {item.type} · {currency.format(Number(item.amount))} ·{' '}
                  {item.frequency} · next {formatDate(item.next_date)}
                </span>
              </div>
              <div className="cell-actions">
                <button
                  type="button"
                  className="btn btn--small btn--primary"
                  onClick={() => onPost(item.id)}
                  disabled={busyId === item.id}
                >
                  Post now
                </button>
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  onClick={() => onDelete(item.id)}
                  disabled={busyId === item.id}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default RecurringPanel
