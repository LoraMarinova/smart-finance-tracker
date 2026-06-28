import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(dirname, '../backend')

// Dedicated throwaway database so E2E runs never touch the real finance.db.
const testDbPath = path.join(backendDir, 'e2e_finance.db')

const isWindows = process.platform === 'win32'
const venvPython = isWindows
  ? path.join('.venv', 'Scripts', 'python.exe')
  : path.join('.venv', 'bin', 'python')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `${venvPython} -m uvicorn main:app --port 8000`,
      cwd: backendDir,
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { FINANCE_DB_PATH: testDbPath },
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
