import { useState } from 'react'
import { validateGoal, validateGoalContribution } from '../validation.js'
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
  actionError = null,
  onClearActionError,
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState('')
  const [contributions, setContributions] = useState({})
  const [contributionErrors, setContributionErrors] = useState({})
  const [contributionTouched, setContributionTouched] = useState({})

  const panelError = serverError || actionError

  function runValidation(next) {
    const result = validateGoal(next)
    setErrors(result)
    return result
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    const validationErrors = runValidation({ name, target })
    if (Object.keys(validationErrors).length > 0) return
    setServerError('')
    onClearActionError?.()
    try {
      await onCreate({ name: name.trim(), target_amount: Number(target) })
      setName('')
      setTarget('')
      setErrors({})
      setTouched(false)
    } catch (err) {
      setServerError(err.message)
    }
  }

  async function handleContribute(id) {
    setContributionTouched((curr) => ({ ...curr, [id]: true }))
    const raw = contributions[id]
    const validationErrors = validateGoalContribution(raw)
    if (Object.keys(validationErrors).length > 0) {
      setContributionErrors((curr) => ({
        ...curr,
        [id]: validationErrors.amount,
      }))
      return
    }
    try {
      await onContribute(id, Number(raw))
      setContributions((curr) => ({ ...curr, [id]: '' }))
      setContributionErrors((curr) => ({ ...curr, [id]: undefined }))
      setContributionTouched((curr) => ({ ...curr, [id]: false }))
    } catch (err) {
      setContributionErrors((curr) => ({ ...curr, [id]: err.message }))
    }
  }

  return (
    <section className="panel" aria-label="Savings goals">
      <h2 className="section-title">Savings goals</h2>
      <p className="panel-hint">
        Set a target and track contributions toward each goal.
      </p>

      {panelError ? (
        <p className="form-error" role="alert">
          {panelError}
        </p>
      ) : null}

      <form className="goal-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (touched) runValidation({ name: e.target.value, target })
              if (serverError) setServerError('')
              onClearActionError?.()
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
              if (serverError) setServerError('')
              onClearActionError?.()
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
                  <label className="field goal-contribute-field">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="goal-contribute-input"
                      placeholder="Amount"
                      aria-label="Contribution amount"
                      value={contributions[goal.id] ?? ''}
                      aria-invalid={
                        contributionTouched[goal.id] &&
                        Boolean(contributionErrors[goal.id])
                      }
                      onChange={(e) => {
                        const value = e.target.value
                        setContributions((curr) => ({
                          ...curr,
                          [goal.id]: value,
                        }))
                        if (contributionTouched[goal.id]) {
                          const nextErrors = validateGoalContribution(value)
                          setContributionErrors((curr) => ({
                            ...curr,
                            [goal.id]: nextErrors.amount,
                          }))
                        }
                      }}
                    />
                    {contributionTouched[goal.id] && contributionErrors[goal.id] ? (
                      <span className="field-error">{contributionErrors[goal.id]}</span>
                    ) : null}
                  </label>
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
