import { NavLink } from 'react-router-dom'
import './sidebar.css'

export default function Sidebar() {
  return (
    <aside className="th-sb">
      <div className="brand">TaxHarvest</div>
      <nav className="nav">
        <NavLink to="/" end className="nav-item">Dashboard</NavLink>
        <NavLink to="/portfolio" className="nav-item">Portfolio</NavLink>
        <NavLink to="/tax-profile" className="nav-item">Tax Profile</NavLink>
        <NavLink to="/analysis" className="nav-item">Analysis</NavLink>
        <NavLink to="/harvesting" className="nav-item">Harvesting</NavLink>
        <NavLink to="/settings" className="nav-item">Settings</NavLink>
      </nav>
      <div className="sb-footer">v0.1 • Placeholder</div>
    </aside>
  )
}
