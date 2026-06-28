import { memo, useMemo } from 'react'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

function Sparkline({ points }) {
  const path = useMemo(() => {
    if (!points || points.length < 2) return null
    const values = points.map((p) => p.net)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const width = 120
    const height = 36
    const step = width / (values.length - 1)

    const coords = values.map((value, index) => {
      const x = index * step
      const y = height - ((value - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })

    return coords.join(' ')
  }, [points])

  if (!path) return null

  const lastNet = points[points.length - 1]?.net ?? 0
  const stroke = lastNet >= 0 ? 'var(--positive)' : 'var(--negative)'

  return (
    <svg
      className="hero-sparkline"
      viewBox="0 0 120 36"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={path}
      />
    </svg>
  )
}

function BalanceSummary({ totalIncome, totalExpense, balance, monthlyTrend = [] }) {
  const balanceNum = Number(balance)
  const balanceClass = balanceNum >= 0 ? 'amount positive' : 'amount negative'

  return (
    <section className="summary" aria-label="Balance summary">
      <div className="summary-hero">
        <div className="summary-hero-main">
          <span className="summary-label">Net Balance</span>
          <span className={`summary-hero-amount ${balanceClass}`}>
            {currency.format(balanceNum)}
          </span>
          <div className="summary-chips">
            <span className="stat-chip stat-chip--income">
              <span className="stat-chip-label">Income</span>
              <span className="stat-chip-value">
                {currency.format(Number(totalIncome))}
              </span>
            </span>
            <span className="stat-chip stat-chip--expense">
              <span className="stat-chip-label">Expense</span>
              <span className="stat-chip-value">
                {currency.format(Number(totalExpense))}
              </span>
            </span>
          </div>
        </div>
        {monthlyTrend.length >= 2 ? (
          <div className="summary-hero-chart">
            <span className="summary-hero-chart-label">Monthly trend</span>
            <Sparkline points={monthlyTrend} />
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default memo(BalanceSummary)
