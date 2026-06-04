import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PortfolioProvider } from './context/PortfolioContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import TaxProfile from './pages/TaxProfile'
import Analysis from './pages/Analysis'
import TaxLossHarvesting from './pages/TaxLossHarvesting'
import Scenarios from './pages/Scenarios'
import Settings from './pages/Settings'

export default function App() {
  return (
    <PortfolioProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="tax-profile" element={<TaxProfile />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="harvesting" element={<TaxLossHarvesting />} />
            <Route path="scenarios" element={<Scenarios />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortfolioProvider>
  )
}

