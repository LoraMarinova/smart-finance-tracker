import { memo } from 'react'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString()
}

function TransactionRow({ transaction, onEdit, onDelete, busy }) {
  const isIncome = transaction.type === 'income'
  const amountClass = isIncome ? 'amount positive' : 'amount negative'
  const sign = isIncome ? '+' : '-'

  return (
    <tr>
      <td>{formatDate(transaction.date)}</td>
      <td>
        <span className={`pill pill--${isIncome ? 'income' : 'expense'}`}>
          {transaction.type}
        </span>
      </td>
      <td>{transaction.category}</td>
      <td className="cell-desc">{transaction.description || '—'}</td>
      <td className={amountClass}>
        {sign}
        {currency.format(transaction.amount)}
      </td>
      <td className="cell-actions">
        <button
          type="button"
          className="btn btn--small"
          onClick={() => onEdit(transaction)}
          disabled={busy}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn--small btn--danger"
          onClick={() => onDelete(transaction.id)}
          disabled={busy}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

const MemoRow = memo(TransactionRow)

function TransactionList({ transactions, onEdit, onDelete, busyId }) {
  if (transactions.length === 0) {
    return (
      <div className="empty">
        <p>No transactions yet.</p>
        <p className="empty-hint">Add your first income or expense above.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Description</th>
            <th className="th-amount">Amount</th>
            <th className="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <MemoRow
              key={t.id}
              transaction={t}
              onEdit={onEdit}
              onDelete={onDelete}
              busy={busyId === t.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default memo(TransactionList)
