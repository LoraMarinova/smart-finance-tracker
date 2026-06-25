import { memo } from 'react'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

function BalanceSummary({ totalIncome, totalExpense, balance }) {
  const balanceClass = balance >= 0 ? 'amount positive' : 'amount negative'

  return (
    <section className="summary" aria-label="Balance summary">
      <div className="summary-card">
        <span className="summary-label">Total Income</span>
        <span className="amount positive">{currency.format(totalIncome)}</span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Total Expense</span>
        <span className="amount negative">{currency.format(totalExpense)}</span>
      </div>
      <div className="summary-card summary-card--balance">
        <span className="summary-label">Net Balance</span>
        <span className={balanceClass}>{currency.format(balance)}</span>
      </div>
    </section>
  )
}

export default memo(BalanceSummary)
