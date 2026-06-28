import { memo } from 'react'
import CategoryChip from './CategoryChip.jsx'

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
      <td>
        <CategoryChip category={transaction.category} />
      </td>
      <td className="cell-desc">{transaction.description || '—'}</td>
      <td className={amountClass}>
        {sign}
        {currency.format(Number(transaction.amount))}
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

function TransactionList({
  transactions,
  onEdit,
  onDelete,
  busyId,
  page,
  totalPages,
  total,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
}) {
  if (transactions.length === 0) {
    return (
      <div className="empty">
        <p>No transactions match your filters.</p>
        <p className="empty-hint">Add a transaction above or clear filters.</p>
      </div>
    )
  }

  return (
    <>
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

      <div className="pagination">
        <label className="page-size">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {totalPages > 1 ? (
          <div className="pagination-controls">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </button>
            <span className="pagination-label">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        ) : null}

        <span className="pagination-label">
          {total} transaction{total === 1 ? '' : 's'}
        </span>
      </div>
    </>
  )
}

export default memo(TransactionList)
