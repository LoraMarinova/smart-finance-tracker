import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  contributeToGoal,
  createGoal,
  createRecurring,
  createTransaction,
  deleteBudget,
  deleteGoal,
  deleteRecurring,
  deleteTransaction,
  downloadCsv,
  exportTransactions,
  getAnalytics,
  getBudgets,
  getCategories,
  getDashboard,
  getGoals,
  getRecurring,
  getTransactions,
  postRecurring,
  setBudget,
  updateTransaction,
} from './api.js'
import BalanceSummary from './components/BalanceSummary.jsx'
import BudgetPanel from './components/BudgetPanel.jsx'
import ChartsPanel from './components/ChartsPanel.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import DashboardCards from './components/DashboardCards.jsx'
import ErrorState from './components/ErrorState.jsx'
import FilterBar from './components/FilterBar.jsx'
import GoalPanel from './components/GoalPanel.jsx'
import RecurringPanel from './components/RecurringPanel.jsx'
import { TableSkeleton } from './components/Skeleton.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { ToastProvider, useToast } from './components/Toast.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import TransactionList from './components/TransactionList.jsx'

const EMPTY_STATS = { total_income: 0, total_expense: 0, balance: 0 }
const EMPTY_CATEGORIES = { income: [], expense: [], all: [] }

function sortCategories(cats) {
  if (!cats) return EMPTY_CATEGORIES
  const sortAlpha = (list) => [...(list ?? [])].sort((a, b) => a.localeCompare(b))
  return {
    income: sortAlpha(cats.income),
    expense: sortAlpha(cats.expense),
    all: sortAlpha(cats.all),
  }
}
const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50]

const EMPTY_FILTERS = {
  type: '',
  category: '',
  from: '',
  to: '',
  search: '',
}

function toApiFilters(filters, page, pageSize) {
  return {
    type: filters.type || undefined,
    category: filters.category || undefined,
    from: filters.from ? `${filters.from}T00:00:00` : undefined,
    to: filters.to ? `${filters.to}T23:59:59` : undefined,
    search: filters.search || undefined,
    page,
    page_size: pageSize,
  }
}

function toDateFilters(filters) {
  return {
    from: filters.from ? `${filters.from}T00:00:00` : undefined,
    to: filters.to ? `${filters.to}T23:59:59` : undefined,
  }
}

function AppContent() {
  const { showToast } = useToast()

  const [categories, setCategories] = useState(EMPTY_CATEGORIES)
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 0,
  })
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [analytics, setAnalytics] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [recurring, setRecurring] = useState([])
  const [goals, setGoals] = useState([])

  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [panelsLoading, setPanelsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [dashboardError, setDashboardError] = useState(null)
  const [retrying, setRetrying] = useState(false)

  const txRequestRef = useRef(0)

  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [transactionError, setTransactionError] = useState(null)
  const [budgetError, setBudgetError] = useState(null)
  const [recurringError, setRecurringError] = useState(null)
  const [goalError, setGoalError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [addFormKey, setAddFormKey] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [budgetBusy, setBudgetBusy] = useState(false)
  const [recurringBusyId, setRecurringBusyId] = useState(null)
  const [goalBusy, setGoalBusy] = useState(false)
  const [goalBusyId, setGoalBusyId] = useState(null)

  const monthlyTrend = useMemo(() => {
    if (!analytics?.by_month?.length) return []
    return analytics.by_month.map((row) => ({
      month: row.month,
      net: Number(row.income) - Number(row.expense),
    }))
  }, [analytics])

  const [confirm, setConfirm] = useState(null)

  const dateFilters = useMemo(() => toDateFilters(filters), [filters])

  const refreshTransactions = useCallback(
    async (page = 1) => {
      const requestId = ++txRequestRef.current
      const data = await getTransactions(toApiFilters(filters, page, pageSize))
      if (requestId !== txRequestRef.current) return
      setTransactions(data?.transactions ?? [])
      setStats(data?.stats ?? EMPTY_STATS)
      setPagination({
        page: data?.page ?? page,
        total: data?.total ?? 0,
        total_pages: data?.total_pages ?? 0,
      })
    },
    [filters, pageSize],
  )

  const refreshAnalytics = useCallback(async () => {
    const data = await getAnalytics(dateFilters)
    setAnalytics(data)
  }, [dateFilters])

  const refreshBudgets = useCallback(async () => {
    const data = await getBudgets(dateFilters)
    setBudgets(data ?? [])
  }, [dateFilters])

  const refreshRecurring = useCallback(async () => {
    const data = await getRecurring()
    setRecurring(data ?? [])
  }, [])

  const refreshDashboard = useCallback(async () => {
    const data = await getDashboard()
    setDashboard(data)
    setDashboardError(null)
  }, [])

  const refreshGoals = useCallback(async () => {
    const data = await getGoals()
    setGoals(data ?? [])
  }, [])

  const refreshAll = useCallback(
    async (page = 1) => {
      await Promise.all([
        refreshTransactions(page),
        refreshAnalytics(),
        refreshBudgets(),
        refreshRecurring(),
        refreshDashboard(),
      ])
    },
    [
      refreshTransactions,
      refreshAnalytics,
      refreshBudgets,
      refreshRecurring,
      refreshDashboard,
    ],
  )

  useEffect(() => {
    let active = true
    getCategories()
      .then((cats) => {
        if (active) setCategories(sortCategories(cats))
      })
      .catch((err) => {
        if (active) setLoadError(err.message)
      })
    Promise.allSettled([
      getRecurring().then((data) => {
        if (active) setRecurring(data ?? [])
      }),
      getGoals().then((data) => {
        if (active) setGoals(data ?? [])
      }),
    ]).finally(() => {
      if (active) setPanelsLoading(false)
    })
    getDashboard()
      .then((data) => {
        if (active) {
          setDashboard(data)
          setDashboardError(null)
        }
      })
      .catch((err) => {
        if (active) setDashboardError(err.message)
      })
      .finally(() => {
        if (active) setDashboardLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setChartsLoading(true)
    txRequestRef.current += 1
    const requestId = txRequestRef.current

    Promise.all([
      getTransactions(toApiFilters(filters, 1, pageSize)),
      getAnalytics(dateFilters),
      getBudgets(dateFilters),
    ])
      .then(([txData, analyticsData, budgetData]) => {
        if (!active || requestId !== txRequestRef.current) return
        setTransactions(txData?.transactions ?? [])
        setStats(txData?.stats ?? EMPTY_STATS)
        setPagination({
          page: txData?.page ?? 1,
          total: txData?.total ?? 0,
          total_pages: txData?.total_pages ?? 0,
        })
        setAnalytics(analyticsData)
        setBudgets(budgetData ?? [])
        setLoadError(null)
      })
      .catch((err) => {
        if (active) setLoadError(err.message)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setChartsLoading(false)
        }
      })

    return () => {
      active = false
      txRequestRef.current += 1
    }
  }, [filters, dateFilters, pageSize])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    setLoading(true)
    try {
      await Promise.all([refreshAll(1), refreshGoals()])
      setLoadError(null)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setRetrying(false)
      setLoading(false)
    }
  }, [refreshAll, refreshGoals])

  const handleFiltersChange = useCallback((next) => {
    setFilters(next)
  }, [])

  const handlePageSizeChange = useCallback((nextSize) => {
    setPageSize(nextSize)
  }, [])

  const handlePageChange = useCallback(
    async (page) => {
      setLoading(true)
      try {
        await refreshTransactions(page)
      } catch (err) {
        setLoadError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [refreshTransactions],
  )

  const handleSubmit = useCallback(
    async (payload) => {
      setSubmitting(true)
      setFormError(null)
      try {
        if (editing) {
          await updateTransaction(editing.id, payload)
          showToast('Transaction updated.')
        } else {
          await createTransaction(payload)
          setAddFormKey((k) => k + 1)
          showToast('Transaction added.')
        }
        await refreshAll(pagination.page)
        setEditing(null)
      } catch (err) {
        setFormError(err.message)
      } finally {
        setSubmitting(false)
      }
    },
    [editing, pagination.page, refreshAll, showToast],
  )

  const handleEdit = useCallback((transaction) => {
    setFormError(null)
    setEditing(transaction)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditing(null)
    setFormError(null)
  }, [])

  const handleDeleteRequest = useCallback(
    (id) => {
      setTransactionError(null)
      setConfirm({
        title: 'Delete transaction?',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        onConfirm: async () => {
          setConfirm(null)
          setBusyId(id)
          setTransactionError(null)
          try {
            await deleteTransaction(id)
            showToast('Transaction deleted.', 'info')
            await refreshAll(pagination.page)
            setEditing((curr) => (curr && curr.id === id ? null : curr))
          } catch (err) {
            setTransactionError(err.message)
          } finally {
            setBusyId(null)
          }
        },
      })
    },
    [pagination.page, refreshAll, showToast],
  )

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const csv = await exportTransactions(toDateFilters(filters))
      downloadCsv(csv)
      showToast('CSV exported.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setExporting(false)
    }
  }, [filters, showToast])

  const handleSetBudget = useCallback(
    async (payload) => {
      setBudgetBusy(true)
      setBudgetError(null)
      try {
        await setBudget(payload)
        showToast('Budget saved.')
        await refreshBudgets()
      } finally {
        setBudgetBusy(false)
      }
    },
    [refreshBudgets, showToast],
  )

  const handleDeleteBudget = useCallback(
    (id) => {
      setConfirm({
        title: 'Remove budget?',
        message: 'The spending limit for this category will be removed.',
        confirmLabel: 'Remove',
        onConfirm: async () => {
          setConfirm(null)
          setBudgetBusy(true)
          setBudgetError(null)
          try {
            await deleteBudget(id)
            showToast('Budget removed.', 'info')
            await refreshBudgets()
          } catch (err) {
            setBudgetError(err.message)
          } finally {
            setBudgetBusy(false)
          }
        },
      })
    },
    [refreshBudgets, showToast],
  )

  const handleCreateRecurring = useCallback(
    async (payload) => {
      setRecurringError(null)
      await createRecurring({
        ...payload,
        next_date: `${payload.next_date}T00:00:00`,
      })
      showToast('Recurring template added.')
      // A due template is auto-posted on create, so refresh everything (list,
      // dashboard, analytics) — not just the recurring panel.
      await refreshAll(pagination.page)
    },
    [pagination.page, refreshAll, showToast],
  )

  const handlePostRecurring = useCallback(
    async (id) => {
      setRecurringBusyId(id)
      setRecurringError(null)
      try {
        await postRecurring(id)
        showToast('Recurring transaction posted.')
        await refreshAll(pagination.page)
        await refreshRecurring()
      } catch (err) {
        setRecurringError(err.message)
      } finally {
        setRecurringBusyId(null)
      }
    },
    [pagination.page, refreshAll, refreshRecurring, showToast],
  )

  const handleDeleteRecurring = useCallback(
    (id) => {
      setConfirm({
        title: 'Delete recurring template?',
        message: 'Future scheduled entries will no longer be available.',
        confirmLabel: 'Delete',
        onConfirm: async () => {
          setConfirm(null)
          setRecurringBusyId(id)
          setRecurringError(null)
          try {
            await deleteRecurring(id)
            showToast('Recurring template deleted.', 'info')
            await refreshRecurring()
          } catch (err) {
            setRecurringError(err.message)
          } finally {
            setRecurringBusyId(null)
          }
        },
      })
    },
    [refreshRecurring, showToast],
  )

  const handleCreateGoal = useCallback(
    async (payload) => {
      setGoalBusy(true)
      setGoalError(null)
      try {
        await createGoal(payload)
        showToast('Goal added.')
        await refreshGoals()
      } finally {
        setGoalBusy(false)
      }
    },
    [refreshGoals, showToast],
  )

  const handleContributeGoal = useCallback(
    async (id, amount) => {
      setGoalBusyId(id)
      setGoalError(null)
      try {
        await contributeToGoal(id, amount)
        showToast('Contribution added.')
        await refreshGoals()
      } finally {
        setGoalBusyId(null)
      }
    },
    [refreshGoals, showToast],
  )

  const handleDeleteGoal = useCallback(
    (id) => {
      setConfirm({
        title: 'Delete goal?',
        message: 'This savings goal and its progress will be removed.',
        confirmLabel: 'Delete',
        onConfirm: async () => {
          setConfirm(null)
          setGoalBusyId(id)
          setGoalError(null)
          try {
            await deleteGoal(id)
            showToast('Goal deleted.', 'info')
            await refreshGoals()
          } catch (err) {
            setGoalError(err.message)
          } finally {
            setGoalBusyId(null)
          }
        },
      })
    },
    [refreshGoals, showToast],
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1>Smart Finance Tracker</h1>
            <p className="app-subtitle">
              Track income and expenses with filters, charts, budgets, and export.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content">
        {loadError ? (
          <ErrorState message={loadError} onRetry={handleRetry} retrying={retrying} />
        ) : null}

        <DashboardCards
          data={dashboard}
          loading={dashboardLoading}
          error={dashboardError}
        />

        <BalanceSummary
          totalIncome={stats.total_income}
          totalExpense={stats.total_expense}
          balance={stats.balance}
          monthlyTrend={monthlyTrend}
        />

        <section className="panel charts-section">
          <h2 className="section-title">Analytics</h2>
          <ChartsPanel analytics={analytics} loading={chartsLoading} />
        </section>

        <TransactionForm
          key={editing ? editing.id : `new-${addFormKey}`}
          editing={editing}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancelEdit}
          submitting={submitting}
          serverError={formError}
        />

        <FilterBar
          filters={filters}
          categories={categories}
          onChange={handleFiltersChange}
          onExport={handleExport}
          exporting={exporting}
        />

        <section className="list-section">
          <h2 className="section-title">Transactions</h2>
          {transactionError ? (
            <p className="form-error" role="alert">
              {transactionError}
            </p>
          ) : null}
          {loading ? (
            <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} />
          ) : (
            <TransactionList
              transactions={transactions}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              busyId={busyId}
              page={pagination.page}
              totalPages={pagination.total_pages}
              total={pagination.total}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </section>

        <div className="side-panels">
          <BudgetPanel
            budgets={budgets}
            categories={categories}
            onSetBudget={handleSetBudget}
            onDeleteBudget={handleDeleteBudget}
            busy={budgetBusy}
            loading={panelsLoading}
            actionError={budgetError}
            onClearActionError={() => setBudgetError(null)}
          />
          <RecurringPanel
            items={recurring}
            categories={categories}
            onCreate={handleCreateRecurring}
            onDelete={handleDeleteRecurring}
            onPost={handlePostRecurring}
            busyId={recurringBusyId}
            loading={panelsLoading}
            actionError={recurringError}
            onClearActionError={() => setRecurringError(null)}
          />
          <GoalPanel
            goals={goals}
            onCreate={handleCreateGoal}
            onContribute={handleContributeGoal}
            onDelete={handleDeleteGoal}
            busy={goalBusy}
            busyId={goalBusyId}
            loading={panelsLoading}
            actionError={goalError}
            onClearActionError={() => setGoalError(null)}
          />
        </div>

        <ConfirmDialog
          open={Boolean(confirm)}
          title={confirm?.title}
          message={confirm?.message}
          confirmLabel={confirm?.confirmLabel}
          onConfirm={confirm?.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
