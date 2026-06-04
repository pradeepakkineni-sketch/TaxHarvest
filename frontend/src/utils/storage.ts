export const PORTFOLIO_STORAGE_KEY = 'portfolioTransactions'
export const TAX_PROFILE_STORAGE_KEY = 'taxProfile'
export const ANALYSIS_STORAGE_KEY = 'analysisInputs'
export const SCENARIOS_STORAGE_KEY = 'scenarios'

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
  const parsed = safeJsonParse<unknown>(raw, fallback)
  if (parsed === null) {
    return fallback
  }

  if (Array.isArray(fallback)) {
    return (Array.isArray(parsed) ? (parsed as T) : fallback) as T
  }

  if (typeof fallback === 'object' && fallback !== null) {
    return {
      ...fallback,
      ...(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}),
    } as T
  }

  return (parsed as T) ?? fallback
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

export function clearTaxHarvestStorage() {
  if (typeof window === 'undefined') {
    return
  }

  const keys = [
    PORTFOLIO_STORAGE_KEY,
    TAX_PROFILE_STORAGE_KEY,
    ANALYSIS_STORAGE_KEY,
    SCENARIOS_STORAGE_KEY,
  ]

  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore failures
    }
  })
}
