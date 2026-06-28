// Resets backend state through the API so each test starts from a clean slate.
// Requests go through the Vite dev server, which proxies /api to the backend.
export async function clearAll(request) {
  const txRes = await request.get('/api/transactions?page=1&page_size=100')
  const txBody = await txRes.json()
  for (const tx of txBody.transactions ?? []) {
    await request.delete(`/api/transactions/${tx.id}`)
  }

  const budgets = await (await request.get('/api/budgets')).json()
  for (const budget of budgets ?? []) {
    await request.delete(`/api/budgets/${budget.id}`)
  }

  const recurring = await (await request.get('/api/recurring')).json()
  for (const item of recurring ?? []) {
    await request.delete(`/api/recurring/${item.id}`)
  }
}

export async function createTransaction(request, data) {
  const res = await request.post('/api/transactions', { data })
  if (!res.ok()) {
    throw new Error(`Failed to seed transaction: ${res.status()}`)
  }
  return res.json()
}
