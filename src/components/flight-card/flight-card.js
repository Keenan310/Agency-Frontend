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
            ${window.renderSelectedSummary(flight)}
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
          <div class="val-mini">${window.money(window.calculateTotalPrice(flight), flight.currency)}</div>
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
  if (activeTab === "Fare Info") return window.renderFareInfo(flight);
  if (activeTab === "Baggages") return window.renderBaggageTab(flight);
  if (activeTab === "Fare Rules") return window.renderFareRules(flight);
  return window.renderFareCategories(flight);
}

function renderFlightDetails(flight) {
  const segments = flight.segments || [];

  return `
    <div class="panel-compact">
      <div class="itin-top-head">
        <strong>Depart • ${segments[0]?.departureDateTime ? window.formatDate(segments[0].departureDateTime) : ""}</strong>
        <span>${flight.duration || ""}</span>
      </div>

      <div class="itin-new-list">
        ${segments
          .map((segment, index) => {
            const nextSegment = segments[index + 1];
            const layover = nextSegment
              ? window.calculateLayover(segment, nextSegment)
              : "";

            return `
            <div class="itin-new-segment">

              <div class="itin-airline-side">
                <img src="${flight.logo || segment.logo || ""}" class="itin-airline-logo" />
                <div>${segment.airline || flight.airline}</div>
                <strong>${segment.airlineCode || flight.airlineCode} ${segment.flightNo}</strong>
              </div>

              <div class="itin-point-left">
                <div class="itin-main-time">${window.formatTime(segment.departureDateTime)}</div>
                <div class="itin-airport-code">${segment.from}</div>
                <div>${window.formatDate(segment.departureDateTime)}</div>
                <div>Terminal: ${segment.fromTerminal || "-"}</div>
              </div>

              <div class="itin-middle-line">
                <div>${segment.duration} ${segments.length === 1 ? "(Non Stop)" : ""}</div>
                <div class="itin-blue-line"></div>
                <div>${segment.aircraft || ""}</div>
              </div>

              <div class="itin-point-right">
                <div class="itin-main-time">${window.formatTime(segment.arrivalDateTime)}</div>
                <div class="itin-airport-code">${segment.to}</div>
                <div>${window.formatDate(segment.arrivalDateTime)}</div>
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

function renderFareInfo(flight) {
  const fare = window.getSelectedFare(flight);
  const raw = flight.raw || {};
  const paxBreakdowns = raw.passengerFareBreakdown || [];

  const fallbackBase = fare.baseFare || raw.fareBreakdown?.base || 0;
  const fallbackTax = fare.taxes || raw.fareBreakdown?.tax || 0;
  const fallbackDiscount = raw.fareBreakdown?.discount || 0;
  const fallbackSCA = raw.fareBreakdown?.fees || 0;
  const fallbackTotal = fare.priceAmount || flight.priceAmount || 0;

  const rows = paxBreakdowns.length
    ? paxBreakdowns.map((pax) => {
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
          count: window.state?.searchParams?.adults || 1,
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
            ${window.formatPassengerType(row.type)} x ${row.count}
          </div>

          <div class="fare-line">
            <span>Base Fare</span>
            <strong>${window.money(row.base, flight.currency)}</strong>
          </div>

          <div class="fare-line">
            <span>Taxes & Fees</span>
            <strong>${window.money(row.tax, flight.currency)}</strong>
          </div>

          <div class="fare-line">
            <span>Discount</span>
            <strong>- ${window.money(row.discount, flight.currency)}</strong>
          </div>

          <div class="fare-line">
            <span>SCA</span>
            <strong>${window.money(row.sca, flight.currency)}</strong>
          </div>
        `,
          )
          .join("")}

        <div class="fare-total-line">
          <span>Total Payable</span>
          <strong>${window.money(grandTotal || fallbackTotal, flight.currency)}</strong>
        </div>
      </div>
    </div>
  `;
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
        "check",
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
               onclick="event.stopPropagation()"
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
        <button
  class="bundle-continue-btn brand-continue-btn"
  type="button"
  data-flight-id="${flight.id}"
  onclick="window.continueWithBrandFare(this.dataset.flightId)"
>
  Continue
</button>
      </div>

    </div>
  `;
}


window.renderFlightCard = renderFlightCard;
window.renderFareInfo = renderFareInfo;
window.renderBaggageTab = renderBaggageTab;
window.renderFareCategories = renderFareCategories;
window.renderBundleTable = renderBundleTable;
window.renderBrandFareTable = renderBrandFareTable;
