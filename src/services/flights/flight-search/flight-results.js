// =======================
// STATE & CONFIG
// =======================

const state = {
  openFlightId: null,
  activeTabs: {},
  sortBy: "price",
  selectedAirline: "",
  selectedFareIndices: {}, // flightId -> index
  selectedBundles: {},     // flightId -> [bundleId, ...]
  searchParams: {
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "Economy",
    preferredAirlines: [] // For Advanced Search
  },
  showAdvanced: false,
  showPassengerDropdown: false,
  filters: {
    connections: [],
    flexibility: [],
    airlines: [],
    suppliers: []
  }
};

const tabs = ["Fare Categories", "Fare Rules", "Add-ons", "Flight Details"];

const AVAILABLE_BUNDLES = [
  { id: "bag-23", category: "Baggage", name: "Extra Bag (23KG)", price: 150, description: "Add one extra piece of checked baggage." },
  { id: "bag-32", category: "Baggage", name: "Extra Bag (32KG)", price: 250, description: "Add one extra piece of checked baggage." },
  { id: "meal-std", category: "Dining", name: "Standard Meal", price: 45, description: "Hot meal service during the flight." },
  { id: "seat-std", category: "Seating", name: "Standard Seat Choice", price: 30, description: "Select your preferred standard seat." },
  { id: "flex-ref", category: "Flexibility", name: "Refundable Fare", price: 300, description: "Make your ticket refundable with a smaller fee." }
];
let flights = []; // Live flights will be stored here

window.scrollAirlineStrip = (dir) => {
  const el = document.getElementById('airlineStrip');
  if (el) el.scrollBy({ left: dir * 200, behavior: 'smooth' });
};

// =======================
// API DATA FETCHING
// =======================

function syncSearchParamsFromURL() {
  const params = new URLSearchParams(window.location.search);
  state.searchParams.origin = params.get("origin") || "";
  state.searchParams.destination = params.get("destination") || "";
  state.searchParams.departureDate = params.get("departureDate") || "";
  state.searchParams.returnDate = params.get("returnDate") || "";
  state.searchParams.adults = parseInt(params.get("adults") || "1");
  state.searchParams.children = parseInt(params.get("children") || "0");
  state.searchParams.infants = parseInt(params.get("infants") || "0");
  state.searchParams.cabinClass = params.get("cabinClass") || "Economy";
  
  const preferred = params.get("airlines");
  state.searchParams.preferredAirlines = preferred ? preferred.split(",") : [];
}

window.fetchFlightResults = async function() {
  syncSearchParamsFromURL();
  const { searchParams } = state;
  const searchBody = {
    origin: searchParams.origin,
    destination: searchParams.destination,
    departureDate: searchParams.departureDate,
    returnDate: searchParams.returnDate,
    adults: searchParams.adults,
    children: searchParams.children,
    infants: searchParams.infants,
    cabinClass: searchParams.cabinClass
  };

  showLoading(true);

  try {
    const apiBase = (window.KEENAN_CONFIG && window.KEENAN_CONFIG.apiBaseUrl) || "http://localhost:3000/v1";
    const response = await fetch(`${apiBase}/flights/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) throw new Error("Failed to fetch flight results");

    const resJson = await response.json();
    if (resJson && resJson.data) {
      flights = mapBackendData(resJson.data);
    } else {
      flights = [];
    }
  } catch (error) {
    console.error("Flight Search Error:", error);
    flights = [];
    const resultsEl = document.getElementById("flightResults");
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div class="empty-state">
          <p>Something went wrong: ${error.message}</p>
          <button onclick="window.buildResults('flights')" class="search-btn" style="margin-top: 15px;">Retry Search</button>
        </div>
      `;
    }
  } finally {
    showLoading(false);
    renderAll();
  }
}

function mapBackendData(backendFlights) {
  return backendFlights.map(f => {
    // Map backend itinerary segments to frontend segment format
    const segments = (f.itinerary || []).map(s => ({
      airline: s.airlineName,
      airlineCode: s.airline,
      flightNo: s.flightNumber,
      aircraft: s.aircraft || "Aircraft",
      cabin: s.cabin || "Economy",
      from: s.origin,
      fromCity: s.originCity || s.origin,
      fromAirport: s.departureTerminal ? `Terminal ${s.departureTerminal}` : "Main",
      fromTerminal: s.departureTerminal || "",
      to: s.destination,
      toCity: s.destinationCity || s.destination,
      toAirport: s.arrivalTerminal ? `Terminal ${s.arrivalTerminal}` : "Main",
      toTerminal: s.arrivalTerminal || "",
      departureDateTime: s.departureTime,
      arrivalDateTime: s.arrivalTime,
      durationMinutes: s.durationMinutes,
      duration: formatDuration(s.durationMinutes),
      baggage: s.baggage?.checkIn || "Check Rules"
    }));

    const firstSeg = segments[0] || {};
    const lastSeg = segments[segments.length - 1] || {};

    return {
      id: f.offerId,
      airline: f.airlineName,
      airlineCode: f.airline,
      supplier: "Keenan API",
      refundable: f.fareType !== "NotRefundable",
      connectionType: f.stops === 0 ? "Non stop" : `${f.stops} Stop${f.stops > 1 ? "s" : ""}`,
      flightNo: f.flightNumber,
      from: f.origin,
      to: f.destination,
      depart: formatTime(f.departureTime),
      arrive: formatTime(f.arrivalTime),
      durationMinutes: f.flightMinutes,
      duration: formatDuration(f.flightMinutes),
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      cabin: firstSeg.cabin || "Economy",
      stops: f.stops === 0 ? "Non Stop" : `${f.stops} Stop${f.stops > 1 ? "s" : ""} via ${segments.slice(0, -1).map(s => s.to).join(", ")}`,
      priceAmount: f.totalAmount,
      currency: f.currency,
      logo: f.logo,
      segments: segments,
      baggage: {
        cabin: "7KG cabin baggage included",
        checked: firstSeg.baggage || "Check Rules",
        infant: "Check airline rules",
        note: "Baggage details provided by API."
      },
      rules: [
        f.fareType === "NotRefundable" ? "This fare is non-refundable." : "Refundable as per airline policy.",
        "Date change is subject to airline penalties.",
        "Supplier rules must be verified before final ticketing."
      ],
      fareOptions: (f.fareOptions || []).map(opt => ({
        offerId: opt.offerId,
        name: opt.fareName || "Standard",
        baggage: opt.baggage?.checkIn || "Check Rules",
        refund: f.fareType === "NotRefundable" ? "Non Refundable" : "Refundable",
        seat: "Standard Seat",
        meal: "Meal Included",
        priceAmount: opt.totalAmount,
        currency: f.currency
      }))
    };
  });
}

// =======================
// HELPERS
// =======================

function money(amount, currency = "AED") {
  return `${currency} ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatTime(dateTime) {
  if (!dateTime) return "--:--";
  return new Date(dateTime).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatDate(dateTime) {
  if (!dateTime) return "";
  return new Date(dateTime).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDuration(minutes) {
  if (!minutes) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function calculateLayover(currentSegment, nextSegment) {
  if (!currentSegment?.arrivalDateTime || !nextSegment?.departureDateTime) {
    return "Layover time not available";
  }

  const diffMs = new Date(nextSegment.departureDateTime) - new Date(currentSegment.arrivalDateTime);
  if (diffMs <= 0) return "Layover time not available";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}h ${minutes}m layover`;
  if (hours) return `${hours}h layover`;
  return `${minutes}m layover`;
}

function getAirlineOptions() {
  const map = new Map();
  flights.forEach((flight) => {
    const current = map.get(flight.airline);
    if (!current || flight.priceAmount < current.priceAmount) {
      map.set(flight.airline, flight);
    }
  });
  return Array.from(map.values()).sort((a, b) => a.priceAmount - b.priceAmount);
}

function getFilterOptions() {
  return {
    connections: [...new Set(flights.map((f) => f.connectionType))],
    flexibility: ["Refundable", "Non Refundable"],
    airlines: [...new Set(flights.map((f) => f.airline))],
    suppliers: [...new Set(flights.map((f) => f.supplier))]
  };
}

function getFilteredFlights() {
  let list = [...flights];

  if (state.selectedAirline) {
    list = list.filter((f) => f.airline === state.selectedAirline);
  }

  if (state.filters.connections.length) {
    list = list.filter((f) => state.filters.connections.includes(f.connectionType));
  }

  if (state.filters.airlines.length) {
    list = list.filter((f) => state.filters.airlines.includes(f.airline));
  }

  if (state.filters.suppliers.length) {
    list = list.filter((f) => state.filters.suppliers.includes(f.supplier));
  }

  if (state.filters.flexibility.length) {
    list = list.filter((f) =>
      state.filters.flexibility.includes(f.refundable ? "Refundable" : "Non Refundable")
    );
  }

  // Advanced Search - Airline Filter
  if (state.searchParams.preferredAirlines.length) {
    list = list.filter((f) => state.searchParams.preferredAirlines.includes(f.airline));
  }

  return list.sort((a, b) => {
    if (state.sortBy === "airline") return a.airline.localeCompare(b.airline);
    if (state.sortBy === "departure") return a.depart.localeCompare(b.depart);
    if (state.sortBy === "arrival") return a.arrive.localeCompare(b.arrive);
    if (state.sortBy === "duration") return a.durationMinutes - b.durationMinutes;
    return a.priceAmount - b.priceAmount;
  });
}

function showLoading(active) {
  const el = document.getElementById("flightResults");
  if (!el) return;
  if (active) {
    el.innerHTML = `
      <div class="loading-state">
        <span class="loader"></span>
        <p>Searching for live flight offers...</p>
      </div>
    `;
  }
}

// =======================
// RENDER FUNCTIONS (Strictly following Reference/Search-card)
// =======================

function renderSearchSummary() {
  const el = document.getElementById("searchSummary");
  if (!el) return;
  
  const { searchParams } = state;
  const totalPassengers = searchParams.adults + searchParams.children + searchParams.infants;

  el.innerHTML = `
    <div class="search-bar-inner">
      <div class="search-main-row">
        <div class="search-field compact">
          <label>From</label>
          <input type="text" value="${searchParams.origin}" placeholder="Origin" onchange="updateSearchParam('origin', this.value)" />
        </div>
        
        <div class="search-field compact">
          <label>To</label>
          <input type="text" value="${searchParams.destination}" placeholder="Destination" onchange="updateSearchParam('destination', this.value)" />
        </div>

        <div class="search-field compact">
          <label>Depart</label>
          <input type="date" value="${searchParams.departureDate}" onchange="updateSearchParam('departureDate', this.value)" />
        </div>

        <div class="search-field compact">
          <label>Return</label>
          <input type="date" value="${searchParams.returnDate}" onchange="updateSearchParam('returnDate', this.value)" />
        </div>

        <div class="search-field compact dropdown-container">
          <label>Passengers</label>
          <div class="pseudo-input" onclick="togglePassengerDropdown(event)">
            ${totalPassengers} Passenger${totalPassengers > 1 ? 's' : ''} ⌄
          </div>
          ${state.showPassengerDropdown ? renderPassengerDropdown() : ''}
        </div>

        <div class="search-field compact">
          <label>Class</label>
          <select onchange="updateSearchParam('cabinClass', this.value)">
            ${["Economy", "Premium Economy", "Business", "First Class"].map(c => `
              <option value="${c}" ${searchParams.cabinClass === c ? "selected" : ""}>${c}</option>
            `).join("")}
          </select>
        </div>

        <button class="primary-search-btn" onclick="performNewSearch()">
           Search
        </button>
      </div>

      <div class="advanced-trigger-area">
        <button class="advanced-toggle" onclick="toggleAdvanced(event)">
          ${state.showAdvanced ? 'Hide Advanced Options ▴' : 'Advanced Search (Airlines) ▾'}
        </button>
      </div>

      ${state.showAdvanced ? renderAdvancedOptions() : ''}
    </div>
  `;
}

window.updateSearchParam = (key, value) => {
  state.searchParams[key] = value;
};

window.performNewSearch = () => {
  const sp = state.searchParams;
  const url = new URL(window.location);
  url.searchParams.set("origin", sp.origin);
  url.searchParams.set("destination", sp.destination);
  url.searchParams.set("departureDate", sp.departureDate);
  url.searchParams.set("returnDate", sp.returnDate);
  url.searchParams.set("adults", sp.adults);
  url.searchParams.set("children", sp.children);
  url.searchParams.set("infants", sp.infants);
  url.searchParams.set("cabinClass", sp.cabinClass);
  
  if (sp.preferredAirlines.length) {
    url.searchParams.set("airlines", sp.preferredAirlines.join(","));
  } else {
    url.searchParams.delete("airlines");
  }

  window.history.pushState({}, '', url);
  fetchFlightResults();
};

window.togglePassengerDropdown = (e) => {
  e.stopPropagation();
  state.showPassengerDropdown = !state.showPassengerDropdown;
  renderAll();
};

function renderPassengerDropdown() {
  const { adults, children, infants } = state.searchParams;
  return `
    <div class="passenger-dropdown" onclick="event.stopPropagation()">
      <div class="pax-row">
        <span>Adults <small>12+ yrs</small></span>
        <div class="pax-ctrl">
          <button onclick="updatePax('adults', -1)">-</button>
          <span>${adults}</span>
          <button onclick="updatePax('adults', 1)">+</button>
        </div>
      </div>
      <div class="pax-row">
        <span>Children <small>2-12 yrs</small></span>
        <div class="pax-ctrl">
          <button onclick="updatePax('children', -1)">-</button>
          <span>${children}</span>
          <button onclick="updatePax('children', 1)">+</button>
        </div>
      </div>
      <div class="pax-row">
        <span>Infants <small>0-2 yrs</small></span>
        <div class="pax-ctrl">
          <button onclick="updatePax('infants', -1)">-</button>
          <span>${infants}</span>
          <button onclick="updatePax('infants', 1)">+</button>
        </div>
      </div>
      <div class="pax-footer">
        <button class="done-btn" onclick="closePaxDropdown()">Done</button>
      </div>
    </div>
  `;
}

window.updatePax = (type, diff) => {
  const current = state.searchParams[type];
  const next = Math.max(type === 'adults' ? 1 : 0, current + diff);
  state.searchParams[type] = next;
  renderAll();
};

window.closePaxDropdown = () => {
  state.showPassengerDropdown = false;
  renderAll();
};

window.toggleAdvanced = (e) => {
  state.showAdvanced = !state.showAdvanced;
  renderAll();
};

function renderAdvancedOptions() {
  const allAirlines = [...new Set(flights.map(f => f.airline))];
  if (!allAirlines.length) return `<div class="advanced-panel empty">Search to see available airlines</div>`;
  
  return `
    <div class="advanced-panel">
      <div class="panel-label">Select Airlines to Show</div>
      <div class="airline-filter-list">
        ${allAirlines.map(name => `
          <div class="airline-list-item">
            <label class="airline-check-label">
              <input type="checkbox" 
                ${state.searchParams.preferredAirlines.length === 0 || state.searchParams.preferredAirlines.includes(name) ? 'checked' : ''} 
                onchange="toggleAirlineFilter('${name}')"
              />
              <span class="airline-name">${name}</span>
            </label>
          </div>
        `).join("")}
      </div>
      <div class="panel-note">* Deselect airlines to exclude them from results.</div>
    </div>
  `;
}

window.toggleAirlineFilter = (name) => {
  const current = state.searchParams.preferredAirlines;
  if (current.includes(name)) {
    state.searchParams.preferredAirlines = current.filter(n => n !== name);
  } else {
    state.searchParams.preferredAirlines = [...current, name];
  }
  renderAll();
};

// Handle clicks outside to close dropdowns
document.addEventListener("click", () => {
  if (state.showPassengerDropdown) {
    state.showPassengerDropdown = false;
    renderAll();
  }
});

function renderAirlineStrip() {
  const listEl = document.getElementById("airlineStrip");
  const sectionEl = listEl?.closest(".airline-strip");
  if (!listEl || !sectionEl) return;

  const airlineOptions = getAirlineOptions();
  listEl.innerHTML = airlineOptions
    .map((flight) => `
      <button
        class="airline-chip ${state.selectedAirline === flight.airline ? "active" : ""}"
        type="button"
        data-airline="${flight.airline}"
      >
        <img src="${flight.logo}" alt="${flight.airline}" />
        <span>
          <div class="airline-name-chip">${flight.airlineCode || flight.airline}</div>
          <div class="airline-price-chip">${money(flight.priceAmount, flight.currency)}</div>
        </span>
      </button>
    `)
    .join("");

  // Check for overflow and show/hide arrows
  setTimeout(() => {
    const isOverflowing = listEl.scrollWidth > listEl.clientWidth;
    sectionEl.querySelectorAll(".strip-arrow").forEach(arrow => {
      arrow.style.display = isOverflowing ? "block" : "none";
    });
    // If not overflowing, center the items
    listEl.style.justifyContent = isOverflowing ? "flex-start" : "center";
  }, 0);

  listEl.querySelectorAll(".airline-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const airline = btn.dataset.airline;
      state.selectedAirline = state.selectedAirline === airline ? "" : airline;
      renderAll();
    });
  });

  // Handle arrows
  sectionEl.querySelectorAll(".strip-arrow").forEach((arrow, idx) => {
    arrow.onclick = () => {
      const direction = idx === 0 ? -1 : 1;
      listEl.scrollBy({ left: 300 * direction, behavior: "smooth" });
    };
  });
}

function renderSortBar() {
  const el = document.getElementById("sortBar");
  if (!el) return;

  const items = [
    ["airline", "Airline"],
    ["departure", "Departure"],
    ["arrival", "Arrival"],
    ["duration", "Duration"],
    ["price", "Price"]
  ];

  el.innerHTML = `
    <span class="sort-title">Sort By:</span>
    ${items.map(([key, label]) => `
      <button class="sort-btn ${state.sortBy === key ? "active" : ""}" type="button" data-sort="${key}">
        ${label}${state.sortBy === key ? " ↓" : ""}
      </button>
    `).join("")}
  `;

  el.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sortBy = btn.dataset.sort;
      renderAll();
    });
  });
}

function renderFilterPanel() {
  const el = document.getElementById("filterPanel");
  if (!el) return;
  
  const options = getFilterOptions();
  const sections = [
    ["connections", "Connections"],
    ["flexibility", "Flexibility"],
    ["airlines", "Airlines"],
    ["suppliers", "Suppliers"]
  ];

  el.innerHTML = `
    <div class="filter-header">
      <h3>Filters</h3>
      <button class="clear-btn" type="button" id="clearFilters">Clear</button>
    </div>
    ${sections.map(([group, title]) => `
      <div class="filter-section">
        <div class="filter-title">
          <span>${title}</span>
          <span>⌃</span>
        </div>
        ${options[group].map((option) => `
          <label class="filter-option">
            <input
              type="checkbox"
              data-group="${group}"
              data-value="${option}"
              ${state.filters[group].includes(option) ? "checked" : ""}
            />
            <span>${option}</span>
          </label>
        `).join("")}
      </div>
    `).join("")}
  `;

  document.getElementById("clearFilters").addEventListener("click", () => {
    state.selectedAirline = "";
    state.filters = { connections: [], flexibility: [], airlines: [], suppliers: [] };
    renderAll();
  });

  el.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const { group, value } = input.dataset;
      const exists = state.filters[group].includes(value);
      state.filters[group] = exists
        ? state.filters[group].filter((item) => item !== value)
        : [...state.filters[group], value];
      renderAll();
    });
  });
}

function renderFlights() {
  const resultsEl = document.getElementById("flightResults");
  const countEl = document.getElementById("resultCount");
  if (!resultsEl) return;

  const filtered = getFilteredFlights();
  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${flights.length} API results`;

  if (!filtered.length && !document.querySelector(".loader")) {
    resultsEl.innerHTML = `<div class="empty-state">No flights found for selected filters.</div>`;
    return;
  }

  if (filtered.length) {
    resultsEl.innerHTML = filtered.map(renderFlightCard).join("");
  }

  // Attach event listeners to newly rendered cards
  resultsEl.querySelectorAll(".toggle-btn-mini").forEach((btn) => {
    btn.addEventListener("click", () => {
      const flightId = btn.dataset.flightId;
      state.openFlightId = state.openFlightId === flightId ? null : flightId;
      state.activeTabs[flightId] = state.activeTabs[flightId] || "Fare Categories";
      renderAll();
    });
  });

  resultsEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTabs[btn.dataset.flightId] = btn.dataset.tab;
      renderAll();
    });
  });

  resultsEl.querySelectorAll(".fare-radio").forEach((radio) => {
    radio.addEventListener("change", () => {
      state.selectedFareIndices[radio.dataset.flightId] = parseInt(radio.dataset.index);
      renderAll();
    });
  });

  resultsEl.querySelectorAll(".bundle-check").forEach((check) => {
    check.addEventListener("change", () => {
      const flightId = check.dataset.flightId;
      const bundleId = check.dataset.bundleId;
      const current = state.selectedBundles[flightId] || [];
      if (check.checked) {
        state.selectedBundles[flightId] = [...current, bundleId];
      } else {
        state.selectedBundles[flightId] = current.filter(id => id !== bundleId);
      }
      renderAll();
    });
  });

  resultsEl.querySelectorAll(".select-btn-mini").forEach((btn) => {
    btn.addEventListener("click", () => {
      const offerId = btn.dataset.offerId;
      alert(`Selected Offer ID: ${offerId}`);
    });
  });
}

function renderFlightCard(flight) {
  const isOpen = state.openFlightId === flight.id;
  const activeTab = state.activeTabs[flight.id] || "Fare Categories";

  return `
    <article class="flight-card-ultra">
      <div class="card-main-row">
        <!-- Branding (Logo & Meta) -->
        <div class="brand-cell">
          <img src="${flight.logo}" alt="${flight.airline}" class="logo-mini" />
          <div class="brand-info-mini">
            <div class="name-mini">${flight.airline}</div>
            <div class="meta-mini">${flight.flightNo} · ${flight.segments[0]?.cabin || 'Economy'}</div>
            ${renderSelectedSummary(flight)}
          </div>
        </div>

        <!-- Route -->
        <div class="route-cell-mini">
          <div class="point-mini">
            <span class="time-mini">${flight.depart}</span>
            <span class="code-mini">${flight.from}</span>
          </div>

          <div class="path-mini">
            <div class="dur-mini">${flight.duration}</div>
            <div class="line-mini"></div>
            <div class="stops-mini">${flight.stops}</div>
          </div>

          <div class="point-mini">
            <span class="time-mini">${flight.arrive}</span>
            <span class="code-mini">${flight.to}</span>
          </div>
        </div>

        <!-- Price -->
        <div class="price-cell-mini">
          <div class="val-mini">${money(calculateTotalPrice(flight), flight.currency)}</div>
          <div class="per-mini">Per Adult</div>
        </div>

        <!-- Actions -->
        <div class="actions-cell-mini">
          <div class="source-mini">${flight.supplier}</div>
          <div class="btn-group-mini">
            <button class="select-btn-mini" type="button" data-offer-id="${flight.id}">
              Select <span class="chevron-mini">⌄</span>
            </button>
            <button class="toggle-btn-mini ${isOpen ? "open" : ""}" type="button" data-flight-id="${flight.id}">
              ${isOpen ? "▲" : "▼"}
            </button>
          </div>
        </div>
      </div>

      <div class="details-wrap ${isOpen ? "open" : ""}">
        <div class="details-inner">
          <div class="tab-row">
            ${tabs.map((tab) => `
              <button
                class="tab-btn ${activeTab === tab ? "active" : ""}"
                type="button"
                data-flight-id="${flight.id}"
                data-tab="${tab}"
              >
                ${tab}
              </button>
            `).join("")}
          </div>
          ${renderTabContent(flight, activeTab)}
        </div>
      </div>
    </article>
  `;
}

function renderTabContent(flight, activeTab) {
  if (activeTab === "Fare Rules") return renderFareRules(flight);
  if (activeTab === "Add-ons") return renderAddons(flight);
  if (activeTab === "Flight Details") return renderFlightDetails(flight);
  return renderFareCategories(flight);
}

function calculateTotalPrice(flight) {
  const fareIndex = state.selectedFareIndices[flight.id] || 0;
  const fareOptions = flight.fareOptions || [];
  const fare = fareOptions.length > fareIndex ? fareOptions[fareIndex] : flight;
  const basePrice = fare.priceAmount || flight.priceAmount;
  
  const bundleIds = state.selectedBundles[flight.id] || [];
  const bundlesPrice = bundleIds.reduce((sum, id) => {
    const bundle = AVAILABLE_BUNDLES.find(b => b.id === id);
    return sum + (bundle ? bundle.price : 0);
  }, 0);

  return basePrice + bundlesPrice;
}

function renderSelectedSummary(flight) {
  const fareIndex = state.selectedFareIndices[flight.id] || 0;
  const fareOptions = flight.fareOptions || [];
  const fareName = fareOptions.length > fareIndex ? fareOptions[fareIndex].name : "Standard";
  const bundleIds = state.selectedBundles[flight.id] || [];
  
  return `
    <div class="selected-summary-mini">
      ${fareName} ${bundleIds.length ? `+ ${bundleIds.length} Add-ons` : ""}
    </div>
  `;
}

function renderFareCategories(flight) {
  const selectedIndex = state.selectedFareIndices[flight.id] || 0;
  return `
    <div class="table-wrap">
      <table class="fare-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Baggage</th>
            <th>Refund</th>
            <th>Meal</th>
            <th>Seat</th>
            <th>Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${(flight.fareOptions || []).map((fare, index) => `
            <tr class="${selectedIndex === index ? "selected-row" : ""}" style="${selectedIndex === index ? "background:rgba(245,158,11,0.05)" : ""}">
              <td>
                <label style="cursor:pointer; display:block">
                  <input 
                    type="radio" 
                    name="fare-${flight.id}" 
                    class="fare-radio" 
                    data-flight-id="${flight.id}" 
                    data-index="${index}" 
                    ${selectedIndex === index ? "checked" : ""} 
                  />
                  <strong>${fare.name}</strong>
                </label>
                <div class="flight-supplier">Supplier Fare Family</div>
              </td>
              <td>${fare.baggage || "Check Airline Rules"}</td>
              <td>${fare.refund || "Check Airline Rules"}</td>
              <td>${fare.meal || "Check Airline Rules"}</td>
              <td>${fare.seat || "Check Airline Rules"}</td>
              <td><strong>${money(fare.priceAmount, fare.currency)}</strong></td>
              <td><button class="select-btn" type="button" data-offer-id="${fare.offerId || flight.id}">Select</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderFareRules(flight) {
  return `
    <div class="panel">
      <h3>Fare Rules</h3>
      ${(flight.rules || ["Check Airline Rules"]).map((rule, index) => `
        <div class="rule-item">
          <div class="rule-number">${index + 1}</div>
          <div>${rule}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAddons(flight) {
  const selectedIds = state.selectedBundles[flight.id] || [];
  
  // Categorize bundles
  const categories = {};
  AVAILABLE_BUNDLES.forEach(b => {
    if (!categories[b.category]) categories[b.category] = [];
    categories[b.category].push(b);
  });

  return `
    <div class="panel">
      <div class="segment-header">
        <div>
          <h3>Available Add-ons</h3>
          <div class="flight-supplier">Customize your flight with extra services. Prices are added to your selected fare.</div>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px">
        ${Object.entries(categories).map(([cat, items]) => `
          <div class="addon-category">
            <h4 style="margin:0 0 12px; font-size:14px; color:var(--slate2); text-transform:uppercase; letter-spacing:1px">${cat}</h4>
            ${items.map(item => `
              <label class="baggage-card" style="display:flex; align-items:flex-start; gap:12px; cursor:pointer; transition:all 0.2s; ${selectedIds.includes(item.id) ? "border-color:#f59e0b; background:rgba(245,158,11,0.03)" : ""}">
                <input 
                  type="checkbox" 
                  class="bundle-check" 
                  data-flight-id="${flight.id}" 
                  data-bundle-id="${item.id}"
                  ${selectedIds.includes(item.id) ? "checked" : ""}
                  style="margin-top:4px"
                />
                <div style="flex:1">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
                    <span style="font-weight:800; font-size:14px">${item.name}</span>
                    <span style="color:#d97706; font-weight:800">+${money(item.price, flight.currency)}</span>
                  </div>
                  <div class="flight-supplier" style="margin:0; font-size:12px">${item.description}</div>
                </div>
              </label>
            `).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderFlightDetails(flight) {
  const segments = flight.segments || [];
  return `
    <div class="panel-compact">
      <div class="compact-header">
        <div>
          <h3 style="margin:0; font-size:16px">Flight Details</h3>
          <div class="flight-supplier" style="margin-top:2px">Detailed itinerary for your selected flight</div>
        </div>
        <span class="segment-badge">${segments.length} Segment${segments.length > 1 ? "s" : ""}</span>
      </div>

      <div class="timeline">
        ${segments.map((segment, index) => {
          const nextSegment = segments[index + 1];
          const layover = nextSegment ? calculateLayover(segment, nextSegment) : "";

          return `
            <div class="timeline-segment">
              <div class="timeline-marker">
                <div class="dot"></div>
                ${index < segments.length - 1 ? '<div class="line"></div>' : ''}
              </div>
              
              <div class="timeline-content">
                <div class="timeline-main">
                  <!-- Departure -->
                  <div class="timeline-col time-col">
                    <div class="time">${formatTime(segment.departureDateTime)}</div>
                    <div class="date">${formatDate(segment.departureDateTime)}</div>
                  </div>
                  
                  <div class="timeline-col info-col">
                    <div class="city"><strong>${segment.fromCity}</strong> <span class="code">${segment.from}</span></div>
                    <div class="airport">${segment.fromAirport} ${segment.fromTerminal ? `· T${segment.fromTerminal}` : ''}</div>
                  </div>

                  <!-- Flight Info -->
                  <div class="timeline-col flight-col">
                    <div class="airline-info">
                       <strong>${segment.airline}</strong> · ${segment.flightNo}
                    </div>
                    <div class="aircraft">${segment.aircraft} · ${segment.cabin}</div>
                    <div class="duration-small">⏱ ${segment.duration}</div>
                  </div>

                  <!-- Arrival -->
                  <div class="timeline-col time-col">
                    <div class="time">${formatTime(segment.arrivalDateTime)}</div>
                    <div class="date">${formatDate(segment.arrivalDateTime)}</div>
                  </div>

                  <div class="timeline-col info-col">
                    <div class="city"><strong>${segment.toCity}</strong> <span class="code">${segment.to}</span></div>
                    <div class="airport">${segment.toAirport} ${segment.toTerminal ? `· T${segment.toTerminal}` : ''}</div>
                  </div>
                </div>

                ${layover ? `
                  <div class="timeline-layover">
                    <span class="layover-pill-small">Layover: ${layover} at ${segment.toCity}</span>
                  </div>
                ` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderAll() {
  renderSearchSummary();
  renderAirlineStrip();
  renderSortBar();
  renderFilterPanel();
  renderFlights();
}

// =======================
// INITIALIZATION
// =======================

window.buildResults = function(type) {
  if (type === 'flights') {
    fetchFlightResults();
  }
};

// Initial render & fetch
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  fetchFlightResults();
});
