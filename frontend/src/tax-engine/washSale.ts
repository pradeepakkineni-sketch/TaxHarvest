import type { WashSaleDetectionResult, WashSaleWarning } from './types'

interface WashSaleTransaction {
  id: string
  ticker: string
  buyDate: string
  sellDate: string
  gainLoss: number
}

function parseDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateDifferenceInDays(a: Date, b: Date) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((a.getTime() - b.getTime()) / msPerDay)
}

export function detectWashSales(
  transactions: WashSaleTransaction[],
): WashSaleDetectionResult {
  const warnings: WashSaleWarning[] = []

  transactions.forEach((lossTx) => {
    if (!lossTx.ticker || lossTx.gainLoss >= 0 || !lossTx.sellDate) {
      return
    }

    const saleDate = parseDate(lossTx.sellDate)
    if (!saleDate) {
      return
    }

    const possibleReplacements = transactions
      .filter((candidate) =>
        candidate.id !== lossTx.id &&
        candidate.ticker === lossTx.ticker &&
        candidate.buyDate,
      )
      .map((candidate) => {
        const purchaseDate = parseDate(candidate.buyDate)
        if (!purchaseDate) {
          return null
        }

        const daysDiff = dateDifferenceInDays(purchaseDate, saleDate)
        return {
          candidate,
          daysDiff,
          purchaseDate,
        }
      })
      .filter((entry): entry is { candidate: WashSaleTransaction; daysDiff: number; purchaseDate: Date } =>
        entry !== null && Math.abs(entry.daysDiff) <= 30,
      )
      .sort((a, b) => Math.abs(a.daysDiff) - Math.abs(b.daysDiff))

    if (possibleReplacements.length === 0) {
      return
    }

    const replacement = possibleReplacements[0]
    const warning: WashSaleWarning = {
      lossTransactionId: lossTx.id,
      replacementTransactionId: replacement.candidate.id,
      ticker: lossTx.ticker,
      lossAmount: Math.abs(lossTx.gainLoss),
      saleDate: lossTx.sellDate,
      replacementPurchaseDate: replacement.candidate.buyDate,
      message: `Potential wash sale for ${lossTx.ticker}: a loss of $${Math.abs(lossTx.gainLoss).toFixed(2)} on ${lossTx.sellDate} may be disallowed because a replacement purchase occurred on ${replacement.candidate.buyDate} within 30 days.`,
    }

    warnings.push(warning)
  })

  return {
    totalWarnings: warnings.length,
    warnings,
  }
}
