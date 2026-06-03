export default function Dashboard() {
  return (
    <section>
      <h2>Dashboard</h2>
      <div className="cards">
        <div className="card">
          <h3>Total Portfolio Value</h3>
          <div className="big">$—</div>
        </div>
        <div className="card">
          <h3>Unrealized Gains</h3>
          <div className="big">$—</div>
        </div>
        <div className="card">
          <h3>Realized Gains</h3>
          <div className="big">$—</div>
        </div>
        <div className="card">
          <h3>Estimated Federal Tax</h3>
          <div className="big">$—</div>
        </div>
      </div>
    </section>
  )
}
