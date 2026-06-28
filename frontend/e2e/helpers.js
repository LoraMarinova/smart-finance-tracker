// Refuses to wipe data unless the backend confirms it is using the isolated
// E2E database (FINANCE_DB_PATH). This prevents accidental deletion of the
// developer's real finance.db if dev servers were running on the wrong port.
async function assertE2eDatabase(request) {
  const res = await request.get('/api/health')
  if (!res.ok()) {
    throw new Error(`Health check failed (${res.status()}). Is the E2E backend running?`)
  }
  const body = await res.json()
  if (body.database !== 'e2e') {
    throw new Error(
      'Refusing to modify data: E2E tests must run against the isolated ' +
        'e2e_finance.db, not your real finance.db. Stop your dev servers and ' +
        'run "npm run test:e2e" again (Playwright starts its own servers on ' +
        'ports 8001 and 5174).',
    )
  }
}

// Resets backend state through the API so each test starts from a clean slate.
export async function clearAll(request) {
  await assertE2eDatabase(request)

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
  await assertE2eDatabase(request)

  const res = await request.post('/api/transactions', { data })
  if (!res.ok()) {
    throw new Error(`Failed to seed transaction: ${res.status()}`)
  }
  return res.json()
}
