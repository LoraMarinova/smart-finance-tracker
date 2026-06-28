const BASE = '/api'

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {any} [details]
   */
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * @param {any} detail
 * @returns {string | null}
 */
function formatValidationDetail(detail) {
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : d.loc
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .join('; ')
  }
  if (typeof detail === 'string') return detail
  return null
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(url, options) {
  /** @type {Response} */
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new ApiError('Could not reach the server. Is the backend running?', 0, null)
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    if (!res.ok) {
      throw new ApiError(`Request failed (${res.status})`, res.status, text)
    }
    return text
  }

  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    // Supports the structured `{ error: { message, details } }` shape and the
    // legacy `{ detail }` shape for backward compatibility.
    let detail = body
    let message = null
    if (body && typeof body === 'object') {
      if (body.error && typeof body.error === 'object') {
        detail = body.error.details ?? null
        message =
          body.error.message || formatValidationDetail(detail)
      } else {
        detail = body.detail
        message = formatValidationDetail(detail)
      }
    }
    throw new ApiError(message || `Request failed (${res.status})`, res.status, detail)
  }

  return body
}

const jsonHeaders = { 'Content-Type': 'application/json' }

/**
 * @param {Record<string, any>} params
 * @returns {string}
 */
function buildQuery(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function getCategories() {
  return request(`${BASE}/categories`)
}

export function getTransactions(filters = {}) {
  return request(`${BASE}/transactions${buildQuery(filters)}`)
}

export function exportTransactions(filters = {}) {
  return request(`${BASE}/transactions/export${buildQuery(filters)}`)
}

export function getAnalytics(filters = {}) {
  return request(`${BASE}/analytics${buildQuery(filters)}`)
}

export function getDashboard() {
  return request(`${BASE}/dashboard`)
}

/** @param {Record<string, any>} data */
export function createTransaction(data) {
  return request(`${BASE}/transactions`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

/**
 * @param {number} id
 * @param {Record<string, any>} data
 */
export function updateTransaction(id, data) {
  return request(`${BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

/** @param {number} id */
export function deleteTransaction(id) {
  return request(`${BASE}/transactions/${id}`, { method: 'DELETE' })
}

export function getBudgets(filters = {}) {
  return request(`${BASE}/budgets${buildQuery(filters)}`)
}

/** @param {Record<string, any>} data */
export function setBudget(data) {
  return request(`${BASE}/budgets`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

/** @param {number} id */
export function deleteBudget(id) {
  return request(`${BASE}/budgets/${id}`, { method: 'DELETE' })
}

export function getRecurring() {
  return request(`${BASE}/recurring`)
}

/** @param {Record<string, any>} data */
export function createRecurring(data) {
  return request(`${BASE}/recurring`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

/** @param {number} id */
export function deleteRecurring(id) {
  return request(`${BASE}/recurring/${id}`, { method: 'DELETE' })
}

/** @param {number} id */
export function postRecurring(id) {
  return request(`${BASE}/recurring/${id}/post`, { method: 'POST' })
}

export function getGoals() {
  return request(`${BASE}/goals`)
}

/** @param {Record<string, any>} data */
export function createGoal(data) {
  return request(`${BASE}/goals`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

/** @param {number} id */
export function deleteGoal(id) {
  return request(`${BASE}/goals/${id}`, { method: 'DELETE' })
}

/**
 * @param {number} id
 * @param {number} amount
 */
export function contributeToGoal(id, amount) {
  return request(`${BASE}/goals/${id}/contribute`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ amount }),
  })
}

/**
 * @param {string} csvText
 * @param {string} [filename]
 */
export function downloadCsv(csvText, filename = 'transactions.csv') {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
