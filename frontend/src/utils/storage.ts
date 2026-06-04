export const PORTFOLIO_STORAGE_KEY = 'portfolioTransactions'
export const TAX_PROFILE_STORAGE_KEY = 'taxProfile'
export const ANALYSIS_STORAGE_KEY = 'analysisInputs'

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (value === null) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  const raw = window.localStorage.getItem(key)
  return safeJsonParse(raw, fallback)
}

export function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures
  }
}
