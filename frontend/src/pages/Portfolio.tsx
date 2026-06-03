export default function Portfolio() {
  return (
    <section>
      <h2>Portfolio</h2>
      <div className="table-card">
        <table className="holdings">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Shares</th>
              <th>Avg Cost</th>
              <th>Market Value</th>
              <th>Unrealized P/L</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="placeholder">No holdings — placeholder</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
