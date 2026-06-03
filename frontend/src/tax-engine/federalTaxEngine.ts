import { federalTaxTables2025 } from './federalTaxTables'
import type { FederalTaxInput, FederalTaxResult, LtcgAllocation, TaxBracket } from './types'

function calculateProgressiveTax(amount: number, brackets: TaxBracket[]) {
  const ordered = [...brackets].sort((a, b) => a.threshold - b.threshold)
  let remaining = amount
  let totalTax = 0
  const breakdown: Array<{ threshold: number; amount: number; rate: number; tax: number }> = []

  for (let index = 0; index < ordered.length; index += 1) {
    const bracket = ordered[index]
    const nextThreshold = ordered[index + 1]?.threshold ?? Infinity
    const taxableAtRate = Math.max(0, Math.min(remaining, nextThreshold - bracket.threshold))
    if (taxableAtRate <= 0) continue

    const tax = taxableAtRate * bracket.rate
    totalTax += tax
    breakdown.push({ threshold: bracket.threshold, amount: taxableAtRate, rate: bracket.rate, tax })
    remaining -= taxableAtRate
    if (remaining <= 0) break
  }

  return { tax: totalTax, breakdown }
}

function allocateLongTermCapitalGains(
  baseIncome: number,
  ltcg: number,
  brackets: TaxBracket[],
): LtcgAllocation {
  const ordered = [...brackets].sort((a, b) => a.threshold - b.threshold)
  let remainingLtcg = ltcg
  let allocated: LtcgAllocation = { zeroPercent: 0, fifteenPercent: 0, twentyPercent: 0 }

  for (let index = 0; index < ordered.length; index += 1) {
    const bracket = ordered[index]
    const nextThreshold = ordered[index + 1]?.threshold ?? Infinity
    const bracketCap = nextThreshold - bracket.threshold
    const availableAtRate = Math.max(0, bracketCap - Math.max(0, baseIncome - bracket.threshold))
    const allocation = Math.min(remainingLtcg, availableAtRate)
    if (allocation > 0) {
      if (bracket.rate === 0) allocated.zeroPercent += allocation
      else if (bracket.rate === 0.15) allocated.fifteenPercent += allocation
      else if (bracket.rate === 0.2) allocated.twentyPercent += allocation
    }
    remainingLtcg -= allocation
    baseIncome = Math.max(baseIncome, nextThreshold)
    if (remainingLtcg <= 0) break
  }

  if (remainingLtcg > 0) {
    allocated.twentyPercent += remainingLtcg
  }

  return allocated
}

export function calculateFederalTax(input: FederalTaxInput): FederalTaxResult {
  const {
    filingStatus,
    taxYear,
    ordinaryIncome,
    shortTermCapitalGains = 0,
    longTermCapitalGains = 0,
    enableNIIT = false,
  } = input

  const ordinaryBrackets = federalTaxTables2025.ordinaryBrackets[filingStatus]
  const ltcgBrackets = federalTaxTables2025.ltcgBrackets[filingStatus]
  const niitThreshold = federalTaxTables2025.niitThresholds[filingStatus]

  const taxableOrdinaryIncome = Math.max(0, ordinaryIncome + shortTermCapitalGains)
  const ordinaryTaxResult = calculateProgressiveTax(taxableOrdinaryIncome, ordinaryBrackets)

  const totalIncomeForLtcg = taxableOrdinaryIncome
  const ltcgAllocation = allocateLongTermCapitalGains(totalIncomeForLtcg, longTermCapitalGains, ltcgBrackets)
  const ltcgTax =
    ltcgAllocation.zeroPercent * 0 +
    ltcgAllocation.fifteenPercent * 0.15 +
    ltcgAllocation.twentyPercent * 0.2

  const preliminaryTax = ordinaryTaxResult.tax + ltcgTax
  const niitAmount = enableNIIT && totalIncomeForLtcg + longTermCapitalGains > niitThreshold
    ? (totalIncomeForLtcg + longTermCapitalGains - niitThreshold) * 0.038
    : 0

  return {
    filingStatus,
    taxYear,
    taxableOrdinaryIncome,
    ordinaryTax: ordinaryTaxResult.tax,
    ltcgAllocation,
    ltcgTax,
    totalFederalTax: preliminaryTax + niitAmount,
    niitAmount,
    niitThreshold,
    detailed: {
      ordinaryTaxBrackets: ordinaryTaxResult.breakdown,
      ltcgBreakdown: [
        { rate: 0, amount: ltcgAllocation.zeroPercent },
        { rate: 0.15, amount: ltcgAllocation.fifteenPercent },
        { rate: 0.2, amount: ltcgAllocation.twentyPercent },
      ],
    },
  }
}
