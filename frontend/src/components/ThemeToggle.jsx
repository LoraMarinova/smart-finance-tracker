import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sft-theme'

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'light'
  } catch {
    return 'light'
  }
}

function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private browsing or disabled storage — theme still applies for this session.
  }
}

export function initTheme() {
  const stored = readStoredTheme()
  document.documentElement.dataset.theme = stored
  return stored
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.dataset.theme || 'light'
      : 'light',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    persistTheme(theme)
  }, [theme])

  const label = theme === 'dark' ? 'Light mode' : 'Dark mode'

  return (
    <button
      type="button"
      className="btn btn--ghost theme-toggle"
      onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {label}
    </button>
  )
}

export default ThemeToggle
