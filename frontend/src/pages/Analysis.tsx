import { useMemo } from 'react'
import { calculateCapitalGainsNetting, calculateFederalTax, normalizeFilingStatus } from '../tax-engine/federalTaxEngine'
import { usePortfolio, defaultAnalysisSettings, defaultTaxProfile } from '../context/PortfolioContext'
import type { FilingStatus } from '../tax-engine/types'

const filingStatusOptions: Array<{ value: FilingStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'marriedFilingJointly', label: 'Married Filing Jointly' },
  { value: 'marriedFilingSeparately', label: 'Married Filing Separately' },
  { value: 'headOfHousehold', label: 'Head of Household' },
  { value: 'qualifyingSurvivingSpouse', label: 'Qualifying Surviving Spouse' },
]

export default function Analysis() {
  const portfolioContext = usePortfolio()
  const analysisSettings = { ...defaultAnalysisSettings, ...(portfolioContext.analysisSettings ?? {}) }
  const taxProfile = { ...defaultTaxProfile, ...(portfolioContext.taxProfile ?? {}) }
  const portfolioCalculated = Array.isArray(portfolioContext.calculated) ? portfolioContext.calculated : []
  const portfolioSummary = portfolioContext.summary ?? {
    totalShortTermGainLoss: 0,
    totalLongTermGainLoss: 0,
    totalRealizedGainLoss: 0,
    totalSaleProceeds: 0,
  }
  const { setAnalysisSettings } = portfolioContext

  const {
    filingStatus,
    ordinaryIncome,
    shortTermCapitalGains,
    longTermCapitalGains,
    netInvestmentIncome,
    enableNIIT,
    usePortfolioData,
    useTaxProfileValues,
  } = analysisSettings

  const updateAnalysisSettings = (updates: Partial<typeof analysisSettings>) => {
    setAnalysisSettings({
      ...analysisSettings,
      ...updates,
    })
  }

  const sourceFilingStatus = useTaxProfileValues
    ? ((taxProfile.filingStatus as FilingStatus) || defaultAnalysisSettings.filingStatus)
    : filingStatus || defaultAnalysisSettings.filingStatus
  const normalizedFilingStatus = normalizeFilingStatus(sourceFilingStatus as string)
  const sourceOrdinaryIncome = useTaxProfileValues ? taxProfile.ordinaryIncome ?? 0 : ordinaryIncome ?? 0
  const sourceNetInvestmentIncome = useTaxProfileValues ? taxProfile.netInvestmentIncome ?? 0 : netInvestmentIncome ?? 0
  const sourceEnableNIIT = useTaxProfileValues ? taxProfile.enableNIIT ?? false : enableNIIT ?? false

  const portfolioShortTermGains = useMemo(
    () =>
      portfolioCalculated
        .filter((tx) => tx?.taxClassification === 'Short-Term' && tx?.gainLoss > 0)
        .reduce((sum, tx) => sum + (tx?.gainLoss ?? 0), 0),
    [portfolioCalculated],
  )

  const portfolioShortTermLosses = useMemo(
    () =>
      portfolioCalculated
        .filter((tx) => tx?.taxClassification === 'Short-Term' && tx?.gainLoss < 0)
        .reduce((sum, tx) => sum + Math.abs(tx?.gainLoss ?? 0), 0),
    [portfolioCalculated],
  )

  const portfolioLongTermGains = useMemo(
    () =>
      portfolioCalculated
        .filter((tx) => tx?.taxClassification === 'Long-Term' && tx?.gainLoss > 0)
        .reduce((sum, tx) => sum + (tx?.gainLoss ?? 0), 0),
    [portfolioCalculated],
  )

  const portfolioLongTermLosses = useMemo(
    () =>
      portfolioCalculated
        .filter((tx) => tx?.taxClassification === 'Long-Term' && tx?.gainLoss < 0)
        .reduce((sum, tx) => sum + Math.abs(tx?.gainLoss ?? 0), 0),
    [portfolioCalculated],
  )

  const portfolioNetting = useMemo(
    () =>
      calculateCapitalGainsNetting({
        shortTermGains: portfolioShortTermGains,
        shortTermLosses: portfolioShortTermLosses,
        longTermGains: portfolioLongTermGains,
        longTermLosses: portfolioLongTermLosses,
      }),
    [portfolioShortTermGains, portfolioShortTermLosses, portfolioLongTermGains, portfolioLongTermLosses],
  )

  const finalShortTermCapitalGains = usePortfolioData
    ? portfolioNetting.finalShortTermTaxableGain
    : shortTermCapitalGains
  const finalLongTermCapitalGains = usePortfolioData
    ? portfolioNetting.finalLongTermTaxableGain
    : longTermCapitalGains

  const calculationState = useMemo(() => {
    try {
      return {
        result: calculateFederalTax({
          filingStatus: normalizedFilingStatus,
          taxYear: 2025,
          ordinaryIncome: sourceOrdinaryIncome,
          shortTermCapitalGains: finalShortTermCapitalGains,
          longTermCapitalGains: finalLongTermCapitalGains,
          netInvestmentIncome: sourceNetInvestmentIncome,
          enableNIIT: sourceEnableNIIT,
        }),
        error: false,
      }
    } catch (error) {
      return {
        result: {
          filingStatus: normalizedFilingStatus,
          taxYear: 2025,
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
  }, [normalizedFilingStatus, sourceOrdinaryIncome, finalShortTermCapitalGains, finalLongTermCapitalGains, sourceNetInvestmentIncome, sourceEnableNIIT])

  const result = calculationState.result
  const resultError = calculationState.error

  return (
    <section>
      <h2>Analysis</h2>

      <div className="profile-source-toggle">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={useTaxProfileValues}
            onChange={(e) => updateAnalysisSettings({ useTaxProfileValues: e.target.checked })}
          />
          Use Tax Profile Values
        </label>
      </div>

      <div className="analysis-form">
        {resultError && (
          <div className="note note-error">
            Tax calculation fallback active: filings status normalized and values are rendered safely.
          </div>
        )}
        <label>
          Filing Status
          <select
            value={sourceFilingStatus}
            onChange={(e) => !useTaxProfileValues && updateAnalysisSettings({ filingStatus: e.target.value as FilingStatus })}
            disabled={useTaxProfileValues}
          >
            {filingStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ordinary Taxable Income
          <input
            type="number"
            value={sourceOrdinaryIncome}
            onChange={(e) => !useTaxProfileValues && updateAnalysisSettings({ ordinaryIncome: Number(e.target.value) })}
            min={0}
            disabled={useTaxProfileValues}
          />
        </label>

        <label>
          Net Investment Income
          <input
            type="number"
            value={sourceNetInvestmentIncome}
            onChange={(e) => !useTaxProfileValues && updateAnalysisSettings({ netInvestmentIncome: Number(e.target.value) })}
            min={0}
            disabled={useTaxProfileValues}
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={sourceEnableNIIT}
            onChange={(e) => !useTaxProfileValues && updateAnalysisSettings({ enableNIIT: e.target.checked })}
            disabled={useTaxProfileValues}
          />
          Enable NIIT
        </label>

        {useTaxProfileValues && (
          <div className="note">
            Values above are read from Tax Profile. Toggle off to edit manually.
          </div>
        )}
      </div>

      {usePortfolioData && (
        <>
          <div className="portfolio-summary">
            <h3>Portfolio Totals</h3>
            <div className="portfolio-totals">
              <div className="total-item">
                <span>Short-Term Gains:</span>
                <strong>${portfolioShortTermGains.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Short-Term Losses:</span>
                <strong>${portfolioShortTermLosses.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Long-Term Gains:</span>
                <strong>${portfolioLongTermGains.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Long-Term Losses:</span>
                <strong>${portfolioLongTermLosses.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Total Realized Gains/Losses:</span>
                <strong>${portfolioSummary.totalRealizedGainLoss.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="portfolio-summary">
            <h3>Capital Gains Netting</h3>
            <div className="portfolio-totals">
              <div className="total-item">
                <span>Net Short-Term:</span>
                <strong>${portfolioNetting.netShortTerm.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Net Long-Term:</span>
                <strong>${portfolioNetting.netLongTerm.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Final ST Taxable Gain:</span>
                <strong>${portfolioNetting.finalShortTermTaxableGain.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Final LT Taxable Gain:</span>
                <strong>${portfolioNetting.finalLongTermTaxableGain.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Total Net Capital Gain/Loss:</span>
                <strong>${portfolioNetting.totalNetCapitalGainOrLoss.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Ordinary Income Offset:</span>
                <strong>${portfolioNetting.ordinaryIncomeOffset.toFixed(2)}</strong>
              </div>
              <div className="total-item">
                <span>Capital Loss Carryforward:</span>
                <strong>${portfolioNetting.capitalLossCarryforward.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="portfolio-source-toggle">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={usePortfolioData}
            onChange={(e) => updateAnalysisSettings({ usePortfolioData: e.target.checked })}
          />
          Use Portfolio Totals
        </label>
      </div>

      <div className="analysis-form">
        <label>
          Short-Term Capital Gains
          <input
            type="number"
            value={finalShortTermCapitalGains}
            onChange={(e) => !usePortfolioData && updateAnalysisSettings({ shortTermCapitalGains: Number(e.target.value) })}
            disabled={usePortfolioData}
            min={0}
          />
        </label>

        <label>
          Long-Term Capital Gains
          <input
            type="number"
            value={finalLongTermCapitalGains}
            onChange={(e) => !usePortfolioData && updateAnalysisSettings({ longTermCapitalGains: Number(e.target.value) })}
            disabled={usePortfolioData}
            min={0}
          />
        </label>
      </div>

      <div className="result-grid">
        <div className="result-card">
          <h3>Ordinary Income Tax</h3>
          <div>${result.ordinaryTax.toFixed(2)}</div>
        </div>
        <div className="result-card">
          <h3>Short-Term Capital Gains Tax Impact</h3>
          <div>${finalShortTermCapitalGains.toFixed(2)}</div>
        </div>
        <div className="result-card">
          <h3>LTCG 0% Portion</h3>
          <div>${result.ltcgAllocation.zeroPercent.toFixed(2)}</div>
        </div>
        <div className="result-card">
          <h3>LTCG 15% Portion</h3>
          <div>${result.ltcgAllocation.fifteenPercent.toFixed(2)}</div>
        </div>
        <div className="result-card">
          <h3>LTCG 20% Portion</h3>
          <div>${result.ltcgAllocation.twentyPercent.toFixed(2)}</div>
        </div>
        <div className="result-card">
          <h3>Long-Term Capital Gains Tax</h3>
          <div>${result.ltcgTax.toFixed(2)}</div>
        </div>
        <div className="result-card">
          <h3>NIIT Tax</h3>
          <div>${result.niitAmount.toFixed(2)}</div>
        </div>
        <div className="result-card">
          <h3>Total Federal Tax</h3>
          <div>${result.totalFederalTax.toFixed(2)}</div>
        </div>
      </div>

      <div className="json-preview">
        <h3>Debug Output</h3>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </div>
    </section>
  )
}
