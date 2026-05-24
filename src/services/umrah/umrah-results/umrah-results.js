(function () {
  function buildCard(pkg, index) {
    const price = Number(pkg.price_per_person || pkg.pricePerPerson || 0);
    const currency = pkg.currency || 'AED';
    const nights = pkg.nights || pkg.duration_nights || '—';
    const hotel = pkg.hotel_name || pkg.hotelName || '';
    const includes = [
      pkg.flights_included ? 'Flights' : null,
      pkg.visa_included ? 'Visa' : null,
      pkg.transport_included ? 'Transport' : null,
      `${pkg.star_rating || ''}⭐`,
    ].filter(Boolean);

    return `
      <div class="umr-card" onclick="window.umrahResultsStep.selectPackage(${index})">
        <div class="umr-card-header">
          <div class="umr-name">${pkg.name || 'Umrah Package'}</div>
          <div class="umr-nights">${nights} Nights</div>
        </div>
        ${hotel ? `<div class="umr-hotel">🏨 ${hotel}</div>` : ''}
        <div class="umr-includes">${includes.map((t) => `<span class="umr-tag">${t}</span>`).join('')}</div>
        <div class="umr-footer">
          <div>
            <div class="umr-price">${price.toLocaleString()} ${currency}</div>
            <div class="umr-price-label">per person</div>
          </div>
          <button class="umr-btn">Book Now</button>
        </div>
      </div>
    `;
  }

  function render(container, packages) {
    if (!container) return;
    if (!packages?.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate)">No packages available</div>';
      return;
    }
    container.innerHTML = packages.map((p, i) => buildCard(p, i)).join('');
  }

  function selectPackage(index) {
    const packages = window.RESULTS?.umrah || [];
    const pkg = packages[index];
    if (!pkg) return;
    window.__selectedUmrahPackage = pkg;
    if (typeof window.go === 'function') window.go('booking');
  }

  window.umrahResultsStep = { render, selectPackage };
})();
