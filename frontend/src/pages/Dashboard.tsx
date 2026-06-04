import { useMemo } from 'react'
import { usePortfolio, defaultAnalysisSettings, defaultTaxProfile } from '../context/PortfolioContext'
import type { FilingStatus } from '../tax-engine/types'
import { calculateCapitalGainsNetting, calculateFederalTax, normalizeFilingStatus } from '../tax-engine/federalTaxEngine'
import { detectWashSales } from '../tax-engine/washSale'

const SHORT_TERM_RATE = 0.24
const LONG_TERM_RATE = 0.15

export default function Dashboard() {
  const portfolio = usePortfolio()
  const { calculated: rawCalculated, summary: rawSummary, analysisSettings: rawAnalysisSettings, taxProfile: rawTaxProfile } = portfolio

  const calculated = Array.isArray(rawCalculated) ? rawCalculated : []
  const summary = rawSummary ?? {
    totalShortTermGainLoss: 0,
    totalLongTermGainLoss: 0,
    totalRealizedGainLoss: 0,
    totalSaleProceeds: 0,
  }
  const analysisSettings = { ...defaultAnalysisSettings, ...(rawAnalysisSettings ?? {}) }
  const taxProfile = { ...defaultTaxProfile, ...(rawTaxProfile ?? {}) }

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

  const sourceFilingStatus = analysisSettings.useTaxProfileValues
    ? ((taxProfile.filingStatus as FilingStatus) || defaultAnalysisSettings.filingStatus)
    : analysisSettings.filingStatus || defaultAnalysisSettings.filingStatus

  const sourceOrdinaryIncome = analysisSettings.useTaxProfileValues
    ? taxProfile.ordinaryIncome
    : analysisSettings.ordinaryIncome

  const sourceNetInvestmentIncome = analysisSettings.useTaxProfileValues
    ? taxProfile.netInvestmentIncome
    : analysisSettings.netInvestmentIncome

  const sourceEnableNIIT = analysisSettings.useTaxProfileValues
    ? taxProfile.enableNIIT
    : analysisSettings.enableNIIT

  const normalizedFilingStatus = normalizeFilingStatus(sourceFilingStatus as string)

  const analysisState = useMemo(() => {
    try {
      return {
        result: calculateFederalTax({
          filingStatus: normalizedFilingStatus,
          taxYear: taxProfile.taxYear || 2025,
          ordinaryIncome: sourceOrdinaryIncome ?? 0,
          shortTermCapitalGains: finalShortTermCapitalGains ?? 0,
          longTermCapitalGains: finalLongTermCapitalGains ?? 0,
          netInvestmentIncome: sourceNetInvestmentIncome ?? 0,
          enableNIIT: sourceEnableNIIT ?? false,
        }),
        error: false,
      }
    } catch (error) {
      return {
        result: {
          filingStatus: normalizedFilingStatus,
          taxYear: taxProfile.taxYear || 2025,
          taxableOrdinaryIncome: 0,
          ordinaryTax: 0,
          ltcgAllocation: { zeroPercent: 0, fifteenPercent: 0, twentyPercent: 0 },
          ltcgTax: 0,
          totalFederalTax: 0,
          niitAmount: 0,
          niitThreshold: 0,
          detailed: { ordinaryTaxBrackets: [], ltcgBreakdown: [] },
        },
        error: true,
      }
    }
  }, [normalizedFilingStatus, taxProfile.taxYear, sourceOrdinaryIncome, finalShortTermCapitalGains, finalLongTermCapitalGains, sourceNetInvestmentIncome, sourceEnableNIIT])

  const analysisResult = analysisState.result
  const analysisError = analysisState.error

  const hasTransactions = computedTransactionsExist(calculated)
  const taxProfileIncomplete = !taxProfile.filingStatus || !taxProfile.state

  return (
    <section>
      <h2>Dashboard</h2>

      <div className="cards">
        {analysisError && (
          <div className="card card-error">
            <h3>Tax calculation unavailable</h3>
            <div className="big">Using safe fallback values</div>
          </div>
        )}
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
