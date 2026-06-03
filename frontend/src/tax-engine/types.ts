export type FilingStatus =
  | 'single'
  | 'marriedFilingJointly'
  | 'marriedFilingSeparately'
  | 'headOfHousehold'
  | 'qualifyingSurvivingSpouse'

export interface TaxBracket {
  rate: number
  threshold: number
}

export interface FederalTaxInput {
  filingStatus: FilingStatus
  taxYear: number
  ordinaryIncome: number
  shortTermCapitalGains?: number
  longTermCapitalGains?: number
  netInvestmentIncome?: number
  enableNIIT?: boolean
}

export interface CapitalGainLossInput {
  shortTermGains: number
  shortTermLosses: number
  longTermGains: number
  longTermLosses: number
  priorYearCapitalLossCarryforward?: number
}

export interface CapitalGainLossNettingResult {
  netShortTerm: number
  netLongTerm: number
  finalShortTermTaxableGain: number
  finalLongTermTaxableGain: number
  totalNetCapitalGainOrLoss: number
  ordinaryIncomeOffset: number
  capitalLossCarryforward: number
}

export interface LtcgAllocation {
  zeroPercent: number
  fifteenPercent: number
  twentyPercent: number
}

export interface FederalTaxResult {
  filingStatus: FilingStatus
  taxYear: number
  taxableOrdinaryIncome: number
  ordinaryTax: number
  ltcgAllocation: LtcgAllocation
  ltcgTax: number
  totalFederalTax: number
  niitAmount: number
  niitThreshold: number
  detailed: {
    ordinaryTaxBrackets: Array<{
      threshold: number
      amount: number
      rate: number
      tax: number
    }>
    ltcgBreakdown: Array<{
      rate: number
      amount: number
    }>
  }
}
