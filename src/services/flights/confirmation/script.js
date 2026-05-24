(function () {
  function formatTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function render(containerSelector, booking) {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!container) return;

    const ref      = booking?.reference || '—';
    const pnr      = booking?.airlinePnr || 'Pending';
    const ticket   = booking?.ticketNumber || 'Pending';
    const flight   = window.__selectedFlight || {};
    const paxName  = (() => {
      try {
        const pax = window.passengerDetailsStep?.getData() || {};
        return `${pax.firstName || ''} ${pax.lastName || ''}`.trim() || '—';
      } catch { return '—'; }
    })();

    container.innerHTML = `
      <div class="conf-wrap">
        <div class="conf-icon">✅</div>
        <div class="conf-title">Payment Successful</div>
        <div class="conf-subtitle">
        Your payment was received successfully.
        Airline ticketing and PNR generation are currently pending.
        </div>

        <div class="conf-ref-card">
          <div class="conf-ref-label">Temporary Booking Reference</div>
          <div class="conf-ref-value">${ref}</div>
        </div>

        <div class="conf-details">
          <div class="conf-detail-row">
            <div class="conf-detail-label">Airline PNR Status</div>
            <div class="conf-detail-value" data-confirm-pnr="${pnr}">${pnr}</div>
          </div>
          <div class="conf-detail-row">
            <div class="conf-detail-label">Ticket Status</div>
            <div class="conf-detail-value" data-confirm-ticket="${ticket}">${ticket}</div>
          </div>
          <div class="conf-detail-row">
            <div class="conf-detail-label">Passenger</div>
            <div class="conf-detail-value">${paxName}</div>
          </div>
          <div class="conf-detail-row">
            <div class="conf-detail-label">Flight</div>
            <div class="conf-detail-value">${flight.airline || '—'} ${flight.flightNumber || ''}</div>
          </div>
          <div class="conf-detail-row">
            <div class="conf-detail-label">Route</div>
            <div class="conf-detail-value">${flight.origin || '—'} → ${flight.destination || '—'}</div>
          </div>
          <div class="conf-detail-row">
            <div class="conf-detail-label">Departure</div>
            <div class="conf-detail-value">${formatTime(flight.departureTime)}</div>
          </div>
        </div>

        <div class="conf-actions">
          <button class="conf-btn primary" onclick="window.go && go('track')">Track Booking</button>
          <button class="conf-btn secondary" onclick="window.go && go('home')">Back to Home</button>
        </div>
      </div>
    `;
  }

  window.flightConfirmationStep = { render };
})();
