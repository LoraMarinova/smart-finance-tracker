import { memo } from 'react'
import { CardSkeleton } from './Skeleton.jsx'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

function formatPct(value) {
  if (value === null || value === undefined) return '—'
  const rounded = Math.round(value * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded}%`
}

function DashboardCards({ data, loading }) {
  if (loading) {
    return (
      <section className="dashboard" aria-label="Dashboard">
        <CardSkeleton count={4} />
      </section>
    )
  }

  if (!data) return null

  const change = data.expense_comparison?.change_pct
  const changeClass =
    change === null || change === undefined
      ? 'amount'
      : change > 0
        ? 'amount negative'
        : 'amount positive'

  return (
    <section className="dashboard" aria-label="Dashboard">
      <div className="dashboard-card">
        <span className="summary-label">This month net</span>
        <span className={Number(data.balance) >= 0 ? 'amount positive' : 'amount negative'}>
          {currency.format(Number(data.balance))}
        </span>
        <span className="dashboard-meta">
          Savings rate {Math.round(data.savings_rate)}%
        </span>
      </div>

      <div className="dashboard-card">
        <span className="summary-label">Spent this month</span>
        <span className="amount">{currency.format(Number(data.expense))}</span>
        <span className={`dashboard-meta ${changeClass}`}>
          {formatPct(change)} vs last month
        </span>
      </div>

      <div className="dashboard-card">
        <span className="summary-label">Top category</span>
        <span className="amount dashboard-amount-sm">{data.top_category ?? '—'}</span>
        <span className="dashboard-meta">
          {currency.format(Number(data.top_category_amount))}
        </span>
      </div>

      <div className="dashboard-card">
        <span className="summary-label">Budget health</span>
        <span className="amount dashboard-amount-sm">
          {data.budgets_over}/{data.budgets_total} over
        </span>
        <span className="dashboard-meta">{data.transaction_count} transactions</span>
      </div>
    </section>
  )
}

export default memo(DashboardCards)
