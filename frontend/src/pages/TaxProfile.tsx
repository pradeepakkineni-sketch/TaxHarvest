import { useState } from 'react'

export interface TaxProfile {
  taxYear: number
  filingStatus: string
  state: string
  ordinaryIncome: number
  netInvestmentIncome: number
  enableNIIT: boolean
}

const stateOptions = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export default function TaxProfile() {
  const [profile, setProfile] = useState<TaxProfile>({
    taxYear: 2024,
    filingStatus: 'single',
    state: 'CA',
    ordinaryIncome: 0,
    netInvestmentIncome: 0,
    enableNIIT: false,
  })

  const handleChange = (field: keyof TaxProfile, value: string | number | boolean) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const formatCurrencyValue = (value: number) => value.toString()

  return (
    <section>
      <h2>Tax Profile</h2>
      <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Tax Year
          <select
            value={profile.taxYear}
            onChange={(e) => handleChange('taxYear', Number(e.target.value))}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </label>

        <label>
          Filing Status
          <select
            value={profile.filingStatus}
            onChange={(e) => handleChange('filingStatus', e.target.value)}
          >
            <option value="single">Single</option>
            <option value="married">Married Filing Jointly</option>
            <option value="mfj">Married Filing Separately</option>
            <option value="head">Head of Household</option>
          </select>
        </label>

        <label>
          State
          <select
            value={profile.state}
            onChange={(e) => handleChange('state', e.target.value)}
          >
            {stateOptions.map((stateOption) => (
              <option key={stateOption.value} value={stateOption.value}>
                {stateOption.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ordinary Taxable Income
          <input
            type="number"
            inputMode="decimal"
            value={formatCurrencyValue(profile.ordinaryIncome)}
            onChange={(e) => handleChange('ordinaryIncome', Number(e.target.value))}
            placeholder="0"
          />
        </label>

        <label>
          Net Investment Income
          <input
            type="number"
            inputMode="decimal"
            value={formatCurrencyValue(profile.netInvestmentIncome)}
            onChange={(e) => handleChange('netInvestmentIncome', Number(e.target.value))}
            placeholder="0"
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={profile.enableNIIT}
            onChange={(e) => handleChange('enableNIIT', e.target.checked)}
          />
          Enable NIIT
        </label>
      </form>

      <div className="json-preview">
        <h3>Current Profile</h3>
        <pre>{JSON.stringify(profile, null, 2)}</pre>
      </div>
    </section>
  )
}
