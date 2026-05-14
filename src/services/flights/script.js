(function () {
  'use strict';

  const STORAGE_BASE_URL = 'https://pub-6ef341e2a42b464fbaa5a56df21e6ec5.r2.dev';

  // State management for results
  window.FLIGHT_RESULTS_STATE = {
    originalItems: [],
    filteredItems: [],
    params: {},
    filters: {
      connections: [],
      flexibility: [],
      airlines: [],
      suppliers: [] // Added as per reference
    },
    sortBy: 'price', 
    expandedOffer: null,
    activeTabs: {}, // Store active tab per flightId
    selectedAirline: "" // For the airline strip
  };

  function getApiBase() {
    const cfg = window.KEENAN_CONFIG || {};
    return (cfg.apiBaseUrl || "http://localhost:3000/v1").replace(/\/$/, "");
  }

  // Load Component Resources
  let resourcesLoaded = null;
  function loadComponentResources() {
    if (resourcesLoaded) return resourcesLoaded;
    
    resourcesLoaded = new Promise((resolve) => {
      const head = document.head;
      if (!document.getElementById('fsc-styles')) {
        const link = document.createElement('link');
        link.id = 'fsc-styles';
        link.rel = 'stylesheet';
        link.href = './src/services/flights/search-card/index.css';
        head.appendChild(link);
      }
      const scriptId = 'fsc-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = './src/services/flights/search-card/index.js';
        script.onload = () => resolve();
        script.onerror = () => resolve(); 
        document.body.appendChild(script);
      } else {
        resolve();
      }
    });
    return resourcesLoaded;
  }

  async function apiRequest(path, options = {}) {
    const headers = { "Content-Type": "application/json" };
    const session = JSON.parse(localStorage.getItem("keenanTravelSession") || "null");
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;

    try {
      const res = await fetch(`${getApiBase()}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Request failed");
      return data;
    } catch (err) {
      console.error(`[API] Error at ${path}:`, err);
      throw err;
    }
  }

  function formatCurrency(amount, currency = 'AED') {
    if (window.KT && window.KT.format) {
      return window.KT.format(amount);
    }
    return `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  const COUNTRY_MAP = {
    'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia', 'EG': 'Egypt', 'PK': 'Pakistan',
    'GB': 'United Kingdom', 'US': 'United States', 'QA': 'Qatar', 'IN': 'India', 'OM': 'Oman', 'TR': 'Turkey'
  };

  function initAirportAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.acInit) return;
    input.dataset.acInit = "true";

    const wrap = document.createElement('div');
    wrap.className = 'ac-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const results = document.createElement('div');
    results.className = 'ac-results';
    wrap.appendChild(results);

    const suggested = [
      { iata: 'RUH', city: 'Riyadh', country: 'SA', name: 'King Khalid International Airport' },
      { iata: 'DXB', city: 'Dubai', country: 'AE', name: 'Dubai International Airport' },
      { iata: 'CAI', city: 'Cairo', country: 'EG', name: 'Cairo International Airport' }
    ];

    function renderItems(data, isSuggested = false) {
      if (!data || !data.length) {
        results.innerHTML = isSuggested ? '' : '<div class="p10 fs12 slate2">No airports found</div>';
        return;
      }
      const title = isSuggested ? '<div class="ac-title">Suggested Airports</div>' : '';
      results.innerHTML = title + data.map(a => {
        const countryName = COUNTRY_MAP[a.country] || a.country;
        const display = `(${a.iata}) ${a.city}, ${countryName}`;
        return `
          <div class="ac-item" data-code="${a.iata}" data-display="${display}">
            <div class="ac-top">
              <span class="ac-code-pill">${a.iata}</span>
              <span class="ac-city">${a.city}, ${countryName}</span>
            </div>
            <div class="ac-name">${a.name}</div>
          </div>
        `;
      }).join('');
    }

    input.addEventListener('focus', () => { if (!input.value.trim()) renderItems(suggested, true); });
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      const q = input.value.trim();
      if (q.length === 0) { renderItems(suggested, true); return; }
      if (q.length < 2) { results.innerHTML = ''; return; }
      timeout = setTimeout(async () => {
        try {
          const data = await apiRequest(`/airports/search?q=${encodeURIComponent(q)}`);
          renderItems(data);
        } catch (e) { results.innerHTML = ''; }
      }, 300);
    });

    results.addEventListener('click', (e) => {
      const item = e.target.closest('.ac-item');
      if (!item) return;
      input.value = item.dataset.display;
      results.innerHTML = '';
    });

    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) results.innerHTML = ''; });
  }

  async function fetchFlightResults(params) {
    const url = 'https://aeapi.keenantravel.com/GetAvailableOffers.php';
    const body = new URLSearchParams();
    body.append('Origin', params.from);
    body.append('Destination', params.to);
    body.append('TravelDate', params.date.split('T')[0]);
    body.append('Class', params.cabin_class || 'Economy');
    body.append('Adults', params.adult_count);
    body.append('Children', params.child_count);
    body.append('Infants', params.infant_count);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return mapApiData(data);
  }

  function mapApiData(apiResponse) {
    if (!apiResponse || !apiResponse.offers) return [];

    const { offers, segments, journeys, priceClasses, baggageDetails } = apiResponse;

    return offers.map(offer => {
      const journey = journeys[offer.journeyId];
      const journeySegments = journey.segmentIds.map(id => {
        const seg = segments[id];
        const baggage = offer.baggageIds ? offer.baggageIds.map(bId => baggageDetails[bId]).filter(b => b.segmentId === id)[0] : null;
        
        return {
          id: id,
          departure: seg.departure,
          arrival: seg.arrival,
          carrier: seg.carrier,
          carrierName: seg.carrierName,
          flightNumber: seg.flightNumber,
          equipment: seg.equipment,
          duration: seg.duration,
          cabin: priceClasses[offer.priceClassId]?.cabin || 'Economy',
          baggage: baggage ? `${baggage.quantity} ${baggage.unit}` : '15 KG'
        };
      });

      const firstSeg = journeySegments[0];
      const lastSeg = journeySegments[journeySegments.length - 1];

      return {
        offerId: offer.offerId,
        airline: firstSeg.carrier,
        airlineName: firstSeg.carrierName,
        departureTime: firstSeg.departure.at,
        arrivalTime: lastSeg.arrival.at,
        origin: firstSeg.departure.airport,
        destination: lastSeg.arrival.airport,
        duration: journey.totalDuration,
        stops: journeySegments.length - 1,
        stopsInfo: journeySegments.length > 1 ? journeySegments.slice(0, -1).map(s => s.arrival.airport).join(', ') : 'Direct',
        totalAmount: parseFloat(offer.price.total),
        currency: offer.price.currency,
        refundable: offer.refundable || false,
        segments: journeySegments,
        priceClass: priceClasses[offer.priceClassId],
        journey: journey
      };
    });
  }

  window.buildResults = async function (type) {
    if (type !== 'flights') return;

    const container = document.getElementById('view-results-flights');
    if (!container) return;

    // 1. Ensure resources are loaded
    await loadComponentResources();

    // 2. Fetch results using the logic in flight-results.js (which should be loaded by now)
    if (typeof window.fetchFlightResults === 'function') {
      window.fetchFlightResults();
    } else {
      // Fallback/Retry if script not yet executed
      setTimeout(() => {
        if (typeof window.fetchFlightResults === 'function') window.fetchFlightResults();
      }, 100);
    }
  };

  async function loadComponentResources() {
    return new Promise((resolve) => {
      const head = document.head;
      
      // Load CSS
      if (!document.getElementById('fsc-styles')) {
        const link = document.createElement('link');
        link.id = 'fsc-styles';
        link.rel = 'stylesheet';
        link.href = './src/services/flights/flight-search/flight-results.css';
        head.appendChild(link);
      }

      // Load JS
      const scriptId = 'fsc-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = './src/services/flights/flight-search/flight-results.js';
        script.onload = () => resolve();
        script.onerror = () => resolve(); 
        document.body.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  // Register module
  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules['service-flights'] = { 
    type: 'service', 
    mount() {
      // Init autocomplete
      ['flight-from', 'flight-to'].forEach(id => {
        const el = document.getElementById(id);
        if (el && typeof initAirportAutocomplete === 'function') initAirportAutocomplete(id);
      });
      
      // Trigger search if we're on the results page and have no data
      if (window.location.hash.startsWith('#/results/flights')) {
        window.buildResults('flights');
      }
    } 
  };
})();

