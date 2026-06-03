import { calculateFederalTax } from './federalTaxEngine'
import type { FederalTaxInput } from './types'

export const sampleFederalTaxInputs: Array<{ description: string; input: FederalTaxInput }> = [
  {
    description: 'Single filer, ordinary income 40000, LTCG 30000',
    input: {
      filingStatus: 'single',
      taxYear: 2025,
      ordinaryIncome: 40000,
      shortTermCapitalGains: 0,
      longTermCapitalGains: 30000,
      enableNIIT: false,
    },
  },
  {
    description: 'Single filer, ordinary income 120000, STCG 10000, LTCG 50000',
    input: {
      filingStatus: 'single',
      taxYear: 2025,
      ordinaryIncome: 120000,
      shortTermCapitalGains: 10000,
      longTermCapitalGains: 50000,
      enableNIIT: false,
    },
  },
  {
    description: 'Married filing jointly, ordinary income 80000, LTCG 60000',
    input: {
      filingStatus: 'marriedFilingJointly',
      taxYear: 2025,
      ordinaryIncome: 80000,
      shortTermCapitalGains: 0,
      longTermCapitalGains: 60000,
      enableNIIT: false,
    },
  },
]

export const sampleFederalTaxResults = sampleFederalTaxInputs.map((item) => ({
  description: item.description,
  result: calculateFederalTax(item.input),
}))
