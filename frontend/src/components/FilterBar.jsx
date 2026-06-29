import { DATE_PRESETS, presetRange } from '../datePresets.js'

function FilterBar({ filters, categories, onChange, onExport, exporting }) {
  const categoryOptions =
    filters.type === 'income'
      ? categories.income
      : filters.type === 'expense'
        ? categories.expense
        : categories.all

  function handleChange(event) {
    const { name, value } = event.target
    const next = { ...filters, [name]: value }
    if (name === 'type') next.category = ''
    onChange(next)
  }

  function applyPreset(preset) {
    const { from, to } = presetRange(preset)
    onChange({ ...filters, from, to })
  }

  return (
    <section className="filters" aria-label="Transaction filters">
      <h2 className="section-title">Filter &amp; Search</h2>
      <p className="panel-hint">
        Narrow the transaction list and analytics below by type, category, date range,
        or text. Export CSV downloads exactly what your current filters show.
      </p>

      <div className="filter-presets" role="group" aria-label="Date range presets">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="filters-grid">
        <label className="field">
          <span>Type</span>
          <select name="type" value={filters.type} onChange={handleChange}>
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>

        <label className="field">
          <span>Category</span>
          <select name="category" value={filters.category} onChange={handleChange}>
            <option value="">All</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>From</span>
          <input type="date" name="from" value={filters.from} onChange={handleChange} />
        </label>

        <label className="field">
          <span>To</span>
          <input type="date" name="to" value={filters.to} onChange={handleChange} />
        </label>

        <label className="field field--wide">
          <span>Search</span>
          <input
            type="search"
            name="search"
            placeholder="Category or description"
            value={filters.search}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="filters-actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() =>
            onChange({
              type: '',
              category: '',
              from: '',
              to: '',
              search: '',
            })
          }
        >
          Clear filters
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
    </section>
  )
}

export default FilterBar
