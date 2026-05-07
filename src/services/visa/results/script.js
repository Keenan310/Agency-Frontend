(function () {
  const VISA_REQUIREMENTS = {
    tourist:  { label: 'Tourist Visa', info: 'For leisure travel. Valid 30–90 days.' },
    business: { label: 'Business Visa', info: 'For business meetings and conferences.' },
    transit:  { label: 'Transit Visa', info: 'For layovers requiring entry.' },
    student:  { label: 'Student Visa', info: 'For enrolled students. Requires university letter.' },
  };

  function buildCard(visaType, countryCode, countryName, fee, currency, index) {
    const info = VISA_REQUIREMENTS[visaType] || {};
    return `
      <div class="vis-card" onclick="window.visaResultsStep.selectVisa(${index})">
        <div class="vis-header">
          <div class="vis-country">🌍 ${countryName}</div>
          <div class="vis-type-badge ${visaType}">${info.label || visaType}</div>
        </div>
        <div class="vis-info">${info.info || ''}</div>
        <div class="vis-footer">
          <div>
            <div class="vis-fee">${Number(fee || 0).toLocaleString()} ${currency || 'AED'}</div>
            <div class="vis-fee-label">visa fee</div>
          </div>
          <button class="vis-btn">Apply Now</button>
        </div>
      </div>
    `;
  }

  function render(container, results) {
    if (!container) return;
    if (!results?.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate)">No visa options found</div>';
      return;
    }
    container.innerHTML = results.map((v, i) =>
      buildCard(v.visa_type || v.type, v.destination_country || v.country, v.countryName || v.destination_country, v.fee, v.currency, i)
    ).join('');
  }

  function selectVisa(index) {
    const results = window.RESULTS?.visa || [];
    const visa = results[index];
    if (!visa) return;
    window.__selectedVisa = visa;
    if (typeof window.go === 'function') window.go('booking');
  }

  window.visaResultsStep = { render, selectVisa };
})();
