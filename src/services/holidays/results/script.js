(function () {
  const DEST_ICONS = { AE: '🏙️', TR: '🕌', MY: '🌴', GB: '🎡', SG: '🦁', EG: '🏺', JO: '🏺', FR: '🗼' };

  function buildCard(pkg, index) {
    const price = Number(pkg.price_per_person || 0);
    const currency = pkg.currency || 'AED';
    const icon = DEST_ICONS[pkg.destination_code] || '✈️';
    const tags = [
      pkg.nights ? `${pkg.nights} nights` : null,
      pkg.star_rating ? `${pkg.star_rating}⭐ hotel` : null,
      pkg.flights_included ? 'Flights incl.' : null,
      pkg.meal_plan ? pkg.meal_plan.replace(/_/g, ' ') : null,
    ].filter(Boolean);

    return `
      <div class="hol-card" onclick="window.holidayResultsStep.selectPackage(${index})">
        <div class="hol-card-img">${icon}</div>
        <div class="hol-card-body">
          <div class="hol-dest">${pkg.destination || ''}</div>
          <div class="hol-name">${pkg.name || 'Holiday Package'}</div>
          <div class="hol-meta">${tags.map((t) => `<span class="hol-tag">${t}</span>`).join('')}</div>
          <div class="hol-footer">
            <div>
              <div class="hol-price">${price.toLocaleString()} ${currency}</div>
              <div class="hol-price-label">per person</div>
            </div>
            <button class="hol-btn">View Details</button>
          </div>
        </div>
      </div>
    `;
  }

  function render(container, packages) {
    if (!container) return;
    if (!packages?.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate)">No holiday packages available</div>';
      return;
    }
    container.innerHTML = packages.map((p, i) => buildCard(p, i)).join('');
  }

  function selectPackage(index) {
    const packages = window.RESULTS?.holiday || [];
    const pkg = packages[index];
    if (!pkg) return;
    window.__selectedHolidayPackage = pkg;
    if (typeof window.go === 'function') window.go('booking');
  }

  window.holidayResultsStep = { render, selectPackage };
})();
