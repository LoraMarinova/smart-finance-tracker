import { useState } from 'react'
import { validateBudget } from '../validation.js'
import { getCategoryColor } from '../categoryColors.js'
import CategoryChip from './CategoryChip.jsx'
import { ListSkeleton } from './Skeleton.jsx'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

function BudgetPanel({
  budgets,
  categories,
  onSetBudget,
  onDeleteBudget,
  busy,
  loading = false,
  actionError = null,
  onClearActionError,
}) {
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    const next = {
      category: name === 'category' ? value : category,
      amount: name === 'amount' ? value : amount,
    }
    if (name === 'category') setCategory(value)
    if (name === 'amount') setAmount(value)
    if (touched) setErrors(validateBudget(next, categories))
    if (serverError) setServerError('')
    onClearActionError?.()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    const validationErrors = validateBudget({ category, amount }, categories)
    setErrors(validationErrors)
    setServerError('')
    if (Object.keys(validationErrors).length > 0) return

    try {
      await onSetBudget({ category, amount: Number(amount) })
      setAmount('')
      setErrors({})
      setTouched(false)
    } catch (err) {
      setServerError(err.message)
    }
  }

  const panelError = serverError || actionError

  return (
    <section className="panel" aria-label="Budgets">
      <h2 className="section-title">Monthly budgets</h2>
      <p className="panel-hint">
        Set spending limits per category. Progress uses your filtered date range.
      </p>

      {panelError ? (
        <p className="form-error" role="alert">
          {panelError}
        </p>
      ) : null}

      <form className="budget-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Category</span>
          <select
            name="category"
            value={category}
            onChange={handleChange}
            aria-invalid={touched && Boolean(errors.category)}
          >
            <option value="">Select…</option>
            {categories.expense.map((cat) => (
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
          <span>Limit</span>
          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            value={amount}
            onChange={handleChange}
            placeholder="0.00"
            aria-invalid={touched && Boolean(errors.amount)}
          />
          {touched && errors.amount ? (
            <span className="field-error">{errors.amount}</span>
          ) : null}
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Set budget
        </button>
      </form>

      {loading ? (
        <ListSkeleton />
      ) : budgets.length === 0 ? (
        <p className="empty-hint">No budgets set yet.</p>
      ) : (
        <ul className="budget-list">
          {budgets.map((budget) => {
            const spent = Number(budget.spent)
            const limit = Number(budget.amount)
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
            const over = spent > limit
            const barColor = getCategoryColor(budget.category)
            return (
              <li key={budget.id} className="budget-item">
                <div className="budget-item-header">
                  <CategoryChip category={budget.category} />
                  <span className={over ? 'amount negative' : 'amount'}>
                    {currency.format(spent)} / {currency.format(limit)}
                  </span>
                </div>
                <div className="budget-bar">
                  <div
                    className={`budget-bar-fill${over ? ' budget-bar-fill--over' : ''}`}
                    style={{
                      width: `${pct}%`,
                      background: over ? undefined : barColor,
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  onClick={() => onDeleteBudget(budget.id)}
                  disabled={busy}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default BudgetPanel
