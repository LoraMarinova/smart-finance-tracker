import { expect, test } from '@playwright/test'
import { clearAll, createTransaction } from './helpers.js'

test.beforeEach(async ({ request }) => {
  await clearAll(request)
})

test('balance summary reflects seeded income and expenses', async ({
  page,
  request,
}) => {
  await createTransaction(request, { type: 'income', amount: 500, category: 'Salary' })
  await createTransaction(request, {
    type: 'expense',
    amount: 125,
    category: 'Groceries',
  })

  await page.goto('/')

  const summary = page.getByLabel('Balance summary')
  await expect(summary.getByText('Net Balance')).toBeVisible()
  await expect(summary.getByText('Income')).toBeVisible()
  await expect(summary.getByText('Expense')).toBeVisible()
  await expect(summary).toContainText('500')
  await expect(summary).toContainText('125')
})

test('editing a transaction updates the list', async ({ page, request }) => {
  await createTransaction(request, {
    type: 'expense',
    amount: 20,
    category: 'Dining Out',
    description: 'Original note',
  })

  await page.goto('/')
  const list = page.locator('.list-section')
  await expect(list.getByText('Original note')).toBeVisible()

  await list.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Edit Transaction' })).toBeVisible()

  const form = page.locator('form.form')
  await form.locator('input[name="description"]').fill('Updated note')
  await form.getByRole('button', { name: 'Save Changes' }).click()

  await expect(page.getByText('Transaction updated.')).toBeVisible()
  await expect(list.getByText('Updated note')).toBeVisible()
  await expect(list.getByText('Original note')).toHaveCount(0)
})

test('search filter narrows visible transactions', async ({ page, request }) => {
  await createTransaction(request, {
    type: 'expense',
    amount: 12,
    category: 'Transport',
    description: 'Bus ticket',
  })
  await createTransaction(request, {
    type: 'expense',
    amount: 8,
    category: 'Groceries',
    description: 'Snacks',
  })

  await page.goto('/')
  const list = page.locator('.list-section')
  await expect(list.getByText('Bus ticket')).toBeVisible()
  await expect(list.getByText('Snacks')).toBeVisible()

  await page.locator('section.filters input[name="search"]').fill('bus')
  await expect(list.getByText('Bus ticket')).toBeVisible()
  await expect(list.getByText('Snacks')).toHaveCount(0)
})

test('export CSV shows a success toast', async ({ page, request }) => {
  await createTransaction(request, { type: 'income', amount: 75, category: 'Salary' })

  await page.goto('/')
  await page
    .locator('section.filters')
    .getByRole('button', { name: 'Export CSV' })
    .click()
  await expect(page.getByText('CSV exported.')).toBeVisible()
})

test('pagination moves to the next page when there are many transactions', async ({
  page,
  request,
}) => {
  for (let i = 0; i < 11; i += 1) {
    await createTransaction(request, {
      type: 'expense',
      amount: i + 1,
      category: 'Groceries',
      description: `Item ${i}`,
    })
  }

  await page.goto('/')
  const list = page.locator('.list-section')
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await expect(list.getByText('11 transactions')).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
})

test('analytics charts appear when expense data exists', async ({ page, request }) => {
  await createTransaction(request, {
    type: 'expense',
    amount: 30,
    category: 'Groceries',
    date: '2026-01-15T00:00:00',
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  await expect(page.getByText('Spending by category')).toBeVisible()
  await expect(page.getByText('Monthly income vs expense')).toBeVisible()
})

test('budget form shows validation errors for missing fields', async ({ page }) => {
  await page.goto('/')

  const budgets = page.getByLabel('Budgets')
  await budgets.getByRole('button', { name: 'Set budget' }).click()

  await expect(budgets.getByText('Category is required.')).toBeVisible()
  await expect(budgets.getByText('Enter a limit.')).toBeVisible()
  await expect(page.getByText('No budgets set yet.')).toBeVisible()
})

test('budget save API error appears in the budget panel', async ({ page }) => {
  await page.route('**/api/budgets', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'internal_error', message: 'Could not save budget.' },
        }),
      })
      return
    }
    await route.continue()
  })

  await page.goto('/')

  const budgets = page.getByLabel('Budgets')
  await budgets.locator('select[name="category"]').selectOption('Groceries')
  await budgets.locator('input[name="amount"]').fill('100')
  await budgets.getByRole('button', { name: 'Set budget' }).click()

  await expect(budgets.getByText('Could not save budget.')).toBeVisible()
  await expect(page.locator('.error-state')).toHaveCount(0)
})

test('setting a budget shows progress for that category', async ({ page, request }) => {
  await createTransaction(request, {
    type: 'expense',
    amount: 40,
    category: 'Groceries',
  })

  await page.goto('/')
  const budgets = page.getByLabel('Budgets')
  await budgets.locator('select').first().selectOption('Groceries')
  await budgets.locator('input[type="number"]').fill('200')
  await budgets.getByRole('button', { name: 'Set budget' }).click()

  await expect(page.getByText('Budget saved.')).toBeVisible()
  await expect(budgets.locator('.budget-list .category-chip')).toHaveText('Groceries')
  await expect(budgets).toContainText('40')
  await expect(budgets).toContainText('200')
})

test('dashboard cards summarise the current month', async ({ page, request }) => {
  const now = new Date()
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15T00:00:00`
  await createTransaction(request, {
    type: 'income',
    amount: 1000,
    category: 'Salary',
    date: iso,
  })
  await createTransaction(request, {
    type: 'expense',
    amount: 200,
    category: 'Groceries',
    date: iso,
  })

  await page.goto('/')
  const dashboard = page.getByLabel('Dashboard')
  await expect(dashboard.getByText('This month net')).toBeVisible()
  await expect(dashboard.getByText('Spent this month')).toBeVisible()
  await expect(dashboard.getByText('Top category')).toBeVisible()
  await expect(dashboard).toContainText('Groceries')
})

test('date range preset narrows the list to this month', async ({ page, request }) => {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10T00:00:00`
  await createTransaction(request, {
    type: 'expense',
    amount: 25,
    category: 'Groceries',
    description: 'Recent buy',
    date: thisMonth,
  })
  await createTransaction(request, {
    type: 'expense',
    amount: 99,
    category: 'Rent',
    description: 'Old rent',
    date: '2020-01-15T00:00:00',
  })

  await page.goto('/')
  const list = page.locator('.list-section')
  await expect(list.getByText('Recent buy')).toBeVisible()
  await expect(list.getByText('Old rent')).toBeVisible()

  await page
    .getByRole('group', { name: 'Date range presets' })
    .getByRole('button', { name: 'This month' })
    .click()

  await expect(list.getByText('Recent buy')).toBeVisible()
  await expect(list.getByText('Old rent')).toHaveCount(0)
})

test('savings goal can be created and contributed to', async ({ page }) => {
  await page.goto('/')

  const goals = page.getByLabel('Savings goals')
  const form = goals.locator('form.goal-form')
  await form.locator('input[type="text"]').fill('Vacation')
  await form.locator('input[type="number"]').fill('1000')
  await form.getByRole('button', { name: 'Add goal' }).click()

  await expect(page.getByText('Goal added.')).toBeVisible()
  await expect(goals.locator('.goal-list strong')).toHaveText('Vacation')

  const item = goals.locator('.goal-item')
  await item.locator('.goal-contribute-input').fill('250')
  await item.getByRole('button', { name: 'Contribute' }).click()

  await expect(page.getByText('Contribution added.')).toBeVisible()
  await expect(item).toContainText('250')
})

test('side panels show friendly empty states when there is no data', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByText('No budgets set yet.')).toBeVisible()
  await expect(page.getByText('No recurring templates yet.')).toBeVisible()
  await expect(page.getByText('No savings goals yet.')).toBeVisible()
})

test('goal contribution shows validation error for negative amount', async ({
  page,
}) => {
  await page.goto('/')

  const goals = page.getByLabel('Savings goals')
  const form = goals.locator('form.goal-form')
  await form.locator('input[type="text"]').fill('Vacation')
  await form.locator('input[type="number"]').fill('1000')
  await form.getByRole('button', { name: 'Add goal' }).click()

  await expect(page.getByText('Goal added.')).toBeVisible()

  const item = goals.locator('.goal-item')
  await item.locator('.goal-contribute-input').fill('-50')
  await item.getByRole('button', { name: 'Contribute' }).click()

  await expect(item.getByText('Amount must be greater than 0.')).toBeVisible()
  await expect(page.getByText('Contribution added.')).toHaveCount(0)
})

test('goal form shows validation errors for missing fields', async ({ page }) => {
  await page.goto('/')

  const goals = page.getByLabel('Savings goals')
  // Submit with both fields empty.
  await goals.getByRole('button', { name: 'Add goal' }).click()

  await expect(goals.getByText('Name is required.')).toBeVisible()
  await expect(goals.getByText('Enter a target amount.')).toBeVisible()
  await expect(goals.getByText('No savings goals yet.')).toBeVisible()
})

test('recurring form shows validation error when category is missing', async ({
  page,
}) => {
  await page.goto('/')

  const recurring = page.getByLabel('Recurring transactions')
  const form = recurring.locator('form.recurring-form')
  await form.locator('input[name="amount"]').fill('500')
  await form.locator('input[name="next_date"]').fill('2026-12-01')
  await form.getByRole('button', { name: 'Add recurring' }).click()

  await expect(recurring.getByText('Category is required.')).toBeVisible()
  await expect(page.getByText('Recurring template added.')).toHaveCount(0)
  await expect(page.getByText('No recurring templates yet.')).toBeVisible()
})

test('a due recurring template auto-posts on creation', async ({ page }) => {
  await page.goto('/')

  const recurring = page.getByLabel('Recurring transactions')
  const form = recurring.locator('form.recurring-form')
  await form.locator('select[name="type"]').selectOption('expense')
  await form.locator('input[name="amount"]').fill('15')
  await form.locator('select[name="category"]').selectOption('Subscriptions')
  // Recent past date (5 days ago): posts exactly once on create, immediately,
  // without clicking "Post now".
  const due = new Date()
  due.setDate(due.getDate() - 5)
  const dueIso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`
  await form.locator('input[name="next_date"]').fill(dueIso)
  await form.getByRole('button', { name: 'Add recurring' }).click()

  await expect(page.getByText('Recurring template added.')).toBeVisible()
  const list = page.locator('.list-section')
  await expect(list.getByText('Subscriptions')).toBeVisible()
})

test('recurring template can be posted into the transaction list', async ({ page }) => {
  await page.goto('/')

  const recurring = page.getByLabel('Recurring transactions')
  const form = recurring.locator('form.recurring-form')
  await form.locator('select[name="type"]').selectOption('expense')
  await form.locator('input[name="amount"]').fill('99')
  await form.locator('select[name="category"]').selectOption('Rent')
  // Future date so it is not auto-posted on create; this tests manual "Post now".
  await form.locator('input[name="next_date"]').fill('2099-06-01')
  await form.getByRole('button', { name: 'Add recurring' }).click()

  await expect(page.getByText('Recurring template added.')).toBeVisible()
  await expect(recurring.locator('.recurring-list strong')).toHaveText('Rent')

  await recurring.getByRole('button', { name: 'Post now' }).click()
  await expect(page.getByText('Recurring transaction posted.')).toBeVisible()

  const list = page.locator('.list-section')
  await expect(list.getByText('Rent')).toBeVisible()
})
