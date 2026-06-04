import { useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { detectWashSales } from '../tax-engine/washSale'

const SHORT_TERM_RATE = 0.24
const LONG_TERM_RATE = 0.15

export default function TaxLossHarvesting() {
  const portfolio = usePortfolio()

  const harvestableLots = useMemo(() => {
    return portfolio.calculated
      .filter((tx) => tx.gainLoss < 0)
      .map((tx) => {
        const loss = Math.abs(tx.gainLoss)
        const estimatedBenefit =
          tx.taxClassification === 'Short-Term'
            ? loss * SHORT_TERM_RATE
            : loss * LONG_TERM_RATE
        return {
          ...tx,
          loss,
          estimatedBenefit,
        }
      })
  }, [portfolio.calculated])

  const washSaleResults = useMemo(() => detectWashSales(portfolio.calculated), [portfolio.calculated])

  const summary = useMemo(() => {
    let totalHarvestable = 0
    let stHarvestable = 0
    let ltHarvestable = 0
    let totalBenefit = 0

    harvestableLots.forEach((lot) => {
      totalHarvestable += lot.loss
      totalBenefit += lot.estimatedBenefit
      if (lot.taxClassification === 'Short-Term') {
        stHarvestable += lot.loss
      } else {
        ltHarvestable += lot.loss
      }
    })

    return {
      totalHarvestable,
      stHarvestable,
      ltHarvestable,
      totalBenefit,
    }
  }, [harvestableLots])

  return (
    <section>
      <h2>Tax-Loss Harvesting</h2>

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Harvestable Losses</h3>
          <div className="amount">${summary.totalHarvestable.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Short-Term Harvestable Losses</h3>
          <div className="amount">${summary.stHarvestable.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Long-Term Harvestable Losses</h3>
          <div className="amount">${summary.ltHarvestable.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Estimated Federal Tax Benefit</h3>
          <div className="amount">${summary.totalBenefit.toFixed(2)}</div>
        </div>
      </div>

      {washSaleResults.totalWarnings > 0 && (
        <div className="portfolio-summary">
          <h3>Wash Sale Warnings</h3>
          <div className="portfolio-totals">
            {washSaleResults.warnings.map((warning) => (
              <div key={`${warning.lossTransactionId}-${warning.replacementTransactionId}`} className="total-item wash-sale-warning-item">
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {washSaleResults.totalWarnings === 0 && (
        <div className="empty-state">
          <p>No potential wash sales detected.</p>
        </div>
      )}

      {harvestableLots.length === 0 ? (
        <div className="empty-state">
          <p>No harvestable losses found. Great job!</p>
        </div>
      ) : (
        <div className="table-card">
          <p className="note">
            Estimated tax benefit calculated at 24% for short-term losses and 15% for long-term losses.
            <br />
            Does not include wash sale detection or state tax.
          </p>
          <table className="harvestable-lots">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Buy Date</th>
                <th>Sell Date</th>
                <th>Loss</th>
                <th>Tax Classification</th>
                <th>Estimated Tax Benefit (24%/15%)</th>
              </tr>
            </thead>
            <tbody>
              {harvestableLots.map((lot) => (
                <tr key={lot.id}>
                  <td className="ticker">{lot.ticker || '—'}</td>
                  <td className="shares">{lot.shares.toFixed(2)}</td>
                  <td className="date">{lot.buyDate || '—'}</td>
                  <td className="date">{lot.sellDate || '—'}</td>
                  <td className="loss">-${lot.loss.toFixed(2)}</td>
                  <td className="classification">
                    <span className={`badge ${lot.taxClassification.toLowerCase()}`}>
                      {lot.taxClassification}
                    </span>
                  </td>
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
