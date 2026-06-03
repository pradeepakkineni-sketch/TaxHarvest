import type { FilingStatus, TaxBracket } from './types'

export interface FederalTaxTables {
  ordinaryBrackets: Record<FilingStatus, TaxBracket[]>
  ltcgBrackets: Record<FilingStatus, TaxBracket[]>
  niitThresholds: Record<FilingStatus, number>
}

export const federalTaxTables2025: FederalTaxTables = {
  ordinaryBrackets: {
    single: [
      { threshold: 0, rate: 0.10 },
      { threshold: 11575, rate: 0.12 },
      { threshold: 47250, rate: 0.22 },
      { threshold: 98575, rate: 0.24 },
      { threshold: 190750, rate: 0.32 },
      { threshold: 230950, rate: 0.35 },
      { threshold: 609350, rate: 0.37 },
    ],
    marriedFilingJointly: [
      { threshold: 0, rate: 0.10 },
      { threshold: 23150, rate: 0.12 },
      { threshold: 94500, rate: 0.22 },
      { threshold: 197150, rate: 0.24 },
      { threshold: 393350, rate: 0.32 },
      { threshold: 462450, rate: 0.35 },
      { threshold: 731200, rate: 0.37 },
    ],
    marriedFilingSeparately: [
      { threshold: 0, rate: 0.10 },
      { threshold: 11575, rate: 0.12 },
      { threshold: 47250, rate: 0.22 },
      { threshold: 98575, rate: 0.24 },
      { threshold: 196675, rate: 0.32 },
      { threshold: 231225, rate: 0.35 },
      { threshold: 365600, rate: 0.37 },
    ],
    headOfHousehold: [
      { threshold: 0, rate: 0.10 },
      { threshold: 16400, rate: 0.12 },
      { threshold: 67150, rate: 0.22 },
      { threshold: 131650, rate: 0.24 },
      { threshold: 209850, rate: 0.32 },
      { threshold: 250050, rate: 0.35 },
      { threshold: 579850, rate: 0.37 },
    ],
    qualifyingSurvivingSpouse: [
      { threshold: 0, rate: 0.10 },
      { threshold: 23150, rate: 0.12 },
      { threshold: 94500, rate: 0.22 },
      { threshold: 197150, rate: 0.24 },
      { threshold: 393350, rate: 0.32 },
      { threshold: 462450, rate: 0.35 },
      { threshold: 731200, rate: 0.37 },
    ],
  },
  ltcgBrackets: {
    single: [
      { threshold: 0, rate: 0 },
      { threshold: 48350, rate: 0.15 },
      { threshold: 533400, rate: 0.2 },
    ],
    marriedFilingJointly: [
      { threshold: 0, rate: 0 },
      { threshold: 96700, rate: 0.15 },
      { threshold: 600050, rate: 0.2 },
    ],
    marriedFilingSeparately: [
      { threshold: 0, rate: 0 },
      { threshold: 48350, rate: 0.15 },
      { threshold: 300000, rate: 0.2 },
    ],
    headOfHousehold: [
      { threshold: 0, rate: 0 },
      { threshold: 64750, rate: 0.15 },
      { threshold: 566700, rate: 0.2 },
    ],
    qualifyingSurvivingSpouse: [
      { threshold: 0, rate: 0 },
      { threshold: 96700, rate: 0.15 },
      { threshold: 600050, rate: 0.2 },
    ],
  },
  niitThresholds: {
    single: 200000,
    marriedFilingJointly: 250000,
    marriedFilingSeparately: 125000,
    headOfHousehold: 200000,
    qualifyingSurvivingSpouse: 250000,
  },
}
