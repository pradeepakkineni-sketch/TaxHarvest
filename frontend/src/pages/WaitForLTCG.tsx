import { useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'

const SHORT_TERM_MARGINAL_RATE = 0.24
const LONG_TERM_CAPITAL_GAINS_RATE = 0.15

interface LTCGCandidate {
  id: string
  ticker: string
  shares: number
  buyDate: string
  sellDate: string
  gain: number
  holdingDays: number
  daysRemainingUntilLT: number
  estimatedShortTermTax: number
  estimatedLongTermTax: number
  estimatedTaxSavings: number
}

export default function WaitForLTCG() {
  const portfolio = usePortfolio()
  const { transactions } = portfolio

  const candidates = useMemo<LTCGCandidate[]>(() => {
    return transactions
      .map((tx) => {
        const costBasis = tx.shares * tx.buyPrice
        const saleProceeds = tx.shares * tx.sellPrice
        const gain = saleProceeds - costBasis

        const buyDateObj = new Date(tx.buyDate)
        const sellDateObj = new Date(tx.sellDate)
        const holdingDays = Math.floor(
          (sellDateObj.getTime() - buyDateObj.getTime()) / (1000 * 60 * 60 * 24),
        )

        const isShortTerm = holdingDays <= 365
        const hasGain = gain > 0

        if (!isShortTerm || !hasGain) {
          return null
        }

        const daysRemainingUntilLT = Math.max(0, 366 - holdingDays)
        const estimatedShortTermTax = gain * SHORT_TERM_MARGINAL_RATE
        const estimatedLongTermTax = gain * LONG_TERM_CAPITAL_GAINS_RATE
        const estimatedTaxSavings = estimatedShortTermTax - estimatedLongTermTax

        return {
          id: tx.id,
          ticker: tx.ticker,
          shares: tx.shares,
          buyDate: tx.buyDate,
          sellDate: tx.sellDate,
          gain,
          holdingDays,
          daysRemainingUntilLT,
          estimatedShortTermTax,
          estimatedLongTermTax,
          estimatedTaxSavings,
        }
      })
      .filter((item): item is LTCGCandidate => item !== null)
      .sort((a, b) => b.estimatedTaxSavings - a.estimatedTaxSavings)
  }, [transactions])

  const totalPotentialSavings = useMemo(
    () => candidates.reduce((sum, c) => sum + c.estimatedTaxSavings, 0),
    [candidates],
  )

  return (
    <section>
      <h2>Wait Until LTCG</h2>
      <p>
        <em>
          Planning tool showing short-term capital gains and potential tax savings from waiting
          until long-term status. All tax estimates are for planning purposes only.
        </em>
      </p>

      {candidates.length === 0 ? (
        <div className="empty-state">
          <p>No short-term gains waiting for long-term status. Great job!</p>
        </div>
      ) : (
        <>
          <div className="summary-cards" style={{ marginBottom: '2rem' }}>
            <div className="card">
              <div className="card-label">Short-Term Gains Waiting</div>
              <div className="card-value">{candidates.length}</div>
            </div>
            <div className="card">
              <div className="card-label">Total Estimated Tax Savings</div>
              <div className="card-value">${totalPotentialSavings.toFixed(2)}</div>
            </div>
            <div className="card">
              <div className="card-label">Avg. Days to Wait</div>
              <div className="card-value">
                {Math.round(
                  candidates.reduce((sum, c) => sum + c.daysRemainingUntilLT, 0) /
                    candidates.length,
                )}
              </div>
            </div>
          </div>

          <div className="table-card">
            <table className="ltcg-analyzer">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Buy Date</th>
                  <th>Sell Date</th>
                  <th>Holding Days</th>
                  <th>Days Until LT</th>
                  <th>Gain</th>
                  <th>Est. ST Tax (24%)</th>
                  <th>Est. LT Tax (15%)</th>
                  <th>Est. Tax Savings</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td><strong>{candidate.ticker}</strong></td>
                    <td>{candidate.shares}</td>
                    <td>{candidate.buyDate}</td>
                    <td>{candidate.sellDate}</td>
                    <td>{candidate.holdingDays}</td>
                    <td className={candidate.daysRemainingUntilLT === 0 ? 'ready' : ''}>
                      {candidate.daysRemainingUntilLT}
                    </td>
                    <td>${candidate.gain.toFixed(2)}</td>
                    <td>${candidate.estimatedShortTermTax.toFixed(2)}</td>
                    <td>${candidate.estimatedLongTermTax.toFixed(2)}</td>
                    <td><strong>${candidate.estimatedTaxSavings.toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p>
              <strong>How to use this:</strong> Transactions with fewer days remaining are close to
              long-term status. Selling after holding for 366+ days qualifies for the lower 15%
              long-term capital gains rate instead of the 24% short-term marginal rate. Tax estimates
              assume the indicated rates and are for planning purposes.
            </p>
          </div>
        </>
      )}
    </section>
  )
}
