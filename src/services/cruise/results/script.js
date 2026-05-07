(function () {
  function buildCard(pkg, index) {
    const price = Number(pkg.price_per_person || 0);
    const currency = pkg.currency || 'AED';
    const tags = [
      pkg.nights ? `${pkg.nights} nights` : null,
      pkg.cabin_type ? pkg.cabin_type.replace(/_/g, ' ') : null,
      pkg.cruise_line || null,
    ].filter(Boolean);

    return `
      <div class="cru-card" onclick="window.cruiseResultsStep.selectPackage(${index})">
        <div class="cru-icon">🚢</div>
        <div class="cru-info">
          <div class="cru-name">${pkg.name || 'Cruise Package'}</div>
          <div class="cru-ship">🛳️ ${pkg.ship_name || ''} · Departing from ${pkg.departure_port || '—'}</div>
          <div class="cru-route">📍 ${pkg.route || '—'}</div>
          <div class="cru-tags">${tags.map((t) => `<span class="cru-tag">${t}</span>`).join('')}</div>
        </div>
        <div class="cru-price-col">
          <div class="cru-price">${price.toLocaleString()} ${currency}</div>
          <div class="cru-price-label">per person</div>
          <button class="cru-btn">Book</button>
        </div>
      </div>
    `;
  }

  function render(container, packages) {
    if (!container) return;
    if (!packages?.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate)">No cruise packages available</div>';
      return;
    }
    container.innerHTML = packages.map((p, i) => buildCard(p, i)).join('');
  }

  function selectPackage(index) {
    const packages = window.RESULTS?.cruise || [];
    const pkg = packages[index];
    if (!pkg) return;
    window.__selectedCruisePackage = pkg;
    if (typeof window.go === 'function') window.go('booking');
  }

  window.cruiseResultsStep = { render, selectPackage };
})();
