import { useState } from 'react'
import { validateGoal } from '../validation.js'
import { ListSkeleton } from './Skeleton.jsx'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

function GoalPanel({
  goals,
  onCreate,
  onContribute,
  onDelete,
  busyId,
  busy,
  loading = false,
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [contributions, setContributions] = useState({})

  function runValidation(next) {
    const result = validateGoal(next)
    setErrors(result)
    return result
  }

  function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    const validationErrors = runValidation({ name, target })
    if (Object.keys(validationErrors).length > 0) return
    onCreate({ name: name.trim(), target_amount: Number(target) })
    setName('')
    setTarget('')
    setErrors({})
    setTouched(false)
  }

  function handleContribute(id) {
    const amount = Number(contributions[id])
    if (!amount || amount <= 0) return
    onContribute(id, amount)
    setContributions((curr) => ({ ...curr, [id]: '' }))
  }

  return (
    <section className="panel" aria-label="Savings goals">
      <h2 className="section-title">Savings goals</h2>
      <p className="panel-hint">
        Set a target and track contributions toward each goal.
      </p>

      <form className="goal-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (touched) runValidation({ name: e.target.value, target })
            }}
            placeholder="Emergency fund"
            aria-invalid={touched && Boolean(errors.name)}
          />
          {touched && errors.name ? (
            <span className="field-error">{errors.name}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Target</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value)
              if (touched) runValidation({ name, target: e.target.value })
            }}
            placeholder="0.00"
            aria-invalid={touched && Boolean(errors.target)}
          />
          {touched && errors.target ? (
            <span className="field-error">{errors.target}</span>
          ) : null}
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Add goal
        </button>
      </form>

      {loading ? (
        <ListSkeleton />
      ) : goals.length === 0 ? (
        <p className="empty-hint">No savings goals yet.</p>
      ) : (
        <ul className="goal-list">
          {goals.map((goal) => {
            const pct = Math.min(Math.round(goal.progress_pct), 100)
            const reached = Number(goal.remaining) <= 0
            return (
              <li key={goal.id} className="goal-item">
                <div className="goal-item-header">
                  <strong>{goal.name}</strong>
                  <span className={reached ? 'amount positive' : 'amount'}>
                    {currency.format(Number(goal.current_amount))} /{' '}
                    {currency.format(Number(goal.target_amount))}
                  </span>
                </div>
                <div className="budget-bar">
                  <div
                    className={`budget-bar-fill${reached ? ' goal-bar-fill--done' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="goal-actions">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="goal-contribute-input"
                    placeholder="Amount"
                    value={contributions[goal.id] ?? ''}
                    onChange={(e) =>
                      setContributions((curr) => ({
                        ...curr,
                        [goal.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn--small btn--primary"
                    onClick={() => handleContribute(goal.id)}
                    disabled={busyId === goal.id}
                  >
                    Contribute
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => onDelete(goal.id)}
                    disabled={busyId === goal.id}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default GoalPanel
