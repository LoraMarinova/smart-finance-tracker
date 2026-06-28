import { useState } from 'react'
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
}) {
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!category || !amount) return
    onSetBudget({ category, amount: Number(amount) })
    setAmount('')
  }

  return (
    <section className="panel" aria-label="Budgets">
      <h2 className="section-title">Monthly budgets</h2>
      <p className="panel-hint">
        Set spending limits per category. Progress uses your filtered date range.
      </p>

      <form className="budget-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select…</option>
            {categories.expense.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Limit</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
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
