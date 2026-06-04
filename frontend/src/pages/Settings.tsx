import { useState, type ChangeEvent } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { buildPortfolioExportData, restorePortfolioFileData, validatePortfolioFileData } from '../utils/portfolioFile'
import type { FilingStatus } from '../tax-engine/types'

export default function Settings() {
  const { setTransactions, setTaxProfile, setAnalysisSettings } = usePortfolio()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null)

  const handleDownload = () => {
    const exportData = buildPortfolioExportData()
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `taxharvest-${new Date().toISOString().slice(0, 10)}.taxharvest.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setStatusType('success')
    setStatusMessage('Portfolio file downloaded successfully.')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    let parsed: unknown

    try {
      parsed = JSON.parse(text)
    } catch {
      setStatusType('error')
      setStatusMessage('The selected file is not valid JSON.')
      return
    }

    if (!validatePortfolioFileData(parsed)) {
      setStatusType('error')
      setStatusMessage('The selected file is not a valid TaxHarvest portfolio export.')
      return
    }

    restorePortfolioFileData(parsed)
    setTransactions(parsed.portfolioTransactions)
    setTaxProfile(parsed.taxProfile)
    if (parsed.analysisInputs) {
      setAnalysisSettings({
        ...parsed.analysisInputs,
        filingStatus: parsed.analysisInputs.filingStatus as FilingStatus,
      })
    }
    setStatusType('success')
    setStatusMessage('Portfolio data imported successfully and live state has been updated.')
    event.target.value = ''
  }

  return (
    <section>
      <h2>Settings</h2>
      <div className="settings-card">
        <div className="settings-row">
          <button onClick={handleDownload} className="btn-primary">
            Download Portfolio File
          </button>
        </div>
        <div className="settings-row">
          <label className="file-input-label">
            Import Portfolio File
            <input
              type="file"
              accept=".taxharvest.json,application/json"
              onChange={handleImport}
            />
          </label>
        </div>
        {statusMessage && (
          <div className={`status-message ${statusType}`}>{statusMessage}</div>
        )}
      </div>
    </section>
  )
}
