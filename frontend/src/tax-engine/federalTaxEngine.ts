import { federalTaxTables2025 } from './federalTaxTables'
import type {
  CapitalGainLossInput,
  CapitalGainLossNettingResult,
  FederalTaxInput,
  FederalTaxResult,
  LtcgAllocation,
  TaxBracket,
} from './types'

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

export function calculateCapitalGainsNetting(
  input: CapitalGainLossInput,
): CapitalGainLossNettingResult {
  const {
    shortTermGains,
    shortTermLosses,
    longTermGains,
    longTermLosses,
    priorYearCapitalLossCarryforward = 0,
  } = input

  const netShortTerm = shortTermGains - shortTermLosses
  const netLongTerm = longTermGains - longTermLosses

  let finalShortTermTaxableGain = 0
  let finalLongTermTaxableGain = 0

  if (netShortTerm >= 0 && netLongTerm >= 0) {
    finalShortTermTaxableGain = netShortTerm
    finalLongTermTaxableGain = netLongTerm
  } else if (netShortTerm <= 0 && netLongTerm <= 0) {
    finalShortTermTaxableGain = 0
    finalLongTermTaxableGain = 0
  } else if (netShortTerm > 0 && netLongTerm < 0) {
    const offset = Math.min(netShortTerm, Math.abs(netLongTerm))
    finalShortTermTaxableGain = netShortTerm - offset
    finalLongTermTaxableGain = 0
  } else if (netShortTerm < 0 && netLongTerm > 0) {
    const offset = Math.min(Math.abs(netShortTerm), netLongTerm)
    finalShortTermTaxableGain = 0
    finalLongTermTaxableGain = netLongTerm - offset
  }

  let totalNetCapitalGainOrLoss = finalShortTermTaxableGain + finalLongTermTaxableGain

  let ordinaryIncomeOffset = 0
  let capitalLossCarryforward = priorYearCapitalLossCarryforward

  if (totalNetCapitalGainOrLoss < 0) {
    ordinaryIncomeOffset = Math.min(3000, Math.abs(totalNetCapitalGainOrLoss))
    capitalLossCarryforward =
      priorYearCapitalLossCarryforward + Math.abs(totalNetCapitalGainOrLoss) - ordinaryIncomeOffset
    totalNetCapitalGainOrLoss += ordinaryIncomeOffset
  } else if (priorYearCapitalLossCarryforward > 0 && totalNetCapitalGainOrLoss > 0) {
    const carryUsage = Math.min(priorYearCapitalLossCarryforward, totalNetCapitalGainOrLoss)
    totalNetCapitalGainOrLoss -= carryUsage
    capitalLossCarryforward = priorYearCapitalLossCarryforward - carryUsage
    if (totalNetCapitalGainOrLoss === 0) {
      finalShortTermTaxableGain = 0
      finalLongTermTaxableGain = 0
    } else if (finalShortTermTaxableGain > 0) {
      const reduction = Math.min(finalShortTermTaxableGain, carryUsage)
      finalShortTermTaxableGain -= reduction
    } else if (finalLongTermTaxableGain > 0) {
      const reduction = Math.min(finalLongTermTaxableGain, carryUsage)
      finalLongTermTaxableGain -= reduction
    }
  }

  return {
    netShortTerm,
    netLongTerm,
    finalShortTermTaxableGain,
    finalLongTermTaxableGain,
    totalNetCapitalGainOrLoss,
    ordinaryIncomeOffset,
    capitalLossCarryforward,
  }
}

export function calculateFederalTax(input: FederalTaxInput): FederalTaxResult {
  const {
    filingStatus,
    taxYear,
    ordinaryIncome,
    shortTermCapitalGains = 0,
    longTermCapitalGains = 0,
    netInvestmentIncome = 0,
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
  const incomeAboveThreshold = Math.max(0, totalIncomeForLtcg + longTermCapitalGains - niitThreshold)
  const niitAmount = enableNIIT
    ? Math.min(netInvestmentIncome, incomeAboveThreshold) * 0.038
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
