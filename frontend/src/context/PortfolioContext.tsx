import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { FilingStatus } from '../tax-engine/types'
import { loadFromStorage, saveToStorage, PORTFOLIO_STORAGE_KEY, TAX_PROFILE_STORAGE_KEY, ANALYSIS_STORAGE_KEY } from '../utils/storage'

export interface Transaction {
  id: string
  ticker: string
  shares: number
  buyDate: string
  sellDate: string
  buyPrice: number
  sellPrice: number
}

interface CalculatedTransaction extends Transaction {
  costBasis: number
  saleProceeds: number
  gainLoss: number
  holdingDays: number
  taxClassification: 'Short-Term' | 'Long-Term'
}

interface PortfolioSummary {
  totalShortTermGainLoss: number
  totalLongTermGainLoss: number
  totalRealizedGainLoss: number
  totalSaleProceeds: number
}

export interface TaxProfile {
  taxYear: number
  filingStatus: string
  state: string
  ordinaryIncome: number
  netInvestmentIncome: number
  enableNIIT: boolean
}

export interface AnalysisSettings {
  filingStatus: FilingStatus
  ordinaryIncome: number
  shortTermCapitalGains: number
  longTermCapitalGains: number
  netInvestmentIncome: number
  enableNIIT: boolean
  usePortfolioData: boolean
}

interface PortfolioContextType {
  transactions: Transaction[]
  calculated: CalculatedTransaction[]
  summary: PortfolioSummary
  taxProfile: TaxProfile
  setTaxProfile: (profile: TaxProfile) => void
  analysisSettings: AnalysisSettings
  setAnalysisSettings: (settings: AnalysisSettings) => void
  setTransactions: (transactions: Transaction[]) => void
  addTransaction: () => void
  removeTransaction: (id: string) => void
  updateTransaction: (id: string, field: keyof Transaction, value: string | number) => void
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

function calculateTransaction(tx: Transaction): Omit<CalculatedTransaction, keyof Transaction> {
  const costBasis = tx.shares * tx.buyPrice
  const saleProceeds = tx.shares * tx.sellPrice
  const gainLoss = saleProceeds - costBasis

  const buyDateObj = new Date(tx.buyDate)
  const sellDateObj = new Date(tx.sellDate)
  const holdingDays = Math.floor((sellDateObj.getTime() - buyDateObj.getTime()) / (1000 * 60 * 60 * 24))
  const taxClassification = holdingDays > 365 ? 'Long-Term' : 'Short-Term'

  return { costBasis, saleProceeds, gainLoss, holdingDays, taxClassification }
}

const defaultTaxProfile: TaxProfile = {
  taxYear: 2024,
  filingStatus: 'single',
  state: 'CA',
  ordinaryIncome: 0,
  netInvestmentIncome: 0,
  enableNIIT: false,
}

const defaultAnalysisSettings: AnalysisSettings = {
  filingStatus: 'single',
  ordinaryIncome: 0,
  shortTermCapitalGains: 0,
  longTermCapitalGains: 0,
  netInvestmentIncome: 0,
  enableNIIT: false,
  usePortfolioData: false,
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage<Transaction[]>(PORTFOLIO_STORAGE_KEY, [
      {
        id: '1',
        ticker: '',
        shares: 0,
        buyDate: '',
        sellDate: '',
        buyPrice: 0,
        sellPrice: 0,
      },
    ]),
  )

  const [taxProfile, setTaxProfile] = useState<TaxProfile>(() =>
    loadFromStorage<TaxProfile>(TAX_PROFILE_STORAGE_KEY, defaultTaxProfile),
  )

  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(() =>
    loadFromStorage<AnalysisSettings>(ANALYSIS_STORAGE_KEY, defaultAnalysisSettings),
  )

  useEffect(() => {
    saveToStorage(PORTFOLIO_STORAGE_KEY, transactions)
  }, [transactions])

  useEffect(() => {
    saveToStorage(TAX_PROFILE_STORAGE_KEY, taxProfile)
  }, [taxProfile])

  useEffect(() => {
    saveToStorage(ANALYSIS_STORAGE_KEY, analysisSettings)
  }, [analysisSettings])

  const calculated = useMemo(
    () =>
      transactions.map((tx) => ({
        ...tx,
        ...calculateTransaction(tx),
      })),
    [transactions],
  )

  const summary = useMemo(
    () =>
      calculated.reduce(
        (acc, tx) => {
          if (tx.taxClassification === 'Short-Term') {
            acc.totalShortTermGainLoss += tx.gainLoss
          } else {
            acc.totalLongTermGainLoss += tx.gainLoss
          }
          acc.totalRealizedGainLoss += tx.gainLoss
          acc.totalSaleProceeds += tx.saleProceeds
          return acc
        },
        {
          totalShortTermGainLoss: 0,
          totalLongTermGainLoss: 0,
          totalRealizedGainLoss: 0,
          totalSaleProceeds: 0,
        },
      ),
    [calculated],
  )

  const addTransaction = useCallback(() => {
    const newId = Math.random().toString(36).slice(2, 9)
    setTransactions((prev) => [
      ...prev,
      {
        id: newId,
        ticker: '',
        shares: 0,
        buyDate: '',
        sellDate: '',
        buyPrice: 0,
        sellPrice: 0,
      },
    ])
  }, [])

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
  }, [])

  const updateTransaction = useCallback((id: string, field: keyof Transaction, value: string | number) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, [field]: value } : tx)),
    )
  }, [])

  return (
    <PortfolioContext.Provider
      value={{
        transactions,
        calculated,
        summary,
        taxProfile,
        setTaxProfile,
        analysisSettings,
        setAnalysisSettings,
        setTransactions,
        addTransaction,
        removeTransaction,
        updateTransaction,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolio must be used within PortfolioProvider')
  }
  return context
}
