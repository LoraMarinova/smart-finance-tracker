const BASE = '/api'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

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

async function request(url, options) {
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
    const detail = body && typeof body === 'object' ? body.detail : body
    const message =
      formatValidationDetail(detail) || `Request failed (${res.status})`
    throw new ApiError(message, res.status, detail)
  }

  return body
}

const jsonHeaders = { 'Content-Type': 'application/json' }

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

export function createTransaction(data) {
  return request(`${BASE}/transactions`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

export function updateTransaction(id, data) {
  return request(`${BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

export function deleteTransaction(id) {
  return request(`${BASE}/transactions/${id}`, { method: 'DELETE' })
}

export function getBudgets(filters = {}) {
  return request(`${BASE}/budgets${buildQuery(filters)}`)
}

export function setBudget(data) {
  return request(`${BASE}/budgets`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

export function deleteBudget(id) {
  return request(`${BASE}/budgets/${id}`, { method: 'DELETE' })
}

export function getRecurring() {
  return request(`${BASE}/recurring`)
}

export function createRecurring(data) {
  return request(`${BASE}/recurring`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

export function deleteRecurring(id) {
  return request(`${BASE}/recurring/${id}`, { method: 'DELETE' })
}

export function postRecurring(id) {
  return request(`${BASE}/recurring/${id}/post`, { method: 'POST' })
}

export function downloadCsv(csvText, filename = 'transactions.csv') {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
