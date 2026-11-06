const STORAGE_KEY = 'atflows-theme'

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'

  const saved = localStorage.getItem(STORAGE_KEY)
  // Light is the default; dark only when the user chose it
  return saved === 'dark' ? 'dark' : 'light'
}

export const theme = $state<{ value: 'light' | 'dark' }>({ value: getInitialTheme() })

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'

  if (theme.value === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }

  localStorage.setItem(STORAGE_KEY, theme.value)
}

export function initTheme() {
  if (theme.value === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
}
