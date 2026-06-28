import { expect, test } from '@playwright/test'
import { clearAll, createTransaction } from './helpers.js'

test.beforeEach(async ({ request }) => {
  await clearAll(request)
})

test('shows the app shell and empty state with no transactions', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Smart Finance Tracker' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Filter & Search' })).toBeVisible()
  await expect(page.getByText('No transactions match your filters.')).toBeVisible()
})

test('adding an expense shows it in the list with a toast', async ({ page }) => {
  await page.goto('/')

  const form = page.locator('form.form')
  await form.locator('select[name="type"]').selectOption('expense')
  await form.locator('input[name="amount"]').fill('42.50')
  await form.locator('select[name="category"]').selectOption('Groceries')
  await form.locator('input[name="description"]').fill('E2E lunch')
  await form.getByRole('button', { name: 'Add Transaction' }).click()

  await expect(page.getByText('Transaction added.')).toBeVisible()

  const list = page.locator('.list-section')
  await expect(list.getByText('E2E lunch')).toBeVisible()
  await expect(list.getByText('Groceries')).toBeVisible()
})

test('client-side validation blocks an empty amount', async ({ page }) => {
  await page.goto('/')

  const form = page.locator('form.form')
  await form.locator('select[name="type"]').selectOption('expense')
  await form.locator('select[name="category"]').selectOption('Groceries')
  await form.getByRole('button', { name: 'Add Transaction' }).click()

  await expect(form.locator('.field-error', { hasText: 'Enter an amount.' })).toBeVisible()
  await expect(page.getByText('No transactions match your filters.')).toBeVisible()
})

test('filtering by type narrows the list', async ({ page, request }) => {
  await createTransaction(request, { type: 'income', amount: 1000, category: 'Salary' })
  await createTransaction(request, {
    type: 'expense',
    amount: 50,
    category: 'Groceries',
  })

  await page.goto('/')
  const list = page.locator('.list-section')
  await expect(list.getByText('Salary')).toBeVisible()
  await expect(list.getByText('Groceries')).toBeVisible()

  const filters = page.locator('section.filters')
  await filters.locator('select[name="type"]').selectOption('income')

  await expect(list.getByText('Salary')).toBeVisible()
  await expect(list.getByText('Groceries')).toHaveCount(0)
})

test('deleting a transaction requires confirmation then removes it', async ({
  page,
  request,
}) => {
  await createTransaction(request, {
    type: 'expense',
    amount: 9.99,
    category: 'Transport',
    description: 'E2E ride',
  })

  await page.goto('/')
  const list = page.locator('.list-section')
  await expect(list.getByText('E2E ride')).toBeVisible()

  await list.getByRole('button', { name: 'Delete' }).click()

  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Transaction deleted.')).toBeVisible()
  await expect(page.getByText('No transactions match your filters.')).toBeVisible()
})

test('dark mode toggle switches the theme', async ({ page }) => {
  await page.goto('/')

  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
})
