export default function TaxProfile() {
  return (
    <section>
      <h2>Tax Profile</h2>
      <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Filing Status
          <select defaultValue="single">
            <option value="single">Single</option>
            <option value="married">Married Filing Jointly</option>
            <option value="mfj">Married Filing Separately</option>
            <option value="head">Head of Household</option>
          </select>
        </label>

        <label>
          State
          <input placeholder="e.g., CA" />
        </label>

        <label>
          Ordinary Taxable Income
          <input placeholder="$0" />
        </label>

        <label>
          NIIT applicability
          <select defaultValue="no">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
      </form>
    </section>
  )
}
