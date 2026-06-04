import { useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import type { FilingStatus } from '../tax-engine/types'
import { calculateCapitalGainsNetting, calculateFederalTax } from '../tax-engine/federalTaxEngine'
import { detectWashSales } from '../tax-engine/washSale'

const SHORT_TERM_RATE = 0.24
const LONG_TERM_RATE = 0.15

export default function Dashboard() {
  const portfolio = usePortfolio()
  const { calculated, summary, analysisSettings, taxProfile } = portfolio

  const washSaleResults = useMemo(() => detectWashSales(calculated), [calculated])
  const washSaleWarningsCount = washSaleResults.totalWarnings

  const harvestableBenefit = useMemo(() => {
    const washSaleLossIds = new Set(washSaleResults.warnings.map((warning) => warning.lossTransactionId))

    return calculated
      .filter((tx) => tx.gainLoss < 0)
      .reduce((total, tx) => {
        const loss = Math.abs(tx.gainLoss)
        const potentiallyDisallowedLoss = washSaleLossIds.has(tx.id) ? loss : 0
        const eligibleLoss = loss - potentiallyDisallowedLoss
        const estimatedBenefit = eligibleLoss * (tx.taxClassification === 'Short-Term' ? SHORT_TERM_RATE : LONG_TERM_RATE)
        return total + estimatedBenefit
      }, 0)
  }, [calculated, washSaleResults.warnings])

  const portfolioShortTermGains = useMemo(
    () => calculated.filter((tx) => tx.taxClassification === 'Short-Term' && tx.gainLoss > 0).reduce((sum, tx) => sum + tx.gainLoss, 0),
    [calculated],
  )

  const portfolioLongTermGains = useMemo(
    () => calculated.filter((tx) => tx.taxClassification === 'Long-Term' && tx.gainLoss > 0).reduce((sum, tx) => sum + tx.gainLoss, 0),
    [calculated],
  )

  const portfolioShortTermLosses = useMemo(
    () => calculated.filter((tx) => tx.taxClassification === 'Short-Term' && tx.gainLoss < 0).reduce((sum, tx) => sum + tx.gainLoss, 0),
    [calculated],
  )

  const portfolioLongTermLosses = useMemo(
    () => calculated.filter((tx) => tx.taxClassification === 'Long-Term' && tx.gainLoss < 0).reduce((sum, tx) => sum + tx.gainLoss, 0),
    [calculated],
  )

  const portfolioNetting = useMemo(
    () =>
      calculateCapitalGainsNetting({
        shortTermGains: portfolioShortTermGains,
        shortTermLosses: Math.abs(portfolioShortTermLosses),
        longTermGains: portfolioLongTermGains,
        longTermLosses: Math.abs(portfolioLongTermLosses),
      }),
    [portfolioShortTermGains, portfolioShortTermLosses, portfolioLongTermGains, portfolioLongTermLosses],
  )

  const finalShortTermCapitalGains = analysisSettings.usePortfolioData
    ? portfolioNetting.finalShortTermTaxableGain
    : analysisSettings.shortTermCapitalGains

  const finalLongTermCapitalGains = analysisSettings.usePortfolioData
    ? portfolioNetting.finalLongTermTaxableGain
    : analysisSettings.longTermCapitalGains

  const analysisResult = useMemo(
    () =>
      calculateFederalTax({
        filingStatus: analysisSettings.useTaxProfileValues
          ? (taxProfile.filingStatus as FilingStatus)
          : analysisSettings.filingStatus,
        taxYear: taxProfile.taxYear,
        ordinaryIncome: analysisSettings.useTaxProfileValues
          ? taxProfile.ordinaryIncome
          : analysisSettings.ordinaryIncome,
        shortTermCapitalGains: finalShortTermCapitalGains,
        longTermCapitalGains: finalLongTermCapitalGains,
        netInvestmentIncome: analysisSettings.useTaxProfileValues
          ? taxProfile.netInvestmentIncome
          : analysisSettings.netInvestmentIncome,
        enableNIIT: analysisSettings.useTaxProfileValues
          ? taxProfile.enableNIIT
          : analysisSettings.enableNIIT,
      }),
    [analysisSettings, taxProfile, finalShortTermCapitalGains, finalLongTermCapitalGains],
  )

  const hasTransactions = computedTransactionsExist(calculated)
  const taxProfileIncomplete = !taxProfile.filingStatus || !taxProfile.state

  return (
    <section>
      <h2>Dashboard</h2>

      <div className="cards">
        <div className="card">
          <h3>Total Sale Proceeds</h3>
          <div className="big">${summary.totalSaleProceeds.toFixed(2)}</div>
        </div>
        <div className="card">
          <h3>Total Realized Gains/Losses</h3>
          <div className="big">${summary.totalRealizedGainLoss.toFixed(2)}</div>
        </div>
        <div className="card">
          <h3>Total Short-Term Gains/Losses</h3>
          <div className="big">${summary.totalShortTermGainLoss.toFixed(2)}</div>
        </div>
        <div className="card">
          <h3>Total Long-Term Gains/Losses</h3>
          <div className="big">${summary.totalLongTermGainLoss.toFixed(2)}</div>
        </div>
        <div className="card">
          <h3>Estimated Federal Tax</h3>
          <div className="big">${analysisResult.totalFederalTax.toFixed(2)}</div>
        </div>
        <div className="card">
          <h3>Estimated Tax-Loss Harvesting Benefit</h3>
          <div className="big">${harvestableBenefit.toFixed(2)}</div>
        </div>
        <div className="card">
          <h3>Wash Sale Warning Count</h3>
          <div className="big">{washSaleWarningsCount}</div>
        </div>
        <div className="card">
          <h3>Capital Loss Carryforward</h3>
          <div className="big">${portfolioNetting.capitalLossCarryforward.toFixed(2)}</div>
        </div>
      </div>

      <div className="next-actions">
        <h3>Next Actions</h3>
        <ul>
          {!hasTransactions && <li>Add transactions or import Robinhood CSV</li>}
          {washSaleWarningsCount > 0 && <li>Review wash sale warnings</li>}
          {harvestableBenefit > 0 && <li>Review tax-loss harvesting opportunities</li>}
          {taxProfileIncomplete && <li>Complete tax profile</li>}
        </ul>
      </div>
    </section>
  )
}

function computedTransactionsExist(transactions: Array<{ id: string }>) {
  return transactions.length > 0
}
