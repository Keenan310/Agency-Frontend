// =======================
// STATE & CONFIG
// =======================

const state = {
  openFlightId: null,
  activeTabs: {},
  sortBy: "price",
  selectedAirline: "",
  selectedFareIndices: {}, // flightId -> index
  selectedBundles: {}, // old add-ons, keep for now
  bundleLoading: {}, // flightId -> true/false
  bundleData: {}, // flightId -> API bundle response
  selectedBundleCodes: {}, // flightId -> selected bundle code

  searchParams: {
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "Economy",
    preferredAirlines: [], // For Advanced Search
  },
  showAdvanced: false,
  showPassengerDropdown: false,
  filters: {
    connections: [],
    flexibility: [],
    airlines: [],
    suppliers: [],
  },
};

const tabs = ["Itinerary", "Fare Info", "Baggages", "Category", "Fare Rules"];

const AVAILABLE_BUNDLES = [
  {
    id: "bag-23",
    category: "Baggage",
    name: "Extra Bag (23KG)",
    price: 150,
    description: "Add one extra piece of checked baggage.",
  },
  {
    id: "bag-32",
    category: "Baggage",
    name: "Extra Bag (32KG)",
    price: 250,
    description: "Add one extra piece of checked baggage.",
  },
  {
    id: "meal-std",
    category: "Dining",
    name: "Standard Meal",
    price: 45,
    description: "Hot meal service during the flight.",
  },
  {
    id: "seat-std",
    category: "Seating",
    name: "Standard Seat Choice",
    price: 30,
    description: "Select your preferred standard seat.",
  },
  {
    id: "flex-ref",
    category: "Flexibility",
    name: "Refundable Fare",
    price: 300,
    description: "Make your ticket refundable with a smaller fee.",
  },
];
let flights = []; // Live flights will be stored here

window.scrollAirlineStrip = (dir) => {
  const el = document.getElementById("airlineStrip");
  if (el) el.scrollBy({ left: dir * 200, behavior: "smooth" });
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

window.fetchFlightResults = async function () {
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
    cabinClass: searchParams.cabinClass,
  };

  showLoading(true);

  try {
    const apiBase =
      (window.KEENAN_CONFIG && window.KEENAN_CONFIG.apiBaseUrl) ||
      "http://localhost:3000/v1/ndc";

    // LOGIN SESSION
    const session = JSON.parse(
      localStorage.getItem("keenanTravelSession") || "null",
    );

    // HEADERS
    const headers = {
      "Content-Type": "application/json",
    };

    // ADD TOKEN IF LOGIN EXISTS
    if (session && session.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    console.log("[Flight Search] URL:", `${apiBase}/flights/search`);
    console.log("[Flight Search] Body:", searchBody);
    console.log("[Flight Search] Session:", session);

    const response = await fetch(`${apiBase}/flights/search`, {
      method: "POST",
      headers,
      body: JSON.stringify(searchBody),
    });

    const resJson = await response.json();

    console.log("[Flight Search] Response:", resJson);

    if (!response.ok) {
      throw new Error(
        resJson.message || resJson.error || "Failed to fetch flight results",
      );
    }

    if (resJson && resJson.data) {
      flights = groupDuplicateFlightCards(mapBackendData(resJson.data));
      console.log("GROUPED FLIGHTS:", flights);
      console.log("FIRST FLIGHT BRANDS:", flights[0]?.fareOptions);
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

        <button
          onclick="window.buildResults('flights')"
          class="search-btn"
          style="margin-top:15px;"
        >
          Retry Search
        </button>
      </div>
    `;
    }
  } finally {
    showLoading(false);
    renderAll();
  }
};

function mapBackendData(backendFlights) {
  return (backendFlights || []).map((f, originalIndex) => {
    const itinerary = f.itinerary || f.segments || [];

    const segments = itinerary.map((s) => ({
      airline:
        s.airlineName || s.airline || f.airlineName || f.airline || "Airline",
      airlineCode:
        s.airline || s.airlineCode || f.airline || f.airlineCode || "XY",
      flightNo: s.flightNumber || s.flightNo || f.flightNumber || "-",
      aircraft: s.aircraft || s.equipment || "Aircraft",
      cabin: s.cabin || s.cabinClass || f.cabin || f.cabinClass || "Economy",
      from: s.origin || s.from || f.origin || "-",
      fromCity: s.originCity || s.fromCity || s.origin || f.origin || "-",
      fromAirport: s.departureTerminal
        ? `Terminal ${s.departureTerminal}`
        : s.fromAirport || "Main",
      fromTerminal: s.departureTerminal || s.fromTerminal || "",
      to: s.destination || s.to || f.destination || "-",
      toCity:
        s.destinationCity || s.toCity || s.destination || f.destination || "-",
      toAirport: s.arrivalTerminal
        ? `Terminal ${s.arrivalTerminal}`
        : s.toAirport || "Main",
      toTerminal: s.arrivalTerminal || s.toTerminal || "",
      departureDateTime: s.departureTime || s.departureDateTime || null,
      arrivalDateTime: s.arrivalTime || s.arrivalDateTime || null,
      durationMinutes: Number(
        s.durationMinutes || s.elapsedTime || f.flightMinutes || 0,
      ),
      duration: formatDuration(
        Number(s.durationMinutes || s.elapsedTime || f.flightMinutes || 0),
      ),
      baggage:
        s.baggage?.checkIn || s.baggage || f.baggage?.checkIn || "Check Rules",
    }));

    const firstSeg = segments[0] || {};
    const lastSeg = segments[segments.length - 1] || firstSeg;
    const currency = f.currency || f.price?.currency || "AED";
    const totalAmount = Number(
      f.totalAmount || f.amount || f.price?.total || f.price?.amount || 0,
    );
    const baseFare = Number(f.baseFare || f.baseAmount || f.price?.base || 0);
    const taxes = Number(
      f.taxes ||
        f.taxAmount ||
        f.price?.taxes ||
        Math.max(totalAmount - baseFare, 0),
    );

    const rawFareOptions =
      Array.isArray(f.fareOptions) && f.fareOptions.length
        ? f.fareOptions
        : Array.isArray(f.brands) && f.brands.length
          ? f.brands
          : Array.isArray(f.bundles) && f.bundles.length
            ? f.bundles
            : [];

    const fareOptions = rawFareOptions.length
      ? rawFareOptions.map((opt, idx) =>
          normalizeFareOption(opt, f, currency, idx),
        )
      : [normalizeFareOption(f, f, currency, 0)];

    return {
      id: f.offerId || f.id || `flight-${originalIndex}`,
      haveBundles: f.haveBundles === true || f.HaveBundles === true,
      cardKey: buildFlightGroupKey(f, segments),
      airline: f.airlineName || firstSeg.airline || f.airline || "Airline",
      airlineCode: f.airline || firstSeg.airlineCode || f.airlineCode || "XY",
      supplier: f.supplier || f.source || "Keenan API",
      refundable: f.fareType !== "NotRefundable",
      connectionType:
        Number(f.stops || 0) === 0
          ? "Non stop"
          : `${f.stops} Stop${Number(f.stops) > 1 ? "s" : ""}`,
      flightNo: f.flightNumber || firstSeg.flightNo || "-",
      from: f.origin || firstSeg.from || "-",
      to: f.destination || lastSeg.to || "-",
      depart: formatTime(f.departureTime || firstSeg.departureDateTime),
      arrive: formatTime(f.arrivalTime || lastSeg.arrivalDateTime),
      durationMinutes: Number(
        f.flightMinutes ||
          segments.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0),
      ),
      duration: formatDuration(
        Number(
          f.flightMinutes ||
            segments.reduce(
              (sum, s) => sum + Number(s.durationMinutes || 0),
              0,
            ),
        ),
      ),
      departureTime: f.departureTime || firstSeg.departureDateTime,
      arrivalTime: f.arrivalTime || lastSeg.arrivalDateTime,
      cabin: firstSeg.cabin || "Economy",
      stops:
        Number(f.stops || 0) === 0
          ? "Non Stop"
          : `${f.stops || segments.length - 1} Stop${Number(f.stops || segments.length - 1) > 1 ? "s" : ""} via ${segments
              .slice(0, -1)
              .map((s) => s.to)
              .join(", ")}`,
      priceAmount: totalAmount,
      baseFare,
      taxes,
      currency,
      logo: f.logo || "",
      segments,
      fareOptions,
      baggage: {
        cabin: fareOptions[0]?.cabinBaggage || "7KG cabin baggage included",
        checked:
          fareOptions[0]?.checkedBaggage || firstSeg.baggage || "Check Rules",
        infant: "Check airline rules",
        note: "Baggage changes when the selected category/class changes.",
      },
      rules:
        Array.isArray(f.rules) && f.rules.length
          ? f.rules
          : [
              f.fareType === "NotRefundable"
                ? "This fare is non-refundable."
                : "Refundable as per airline policy.",
              "Date change is subject to airline penalties.",
              "Supplier rules must be verified before final ticketing.",
            ],
      raw: f,
    };
  });
}

function normalizeFareOption(opt, parentFlight, currency, index) {
  const total = Number(
    opt.totalAmount ||
      opt.amount ||
      opt.priceAmount ||
      opt.price?.total ||
      parentFlight.totalAmount ||
      0,
  );
  const base = Number(
    opt.baseFare ||
      opt.baseAmount ||
      opt.price?.base ||
      parentFlight.baseFare ||
      0,
  );
  const taxes = Number(
    opt.taxes ||
      opt.taxAmount ||
      opt.price?.taxes ||
      parentFlight.taxes ||
      Math.max(total - base, 0),
  );
  const name =
    opt.fareClass ||
    opt.priceClassName ||
    opt.fareName ||
    opt.brandName ||
    opt.bundleName ||
    opt.name ||
    parentFlight.fareClass ||
    parentFlight.priceClassName ||
    parentFlight.brandName ||
    parentFlight.brand ||
    "Standard";

  return {
    offerId: opt.offerId || parentFlight.offerId || parentFlight.id,
    name: formatFareName(name),
    rawName: name,
    cabin:
      opt.cabin ||
      opt.cabinClass ||
      parentFlight.cabin ||
      parentFlight.cabinClass ||
      "Economy",
    checkedBaggage:
      opt.baggage?.checkIn ||
      opt.checkedBaggage ||
      opt.checkinBaggage ||
      parentFlight.baggage?.checkIn ||
      "Check Rules",
    cabinBaggage:
      opt.baggage?.cabin || opt.cabinBaggage || opt.handCarry || "7KG / 1 PC",
    refund:
      opt.refund ||
      opt.refundableText ||
      (parentFlight.fareType === "NotRefundable"
        ? "Non Refundable"
        : "As per fare rules"),
    change: opt.change || opt.changeFee || "As per fare rules",
    meal: opt.meal || opt.meals || "Check Airline Rules",
    seat: opt.seat || opt.seatSelection || "Check Airline Rules",
    baseFare: base,
    taxes,
    priceAmount: total,
    currency: opt.currency || currency,
    sourceIndex: index,
  };
}

function formatFareName(name) {
  const text = String(name || "Standard").trim();
  const parts = text.split(/\s+/);
  if (
    parts.length > 1 &&
    ["ECONOMY", "BUSINESS", "FIRST", "PREMIUM"].includes(parts[0].toUpperCase())
  ) {
    return parts.slice(1).join(" ") || text;
  }
  return text;
}

function buildFlightGroupKey(f, segments) {
  if (!segments.length) {
    return [
      f.airline || "",
      f.flightNumber || "",
      f.origin || "",
      f.destination || "",
    ].join("|");
  }

  return segments
    .map((s) => {
      const dep = String(s.departureDateTime || "")
        .replace("Z", "")
        .split(":")
        .slice(0, 2)
        .join(":");

      return [
        s.airlineCode || s.airline || "",
        s.flightNo || "",
        s.from || "",
        s.to || "",
        dep,
      ].join("~");
    })
    .join("|");
}

function groupDuplicateFlightCards(mappedFlights) {
  const groups = new Map();

  console.log("ALL GROUPED FLIGHTS", mappedFlights);
  (mappedFlights || []).forEach((flight) => {
    const key = flight.cardKey || flight.id;

    if (!groups.has(key)) {
      groups.set(key, {
        ...flight,
        fareOptions: [...(flight.fareOptions || [])],
      });

      return;
    }

    const existing = groups.get(key);

    // Merge fare options only
    existing.fareOptions.push({
      ...(flight.fareOptions?.[0] || flight),

      offerId: flight.id,

      name:
        flight.fareOptions?.[0]?.priceClassName ||
        flight.fareOptions?.[0]?.brandName ||
        flight.fareOptions?.[0]?.brand ||
        flight.fareOptions?.[0]?.name ||
        flight.fareOptions?.[0]?.cabin ||
        flight.cabin ||
        "Economy",

      cabin:
        flight.fareOptions?.[0]?.priceClassName ||
        flight.fareOptions?.[0]?.brandName ||
        flight.fareOptions?.[0]?.brand ||
        flight.fareOptions?.[0]?.cabin ||
        flight.cabin,

      priceAmount: flight.priceAmount,

      checkedBaggage: flight.baggage?.checked,

      cabinBaggage: flight.baggage?.cabin,
    });

    // Sort cheapest first
    existing.fareOptions.sort(
      (a, b) => Number(a.priceAmount || 0) - Number(b.priceAmount || 0),
    );

    // Main card price = cheapest fare
    const cheapest = existing.fareOptions[0];

    existing.priceAmount = cheapest?.priceAmount || existing.priceAmount;
    existing.baseFare = cheapest?.baseFare || existing.baseFare;
    existing.taxes = cheapest?.taxes || existing.taxes;
    existing.currency = cheapest?.currency || existing.currency;
  });

  return Array.from(groups.values());
}

// =======================
// HELPERS
// =======================

function money(amount, currency = "AED") {
  return `${currency} ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(dateTime) {
  if (!dateTime) return "--:--";

  const text = String(dateTime);

  // Keep API time exactly as received, no timezone conversion
  const match = text.match(/T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  return "--:--";
}

function formatDate(dateTime) {
  if (!dateTime) return "";
  return new Date(dateTime).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

  const diffMs =
    new Date(nextSegment.departureDateTime) -
    new Date(currentSegment.arrivalDateTime);
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
    suppliers: [...new Set(flights.map((f) => f.supplier))],
  };
}

function getFilteredFlights() {
  let list = [...flights];

  if (state.selectedAirline) {
    list = list.filter((f) => f.airline === state.selectedAirline);
  }

  if (state.filters.connections.length) {
    list = list.filter((f) =>
      state.filters.connections.includes(f.connectionType),
    );
  }

  if (state.filters.airlines.length) {
    list = list.filter((f) => state.filters.airlines.includes(f.airline));
  }

  if (state.filters.suppliers.length) {
    list = list.filter((f) => state.filters.suppliers.includes(f.supplier));
  }

  if (state.filters.flexibility.length) {
    list = list.filter((f) =>
      state.filters.flexibility.includes(
        f.refundable ? "Refundable" : "Non Refundable",
      ),
    );
  }

  // Advanced Search - Airline Filter
  if (state.searchParams.preferredAirlines.length) {
    list = list.filter((f) =>
      state.searchParams.preferredAirlines.includes(f.airline),
    );
  }

  return list.sort((a, b) => {
    if (state.sortBy === "airline") return a.airline.localeCompare(b.airline);
    if (state.sortBy === "departure") return a.depart.localeCompare(b.depart);
    if (state.sortBy === "arrival") return a.arrive.localeCompare(b.arrive);
    if (state.sortBy === "duration")
      return a.durationMinutes - b.durationMinutes;
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
  const totalPassengers =
    searchParams.adults + searchParams.children + searchParams.infants;

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
            ${totalPassengers} Passenger${totalPassengers > 1 ? "s" : ""} ⌄
          </div>
          ${state.showPassengerDropdown ? renderPassengerDropdown() : ""}
        </div>

        <div class="search-field compact">
          <label>Class</label>
          <select onchange="updateSearchParam('cabinClass', this.value)">
            ${["Economy", "Premium Economy", "Business", "First Class"]
              .map(
                (c) => `
              <option value="${c}" ${searchParams.cabinClass === c ? "selected" : ""}>${c}</option>
            `,
              )
              .join("")}
          </select>
        </div>

        <button class="primary-search-btn" onclick="performNewSearch()">
           Search
        </button>
      </div>

      <div class="advanced-trigger-area">
        <button class="advanced-toggle" onclick="toggleAdvanced(event)">
          ${state.showAdvanced ? "Hide Advanced Options ▴" : "Advanced Search (Airlines) ▾"}
        </button>
      </div>

      ${state.showAdvanced ? renderAdvancedOptions() : ""}
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

  window.history.pushState({}, "", url);
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
  const next = Math.max(type === "adults" ? 1 : 0, current + diff);
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
  const allAirlines = [...new Set(flights.map((f) => f.airline))];
  if (!allAirlines.length)
    return `<div class="advanced-panel empty">Search to see available airlines</div>`;

  return `
    <div class="advanced-panel">
      <div class="panel-label">Select Airlines to Show</div>
      <div class="airline-filter-list">
        ${allAirlines
          .map(
            (name) => `
          <div class="airline-list-item">
            <label class="airline-check-label">
              <input type="checkbox" 
                ${state.searchParams.preferredAirlines.length === 0 || state.searchParams.preferredAirlines.includes(name) ? "checked" : ""} 
                onchange="toggleAirlineFilter('${name}')"
              />
              <span class="airline-name">${name}</span>
            </label>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="panel-note">* Deselect airlines to exclude them from results.</div>
    </div>
  `;
}

window.toggleAirlineFilter = (name) => {
  const current = state.searchParams.preferredAirlines;
  if (current.includes(name)) {
    state.searchParams.preferredAirlines = current.filter((n) => n !== name);
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
    .map(
      (flight) => `
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
    `,
    )
    .join("");

  // Check for overflow and show/hide arrows
  setTimeout(() => {
    const isOverflowing = listEl.scrollWidth > listEl.clientWidth;
    sectionEl.querySelectorAll(".strip-arrow").forEach((arrow) => {
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
    ["price", "Price"],
  ];

  el.innerHTML = `
    <span class="sort-title">Sort By:</span>
    ${items
      .map(
        ([key, label]) => `
      <button class="sort-btn ${state.sortBy === key ? "active" : ""}" type="button" data-sort="${key}">
        ${label}${state.sortBy === key ? " ↓" : ""}
      </button>
    `,
      )
      .join("")}
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
    ["suppliers", "Suppliers"],
  ];

  el.innerHTML = `
    <div class="filter-header">
      <h3>Filters</h3>
      <button class="clear-btn" type="button" id="clearFilters">Clear</button>
    </div>
    ${sections
      .map(
        ([group, title]) => `
      <div class="filter-section">
        <div class="filter-title">
          <span>${title}</span>
          <span>⌃</span>
        </div>
        ${options[group]
          .map(
            (option) => `
          <label class="filter-option">
            <input
              type="checkbox"
              data-group="${group}"
              data-value="${option}"
              ${state.filters[group].includes(option) ? "checked" : ""}
            />
            <span>${option}</span>
          </label>
        `,
          )
          .join("")}
      </div>
    `,
      )
      .join("")}
  `;

  document.getElementById("clearFilters").addEventListener("click", () => {
    state.selectedAirline = "";
    state.filters = {
      connections: [],
      flexibility: [],
      airlines: [],
      suppliers: [],
    };
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
  if (countEl)
    countEl.textContent = `Showing ${filtered.length} of ${flights.length} API results`;

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
      state.activeTabs[flightId] =
        state.activeTabs[flightId] || "Fare Categories";
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
      state.selectedFareIndices[radio.dataset.flightId] = parseInt(
        radio.dataset.index,
      );

      renderAll();
    });
  });

  resultsEl.querySelectorAll(".bundle-selector").forEach((radio) => {
    radio.addEventListener("change", () => {
      state.selectedBundleCodes[radio.dataset.flightId] =
        radio.dataset.bundleCode;

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
        state.selectedBundles[flightId] = current.filter(
          (id) => id !== bundleId,
        );
      }
      renderAll();
    });
  });

  resultsEl
    .querySelectorAll(".select-btn-mini, .category-continue-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const flightId = btn.dataset.flightId || btn.dataset.offerId;
        const flight = flights.find(
          (f) => f.id === flightId || f.cardKey === flightId,
        );
        if (!flight) return;

        const fare = getSelectedFare(flight);
        const bookingData = {
          flight: {
            ...flight,
            selectedOfferId: fare.offerId,
            selectedTotal: calculateTotalPrice(flight),
          },
          fare,
          params: {
            adults: state.searchParams.adults,
            children: state.searchParams.children,
            infants: state.searchParams.infants,
            cabinClass: state.searchParams.cabinClass,
          },
        };

        console.log("[Booking] Saving data to localStorage:", bookingData);
        localStorage.setItem(
          "keenan_selected_flight",
          JSON.stringify(bookingData),
        );
        window.location.href =
          "/src/services/flights/passenger-details/index.html";
      });
    });
}

function renderFlightCard(flight) {
  const isOpen = state.openFlightId === flight.id;
  const activeTab = state.activeTabs[flight.id] || "Itinerary";
  const showCategoryTab = flight.haveBundles === true;

  return `
    <article class="flight-card-ultra">
      <div class="card-main-row">
        <!-- Branding (Logo & Meta) -->
        <div class="brand-cell">
          <img src="${flight.logo}" alt="${flight.airline}" class="logo-mini" />
          <div class="brand-info-mini">
            <div class="name-mini">${flight.airline}</div>
            <div class="meta-mini">${flight.flightNo} · ${flight.segments[0]?.cabin || "Economy"}</div>
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

      ${tabs
        .map(
          (tab) => `
        <button
          class="tab-btn ${activeTab === tab ? "active" : ""}"
          type="button"
          data-flight-id="${flight.id}"
          data-tab="${tab}"
        >
          ${tab}
        </button>
      `,
        )
        .join("")}

    </div>

    ${isOpen ? renderTabContent(flight, activeTab) : ""}

  </div>
</div>
      
    </article>
  `;
}

function renderTabContent(flight, activeTab) {
  if (activeTab === "Itinerary") return renderFlightDetails(flight);
  if (activeTab === "Fare Info") return renderFareInfo(flight);
  if (activeTab === "Baggages") return renderBaggageTab(flight);
  if (activeTab === "Fare Rules") return renderFareRules(flight);
  return renderFareCategories(flight);
}

function getSelectedFare(flight) {
  const fareIndex = state.selectedFareIndices[flight.id] || 0;
  const fareOptions = flight.fareOptions || [];
  return fareOptions.length > fareIndex ? fareOptions[fareIndex] : flight;
}

function calculateTotalPrice(flight) {
  const fare = getSelectedFare(flight);

  let total = Number(
    fare.priceAmount ||
    flight.priceAmount ||
    0
  );

  const selectedCode = state.selectedBundleCodes[flight.id];
  const bundleData = state.bundleData[flight.id]?.raw;

  if (!selectedCode || !bundleData) {
    return total;
  }

  const bundleChoicesRaw =
    bundleData.bundleChoices || bundleData.BundleChoices || bundleData;

  const bundleChoices = Array.isArray(bundleChoicesRaw)
    ? bundleChoicesRaw
    : Object.values(bundleChoicesRaw || {});

  const selectedBundle = bundleChoices.find(
    (b) => b.bundleCode === selectedCode
  );

  if (!selectedBundle) {
    return total;
  }

  const bundleAmount = Number(
    selectedBundle.bundlePrices?.[0]?.totalAmount?.amount || 0
  );

  return total + bundleAmount;
}

function renderSelectedSummary(flight) {
  const fare = getSelectedFare(flight);
  const bundleIds = state.selectedBundles[flight.id] || [];
  return `
    <div class="selected-summary-mini">
      ${fare.name || "Standard"}${bundleIds.length ? ` + ${bundleIds.length} Add-ons` : ""}
    </div>
  `;
}

function renderFareCategories(flight) {
  const selectedIndex = state.selectedFareIndices[flight.id] || 0;
  const fareOptions = flight.fareOptions || [];
  const hasBundles = fareOptions.length > 1;
  const title = hasBundles ? "Categories / Bundles" : "Available Class";
  const bundleData = state.bundleData[flight.id];
  const loadingBundles = state.bundleLoading[flight.id];
  const subtitle = hasBundles
    ? "Select one fare category. Price and baggage will update instantly."
    : "No branded fares received from the API. Showing the available standard class.";

  if (flight.haveBundles && !bundleData && !loadingBundles) {
    loadBundlesForFlight(flight);
    return `
    <div class="panel">
      <div class="loading-state">
        Loading available bundles...
      </div>
    </div>
  `;
  }

  if (loadingBundles) {
    return `
    <div class="panel">
      <div class="loading-state">
        Loading available bundles...
      </div>
    </div>
  `;
  }
  if (bundleData?.error) {
    return `
    <div class="panel">
      <div class="empty-state">Bundle error: ${bundleData.error}</div>
    </div>
  `;
  }

  if (flight.haveBundles && bundleData?.raw) {
    return renderBundleTable(
      flight,
      bundleData.raw,
      bundleData.confirmedOfferId,
    );
  }

  if (!flight.haveBundles) {
    return renderBrandFareTable(flight);
  }

  return `
  <div class="panel">
    <div class="loading-state">
      Loading airline bundles...
    </div>
  </div>
`;
}

async function loadBundlesForFlight(flight) {
  try {
    state.bundleLoading[flight.id] = true;
    renderAll();

    const fare = getSelectedFare(flight);
    const selectedOfferId = fare.offerId || flight.id;

    const apiBase =
      (window.KEENAN_CONFIG && window.KEENAN_CONFIG.apiBaseUrl) ||
      "http://localhost:3000/v1/ndc";

    const session = JSON.parse(
      localStorage.getItem("keenanTravelSession") || "null",
    );

    const headers = {
      "Content-Type": "application/json",
    };

    if (session && session.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    // 1. Fare Confirm
    const confirmRes = await fetch(`${apiBase}/flights/fare-confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({ offerId: selectedOfferId }),
    });

    const confirmJson = await confirmRes.json();

    if (!confirmRes.ok || confirmJson.success === false) {
      throw new Error(confirmJson.message || "Fare confirmation failed");
    }

    // 2. Get confirmed offer id
    const confirmedOfferId =
      confirmJson.offerId ||
      confirmJson.data?.offerId ||
      confirmJson.data?.OfferId ||
      confirmJson.data?.confirmedOfferId ||
      selectedOfferId;

    // 3. Get Available Bundles
    const bundleRes = await fetch(`${apiBase}/flights/bundles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ offerId: confirmedOfferId }),
    });

    const bundleJson = await bundleRes.json();
    console.log("[Bundles] FULL RESPONSE:", bundleJson);
    console.log(
      "[Bundles] DATA USED:",
      bundleJson.data?.data || bundleJson.data || bundleJson,
    );

    if (!bundleRes.ok || bundleJson.success === false) {
      throw new Error(bundleJson.message || "Bundle request failed");
    }

    state.bundleData[flight.id] = {
      confirmedOfferId,
      raw: bundleJson.data?.data || bundleJson.data || bundleJson,
    };
  } catch (error) {
    console.error("[Bundles] Error:", error);

    state.bundleData[flight.id] = {
      error: error.message,
    };
  } finally {
    state.bundleLoading[flight.id] = false;
    renderAll();
  }
}

function renderBundleTable(flight, rawBundleData, confirmedOfferId) {
  const bundleChoicesRaw =
    rawBundleData?.bundleChoices ||
    rawBundleData?.BundleChoices ||
    rawBundleData;

  const bundleChoices = Array.isArray(bundleChoicesRaw)
    ? bundleChoicesRaw
    : Object.values(bundleChoicesRaw || {});

  if (!bundleChoices.length) {
    return `
      <div class="panel">
        <div class="empty-state">
          No bundles available for this flight.
        </div>
      </div>
    `;
  }

  const selectedCode =
    state.selectedBundleCodes[flight.id] || bundleChoices[0]?.bundleCode;

  return `
  <div class="panel fare-category-panel">

    <div class="segment-header">
      <div>
        <h3>Flight from ${flight.fromCity || flight.from} to ${flight.toCity || flight.to}</h3>
      </div>
      <span class="segment-badge">${bundleChoices.length} Bundles</span>
    </div>

    <div class="bundle-card-slider">
      ${bundleChoices
        .map((bundle) => {
          const bundleAmount = Number(
            bundle.bundlePrices?.[0]?.totalAmount?.amount || 0,
          );
          const totalFare = Number(flight.priceAmount || 0) + bundleAmount;

          return `
          <label class="bundle-mini-card">
            <input
              type="radio"
              name="bundle-${flight.id}"
              class="bundle-selector"
              data-flight-id="${flight.id}"
              data-bundle-code="${bundle.bundleCode}"
              ${selectedCode === bundle.bundleCode ? "checked" : ""}
            />

            <div class="bundle-mini-title">${bundle.bundleName || bundle.bundleCode}</div>

            <div class="bundle-mini-row"><strong>Hand Baggage</strong><span>${getBundleServiceText(bundle.includedServices, "carry")}</span></div>
            <div class="bundle-mini-row"><strong>Check Baggage</strong><span>${getBundleServiceText(bundle.includedServices, "check")}</span></div>
            <div class="bundle-mini-row"><strong>Meals & Beverage</strong><span>${getBundleServiceText(bundle.includedServices, "meal")}</span></div>
            <div class="bundle-mini-row"><strong>Rebooking</strong><span>${getBundleServiceText(bundle.includedServices, "change")}</span></div>
            <div class="bundle-mini-row"><strong>Cancellation</strong><span>${getBundleServiceText(bundle.includedServices, "cancel")}</span></div>

            <div class="bundle-mini-total">
              <strong>Total Fare</strong>
              <span>${money(totalFare, flight.currency)}</span>
            </div>
          </label>
        `;
        })
        .join("")}
    </div>

    <div class="bundle-footer">
      <button
        class="bundle-continue-btn"
        onclick="continueWithSelectedBundle('${flight.id}', '${confirmedOfferId}')"
      >
        Continue
      </button>
    </div>

  </div>
`;
}

function renderBrandFareTable(flight) {
  const fareOptions = flight.fareOptions || [];

  if (!fareOptions.length) {
    return `
      <div class="panel">
        <div class="empty-state">
          No fare brands available.
        </div>
      </div>
    `;
  }

  return `
    <div class="panel fare-category-panel">

      <div class="segment-header">
        <div>
          <h3>
            Flight from ${flight.fromCity || flight.from}
            to
            ${flight.toCity || flight.to}
          </h3>
        </div>

        <span class="segment-badge">
          ${fareOptions.length} Brands
        </span>
      </div>

      <div class="bundle-card-slider">

        ${fareOptions
          .map(
            (fare, index) => `

          <label class="bundle-mini-card">

            <input
              type="radio"
              name="brand-${flight.id}"
              class="fare-radio"
              data-flight-id="${flight.id}"
              data-index="${index}"
              ${
                index === (state.selectedFareIndices[flight.id] || 0)
                  ? "checked"
                  : ""
              }
            />

            <div class="bundle-mini-title">
              ${(fare.name || "Standard").toUpperCase()}
            </div>

            <div class="bundle-mini-row">
              <strong>Hand Baggage</strong>

              <span>
                ${
                  fare.cabinBaggage === "Check Fare Rule!"
                    ? "7 KG"
                    : fare.cabinBaggage || "7 KG"
                }
              </span>
            </div>

            <div class="bundle-mini-row">
              <strong>Check Baggage</strong>

              <span>
                ${fare.checkedBaggage || "Check Rules"}
              </span>
            </div>

            <div class="bundle-mini-row">
              <strong>Refund</strong>

              <span>
                ${fare.refund || "As per fare rules"}
              </span>
            </div>

            <div class="bundle-mini-row">
              <strong>Rebooking</strong>

              <span>
                ${fare.change || "As per fare rules"}
              </span>
            </div>

            <div class="bundle-mini-total">
              <strong>Total Fare</strong>

              <span>
                ${money(fare.priceAmount, fare.currency || flight.currency)}
              </span>
            </div>

          </label>

        `,
          )
          .join("")}

      </div>

      <div class="bundle-footer">
        <button class="bundle-continue-btn">
          Continue
        </button>
      </div>

    </div>
  `;
}

function renderFareInfo(flight) {
  const fare = getSelectedFare(flight);
  const raw = flight.raw || {};
  const paxBreakdowns = raw.passengerFareBreakdown || [];

  const fallbackBase = fare.baseFare || raw.fareBreakdown?.base || 0;
  const fallbackTax = fare.taxes || raw.fareBreakdown?.tax || 0;
  const fallbackDiscount = raw.fareBreakdown?.discount || 0;
  const fallbackSCA = raw.fareBreakdown?.fees || 0;
  const fallbackTotal = fare.priceAmount || flight.priceAmount || 0;

  const rows = paxBreakdowns.length
    ? paxBreakdowns.map((pax, index) => {
        const type = pax.passengerTypeCode || pax.paxType || pax.type || "ADT";
        const count = pax.count || pax.quantity || 1;

        const base =
          pax.baseAmount?.amount || pax.baseFare?.amount || pax.baseAmount || 0;

        const tax =
          pax.taxesAmount?.amount ||
          pax.taxAmount?.amount ||
          pax.taxes ||
          pax.tax ||
          0;

        const discount = pax.discountAmount?.amount || pax.discountAmount || 0;

        const sca =
          pax.serviceChargeAmount?.amount ||
          pax.scaAmount?.amount ||
          pax.serviceChargeAmount ||
          pax.sca ||
          0;

        const total =
          pax.totalAmount?.amount ||
          pax.totalFare?.amount ||
          pax.totalAmount ||
          base + tax + sca - discount;

        return { type, count, base, tax, discount, sca, total };
      })
    : [
        {
          type: "ADT",
          count: state.searchParams.adults || 1,
          base: fallbackBase,
          tax: fallbackTax,
          discount: fallbackDiscount,
          sca: fallbackSCA,
          total: fallbackTotal,
        },
      ];

  const grandTotal = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);

  return `
    <div class="fare-box">
      <div class="fare-box-head">Fare Breakup</div>

      <div class="fare-box-body">
        ${rows
          .map(
            (row) => `
          <div class="fare-pax-title">
            ${formatPassengerType(row.type)} x ${row.count}
          </div>

          <div class="fare-line">
            <span>Base Fare</span>
            <strong>${money(row.base, flight.currency)}</strong>
          </div>

          <div class="fare-line">
            <span>Taxes & Fees</span>
            <strong>${money(row.tax, flight.currency)}</strong>
          </div>

          <div class="fare-line">
            <span>Discount</span>
            <strong>- ${money(row.discount, flight.currency)}</strong>
          </div>

          <div class="fare-line">
            <span>SCA</span>
            <strong>${money(row.sca, flight.currency)}</strong>
          </div>
        `,
          )
          .join("")}

        <div class="fare-total-line">
          <span>Total Payable</span>
          <strong>${money(grandTotal || fallbackTotal, flight.currency)}</strong>
        </div>
      </div>
    </div>
  `;
}

function formatPassengerType(type) {
  const t = String(type || "").toUpperCase();
  if (t === "ADT") return "Adult";
  if (t === "CHD") return "Child";
  if (t === "INF") return "Infant";
  return t;
}

function renderBaggageTab(flight) {
  const fare = getSelectedFare(flight);
  const segments = flight.segments || [];

  const handBaggage =
    fare.cabinBaggage === "Check Fare Rule!"
      ? "7 KG"
      : fare.cabinBaggage || "7 KG";

  const selectedBundle = getSelectedBundle(flight);

  const bundleCheckText = selectedBundle
  ? getBundleServiceText(
      selectedBundle.includedServices ||
      selectedBundle.IncludedServices ||
      [],
      "check"
    )
  : "";

  const checkBaggage = selectedBundle
    ? normalizeCheckedBaggage(bundleCheckText)
    : normalizeCheckedBaggage(fare.checkedBaggage || flight.baggage?.checked);

  return `
    <div class="baggage-info-box">
      <div class="baggage-info-head">
        Baggage Information
      </div>

      <div class="baggage-info-body">
        ${segments
          .map(
            (segment) => `
          <div class="baggage-segment">
            <div class="baggage-route">
              Flight from ${segment.from} to ${segment.to}
            </div>

            <div class="baggage-line">
              <span>Checkin Luggage</span>
              <strong>${checkBaggage}</strong>
            </div>

            <div class="baggage-line">
              <span>Cabin Baggage</span>
              <strong>${handBaggage}</strong>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderBundleServiceRow(label, bundles, type) {
  return `
    <tr>
      <td>${label}</td>
      ${bundles
        .map((bundle) => {
          const services =
            bundle.includedServices || bundle.IncludedServices || [];
          const text = getBundleServiceText(services, type);

          return `
          <td>
            ${text}
          </td>
        `;
        })
        .join("")}
    </tr>
  `;
}

  function getBundleServiceText(services, type) {
    const list = Array.isArray(services) ? services : [];

    const found = list.find((s) => {
      const text = String(
        typeof s === "string"
          ? s
          : s.name || s.serviceName || s.description || s.Description || "",
      ).toLowerCase();

      if (type === "carry") return text.includes("carry");
      if (type === "check") return text.includes("check");
      if (type === "meal") return text.includes("meal") || text.includes("snack");
      if (type === "change")
        return text.includes("change") || text.includes("rebook");
      if (type === "cancel")
        return text.includes("cancel") || text.includes("refund");

      return false;
    });

    if (!found) return "Not offered";

    return typeof found === "string"
      ? found
      : found.description ||
          found.Description ||
          found.name ||
          found.serviceName ||
          "Included";
  }

  function getSelectedBundle(flight) {
  const raw = state.bundleData[flight.id]?.raw;
  if (!raw) return null;

  const bundleChoicesRaw =
    raw.bundleChoices ||
    raw.BundleChoices ||
    raw;

  const bundleChoices = Array.isArray(bundleChoicesRaw)
    ? bundleChoicesRaw
    : Object.values(bundleChoicesRaw || {});

  const selectedCode =
    state.selectedBundleCodes[flight.id] ||
    bundleChoices[0]?.bundleCode;

  return bundleChoices.find((b) => b.bundleCode === selectedCode) || null;
}

function normalizeCheckedBaggage(text) {
  const value = String(text || "").toUpperCase();

  if (
    value.includes("CHECK RULE") ||
    value.includes("CHECK RULES") ||
    value.includes("DEPENDS")
  ) {
    return "Check Rules";
  }

  const multi = value.match(/(\d+)\s*X\s*(\d+)\s*KG/);
  if (multi) return `${Number(multi[1]) * Number(multi[2])} KG`;

  const piecesKg = value.match(/(\d+)\s*PIECE.*?(\d+)\s*KG|(\d+)\s*KG.*?(\d+)\s*PIECE/);
  if (piecesKg) {
    const kg = piecesKg[2] || piecesKg[3];
    return `${kg} KG`;
  }

  const kg = value.match(/(\d+)\s*(KG|KILOGRAM|KILOGRAMS)/);
  if (kg) return `${kg[1]} KG`;

  const pc = value.match(/(\d+)\s*(PC|PIECE|PIECES)/);
  if (pc) return `${pc[1]} Piece${Number(pc[1]) > 1 ? "s" : ""}`;

  return "Check Rules";
}

function continueWithSelectedBundle(flightId, confirmedOfferId) {
  const selectedCode = state.selectedBundleCodes[flightId];

  if (!selectedCode) {
    alert("Please select a bundle.");
    return;
  }

  const payload = {
    offerId: confirmedOfferId,
    selectedBundleCode: selectedCode,
  };

  localStorage.setItem("selectedFlightBundle", JSON.stringify(payload));

  window.location.href = "/src/services/flights/passenger-details/index.html";
}

function renderFareRules(flight) {
  return `
    <div class="panel">
      <h3>Fare Rules</h3>
      ${(flight.rules || ["Check Airline Rules"])
        .map(
          (rule, index) => `
        <details class="rule-accordion" ${index === 0 ? "open" : ""}>
          <summary>${getRuleTitle(rule, index)}</summary>
          <div class="rule-body">${rule}</div>
        </details>
      `,
        )
        .join("")}
    </div>
  `;
}

function getRuleTitle(rule, index) {
  const titles = [
    "Application and Conditions",
    "Date Change",
    "Refund / Cancellation",
    "Ticketing",
    "Other Rules",
  ];
  return titles[index] || `Rule ${index + 1}`;
}

function renderAddons(flight) {
  const selectedIds = state.selectedBundles[flight.id] || [];
  const categories = {};
  AVAILABLE_BUNDLES.forEach((b) => {
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
        ${Object.entries(categories)
          .map(
            ([cat, items]) => `
          <div class="addon-category">
            <h4 style="margin:0 0 12px; font-size:14px; color:var(--slate2); text-transform:uppercase; letter-spacing:1px">${cat}</h4>
            ${items
              .map(
                (item) => `
              <label class="baggage-card" style="display:flex; align-items:flex-start; gap:12px; cursor:pointer; transition:all 0.2s; ${selectedIds.includes(item.id) ? "border-color:#f59e0b; background:rgba(245,158,11,0.03)" : ""}">
                <input type="checkbox" class="bundle-check" data-flight-id="${flight.id}" data-bundle-id="${item.id}" ${selectedIds.includes(item.id) ? "checked" : ""} style="margin-top:4px" />
                <div style="flex:1">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
                    <span style="font-weight:800; font-size:14px">${item.name}</span>
                    <span style="color:#d97706; font-weight:800">+${money(item.price, flight.currency)}</span>
                  </div>
                  <div class="flight-supplier" style="margin:0; font-size:12px">${item.description}</div>
                </div>
              </label>
            `,
              )
              .join("")}
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderFlightDetails(flight) {
  const segments = flight.segments || [];

  return `
    <div class="panel-compact">
      <div class="itin-top-head">
        <strong>Depart • ${segments[0]?.departureDateTime ? formatDate(segments[0].departureDateTime) : ""}</strong>
        <span>${flight.duration || ""}</span>
      </div>

      <div class="itin-new-list">
        ${segments
          .map((segment, index) => {
            const nextSegment = segments[index + 1];
            const layover = nextSegment
              ? calculateLayover(segment, nextSegment)
              : "";

            return `
            <div class="itin-new-segment">

              <div class="itin-airline-side">
                <img src="${flight.logo || segment.logo || ""}" class="itin-airline-logo" />
                <div>${segment.airline || flight.airline}</div>
                <strong>${segment.airlineCode || flight.airlineCode} ${segment.flightNo}</strong>
              </div>

              <div class="itin-point-left">
                <div class="itin-main-time">${formatTime(segment.departureDateTime)}</div>
                <div class="itin-airport-code">${segment.from}</div>
                <div>${formatDate(segment.departureDateTime)}</div>
                <div>Terminal: ${segment.fromTerminal || "-"}</div>
              </div>

              <div class="itin-middle-line">
                <div>${segment.duration} ${segments.length === 1 ? "(Non Stop)" : ""}</div>
                <div class="itin-blue-line"></div>
                <div>${segment.aircraft || ""}</div>
              </div>

              <div class="itin-point-right">
                <div class="itin-main-time">${formatTime(segment.arrivalDateTime)}</div>
                <div class="itin-airport-code">${segment.to}</div>
                <div>${formatDate(segment.arrivalDateTime)}</div>
                <div>Terminal: ${segment.toTerminal || "-"}</div>
              </div>

              <div class="itin-class-side">
                <div>Class : ${segment.cabin || flight.cabin || "Economy"}</div>
                <div>Checkin Luggage : ${segment.baggage || "Check Rules"}</div>
              </div>

              ${
                layover
                  ? `
                <div class="itin-layover-row">
                  ${layover.replace(" layover", "")} layover ${segment.toCity || segment.to} (${segment.to})
                </div>
              `
                  : ""
              }

            </div>
          `;
          })
          .join("")}
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

window.buildResults = function (type) {
  if (type === "flights") {
    fetchFlightResults();
  }
};

// Initial render & fetch
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  fetchFlightResults();
});
