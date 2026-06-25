import { useCallback, useEffect, useState } from 'react'
import BalanceSummary from './components/BalanceSummary.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import TransactionList from './components/TransactionList.jsx'
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from './api.js'

const EMPTY_STATS = { total_income: 0, total_expense: 0, balance: 0 }

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [addFormKey, setAddFormKey] = useState(0)

  const refresh = useCallback(async () => {
    const data = await getTransactions()
    setTransactions(data?.transactions ?? [])
    setStats(data?.stats ?? EMPTY_STATS)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    getTransactions()
      .then((data) => {
        if (!active) return
        setTransactions(data?.transactions ?? [])
        setStats(data?.stats ?? EMPTY_STATS)
        setLoadError(null)
      })
      .catch((err) => {
        if (active) setLoadError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = useCallback(
    async (payload) => {
      setSubmitting(true)
      setFormError(null)
      try {
        if (editing) {
          await updateTransaction(editing.id, payload)
        } else {
          await createTransaction(payload)
          setAddFormKey((k) => k + 1)
        }
        await refresh()
        setEditing(null)
      } catch (err) {
        setFormError(err.message)
      } finally {
        setSubmitting(false)
      }
    },
    [editing, refresh],
  )

  const handleEdit = useCallback((transaction) => {
    setFormError(null)
    setEditing(transaction)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditing(null)
    setFormError(null)
  }, [])

  const handleDelete = useCallback(
    async (id) => {
      setBusyId(id)
      try {
        await deleteTransaction(id)
        await refresh()
        setEditing((curr) => (curr && curr.id === id ? null : curr))
      } catch (err) {
        setLoadError(err.message)
      } finally {
        setBusyId(null)
      }
    },
    [refresh],
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>Smart Finance Tracker</h1>
        <p className="app-subtitle">Track income and expenses with a live balance.</p>
      </header>

      <BalanceSummary
        totalIncome={stats.total_income}
        totalExpense={stats.total_expense}
        balance={stats.balance}
      />

      <TransactionForm
        key={editing ? editing.id : `new-${addFormKey}`}
        editing={editing}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
        submitting={submitting}
        serverError={formError}
      />

      <section className="list-section">
        <h2 className="section-title">Transactions</h2>
        {loadError ? <p className="form-error" role="alert">{loadError}</p> : null}
        {loading ? (
          <p className="loading">Loading…</p>
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            busyId={busyId}
          />
        )}
      </section>
    </div>
  )
}
