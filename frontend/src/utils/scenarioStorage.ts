import { loadFromStorage, saveToStorage } from './storage'
import type { Transaction } from '../context/PortfolioContext'

export interface TaxProfileSnapshot {
  taxYear: number
  filingStatus: string
  state: string
  ordinaryIncome: number
  netInvestmentIncome: number
  enableNIIT: boolean
}

export interface Scenario {
  id: string
  name: string
  transactions: Transaction[]
  taxProfile: TaxProfileSnapshot
  createdAt: string
}

const SCENARIOS_STORAGE_KEY = 'scenarios'

export function loadScenarios(): Scenario[] {
  return loadFromStorage<Scenario[]>(SCENARIOS_STORAGE_KEY, [])
}

export function saveScenarios(scenarios: Scenario[]): void {
  saveToStorage(SCENARIOS_STORAGE_KEY, scenarios)
}

export function createScenario(
  name: string,
  transactions: Transaction[],
  taxProfile: TaxProfileSnapshot,
): Scenario {
  return {
    id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    transactions: JSON.parse(JSON.stringify(transactions)),
    taxProfile: JSON.parse(JSON.stringify(taxProfile)),
    createdAt: new Date().toISOString(),
  }
}

export function duplicateScenario(scenario: Scenario, newName: string): Scenario {
  return {
    ...scenario,
    id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: newName,
    createdAt: new Date().toISOString(),
  }
}
