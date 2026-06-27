import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sft-theme'

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY) || 'light'
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
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <button
      type="button"
      className="btn btn--ghost theme-toggle"
      onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

export default ThemeToggle
