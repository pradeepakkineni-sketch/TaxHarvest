export interface RobinhoodCsvPreviewRow {
  ticker: string
  shares: number
  buyDate: string
  sellDate: string
  buyPrice: number
  sellPrice: number
  costBasis: number
  saleProceeds: number
  gainLoss?: number
  status: 'ready' | 'skipped'
  reason?: string
  rawData: Record<string, string>
}

export interface RobinhoodCsvImportSummary {
  rowsRead: number
  rowsImported: number
  rowsSkipped: number
  warnings: string[]
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '')

const parseCsv = (csvText: string): Array<string[]> => {
  const rows: Array<string[]> = []
  let currentRow: string[] = []
  let currentValue = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i]

    if (inQuotes) {
      if (char === '"') {
        const nextChar = csvText[i + 1]
        if (nextChar === '"') {
          currentValue += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        currentValue += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if (char === '\n') {
      currentRow.push(currentValue)
      rows.push(currentRow)
      currentRow = []
      currentValue = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    currentValue += char
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue)
    rows.push(currentRow)
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0))
}

const parseNumber = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined
  const normalized = value.trim().replace(/[$,]/g, '')
  if (normalized === '') return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeDateValue = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const cleaned = value
    .trim()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015–—−]/g, '-')
    .replace(/\s+/g, ' ')
  return cleaned === '' ? undefined : cleaned
}

const parseDate = (value: string | undefined): string | undefined => {
  const normalized = normalizeDateValue(value)
  if (!normalized) return undefined

  let parsedDate: Date | undefined
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(normalized)) {
    parsedDate = new Date(normalized.replace(/\//g, '-'))
  } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(normalized)) {
    const [month, day, year] = normalized.split(/[-/]/)
    parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  } else {
    parsedDate = new Date(normalized)
  }

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return undefined
  return parsedDate.toISOString().slice(0, 10)
}

const headerCandidates = {
  ticker: ['symbol', 'instrument', 'ticker', 'asset'],
  shares: ['quantity', 'shares', 'qty'],
  buyDate: ['buy date', 'buy_date', 'buydate', 'buy-date', 'acquisition date', 'acquisition_date', 'date acquired', 'date_acquired', 'dateacquired'],
  sellDate: ['sell date', 'sell_date', 'selldate', 'sell-date', 'disposal date', 'disposal_date', 'date sold', 'date_sold', 'datesold'],
  buyPrice: ['buy price', 'purchase price', 'cost price'],
  costBasis: ['cost basis', 'costbasis', 'total cost', 'basis'],
  sellPrice: ['sell price', 'sale price'],
  proceeds: ['proceeds', 'sale proceeds', 'net proceeds'],
  gainLoss: ['gain/loss', 'gainloss', 'realized gain/loss', 'profit/loss'],
  instrumentType: ['instrument type', 'instrumenttype', 'asset type', 'type'],
}

const findColumnIndex = (headers: string[], names: string[]): number | undefined => {
  const normalizedNames = names.map(normalizeHeader)
  return headers.findIndex((header) => normalizedNames.includes(normalizeHeader(header)))
}

const getField = (row: string[], headers: string[], candidates: string[]): string | undefined => {
  const index = findColumnIndex(headers, candidates)
  return typeof index === 'number' && index >= 0 ? row[index]?.trim() : undefined
}

const isUnsupportedInstrument = (value: string | undefined): boolean => {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return /option|crypto|rsu|espp|future|contract|forex|fx|bond/.test(normalized)
}

export const parseRobinhoodCsv = (
  csvText: string,
): { rows: RobinhoodCsvPreviewRow[]; summary: RobinhoodCsvImportSummary } => {
  const parsedRows = parseCsv(csvText)
  if (parsedRows.length === 0) {
    return {
      rows: [],
      summary: { rowsRead: 0, rowsImported: 0, rowsSkipped: 0, warnings: ['CSV file contained no rows.'] },
    }
  }

  const headers = parsedRows[0].map((header) => header.trim())
  const normalizedHeaders = headers.map(normalizeHeader)
  const rows = parsedRows.slice(1)
  const previewRows: RobinhoodCsvPreviewRow[] = []
  const warnings: string[] = []

  const buyDateHeaderIndex = findColumnIndex(headers, headerCandidates.buyDate)
  const sellDateHeaderIndex = findColumnIndex(headers, headerCandidates.sellDate)

  console.debug('Robinhood CSV raw headers:', headers)
  console.debug('Robinhood CSV normalized headers:', normalizedHeaders)
  console.debug(
    'Robinhood CSV detected buy date header:',
    typeof buyDateHeaderIndex === 'number' && buyDateHeaderIndex >= 0 ? headers[buyDateHeaderIndex] : 'none',
  )
  console.debug(
    'Robinhood CSV detected sell date header:',
    typeof sellDateHeaderIndex === 'number' && sellDateHeaderIndex >= 0 ? headers[sellDateHeaderIndex] : 'none',
  )
  console.debug('Robinhood CSV first raw row:', rows[0] ?? [])

  rows.forEach((row, index) => {
    const rawData: Record<string, string> = {}
    headers.forEach((header, headerIndex) => {
      rawData[header] = row[headerIndex]?.trim() ?? ''
    })

    const instrumentType = getField(row, headers, headerCandidates.instrumentType)
    if (isUnsupportedInstrument(instrumentType)) {
      const reason = `Unsupported instrument type: ${instrumentType}`
      previewRows.push({
        ticker: '',
        shares: 0,
        buyDate: '',
        sellDate: '',
        buyPrice: 0,
        sellPrice: 0,
        costBasis: 0,
        saleProceeds: 0,
        status: 'skipped',
        reason,
        rawData,
      })
      warnings.push(`Row ${index + 2}: ${reason}`)
      return
    }

    const ticker = getField(row, headers, headerCandidates.ticker) ?? ''
    const shares = parseNumber(getField(row, headers, headerCandidates.shares))
    const rawBuyDate = getField(row, headers, headerCandidates.buyDate)
    const rawSellDate = getField(row, headers, headerCandidates.sellDate)
    const buyDate = parseDate(rawBuyDate)
    const sellDate = parseDate(rawSellDate)
    const buyPriceValue = parseNumber(getField(row, headers, headerCandidates.buyPrice))
    const costBasis = parseNumber(getField(row, headers, headerCandidates.costBasis))
    const rawSellPrice = parseNumber(getField(row, headers, headerCandidates.sellPrice))
    const totalProceeds = parseNumber(getField(row, headers, headerCandidates.proceeds))
    const gainLoss = parseNumber(getField(row, headers, headerCandidates.gainLoss))

    const resolvedBuyPrice = buyPriceValue !== undefined
      ? buyPriceValue
      : shares && costBasis !== undefined
      ? costBasis / shares
      : undefined

    const resolvedSellPrice = rawSellPrice !== undefined
      ? rawSellPrice
      : shares && totalProceeds !== undefined
      ? totalProceeds / shares
      : undefined

    const resolvedCostBasis = costBasis !== undefined
      ? costBasis
      : resolvedBuyPrice !== undefined && shares !== undefined
      ? resolvedBuyPrice * shares
      : undefined

    const resolvedSaleProceeds = totalProceeds !== undefined
      ? totalProceeds
      : resolvedSellPrice !== undefined && shares !== undefined
      ? resolvedSellPrice * shares
      : undefined

    const reasons: string[] = []
    if (!ticker) reasons.push('Missing symbol')
    if (!shares || shares <= 0) reasons.push('Invalid or missing shares')
    if (!buyDate) reasons.push(`Invalid or missing buy date (${rawBuyDate ?? 'empty'})`)
    if (!sellDate) reasons.push(`Invalid or missing sell date (${rawSellDate ?? 'empty'})`)
    if (resolvedBuyPrice === undefined || Number.isNaN(resolvedBuyPrice) || !Number.isFinite(resolvedBuyPrice)) reasons.push('Missing or invalid buy price/cost basis')
    if (resolvedSellPrice === undefined || Number.isNaN(resolvedSellPrice) || !Number.isFinite(resolvedSellPrice)) reasons.push('Missing or invalid sell price/proceeds')

    if (reasons.length > 0) {
      const reason = reasons.join('; ')
      previewRows.push({
        ticker: ticker || 'UNKNOWN',
        shares: shares ?? 0,
        buyDate: buyDate ?? '',
        sellDate: sellDate ?? '',
        buyPrice: resolvedBuyPrice ?? 0,
        sellPrice: resolvedSellPrice ?? 0,
        costBasis: resolvedCostBasis ?? 0,
        saleProceeds: resolvedSaleProceeds ?? 0,
        gainLoss,
        status: 'skipped',
        reason,
        rawData,
      })
      warnings.push(`Row ${index + 2}: ${reason}`)
      return
    }

    previewRows.push({
      ticker,
      shares: shares ?? 0,
      buyDate: buyDate ?? '',
      sellDate: sellDate ?? '',
      buyPrice: resolvedBuyPrice ?? 0,
      sellPrice: resolvedSellPrice ?? 0,
      costBasis: resolvedCostBasis ?? 0,
      saleProceeds: resolvedSaleProceeds ?? 0,
      gainLoss,
      status: 'ready',
      rawData,
    })
  })

  const rowsImported = previewRows.filter((row) => row.status === 'ready').length
  const rowsSkipped = previewRows.length - rowsImported

  if (rowsImported === 0 && rowsSkipped > 0) {
    warnings.unshift('No importable rows were found in the CSV file.')
  }

  console.debug('Robinhood CSV first parsed row:', previewRows[0] ?? null)

  return {
    rows: previewRows,
    summary: {
      rowsRead: rows.length,
      rowsImported,
      rowsSkipped,
      warnings,
    },
  }
}
