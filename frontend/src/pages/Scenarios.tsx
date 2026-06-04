import { useState, useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { loadScenarios, saveScenarios, createScenario, duplicateScenario, type Scenario, type TaxProfileSnapshot } from '../utils/scenarioStorage'
import { calculateCapitalGainsNetting, calculateFederalTax } from '../tax-engine/federalTaxEngine'
import { detectWashSales } from '../tax-engine/washSale'
import type { FilingStatus } from '../tax-engine/types'

const SHORT_TERM_RATE = 0.24
const LONG_TERM_RATE = 0.15

interface ScenarioCalculation {
  scenario: Scenario
  totalSaleProceeds: number
  totalRealizedGainLoss: number
  shortTermGainLoss: number
  longTermGainLoss: number
  estimatedFederalTax: number
  harvestingBenefit: number
  washSaleWarningCount: number
  capitalLossCarryforward: number
}

function calculateScenarioMetrics(scenario: Scenario): ScenarioCalculation {
  const transactions = scenario.transactions.map((tx) => {
    const costBasis = tx.shares * tx.buyPrice
    const saleProceeds = tx.shares * tx.sellPrice
    const gainLoss = saleProceeds - costBasis
    const buyDateObj = new Date(tx.buyDate)
    const sellDateObj = new Date(tx.sellDate)
    const holdingDays = Math.floor((sellDateObj.getTime() - buyDateObj.getTime()) / (1000 * 60 * 60 * 24))
    const taxClassification = holdingDays > 365 ? 'Long-Term' : 'Short-Term'
    return { ...tx, costBasis, saleProceeds, gainLoss, holdingDays, taxClassification }
  })

  const shortTermGains = transactions
    .filter((tx) => tx.taxClassification === 'Short-Term' && tx.gainLoss > 0)
    .reduce((sum, tx) => sum + tx.gainLoss, 0)
  const shortTermLosses = Math.abs(
    transactions
      .filter((tx) => tx.taxClassification === 'Short-Term' && tx.gainLoss < 0)
      .reduce((sum, tx) => sum + tx.gainLoss, 0),
  )
  const longTermGains = transactions
    .filter((tx) => tx.taxClassification === 'Long-Term' && tx.gainLoss > 0)
    .reduce((sum, tx) => sum + tx.gainLoss, 0)
  const longTermLosses = Math.abs(
    transactions
      .filter((tx) => tx.taxClassification === 'Long-Term' && tx.gainLoss < 0)
      .reduce((sum, tx) => sum + tx.gainLoss, 0),
  )

  const netting = calculateCapitalGainsNetting({
    shortTermGains,
    shortTermLosses,
    longTermGains,
    longTermLosses,
  })

  const washSaleResults = detectWashSales(transactions)
  const washSaleLossIds = new Set(washSaleResults.warnings.map((w) => w.lossTransactionId))

  const harvestingBenefit = transactions
    .filter((tx) => tx.gainLoss < 0)
    .reduce((total, tx) => {
      const loss = Math.abs(tx.gainLoss)
      const disallowed = washSaleLossIds.has(tx.id) ? loss : 0
      const eligible = loss - disallowed
      return total + eligible * (tx.taxClassification === 'Short-Term' ? SHORT_TERM_RATE : LONG_TERM_RATE)
    }, 0)

  const taxResult = calculateFederalTax({
    filingStatus: scenario.taxProfile.filingStatus as FilingStatus,
    taxYear: scenario.taxProfile.taxYear,
    ordinaryIncome: scenario.taxProfile.ordinaryIncome,
    shortTermCapitalGains: netting.finalShortTermTaxableGain,
    longTermCapitalGains: netting.finalLongTermTaxableGain,
    netInvestmentIncome: scenario.taxProfile.netInvestmentIncome,
    enableNIIT: scenario.taxProfile.enableNIIT,
  })

  const totalSaleProceeds = transactions.reduce((sum, tx) => sum + tx.saleProceeds, 0)
  const totalRealizedGainLoss = transactions.reduce((sum, tx) => sum + tx.gainLoss, 0)

  return {
    scenario,
    totalSaleProceeds,
    totalRealizedGainLoss,
    shortTermGainLoss: netting.netShortTerm,
    longTermGainLoss: netting.netLongTerm,
    estimatedFederalTax: taxResult.totalFederalTax,
    harvestingBenefit,
    washSaleWarningCount: washSaleResults.totalWarnings,
    capitalLossCarryforward: netting.capitalLossCarryforward,
  }
}

export default function Scenarios() {
  const portfolio = usePortfolio()
  const { transactions, taxProfile } = portfolio

  const [scenarios, setScenarios] = useState<Scenario[]>(loadScenarios())
  const [newScenarioName, setNewScenarioName] = useState<string>('')
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null)
  const [duplicateName, setDuplicateName] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null)

  const calculations = useMemo(() => scenarios.map(calculateScenarioMetrics), [scenarios])

  const handleCreateScenario = () => {
    if (!newScenarioName.trim()) {
      setStatusType('error')
      setStatusMessage('Scenario name is required.')
      return
    }

    const taxProfileSnapshot: TaxProfileSnapshot = {
      taxYear: taxProfile.taxYear,
      filingStatus: taxProfile.filingStatus,
      state: taxProfile.state,
      ordinaryIncome: taxProfile.ordinaryIncome,
      netInvestmentIncome: taxProfile.netInvestmentIncome,
      enableNIIT: taxProfile.enableNIIT,
    }

    const newScenario = createScenario(newScenarioName, transactions, taxProfileSnapshot)
    const updated = [...scenarios, newScenario]
    setScenarios(updated)
    saveScenarios(updated)
    setNewScenarioName('')
    setStatusType('success')
    setStatusMessage(`Scenario "${newScenarioName}" created successfully.`)
  }

  const handleDuplicateScenario = (sourceId: string) => {
    if (!duplicateName.trim()) {
      setStatusType('error')
      setStatusMessage('Duplicate name is required.')
      return
    }

    const sourceScenario = scenarios.find((s) => s.id === sourceId)
    if (!sourceScenario) {
      setStatusType('error')
      setStatusMessage('Source scenario not found.')
      return
    }

    const newScenario = duplicateScenario(sourceScenario, duplicateName)
    const updated = [...scenarios, newScenario]
    setScenarios(updated)
    saveScenarios(updated)
    setDuplicateSourceId(null)
    setDuplicateName('')
    setStatusType('success')
    setStatusMessage(`Scenario duplicated as "${duplicateName}".`)
  }

  const handleDeleteScenario = (id: string) => {
    const updated = scenarios.filter((s) => s.id !== id)
    setScenarios(updated)
    saveScenarios(updated)
    setStatusType('success')
    setStatusMessage('Scenario deleted.')
  }

  return (
    <section>
      <h2>Scenarios</h2>

      <div className="scenario-form">
        <h3>Create New Scenario</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder="Scenario name"
            value={newScenarioName}
            onChange={(e) => setNewScenarioName(e.target.value)}
          />
          <button onClick={handleCreateScenario} className="btn-primary">
            Create from Current Portfolio
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`status-message ${statusType}`}>{statusMessage}</div>
      )}

      {scenarios.length === 0 ? (
        <div className="empty-state">
          <p>No scenarios created yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="scenarios-comparison">
            <thead>
              <tr>
                <th>Scenario Name</th>
                <th>Total Sale Proceeds</th>
                <th>Total Realized Gains/Losses</th>
                <th>Short-Term Gains/Losses</th>
                <th>Long-Term Gains/Losses</th>
                <th>Estimated Federal Tax</th>
                <th>Harvesting Benefit</th>
                <th>Wash Sale Warnings</th>
                <th>Capital Loss Carryforward</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {calculations.map((calc) => (
                <tr key={calc.scenario.id}>
                  <td>{calc.scenario.name}</td>
                  <td>${calc.totalSaleProceeds.toFixed(2)}</td>
                  <td>${calc.totalRealizedGainLoss.toFixed(2)}</td>
                  <td>${calc.shortTermGainLoss.toFixed(2)}</td>
                  <td>${calc.longTermGainLoss.toFixed(2)}</td>
                  <td>${calc.estimatedFederalTax.toFixed(2)}</td>
                  <td>${calc.harvestingBenefit.toFixed(2)}</td>
                  <td>{calc.washSaleWarningCount}</td>
                  <td>${calc.capitalLossCarryforward.toFixed(2)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => setDuplicateSourceId(calc.scenario.id)}
                        className="btn-small"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(calc.scenario.id)}
                        className="btn-small btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {duplicateSourceId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Duplicate Scenario</h3>
            <input
              type="text"
              placeholder="New scenario name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
            />
            <div className="modal-actions">
              <button
                onClick={() => handleDuplicateScenario(duplicateSourceId)}
                className="btn-primary"
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  setDuplicateSourceId(null)
                  setDuplicateName('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
