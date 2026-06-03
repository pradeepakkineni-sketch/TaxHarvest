import { useMemo, useState } from 'react'
import { calculateFederalTax } from '../tax-engine/federalTaxEngine'
import { usePortfolio } from '../context/PortfolioContext'
import type { FilingStatus } from '../tax-engine/types'

const filingStatusOptions: Array<{ value: FilingStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'marriedFilingJointly', label: 'Married Filing Jointly' },
  { value: 'marriedFilingSeparately', label: 'Married Filing Separately' },
  { value: 'headOfHousehold', label: 'Head of Household' },
  { value: 'qualifyingSurvivingSpouse', label: 'Qualifying Surviving Spouse' },
]

export default function Analysis() {
  const portfolio = usePortfolio()
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single')
  const [ordinaryIncome, setOrdinaryIncome] = useState(0)
  const [shortTermCapitalGains, setShortTermCapitalGains] = useState(0)
  const [longTermCapitalGains, setLongTermCapitalGains] = useState(0)
  const [netInvestmentIncome, setNetInvestmentIncome] = useState(0)
  const [enableNIIT, setEnableNIIT] = useState(false)
  const [usePortfolioData, setUsePortfolioData] = useState(false)

  const finalShortTermCapitalGains = usePortfolioData ? portfolio.summary.totalShortTermGainLoss : shortTermCapitalGains
  const finalLongTermCapitalGains = usePortfolioData ? portfolio.summary.totalLongTermGainLoss : longTermCapitalGains

  const result = useMemo(
    () =>
      calculateFederalTax({
        filingStatus,
        taxYear: 2025,
        ordinaryIncome,
        shortTermCapitalGains: finalShortTermCapitalGains,
        longTermCapitalGains: finalLongTermCapitalGains,
        netInvestmentIncome,
        enableNIIT,
      }),
    [filingStatus, ordinaryIncome, finalShortTermCapitalGains, finalLongTermCapitalGains, netInvestmentIncome, enableNIIT],
  )

  return (
    <section>
      <h2>Analysis</h2>

      <div className="portfolio-source-toggle">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={usePortfolioData}
            onChange={(e) => setUsePortfolioData(e.target.checked)}
          />
          Use Portfolio Totals
        </label>
      </div>

      {usePortfolioData && (
        <div className="portfolio-summary">
          <h3>Portfolio Totals</h3>
          <div className="portfolio-totals">
            <div className="total-item">
              <span>Short-Term Gains/Losses:</span>
              <strong>${portfolio.summary.totalShortTermGainLoss.toFixed(2)}</strong>
            </div>
            <div className="total-item">
              <span>Long-Term Gains/Losses:</span>
              <strong>${portfolio.summary.totalLongTermGainLoss.toFixed(2)}</strong>
            </div>
            <div className="total-item">
              <span>Total Realized Gains/Losses:</span>
              <strong>${portfolio.summary.totalRealizedGainLoss.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="analysis-form">
        <label>
          Filing Status
          <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}>
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
            value={ordinaryIncome}
            onChange={(e) => setOrdinaryIncome(Number(e.target.value))}
            min={0}
          />
        </label>

        <label>
          Short-Term Capital Gains
          <input
            type="number"
            value={finalShortTermCapitalGains}
            onChange={(e) => !usePortfolioData && setShortTermCapitalGains(Number(e.target.value))}
            disabled={usePortfolioData}
            min={0}
          />
        </label>

        <label>
          Long-Term Capital Gains
          <input
            type="number"
            value={finalLongTermCapitalGains}
            onChange={(e) => !usePortfolioData && setLongTermCapitalGains(Number(e.target.value))}
            disabled={usePortfolioData}
            min={0}
          />
        </label>

        <label>
          Net Investment Income
          <input
            type="number"
            value={netInvestmentIncome}
            onChange={(e) => setNetInvestmentIncome(Number(e.target.value))}
            min={0}
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={enableNIIT}
            onChange={(e) => setEnableNIIT(e.target.checked)}
          />
          Enable NIIT
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
