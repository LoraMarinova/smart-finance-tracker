import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(dirname, '../backend')

// Dedicated throwaway database so E2E runs never touch the real finance.db.
const testDbPath = path.join(backendDir, 'e2e_finance.db')

// Separate ports from the normal dev servers (8000 / 5173) so Playwright never
// reuses a backend that is connected to the developer's real finance.db.
const E2E_BACKEND_PORT = 8001
const E2E_FRONTEND_PORT = 5174
const e2eBackendUrl = `http://127.0.0.1:${E2E_BACKEND_PORT}`

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
    baseURL: `http://127.0.0.1:${E2E_FRONTEND_PORT}`,
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
      command: `${venvPython} -m uvicorn main:app --port ${E2E_BACKEND_PORT}`,
      cwd: backendDir,
      url: `${e2eBackendUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { FINANCE_DB_PATH: testDbPath },
    },
    {
      command: `npm run dev -- --port ${E2E_FRONTEND_PORT} --strictPort`,
      url: `http://127.0.0.1:${E2E_FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PROXY_TARGET: e2eBackendUrl },
    },
  ],
})
