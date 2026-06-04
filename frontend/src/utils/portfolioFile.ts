import { loadFromStorage, saveToStorage, PORTFOLIO_STORAGE_KEY, TAX_PROFILE_STORAGE_KEY, ANALYSIS_STORAGE_KEY } from './storage'

export interface PortfolioTransaction {
  id: string
  ticker: string
  shares: number
  buyDate: string
  sellDate: string
  buyPrice: number
  sellPrice: number
}

export interface TaxProfileExport {
  taxYear: number
  filingStatus: string
  state: string
  ordinaryIncome: number
  netInvestmentIncome: number
  enableNIIT: boolean
}

export interface AnalysisExport {
  filingStatus: string
  ordinaryIncome: number
  shortTermCapitalGains: number
  longTermCapitalGains: number
  netInvestmentIncome: number
  enableNIIT: boolean
  usePortfolioData: boolean
}

export interface PortfolioFileData {
  appVersion: string
  exportedAt: string
  portfolioTransactions: PortfolioTransaction[]
  taxProfile: TaxProfileExport
  analysisInputs?: AnalysisExport
}

const APP_VERSION = '0.0.0'

const defaultTaxProfile: TaxProfileExport = {
  taxYear: 2024,
  filingStatus: 'single',
  state: 'CA',
  ordinaryIncome: 0,
  netInvestmentIncome: 0,
  enableNIIT: false,
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isTaxProfileExport(value: unknown): value is TaxProfileExport {
  if (typeof value !== 'object' || value === null) return false
  const profile = value as Record<string, unknown>
  return (
    isNumber(profile.taxYear) &&
    isString(profile.filingStatus) &&
    isString(profile.state) &&
    isNumber(profile.ordinaryIncome) &&
    isNumber(profile.netInvestmentIncome) &&
    typeof profile.enableNIIT === 'boolean'
  )
}

function isAnalysisExport(value: unknown): value is AnalysisExport {
  if (typeof value !== 'object' || value === null) return false
  const analysis = value as Record<string, unknown>
  return (
    isString(analysis.filingStatus) &&
    isNumber(analysis.ordinaryIncome) &&
    isNumber(analysis.shortTermCapitalGains) &&
    isNumber(analysis.longTermCapitalGains) &&
    isNumber(analysis.netInvestmentIncome) &&
    typeof analysis.enableNIIT === 'boolean' &&
    typeof analysis.usePortfolioData === 'boolean'
  )
}

function isPortfolioTransaction(value: unknown): value is PortfolioTransaction {
  if (typeof value !== 'object' || value === null) return false
  const tx = value as Record<string, unknown>
  return (
    isString(tx.id) &&
    isString(tx.ticker) &&
    isNumber(tx.shares) &&
    isString(tx.buyDate) &&
    isString(tx.sellDate) &&
    isNumber(tx.buyPrice) &&
    isNumber(tx.sellPrice)
  )
}

export function buildPortfolioExportData(): PortfolioFileData {
  const portfolioTransactions = loadFromStorage<PortfolioTransaction[]>(PORTFOLIO_STORAGE_KEY, [])
  const taxProfile = loadFromStorage<TaxProfileExport>(TAX_PROFILE_STORAGE_KEY, defaultTaxProfile)
  const analysisInputs = loadFromStorage<AnalysisExport | null>(ANALYSIS_STORAGE_KEY, null)

  const exportData: PortfolioFileData = {
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    portfolioTransactions,
    taxProfile,
  }

  if (analysisInputs) {
    exportData.analysisInputs = analysisInputs
  }

  return exportData
}

export function validatePortfolioFileData(value: unknown): value is PortfolioFileData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  if (!isString(data.appVersion) || !isString(data.exportedAt)) return false
  if (!Array.isArray(data.portfolioTransactions)) return false
  if (!isTaxProfileExport(data.taxProfile)) return false
  if (data.analysisInputs !== undefined && data.analysisInputs !== null && !isAnalysisExport(data.analysisInputs)) {
    return false
  }
  return data.portfolioTransactions.every(isPortfolioTransaction)
}

export function restorePortfolioFileData(data: PortfolioFileData) {
  saveToStorage(PORTFOLIO_STORAGE_KEY, data.portfolioTransactions)
  saveToStorage(TAX_PROFILE_STORAGE_KEY, data.taxProfile)
  if (data.analysisInputs) {
    saveToStorage(ANALYSIS_STORAGE_KEY, data.analysisInputs)
  }
}
