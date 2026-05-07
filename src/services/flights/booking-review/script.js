(function () {
  function formatTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function render(containerSelector) {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!container) return;

    const flight = window.__selectedFlight || {};
    const pax = (window.passengerDetailsStep?.getData()) || {};
    const total = flight.totalAmount || 0;
    const currency = flight.currency || 'AED';

    container.innerHTML = `
      <div class="br-card">
        <div class="br-card-title">Flight Details</div>
        <div class="br-flight-row">
          <div class="br-airline-tag">${flight.airline || '—'} ${flight.flightNumber || ''}</div>
          <div class="br-route">
            <div class="br-route-times">${formatTime(flight.departureTime)} → ${formatTime(flight.arrivalTime)}</div>
            <div class="br-route-codes">${flight.origin || '—'} → ${flight.destination || '—'}</div>
          </div>
          <div class="br-fare">
            <div class="br-fare-class">${flight.fareClass || ''} · ${flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop(s)`}</div>
            <div class="br-fare-amount">${Number(total).toLocaleString()} ${currency}</div>
          </div>
        </div>
      </div>

      <div class="br-card">
        <div class="br-card-title">Passenger</div>
        <div class="br-pax-row">
          <div>
            <div class="br-pax-name">${pax.firstName || ''} ${pax.lastName || ''}</div>
            <div class="br-pax-meta">${pax.nationality || ''} · Passport: ${pax.passportNumber || '—'}</div>
          </div>
          <div class="br-pax-type">ADT</div>
        </div>
      </div>

      <div class="br-card">
        <div class="br-card-title">Price Summary</div>
        <div class="br-price-row"><span>Base Fare</span><span class="amount">${Number(flight.baseAmount || 0).toLocaleString()} ${currency}</span></div>
        <div class="br-price-row"><span>Taxes &amp; Fees</span><span class="amount">${Number(flight.taxAmount || 0).toLocaleString()} ${currency}</span></div>
        ${flight.carryOn ? `<div class="br-price-row"><span>Carry-on</span><span>${flight.carryOn}</span></div>` : ''}
        ${flight.checkIn ? `<div class="br-price-row"><span>Check-in Baggage</span><span>${flight.checkIn}</span></div>` : ''}
        <div class="br-price-row total"><span>Total</span><span class="amount">${Number(total).toLocaleString()} ${currency}</span></div>
      </div>
    `;
  }

  window.bookingReviewStep = { render };
})();
