const BASE = '/api/transactions'

// Raised when the backend returns a non-2xx response. `details` holds parsed
// validation info (e.g. FastAPI 422 `detail`) so the UI can surface it clearly.
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

  let body = null
  const text = await res.text()
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

export function getTransactions() {
  return request(BASE)
}

export function createTransaction(data) {
  return request(BASE, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

export function updateTransaction(id, data) {
  return request(`${BASE}/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
}

export function deleteTransaction(id) {
  return request(`${BASE}/${id}`, { method: 'DELETE' })
}
