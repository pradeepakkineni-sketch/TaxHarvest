import { useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { detectWashSales } from '../tax-engine/washSale'

const SHORT_TERM_RATE = 0.24
const LONG_TERM_RATE = 0.15

export default function TaxLossHarvesting() {
  const portfolio = usePortfolio()

  const washSaleResults = useMemo(() => detectWashSales(portfolio.calculated), [portfolio.calculated])

  const harvestableLots = useMemo(() => {
    const washSaleLossIds = new Set(washSaleResults.warnings.map((warning) => warning.lossTransactionId))

    return portfolio.calculated
      .filter((tx) => tx.gainLoss < 0)
      .map((tx) => {
        const loss = Math.abs(tx.gainLoss)
        const potentiallyDisallowedLoss = washSaleLossIds.has(tx.id) ? loss : 0
        const eligibleLoss = loss - potentiallyDisallowedLoss
        const estimatedBenefit =
          eligibleLoss > 0
            ? eligibleLoss * (tx.taxClassification === 'Short-Term' ? SHORT_TERM_RATE : LONG_TERM_RATE)
            : 0

        return {
          ...tx,
          loss,
          potentiallyDisallowedLoss,
          eligibleLoss,
          estimatedBenefit,
          isWashSale: potentiallyDisallowedLoss > 0,
        }
      })
  }, [portfolio.calculated, washSaleResults.warnings])

  const summary = useMemo(() => {
    let totalGrossHarvestable = 0
    let totalPotentiallyDisallowed = 0
    let totalEligibleHarvestable = 0
    let totalBenefit = 0

    harvestableLots.forEach((lot) => {
      totalGrossHarvestable += lot.loss
      totalPotentiallyDisallowed += lot.potentiallyDisallowedLoss
      totalEligibleHarvestable += lot.eligibleLoss
      totalBenefit += lot.estimatedBenefit
    })

    return {
      totalGrossHarvestable,
      totalPotentiallyDisallowed,
      totalEligibleHarvestable,
      totalBenefit,
    }
  }, [harvestableLots])

  return (
    <section>
      <h2>Tax-Loss Harvesting</h2>

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Gross Harvestable Losses</h3>
          <div className="amount">${summary.totalGrossHarvestable.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Potentially Disallowed Wash Sale Losses</h3>
          <div className="amount">${summary.totalPotentiallyDisallowed.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Eligible Harvestable Losses</h3>
          <div className="amount">${summary.totalEligibleHarvestable.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Estimated Federal Tax Benefit</h3>
          <div className="amount">${summary.totalBenefit.toFixed(2)}</div>
        </div>
      </div>

      <div className="portfolio-summary">
        <h3>Wash Sale Warnings</h3>
        {washSaleResults.totalWarnings === 0 ? (
          <div className="empty-state">
            <p>No potential wash sales detected.</p>
          </div>
        ) : (
          <table className="wash-sale-warnings">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Loss Amount</th>
                <th>Sale Date</th>
                <th>Replacement Purchase Date</th>
                <th>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {washSaleResults.warnings.map((warning) => (
                <tr key={`${warning.lossTransactionId}-${warning.replacementTransactionId}`}>
                  <td>{warning.ticker}</td>
                  <td>${warning.lossAmount.toFixed(2)}</td>
                  <td>{warning.saleDate}</td>
                  <td>{warning.replacementPurchaseDate}</td>
                  <td>{warning.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {harvestableLots.length === 0 ? (
        <div className="empty-state">
          <p>No harvestable losses found. Great job!</p>
        </div>
      ) : (
        <div className="table-card">
          <p className="note">
            Estimated tax benefit calculated at 24% for short-term losses and 15% for long-term losses.
            <br />
            Wash sale losses are treated as potentially disallowed for planning purposes. This version does not yet adjust replacement-lot cost basis.
          </p>
          <table className="harvestable-lots">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Buy Date</th>
                <th>Sell Date</th>
                <th>Tax Classification</th>
                <th>Gross Loss</th>
                <th>Potentially Disallowed Loss</th>
                <th>Eligible Loss</th>
                <th>Estimated Tax Benefit</th>
              </tr>
            </thead>
            <tbody>
              {harvestableLots.map((lot) => (
                <tr key={lot.id}>
                  <td className="ticker">{lot.ticker || '—'}</td>
                  <td className="shares">{lot.shares.toFixed(2)}</td>
                  <td className="date">{lot.buyDate || '—'}</td>
                  <td className="date">{lot.sellDate || '—'}</td>
                  <td className="classification">
                    <span className={`badge ${lot.taxClassification.toLowerCase()}`}>
                      {lot.taxClassification}
                    </span>
                  </td>
                  <td className="loss">-${lot.loss.toFixed(2)}</td>
                  <td className="loss">-${lot.potentiallyDisallowedLoss.toFixed(2)}</td>
                  <td className="loss">-${lot.eligibleLoss.toFixed(2)}</td>
                  <td className="benefit">${lot.estimatedBenefit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
