import { expect, test } from '@playwright/test'
import { clearAll, createTransaction } from './helpers.js'

test.beforeEach(async ({ request }) => {
  await clearAll(request)
})

test('balance summary reflects seeded income and expenses', async ({ page, request }) => {
  await createTransaction(request, { type: 'income', amount: 500, category: 'Salary' })
  await createTransaction(request, { type: 'expense', amount: 125, category: 'Groceries' })

  await page.goto('/')

  const summary = page.getByLabel('Balance summary')
  await expect(summary.getByText('Total Income')).toBeVisible()
  await expect(summary.getByText('Total Expense')).toBeVisible()
  await expect(summary.getByText('Net Balance')).toBeVisible()
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
  await page.locator('section.filters').getByRole('button', { name: 'Export CSV' }).click()
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
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await expect(page.getByText('11 transactions')).toBeVisible()

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

test('setting a budget shows progress for that category', async ({ page, request }) => {
  await createTransaction(request, { type: 'expense', amount: 40, category: 'Groceries' })

  await page.goto('/')
  const budgets = page.getByLabel('Budgets')
  await budgets.locator('select').first().selectOption('Groceries')
  await budgets.locator('input[type="number"]').fill('200')
  await budgets.getByRole('button', { name: 'Set budget' }).click()

  await expect(page.getByText('Budget saved.')).toBeVisible()
  await expect(budgets.locator('.budget-list strong')).toHaveText('Groceries')
  await expect(budgets).toContainText('40')
  await expect(budgets).toContainText('200')
})

test('recurring template can be posted into the transaction list', async ({ page }) => {
  await page.goto('/')

  const recurring = page.getByLabel('Recurring transactions')
  const form = recurring.locator('form.recurring-form')
  await form.locator('select[name="type"]').selectOption('expense')
  await form.locator('input[name="amount"]').fill('99')
  await form.locator('select[name="category"]').selectOption('Rent')
  await form.locator('input[name="next_date"]').fill('2026-06-01')
  await form.getByRole('button', { name: 'Add recurring' }).click()

  await expect(page.getByText('Recurring template added.')).toBeVisible()
  await expect(recurring.locator('.recurring-list strong')).toHaveText('Rent')

  await recurring.getByRole('button', { name: 'Post now' }).click()
  await expect(page.getByText('Recurring transaction posted.')).toBeVisible()

  const list = page.locator('.list-section')
  await expect(list.getByText('Rent')).toBeVisible()
})
