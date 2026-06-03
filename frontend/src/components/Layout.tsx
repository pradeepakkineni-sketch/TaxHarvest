import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import '../styles/layout.css'

export default function Layout() {
  return (
    <div className="th-app">
      <Sidebar />
      <main className="th-main">
        <Outlet />
      </main>
    </div>
  )
}
