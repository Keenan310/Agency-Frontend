(function () {
  'use strict';

  // Shared NDC offer state threaded through the booking flow
  const _state = {
    selectedOfferId: null,
    confirmedOfferId: null,
    bookingOfferId: null,
    haveBundles: false,
    canBeHeld: false,
    bundles: null,
    selectedBundles: [],
    confirmedAmount: null,
  };

  function apiBase() {
    const cfg = window.KEENAN_CONFIG || {};
    return (cfg.apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
  }

  async function post(path, body) {
    const session = JSON.parse(localStorage.getItem('keenanTravelSession') || 'null');
    const headers = { 'Content-Type': 'application/json' };
    if (session?.token) headers['Authorization'] = 'Bearer ' + session.token;
    const res = await fetch(apiBase() + path, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  // ── Flight search ────────────────────────────────────────────────────────────
  window.searchFlightsLive = async function searchFlightsLive() {
    const from = document.querySelector('[data-role="dep-airport"]')?.value
              || document.querySelector('#sw-flights [data-role="from"]')?.value || 'DXB';
    const to   = document.querySelector('[data-role="arr-airport"]')?.value
              || document.querySelector('#sw-flights [data-role="to"]')?.value
              || document.querySelector('#sw-flights input[placeholder="Destination"]')?.value || 'LHR';
    const date = document.querySelector('#sw-flights [type="date"]')?.value || new Date().toISOString().slice(0, 10);

    if (typeof window.go === 'function') window.go('results-flights');

    const container = document.getElementById('view-results-flights');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center;padding:80px 32px">
          <div style="font-size:48px;margin-bottom:16px">✈</div>
          <div style="font-family:var(--serif,serif);font-size:28px;font-weight:700;color:var(--ink,#0B1120)">Searching Flights…</div>
          <div style="color:var(--slate,#64748b);margin-top:8px">Checking live availability and fares</div>
        </div>`;
    }

    try {
      const counts = window.KT_PAX_COUNTS || { adult: 1, child: 0, infant: 0 };
      const data = await post('/flights/search', {
        from,
        to,
        date: date.includes('T') ? date : date + 'T00:00:00.000Z',
        adult_count: counts.adult,
        child_count: counts.child,
        infant_count: counts.infant
      });

      const flights = data.data || [];
      if (typeof window.RESULTS !== 'undefined') {
        window.RESULTS['flights'] = {
          title: `${from} → ${to}`,
          sub: `${date} · 1 Adult · ${flights.length} flight${flights.length !== 1 ? 's' : ''} found`,
          items: flights.map((f) => ({
            offerId:     f.offerId,
            haveBundles: f.haveBundles,
            canBeHeld:   f.canBeHeld,
            name:        `${f.airline} · ${f.flightNumber}`,
            tags: [
              f.stops === 0 ? 'Non-stop' : `${f.stops} Stop${f.stops > 1 ? 's' : ''}`,
              f.flightMinutes ? `${Math.floor(f.flightMinutes / 60)}h ${f.flightMinutes % 60}m` : '',
              f.departureTime ? new Date(f.departureTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' → ' + (f.arrivalTime ? new Date(f.arrivalTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '') : '',
              f.aircraft || '',
            ].filter(Boolean),
            meta: [
              `${f.cabin || 'Y'} · ${f.checkIn || '—'} check-in`,
              f.fareType || '',
            ].filter(Boolean),
            price:        _formatAmount(f.totalAmount, f.currency),
            plabel:       'per person',
            rating:       '',
            bg:           '#1e3a5f',
            _ndcOfferId:  f.offerId,
            _currency:    f.currency,
            _amount:      f.totalAmount,
          })),
        };
        if (typeof window.buildResults === 'function') window.buildResults('flights');
      } else if (container) {
        container.innerHTML = _renderFlightCards(flights);
      }
    } catch (err) {
      if (container) {
        container.innerHTML = `
          <div style="text-align:center;padding:80px 32px;color:var(--red,#dc2626)">
            <div style="font-size:36px;margin-bottom:12px">⚠</div>
            <div style="font-size:18px;font-weight:700">${_esc(err.message || 'Search failed')}</div>
            <button style="margin-top:20px;padding:10px 24px;border:1.5px solid currentColor;border-radius:8px;background:transparent;cursor:pointer;font-size:14px" onclick="if(window.go)window.go('home')">← Back</button>
          </div>`;
      }
    }
  };

  // ── Select offer ─────────────────────────────────────────────────────────────
  window.selectFlightOffer = function selectFlightOffer(offerId) {
    _state.selectedOfferId = offerId;
  };

  // ── Fare confirm + add passengers (called before showing payment step) ───────
  window.fareConfirmAndAddPassengers = async function fareConfirmAndAddPassengers() {
    const offerId = _state.selectedOfferId || window.__selectedOfferId;
    if (!offerId) throw new Error('No flight selected');

    // FareConfirm
    const fc = await post('/flights/fare-confirm', { offerId });
    _state.confirmedOfferId = fc.offerId;
    _state.haveBundles      = fc.confirmed?.haveBundles || false;
    _state.canBeHeld        = fc.confirmed?.canBeHeld   || false;
    _state.bundles          = fc.bundles || null;
    _state.confirmedAmount  = fc.confirmed?.priceDetails?.totalAmount || null;

    // AddPassengers
    const paxPayload = _buildPassengerPayload(fc.offerId);
    const ap = await post('/flights/add-passengers', paxPayload);
    _state.bookingOfferId = ap.offerId;

    // Expose to legacy code
    window.__confirmedOfferId = fc.offerId;
    window.__bookingOfferId   = ap.offerId;
    window.__haveBundles      = _state.haveBundles;
    window.__canBeHeld        = _state.canBeHeld;
    window.__selectedBundles  = [];

    return { confirmedAmount: _state.confirmedAmount, canBeHeld: _state.canBeHeld };
  };

  // ── Build passenger payload from booking form Step 3 fields ─────────────────
  function _buildPassengerPayload(offerId) {
    const g = (id) => document.getElementById(id)?.value || '';
    return {
      OfferId: offerId,
      Passengers: {
        Pax1: {
          PassengerTypeCode: 'ADT',
          Title:    g('bk-title') || 'MR',
          Gender:   g('bk-gender') || 'Male',
          Name:     { First: g('bk-fname'), Middle: '', Last: g('bk-lname') },
          BirthDate: g('bk-dob'),
          NationalityCountryCode: g('bk-nationality') || 'AE',
          ResidenceCountryCode:   g('bk-nationality') || 'AE',
          ParentPassengerRefId: null,
          TravelDocument: {
            DocumentNumber:         g('bk-passport'),
            DocumentType:           'Passport',
            Name:                   { First: g('bk-fname'), Middle: '', Last: g('bk-lname') },
            Gender:                 g('bk-gender') || 'Male',
            BirthDate:              g('bk-dob'),
            ExpirationDate:         g('bk-passport-expiry'),
            IssuanceDate:           g('bk-passport-issue'),
            BirthCountryCode:       g('bk-nationality') || 'AE',
            NationalityCountryCode: g('bk-nationality') || 'AE',
            IssuanceCountryCode:    g('bk-nationality') || 'AE',
          },
          Contact: {
            Email: g('bk-email'),
            Phone: {
              CountryDialingCode: '+971',
              PhoneNumber: g('bk-phone').replace(/\D/g, ''),
              Type: 'Mobile',
            },
            Address: { CountryCode: 'AE', CityCode: 'Dubai', Line1: '', Line2: '' },
          },
        },
      },
    };
  }

  window.buildPassengerPayload = _buildPassengerPayload;

  // ── Simple fallback card renderer ────────────────────────────────────────────
  function _renderFlightCards(flights) {
    if (!flights.length) return '<div style="padding:40px;text-align:center;color:var(--slate)">No flights found for this route.</div>';
    return `<div style="display:flex;flex-direction:column;gap:16px;padding:24px">${
      flights.map((f) => `
        <div style="background:var(--surface,#fff);border:1.5px solid var(--surface3,#e2e8f0);border-radius:12px;padding:20px;display:flex;justify-content:space-between;align-items:center;gap:16px">
          <div>
            <div style="font-weight:700;font-size:15px">${_esc(f.airline)} · ${_esc(f.flightNumber)}</div>
            <div style="color:var(--slate,#64748b);font-size:13px;margin-top:4px">${_esc(f.origin)} → ${_esc(f.destination)} · ${_esc(String(f.stops === 0 ? 'Non-stop' : f.stops + ' stop(s)'))}</div>
          </div>
          <div style="font-weight:700;font-size:18px">${_formatAmount(f.totalAmount, f.currency)}</div>
        </div>`).join('')
    }</div>`;
  }

  function _formatAmount(amount, currency) {
    if (typeof window.KT?.format === 'function') return window.KT.format(amount);
    return `${currency || 'AED'} ${Number(amount || 0).toLocaleString()}`;
  }

  function _esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Register module
  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules['service-flights'] = { type: 'service', mount() {} };
})();
