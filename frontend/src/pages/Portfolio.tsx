import { useState } from 'react'

interface Transaction {
  id: string
  ticker: string
  shares: number
  buyDate: string
  sellDate: string
  buyPrice: number
  sellPrice: number
}

function calculateTransaction(tx: Transaction) {
  const costBasis = tx.shares * tx.buyPrice
  const saleProceeds = tx.shares * tx.sellPrice
  const gainLoss = saleProceeds - costBasis

  const buyDateObj = new Date(tx.buyDate)
  const sellDateObj = new Date(tx.sellDate)
  const holdingDays = Math.floor((sellDateObj.getTime() - buyDateObj.getTime()) / (1000 * 60 * 60 * 24))
  const taxClassification = holdingDays > 365 ? 'Long-Term' : 'Short-Term'

  return { costBasis, saleProceeds, gainLoss, holdingDays, taxClassification }
}

export default function Portfolio() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      ticker: '',
      shares: 0,
      buyDate: '',
      sellDate: '',
      buyPrice: 0,
      sellPrice: 0,
    },
  ])

  const handleAddRow = () => {
    const newId = Math.random().toString(36).slice(2, 9)
    setTransactions((prev) => [
      ...prev,
      {
        id: newId,
        ticker: '',
        shares: 0,
        buyDate: '',
        sellDate: '',
        buyPrice: 0,
        sellPrice: 0,
      },
    ])
  }

  const handleRemoveRow = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
  }

  const handleChange = (id: string, field: keyof Transaction, value: string | number) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, [field]: value } : tx)),
    )
  }

  const calculatedTransactions = transactions.map((tx) => ({
    ...tx,
    ...calculateTransaction(tx),
  }))

  const summary = calculatedTransactions.reduce(
    (acc, tx) => {
      if (tx.taxClassification === 'Short-Term') {
        acc.totalShortTermGainLoss += tx.gainLoss
      } else {
        acc.totalLongTermGainLoss += tx.gainLoss
      }
      acc.totalRealizedGainLoss += tx.gainLoss
      acc.totalSaleProceeds += tx.saleProceeds
      return acc
    },
    {
      totalShortTermGainLoss: 0,
      totalLongTermGainLoss: 0,
      totalRealizedGainLoss: 0,
      totalSaleProceeds: 0,
    },
  )

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
            {calculatedTransactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <input
                    type="text"
                    placeholder="AAPL"
                    value={tx.ticker}
                    onChange={(e) => handleChange(tx.id, 'ticker', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    placeholder="0"
                    value={tx.shares || ''}
                    onChange={(e) => handleChange(tx.id, 'shares', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={tx.buyDate}
                    onChange={(e) => handleChange(tx.id, 'buyDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={tx.sellDate}
                    onChange={(e) => handleChange(tx.id, 'sellDate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    placeholder="0"
                    value={tx.buyPrice || ''}
                    onChange={(e) => handleChange(tx.id, 'buyPrice', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    placeholder="0"
                    value={tx.sellPrice || ''}
                    onChange={(e) => handleChange(tx.id, 'sellPrice', Number(e.target.value))}
                  />
                </td>
                <td className="calculated">${tx.costBasis.toFixed(2)}</td>
                <td className="calculated">${tx.saleProceeds.toFixed(2)}</td>
                <td className="calculated">${tx.gainLoss.toFixed(2)}</td>
                <td className="calculated">{tx.holdingDays}</td>
                <td className="calculated">{tx.taxClassification}</td>
                <td>
                  <button
                    onClick={() => handleRemoveRow(tx.id)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={handleAddRow} className="btn-add-row">
          + Add Transaction
        </button>
      </div>
    </section>
  )
}
