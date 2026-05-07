(function () {
  const API = () => ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');

  function formatDuration(mins) {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function buildFlightCard(flight, index) {
    const badges = [
      flight.canBeHeld ? '<span class="fr-badge hold">Hold Available</span>' : '',
      flight.haveBundles ? '<span class="fr-badge bundles">Bundles</span>' : '',
    ].filter(Boolean).join('');

    return `
      <div class="fr-card" id="fr-card-${index}" onclick="window.flightResultsStep.selectFlight(${index})">
        <div class="fr-airline-logo">${(flight.airline || '').substring(0, 2)}</div>
        <div class="fr-route">
          <div class="fr-times">
            <span class="fr-time">${formatTime(flight.departureTime)}</span>
            <span class="fr-arrow">→</span>
            <span class="fr-time">${formatTime(flight.arrivalTime)}</span>
          </div>
          <div class="fr-codes">${flight.origin || '—'} → ${flight.destination || '—'}</div>
          <div class="fr-stops">${flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop(s)`} · ${flight.airline || ''} ${flight.flightNumber || ''} · ${flight.fareClass || ''}${badges}</div>
        </div>
        <div class="fr-duration">${formatDuration(flight.flightMinutes)}</div>
        <div class="fr-price">
          <div class="fr-amount">${Number(flight.totalAmount || 0).toLocaleString()}</div>
          <div class="fr-currency">${flight.currency || 'AED'}</div>
          <button class="fr-select-btn">Select</button>
        </div>
      </div>
    `;
  }

  function renderFlights(container, flights) {
    if (!flights || !flights.length) {
      container.innerHTML = `
        <div class="fr-empty">
          <div class="fr-empty-icon">✈️</div>
          <div class="fr-empty-title">No flights found</div>
          <div>Try adjusting your search criteria</div>
        </div>`;
      return;
    }
    container.innerHTML = flights.map((f, i) => buildFlightCard(f, i)).join('');
  }

  function selectFlight(index) {
    const flights = window.__flightResults || [];
    const flight = flights[index];
    if (!flight) return;

    document.querySelectorAll('.fr-card').forEach((el) => el.classList.remove('selected'));
    const card = document.getElementById(`fr-card-${index}`);
    if (card) card.classList.add('selected');

    window.__selectedOfferId = flight.offerId;
    window.__selectedFlight = flight;

    if (typeof window.go === 'function') window.go('booking');
    if (typeof window.fareConfirmAndAddPassengers === 'function') {
      window.fareConfirmAndAddPassengers(flight.offerId, flight);
    }
  }

  window.flightResultsStep = {
    render: renderFlights,
    selectFlight,
    formatTime,
    formatDuration,
  };
})();
