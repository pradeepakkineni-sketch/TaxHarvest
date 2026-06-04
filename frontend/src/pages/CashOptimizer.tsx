import { useState, useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'

const SHORT_TERM_TAX_RATE = 0.24
const LONG_TERM_TAX_RATE = 0.15

type OptimizationObjective = 'lowest-tax' | 'highest-after-tax' | 'prefer-long-term'

interface CashOptimizerLot {
  id: string
  ticker: string
  shares: number
  saleProceeds: number
  gain: number
  loss: number
  taxClassification: 'Short-Term' | 'Long-Term'
  estimatedTax: number
  afterTaxCash: number
  holdingDays: number
}

interface CashOptimizerRecommendation {
  recommended: CashOptimizerLot[]
  targetCash: number
  totalSaleProceeds: number
  totalEstimatedTax: number
  totalAfterTaxCash: number
  shortfall: number
}

export default function CashOptimizer() {
  const portfolio = usePortfolio()
  const { transactions } = portfolio

  const [targetCash, setTargetCash] = useState<number>(10000)
  const [objective, setObjective] = useState<OptimizationObjective>('highest-after-tax')

  const allLots = useMemo<CashOptimizerLot[]>(() => {
    return transactions.map((tx) => {
      const costBasis = tx.shares * tx.buyPrice
      const saleProceeds = tx.shares * tx.sellPrice
      const gainLoss = saleProceeds - costBasis

      const buyDateObj = new Date(tx.buyDate)
      const sellDateObj = new Date(tx.sellDate)
      const holdingDays = Math.floor(
        (sellDateObj.getTime() - buyDateObj.getTime()) / (1000 * 60 * 60 * 24),
      )

      const taxClassification = holdingDays > 365 ? 'Long-Term' : 'Short-Term'

      let estimatedTax = 0
      if (gainLoss > 0) {
        estimatedTax = gainLoss * (taxClassification === 'Short-Term' ? SHORT_TERM_TAX_RATE : LONG_TERM_TAX_RATE)
      }

      const afterTaxCash = saleProceeds - estimatedTax

      return {
        id: tx.id,
        ticker: tx.ticker,
        shares: tx.shares,
        saleProceeds,
        gain: gainLoss > 0 ? gainLoss : 0,
        loss: gainLoss < 0 ? Math.abs(gainLoss) : 0,
        taxClassification,
        estimatedTax,
        afterTaxCash,
        holdingDays,
      }
    })
  }, [transactions])

  const rankedLots = useMemo<CashOptimizerLot[]>(() => {
    const sorted = [...allLots]

    if (objective === 'lowest-tax') {
      sorted.sort((a, b) => a.estimatedTax - b.estimatedTax)
    } else if (objective === 'highest-after-tax') {
      sorted.sort((a, b) => b.afterTaxCash - a.afterTaxCash)
    } else if (objective === 'prefer-long-term') {
      sorted.sort((a, b) => {
        if (a.taxClassification !== b.taxClassification) {
          return a.taxClassification === 'Long-Term' ? -1 : 1
        }
        return b.afterTaxCash - a.afterTaxCash
      })
    }

    return sorted
  }, [allLots, objective])

  const recommendation = useMemo<CashOptimizerRecommendation>(() => {
    const recommended: CashOptimizerLot[] = []
    let accumulator = 0

    for (const lot of rankedLots) {
      recommended.push(lot)
      accumulator += lot.afterTaxCash

      if (accumulator >= targetCash) {
        break
      }
    }

    const totalSaleProceeds = recommended.reduce((sum, lot) => sum + lot.saleProceeds, 0)
    const totalEstimatedTax = recommended.reduce((sum, lot) => sum + lot.estimatedTax, 0)
    const totalAfterTaxCash = recommended.reduce((sum, lot) => sum + lot.afterTaxCash, 0)
    const shortfall = Math.max(0, targetCash - totalAfterTaxCash)

    return {
      recommended,
      targetCash,
      totalSaleProceeds,
      totalEstimatedTax,
      totalAfterTaxCash,
      shortfall,
    }
  }, [rankedLots, targetCash])

  const objectiveLabel = {
    'lowest-tax': 'Lowest Estimated Tax',
    'highest-after-tax': 'Highest After-Tax Cash',
    'prefer-long-term': 'Prefer Long-Term Lots First',
  }

  return (
    <section>
      <h2>Cash Optimizer</h2>
      <p>
        <em>
          Planning tool to identify which lots to sell to meet a cash target. All tax estimates are
          for planning purposes only.
        </em>
      </p>

      <div className="optimizer-form" style={{ marginBottom: '2rem' }}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="target-cash">Target Cash Amount ($)</label>
            <input
              id="target-cash"
              type="number"
              value={targetCash}
              onChange={(e) => setTargetCash(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0"
              step="100"
            />
          </div>
          <div className="form-group">
            <label htmlFor="objective">Optimization Objective</label>
            <select
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value as OptimizationObjective)}
            >
              <option value="highest-after-tax">Highest After-Tax Cash</option>
              <option value="lowest-tax">Lowest Estimated Tax</option>
              <option value="prefer-long-term">Prefer Long-Term Lots First</option>
            </select>
          </div>
        </div>
      </div>

      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-label">Target Cash</div>
          <div className="card-value">${recommendation.targetCash.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="card-label">Recommended Gross Proceeds</div>
          <div className="card-value">${recommendation.totalSaleProceeds.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="card-label">Estimated Tax</div>
          <div className="card-value">${recommendation.totalEstimatedTax.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="card-label">Estimated After-Tax Cash</div>
          <div className="card-value">${recommendation.totalAfterTaxCash.toFixed(2)}</div>
        </div>
        <div className={`card ${recommendation.shortfall > 0 ? 'warning' : 'success'}`}>
          <div className="card-label">{recommendation.shortfall > 0 ? 'Shortfall' : 'Excess'}</div>
          <div className="card-value">
            ${Math.abs(recommendation.totalAfterTaxCash - recommendation.targetCash).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="table-card">
        <h3>Recommended Lots (sorted by: {objectiveLabel[objective]})</h3>
        {recommendation.recommended.length === 0 ? (
          <div className="empty-state">
            <p>No transactions available to meet target.</p>
          </div>
        ) : (
          <table className="cash-optimizer">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Sale Proceeds</th>
                <th>Gain/Loss</th>
                <th>Tax Classification</th>
                <th>Estimated Tax</th>
                <th>After-Tax Cash</th>
              </tr>
            </thead>
            <tbody>
              {recommendation.recommended.map((lot) => (
                <tr key={lot.id}>
                  <td>
                    <strong>{lot.ticker}</strong>
                  </td>
                  <td>{lot.shares}</td>
                  <td>${lot.saleProceeds.toFixed(2)}</td>
                  <td>
                    <span className={lot.gain > 0 ? 'gain' : lot.loss > 0 ? 'loss' : ''}>
                      {lot.gain > 0 ? `+$${lot.gain.toFixed(2)}` : lot.loss > 0 ? `-$${lot.loss.toFixed(2)}` : '$0.00'}
                    </span>
                  </td>
                  <td>{lot.taxClassification}</td>
                  <td>${lot.estimatedTax.toFixed(2)}</td>
                  <td>
                    <strong>${lot.afterTaxCash.toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p>
          <strong>How to use this:</strong> Enter your target cash amount and select an optimization
          objective. The tool recommends which lots to sell to meet your target. Short-term gains are
          estimated at 24% tax, long-term gains at 15% tax, and losses are treated as tax-efficient
          with no estimated tax. Estimates are for planning purposes and assume the indicated tax
          rates.
        </p>
      </div>
    </section>
  )
}
