import { useState, type ChangeEvent } from 'react'
import { usePortfolio, type Transaction } from '../context/PortfolioContext'
import { buildPortfolioExportData, restorePortfolioFileData, validatePortfolioFileData } from '../utils/portfolioFile'
import { parseRobinhoodCsv, type RobinhoodCsvPreviewRow } from '../importers/robinhoodCsvImporter'
import { downloadExcelReport } from '../utils/excelExport'
import type { FilingStatus } from '../tax-engine/types'

export default function Settings() {
  const { transactions, calculated, analysisSettings, setTransactions, setTaxProfile, setAnalysisSettings } = usePortfolio()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null)
  const [csvPreviewRows, setCsvPreviewRows] = useState<RobinhoodCsvPreviewRow[]>([])
  const [csvSummary, setCsvSummary] = useState<{
    rowsRead: number
    rowsImported: number
    rowsSkipped: number
    warnings: string[]
  } | null>(null)
  const [csvParseError, setCsvParseError] = useState<string | null>(null)

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

  const handleExportExcel = () => {
    downloadExcelReport({
      transactions: calculated,
      analysisSettings,
    })
    setStatusType('success')
    setStatusMessage('Excel report downloaded successfully.')
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
        useTaxProfileValues: false,
      })
    }
    setStatusType('success')
    setStatusMessage('Portfolio data imported successfully and live state has been updated.')
    event.target.value = ''
  }

  const handleCsvPreview = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setCsvPreviewRows([])
    setCsvSummary(null)
    setCsvParseError(null)

    const text = await file.text()

    try {
      const { rows, summary } = parseRobinhoodCsv(text)
      setCsvPreviewRows(rows)
      setCsvSummary(summary)
      if (summary.rowsRead === 0) {
        setCsvParseError('No valid rows were detected in the CSV file.')
      }
    } catch {
      setCsvParseError('Unable to parse the selected CSV file.')
    }

    event.target.value = ''
  }

  const handleCsvImport = () => {
    if (!csvSummary || csvSummary.rowsImported === 0) {
      setStatusType('error')
      setStatusMessage('No importable Robinhood rows are available.')
      return
    }

    const importedTransactions: Transaction[] = csvPreviewRows
      .filter((row) => row.status === 'ready')
      .map((row) => ({
        id: `${row.ticker}-${Math.random().toString(36).slice(2, 9)}`,
        ticker: row.ticker,
        shares: row.shares,
        buyDate: row.buyDate,
        sellDate: row.sellDate,
        buyPrice: row.buyPrice,
        sellPrice: row.sellPrice,
      }))

    setTransactions([...transactions, ...importedTransactions])
    setStatusType('success')
    setStatusMessage(`Imported ${importedTransactions.length} Robinhood transaction(s).`)
  }

  return (
    <section>
      <h2>Settings</h2>
      <div className="settings-card">
        <div className="settings-row">
          <button onClick={handleDownload} className="btn-primary">
            Download Portfolio File
          </button>
          <button onClick={handleExportExcel} className="btn-secondary">
            Export Excel
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
        <div className="settings-row">
          <label className="file-input-label">
            Import Robinhood CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvPreview}
            />
          </label>
        </div>

        {csvParseError && (
          <div className="status-message error">{csvParseError}</div>
        )}

        {csvSummary && (
          <div className="csv-preview-card">
            <div className="csv-summary">
              <div>Rows read: {csvSummary.rowsRead}</div>
              <div>Rows imported: {csvSummary.rowsImported}</div>
              <div>Rows skipped: {csvSummary.rowsSkipped}</div>
            </div>
            {csvSummary.warnings.length > 0 && (
              <div className="csv-warnings">
                <h4>Import Warnings</h4>
                <ul>
                  {csvSummary.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="csv-actions">
              <button
                type="button"
                onClick={handleCsvImport}
                className="btn-primary"
                disabled={csvSummary.rowsImported === 0}
              >
                Confirm Robinhood Import
              </button>
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
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewRows.map((row, index) => (
                    <tr key={`${row.ticker}-${index}`}>
                      <td>{row.ticker}</td>
                      <td>{row.shares}</td>
                      <td>{row.buyDate}</td>
                      <td>{row.sellDate}</td>
                      <td>${row.buyPrice.toFixed(2)}</td>
                      <td>${row.sellPrice.toFixed(2)}</td>
                      <td>{row.status === 'ready' ? 'Ready' : 'Skipped'}</td>
                      <td>{row.reason ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className={`status-message ${statusType}`}>{statusMessage}</div>
        )}
      </div>
    </section>
  )
}
