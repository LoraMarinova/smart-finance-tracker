import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getCategoryColor } from '../categoryColors.js'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

function ChartsPanel({ analytics, loading }) {
  if (loading) {
    return (
      <div className="charts-grid" aria-busy="true" aria-label="Loading charts">
        <div className="chart-card skeleton" style={{ height: 260 }} />
        <div className="chart-card skeleton" style={{ height: 260 }} />
      </div>
    )
  }

  if (!analytics) return null

  const monthly = (analytics.by_month ?? []).map((row) => ({
    month: row.month,
    income: Number(row.income),
    expense: Number(row.expense),
  }))

  const byCategory = (analytics.by_category ?? []).map((row) => ({
    name: row.category,
    value: Number(row.total),
  }))

  if (monthly.length === 0 && byCategory.length === 0) {
    return (
      <div className="empty charts-empty">
        <p>No expense data yet for charts.</p>
      </div>
    )
  }

  return (
    <div className="charts-grid">
      {monthly.length > 0 ? (
        <div className="chart-card">
          <h3 className="chart-title">Monthly income vs expense</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <Tooltip formatter={(value) => currency.format(value)} />
              <Bar
                dataKey="income"
                fill="var(--positive)"
                name="Income"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                fill="var(--negative)"
                name="Expense"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {byCategory.length > 0 ? (
        <div className="chart-card">
          <h3 className="chart-title">Spending by category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {byCategory.map((entry) => (
                  <Cell key={entry.name} fill={getCategoryColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => currency.format(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}

export default ChartsPanel
