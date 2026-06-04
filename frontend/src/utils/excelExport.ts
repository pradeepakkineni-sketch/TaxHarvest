import * as XLSX from 'xlsx'
import { calculateCapitalGainsNetting, calculateFederalTax } from '../tax-engine/federalTaxEngine'
import { detectWashSales } from '../tax-engine/washSale'
import type { AnalysisSettings, Transaction } from '../context/PortfolioContext'

export interface CalculatedTransaction extends Transaction {
  costBasis: number
  saleProceeds: number
  gainLoss: number
  holdingDays: number
  taxClassification: 'Short-Term' | 'Long-Term'
}

export function downloadExcelReport(options: {
  transactions: CalculatedTransaction[]
  analysisSettings: AnalysisSettings
}): void {
  const { transactions, analysisSettings } = options

  const washSaleResults = detectWashSales(transactions)
  const washSaleById = new Map<string, typeof washSaleResults.warnings[number]>()
  washSaleResults.warnings.forEach((warning) => washSaleById.set(warning.lossTransactionId, warning))

  const portfolioShortTermGains = transactions
    .filter((tx) => tx.taxClassification === 'Short-Term' && tx.gainLoss > 0)
    .reduce((sum, tx) => sum + tx.gainLoss, 0)
  const portfolioShortTermLosses = transactions
    .filter((tx) => tx.taxClassification === 'Short-Term' && tx.gainLoss < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.gainLoss), 0)
  const portfolioLongTermGains = transactions
    .filter((tx) => tx.taxClassification === 'Long-Term' && tx.gainLoss > 0)
    .reduce((sum, tx) => sum + tx.gainLoss, 0)
  const portfolioLongTermLosses = transactions
    .filter((tx) => tx.taxClassification === 'Long-Term' && tx.gainLoss < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.gainLoss), 0)

  const portfolioNetting = calculateCapitalGainsNetting({
    shortTermGains: portfolioShortTermGains,
    shortTermLosses: portfolioShortTermLosses,
    longTermGains: portfolioLongTermGains,
    longTermLosses: portfolioLongTermLosses,
  })

  const finalShortTermCapitalGains = analysisSettings.usePortfolioData
    ? portfolioNetting.finalShortTermTaxableGain
    : analysisSettings.shortTermCapitalGains
  const finalLongTermCapitalGains = analysisSettings.usePortfolioData
    ? portfolioNetting.finalLongTermTaxableGain
    : analysisSettings.longTermCapitalGains

  const taxResult = calculateFederalTax({
    filingStatus: analysisSettings.filingStatus,
    taxYear: 2025,
    ordinaryIncome: analysisSettings.ordinaryIncome,
    shortTermCapitalGains: finalShortTermCapitalGains,
    longTermCapitalGains: finalLongTermCapitalGains,
    netInvestmentIncome: analysisSettings.netInvestmentIncome,
    enableNIIT: analysisSettings.enableNIIT,
  })

  const portfolioSheetData = [
    [
      'Ticker',
      'Shares',
      'Buy Date',
      'Sell Date',
      'Buy Price',
      'Sell Price',
      'Cost Basis',
      'Sale Proceeds',
      'Gain/Loss',
      'Holding Days',
      'Tax Classification',
      'Wash Sale Warning',
      'Potentially Disallowed Loss',
    ],
    ...transactions.map((tx) => {
      const warning = washSaleById.get(tx.id)
      return [
        tx.ticker,
        tx.shares,
        tx.buyDate,
        tx.sellDate,
        tx.buyPrice,
        tx.sellPrice,
        tx.costBasis,
        tx.saleProceeds,
        tx.gainLoss,
        tx.holdingDays,
        tx.taxClassification,
        warning?.message ?? '',
        warning?.lossAmount ?? 0,
      ]
    }),
  ]

  const analysisSheetData = [
    ['Filing Status', analysisSettings.filingStatus],
    ['Ordinary Taxable Income', analysisSettings.ordinaryIncome],
    ['Short-Term Capital Gains', portfolioShortTermGains],
    ['Long-Term Capital Gains', portfolioLongTermGains],
    ['Net Short-Term', portfolioNetting.netShortTerm],
    ['Net Long-Term', portfolioNetting.netLongTerm],
    ['Final ST Taxable Gain', portfolioNetting.finalShortTermTaxableGain],
    ['Final LT Taxable Gain', portfolioNetting.finalLongTermTaxableGain],
    ['Ordinary Income Offset', portfolioNetting.ordinaryIncomeOffset],
    ['Capital Loss Carryforward', portfolioNetting.capitalLossCarryforward],
    ['LTCG 0% Portion', taxResult.ltcgAllocation.zeroPercent],
    ['LTCG 15% Portion', taxResult.ltcgAllocation.fifteenPercent],
    ['LTCG 20% Portion', taxResult.ltcgAllocation.twentyPercent],
    ['Ordinary Income Tax', taxResult.ordinaryTax],
    ['LTCG Tax', taxResult.ltcgTax],
    ['NIIT Tax', taxResult.niitAmount],
    ['Total Federal Tax', taxResult.totalFederalTax],
  ]

  const harvestingRows = transactions
    .filter((tx) => tx.gainLoss < 0)
    .map((tx) => {
      const loss = Math.abs(tx.gainLoss)
      const warning = washSaleById.get(tx.id)
      const potentiallyDisallowedLoss = warning ? loss : 0
      const eligibleLoss = loss - potentiallyDisallowedLoss
      const estimatedBenefit = eligibleLoss * (tx.taxClassification === 'Short-Term' ? 0.24 : 0.15)
      return [
        tx.ticker,
        tx.shares,
        tx.buyDate,
        tx.sellDate,
        tx.taxClassification,
        loss,
        potentiallyDisallowedLoss,
        eligibleLoss,
        estimatedBenefit,
      ]
    })

  const harvestingSheetData = [
    [
      'Ticker',
      'Shares',
      'Buy Date',
      'Sell Date',
      'Tax Classification',
      'Gross Loss',
      'Potentially Disallowed Loss',
      'Eligible Loss',
      'Estimated Tax Benefit',
    ],
    ...harvestingRows,
  ]

  const washSaleSheetData = [
    [
      'Ticker',
      'Loss Amount',
      'Sale Date',
      'Replacement Purchase Date',
      'Warning Message',
    ],
    ...washSaleResults.warnings.map((warning) => [
      warning.ticker,
      warning.lossAmount,
      warning.saleDate,
      warning.replacementPurchaseDate,
      warning.message,
    ]),
  ]

  const workbook = XLSX.utils.book_new()
  const portfolioSheet = XLSX.utils.aoa_to_sheet(portfolioSheetData)
  const analysisSheet = XLSX.utils.aoa_to_sheet(analysisSheetData)
  const harvestingSheet = XLSX.utils.aoa_to_sheet(harvestingSheetData)
  const washSaleSheet = XLSX.utils.aoa_to_sheet(washSaleSheetData)

  XLSX.utils.book_append_sheet(workbook, portfolioSheet, 'Portfolio Transactions')
  XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Tax Analysis')
  XLSX.utils.book_append_sheet(workbook, harvestingSheet, 'Tax-Loss Harvesting')
  XLSX.utils.book_append_sheet(workbook, washSaleSheet, 'Wash Sale Warnings')

  const workbookBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([workbookBinary], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const fileName = `TaxHarvest_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
