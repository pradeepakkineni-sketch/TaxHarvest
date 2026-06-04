import { federalTaxTables2025 } from './federalTaxTables'
import type {
  CapitalGainLossInput,
  CapitalGainLossNettingResult,
  FederalTaxInput,
  FederalTaxResult,
  FilingStatus,
  LtcgAllocation,
  TaxBracket,
} from './types'

function calculateProgressiveTax(amount: number, brackets: TaxBracket[] | null | undefined) {
  if (!Array.isArray(brackets)) {
    return { tax: 0, breakdown: [] }
  }

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
  brackets: TaxBracket[] | null | undefined,
): LtcgAllocation {
  const ordered = Array.isArray(brackets) ? [...brackets].sort((a, b) => a.threshold - b.threshold) : []
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
  const totalNetBeforeCarryforward = netShortTerm + netLongTerm

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

  let totalNetCapitalGainOrLoss =
    totalNetBeforeCarryforward >= 0
      ? finalShortTermTaxableGain + finalLongTermTaxableGain
      : totalNetBeforeCarryforward

  let ordinaryIncomeOffset = 0
  let capitalLossCarryforward = priorYearCapitalLossCarryforward

  if (totalNetCapitalGainOrLoss < 0) {
    ordinaryIncomeOffset = Math.min(3000, Math.abs(totalNetCapitalGainOrLoss))
    capitalLossCarryforward += Math.abs(totalNetCapitalGainOrLoss) - ordinaryIncomeOffset
    totalNetCapitalGainOrLoss += ordinaryIncomeOffset
  } else if (capitalLossCarryforward > 0 && totalNetCapitalGainOrLoss > 0) {
    const carryUsage = Math.min(capitalLossCarryforward, totalNetCapitalGainOrLoss)
    totalNetCapitalGainOrLoss -= carryUsage
    capitalLossCarryforward -= carryUsage

    let remainingUsage = carryUsage
    if (finalShortTermTaxableGain > 0) {
      const reduction = Math.min(finalShortTermTaxableGain, remainingUsage)
      finalShortTermTaxableGain -= reduction
      remainingUsage -= reduction
    }
    if (remainingUsage > 0 && finalLongTermTaxableGain > 0) {
      const reduction = Math.min(finalLongTermTaxableGain, remainingUsage)
      finalLongTermTaxableGain -= reduction
      remainingUsage -= reduction
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

const filingStatusMap: Record<string, FilingStatus> = {
  single: 'single',
  'Single': 'single',
  'marriedFilingJointly': 'marriedFilingJointly',
  'Married Filing Jointly': 'marriedFilingJointly',
  'marriedfilingjointly': 'marriedFilingJointly',
  'married filing jointly': 'marriedFilingJointly',
  marriedFilingSeparately: 'marriedFilingSeparately',
  'Married Filing Separately': 'marriedFilingSeparately',
  'marriedfilingseparately': 'marriedFilingSeparately',
  'married filing separately': 'marriedFilingSeparately',
  headOfHousehold: 'headOfHousehold',
  'Head of Household': 'headOfHousehold',
  'headofhousehold': 'headOfHousehold',
  'head of household': 'headOfHousehold',
  qualifyingSurvivingSpouse: 'qualifyingSurvivingSpouse',
  'Qualifying Surviving Spouse': 'qualifyingSurvivingSpouse',
  'qualifyingsurvivingspouse': 'qualifyingSurvivingSpouse',
  'qualifying surviving spouse': 'qualifyingSurvivingSpouse',
}

export function normalizeFilingStatus(status: string | null | undefined): FilingStatus {
  if (!status) {
    return 'single'
  }

  const trimmed = status.toString().trim()
  return filingStatusMap[trimmed] ?? filingStatusMap[trimmed.toLowerCase()] ?? 'single'
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

  const normalizedStatus = normalizeFilingStatus(filingStatus as string)
  const ordinaryBrackets = federalTaxTables2025.ordinaryBrackets[normalizedStatus] ?? []
  const ltcgBrackets = federalTaxTables2025.ltcgBrackets[normalizedStatus] ?? []
  const niitThreshold = federalTaxTables2025.niitThresholds[normalizedStatus] ?? 0

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
    filingStatus: normalizedStatus,
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
