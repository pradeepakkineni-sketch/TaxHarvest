import { usePortfolio } from '../context/PortfolioContext'

export default function Portfolio() {
  const { calculated, summary, addTransaction, removeTransaction, updateTransaction } = usePortfolio()

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
            {calculated.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <input
                    type="text"
                    placeholder="AAPL"
                    value={tx.ticker}
                    onChange={(e) => updateTransaction(tx.id, 'ticker', e.target.value)}
                  />
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
            ))}
          </tbody>
        </table>
        <button onClick={addTransaction} className="btn-add-row">
          + Add Transaction
        </button>
      </div>
    </section>
  )
}
