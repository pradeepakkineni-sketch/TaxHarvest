import { useMemo, Fragment } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { detectWashSales } from '../tax-engine/washSale'

export default function Portfolio() {
  const { calculated, summary, addTransaction, removeTransaction, updateTransaction } = usePortfolio()

  const washSaleWarnings = useMemo(() => detectWashSales(calculated), [calculated])
  const washSaleWarningsByTransactionId = useMemo(() => {
    const map = new Map<string, typeof washSaleWarnings.warnings[number]>()
    washSaleWarnings.warnings.forEach((warning) => {
      map.set(warning.lossTransactionId, warning)
    })
    return map
  }, [washSaleWarnings])

  return (
    <section>
      <h2>Portfolio</h2>

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Short-Term Gains/Losses</h3>
          <div className="amount">${summary.totalShortTermGainLoss.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Total Long-Term Gains/Losses</h3>
          <div className="amount">${summary.totalLongTermGainLoss.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Total Realized Gains/Losses</h3>
          <div className="amount">${summary.totalRealizedGainLoss.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <h3>Total Sale Proceeds</h3>
          <div className="amount">${summary.totalSaleProceeds.toFixed(2)}</div>
        </div>
      </div>

      <div className="table-card">
        <table className="transactions">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Shares</th>
              <th>Buy Date</th>
              <th>Sell Date</th>
              <th>Buy Price</th>
              <th>Sell Price</th>
              <th>Cost Basis</th>
              <th>Sale Proceeds</th>
              <th>Gain/Loss</th>
              <th>Holding Days</th>
              <th>Tax Classification</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {calculated.map((tx) => {
              const warning = washSaleWarningsByTransactionId.get(tx.id)
              return (
                <Fragment key={tx.id}>
                  <tr>
                    <td>
                      <div className="ticker-input-row">
                        <input
                          type="text"
                          placeholder="AAPL"
                          value={tx.ticker}
                          onChange={(e) => updateTransaction(tx.id, 'ticker', e.target.value)}
                        />
                        {warning && (
                          <>
                            <span className="wash-sale-indicator" title="Potential wash sale detected">
                              ⚠️
                            </span>
                            <span className="wash-sale-row-label">Potentially disallowed loss</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        value={tx.shares || ''}
                        onChange={(e) => updateTransaction(tx.id, 'shares', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={tx.buyDate}
                        onChange={(e) => updateTransaction(tx.id, 'buyDate', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={tx.sellDate}
                        onChange={(e) => updateTransaction(tx.id, 'sellDate', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        value={tx.buyPrice || ''}
                        onChange={(e) => updateTransaction(tx.id, 'buyPrice', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        value={tx.sellPrice || ''}
                        onChange={(e) => updateTransaction(tx.id, 'sellPrice', Number(e.target.value))}
                      />
                    </td>
                    <td className="calculated">${tx.costBasis.toFixed(2)}</td>
                    <td className="calculated">${tx.saleProceeds.toFixed(2)}</td>
                    <td className="calculated">${tx.gainLoss.toFixed(2)}</td>
                    <td className="calculated">{tx.holdingDays}</td>
                    <td className="calculated">{tx.taxClassification}</td>
                    <td>
                      <button
                        onClick={() => removeTransaction(tx.id)}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  {warning ? (
                    <tr className="wash-sale-warning-row">
                      <td colSpan={12}>
                        <div className="wash-sale-banner">
                          <span className="wash-sale-indicator">⚠️</span>
                          <span>{warning.message}</span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        <button onClick={addTransaction} className="btn-add-row">
          + Add Transaction
        </button>
      </div>
    </section>
  )
}
