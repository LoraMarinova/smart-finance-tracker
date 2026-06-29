import { memo } from 'react'
import CategoryChip from './CategoryChip.jsx'
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

function TrendPill({ value }) {
  if (value === null || value === undefined) {
    return <span className="trend-pill trend-pill--neutral">—</span>
  }
  const up = value > 0
  const down = value < 0
  const cls = up ? 'trend-pill--up' : down ? 'trend-pill--down' : 'trend-pill--neutral'
  const arrow = up ? '↑' : down ? '↓' : '→'
  return (
    <span className={`trend-pill ${cls}`}>
      {arrow} {formatPct(value)}
    </span>
  )
}

function CardIcon({ children }) {
  return (
    <span className="dashboard-card-icon" aria-hidden="true">
      {children}
    </span>
  )
}

function DashboardCards({ data, loading, error }) {
  if (loading) {
    return (
      <section className="dashboard" aria-label="Dashboard">
        <CardSkeleton count={4} />
      </section>
    )
  }

  if (error) {
    return (
      <section className="dashboard" aria-label="Dashboard">
        <p className="form-error dashboard-error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  if (!data) return null

  const change = data.expense_comparison?.change_pct
  const budgetsHealthy = data.budgets_over === 0

  return (
    <section className="dashboard" aria-label="Dashboard">
      <div className="dashboard-card">
        <div className="dashboard-card-top">
          <CardIcon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </CardIcon>
          <span className="summary-label">This month net</span>
        </div>
        <span
          className={Number(data.balance) >= 0 ? 'amount positive' : 'amount negative'}
        >
          {currency.format(Number(data.balance))}
        </span>
        <span className="dashboard-meta">
          Savings rate {Math.round(data.savings_rate)}%
        </span>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-top">
          <CardIcon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M3 6h18M16 10a4 4 0 0 1-8 0"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </CardIcon>
          <span className="summary-label">Spent this month</span>
        </div>
        <span className="amount">{currency.format(Number(data.expense))}</span>
        <span className="dashboard-meta">
          <TrendPill value={change} /> vs last month
        </span>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-top">
          <CardIcon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="7" cy="7" r="1.5" fill="currentColor" />
            </svg>
          </CardIcon>
          <span className="summary-label">Top category</span>
        </div>
        {data.top_category ? (
          <CategoryChip category={data.top_category} />
        ) : (
          <span className="amount dashboard-amount-sm">—</span>
        )}
        <span className="dashboard-meta">
          {currency.format(Number(data.top_category_amount))}
        </span>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-top">
          <CardIcon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </CardIcon>
          <span className="summary-label">Budget health</span>
        </div>
        <span
          className={`amount dashboard-amount-sm${budgetsHealthy ? ' positive' : ' negative'}`}
        >
          {data.budgets_over}/{data.budgets_total} over
        </span>
        <span className="dashboard-meta">{data.transaction_count} transactions</span>
      </div>
    </section>
  )
}

export default memo(DashboardCards)
