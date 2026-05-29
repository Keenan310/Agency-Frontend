(function () {
  const STORAGE_KEY = "keenan_booking_review";

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value || "");
    } catch (e) {
      return fallback;
    }
  }

  function money(value, currency) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency || "AED"}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPassengerName(pax) {
    const nested = pax?.name || {};
    const first = pax?.firstName || pax?.first || nested.first || "";
    const last = pax?.lastName || pax?.last || nested.last || "";
    const title = pax?.title || "";
    const full = `${title} ${first} ${last}`.replace(/\s+/g, " ").trim();
    return full || "Passenger";
  }

  function getPassengerType(pax, index) {
    return (
      pax?.passengerTypeCode ||
      pax?.type ||
      pax?.paxType ||
      (index === 0 ? "ADT" : "PAX")
    );
  }

  function getPassengerEmail(pax) {
    return pax?.email || pax?.contact?.email || "—";
  }

  function getPassengerPhone(pax) {
    const phone = pax?.phone || pax?.contact?.phone || {};
    const code = phone.countryDialingCode || pax?.countryDialingCode || "";
    const number = phone.phoneNumber || pax?.phoneNumber || "";
    const direct = typeof phone === "string" ? phone : "";
    return direct || `${code} ${number}`.trim() || "—";
  }

  function getPassportNumber(pax) {
    return (
      pax?.passportNumber ||
      pax?.passport ||
      pax?.travelDocument?.documentNumber ||
      "—"
    );
  }

  function getPassportExpiry(pax) {
    return (
      pax?.passportExpiry ||
      pax?.expirationDate ||
      pax?.travelDocument?.expirationDate ||
      "—"
    );
  }

  function getSegments(flight) {
    if (Array.isArray(flight?.segments) && flight.segments.length)
      return flight.segments;
    if (
      Array.isArray(flight?.outboundSegments) &&
      flight.outboundSegments.length
    )
      return flight.outboundSegments;
    return [
      {
        airline: flight?.airline,
        airlineCode: flight?.airlineCode,
        flightNumber: flight?.flightNumber,
        origin: flight?.origin,
        destination: flight?.destination,
        departureTime: flight?.departureTime,
        arrivalTime: flight?.arrivalTime,
        duration: flight?.duration,
        stops: flight?.stops,
      },
    ];
  }

  function getReturnSegments(flight) {
    if (Array.isArray(flight?.returnSegments) && flight.returnSegments.length)
      return flight.returnSegments;
    if (
      Array.isArray(flight?.return?.segments) &&
      flight.return.segments.length
    )
      return flight.return.segments;
    return [];
  }

  function segmentAirlineName(segment, flight) {
    return (
      segment?.airline || segment?.airlineName || flight?.airline || "Airline"
    );
  }

  function segmentFlightNo(segment, flight) {
    const airlineCode =
      segment?.airlineCode || segment?.carrier || flight?.airlineCode || "";
    const flightNumber =
      segment?.flightNumber || segment?.marketingFlightNumber || "";
    return `${airlineCode}${flightNumber ? " " + flightNumber : ""}`.trim();
  }


  function getSegmentValue(segment, keys, fallback = "") {
    for (const key of keys) {
      const value = key.split(".").reduce((obj, part) => obj && obj[part], segment);
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return fallback;
  }

  function calculateLayover(currentSegment, nextSegment) {
    const arrivalValue =
      currentSegment?.arrivalDateTime ||
      currentSegment?.arrivalTime ||
      currentSegment?.arrival?.dateTime ||
      currentSegment?.arrival?.time;

    const departureValue =
      nextSegment?.departureDateTime ||
      nextSegment?.departureTime ||
      nextSegment?.departure?.dateTime ||
      nextSegment?.departure?.time;

    const arrival = new Date(arrivalValue);
    const departure = new Date(departureValue);

    if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) {
      return "";
    }

    const diffMinutes = Math.max(0, Math.round((departure - arrival) / 60000));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours ? hours + "h " : ""}${minutes ? minutes + "m" : ""}`.trim();
  }

  function injectItineraryStyles() {
    if (document.getElementById("booking-review-itinerary-style")) return;

    const style = document.createElement("style");
    style.id = "booking-review-itinerary-style";
    style.textContent = `
      .br-itin-panel {
        margin-top: 16px;
        border: 1px solid #dbe3ee;
        border-radius: 16px;
        background: #fff;
        overflow: hidden;
      }

      .br-itin-top-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 18px;
        border-bottom: 1px solid #dbe3ee;
        color: #07132f;
        font-size: 14px;
      }

      .br-itin-top-head span {
        color: #334155;
        font-size: 13px;
        white-space: nowrap;
      }

      .br-itin-list {
        padding: 0 18px 18px;
      }

      .br-itin-segment {
        display: grid;
        grid-template-columns: 92px 1fr 2fr 1fr 170px;
        gap: 18px;
        align-items: center;
        padding: 22px 0;
        border-bottom: 1px solid #dbe3ee;
        position: relative;
      }

      .br-itin-segment:last-child {
        border-bottom: 0;
      }

      .br-itin-airline-side {
        text-align: center;
        font-size: 12px;
        color: #334155;
      }

      .br-itin-airline-logo {
        width: 34px;
        height: 34px;
        object-fit: contain;
        display: block;
        margin: 0 auto 6px;
      }

      .br-itin-airline-side strong {
        display: block;
        margin-top: 4px;
        color: #07132f;
        font-size: 12px;
      }

      .br-itin-point-left,
      .br-itin-point-right {
        color: #07132f;
        font-size: 12px;
      }

      .br-itin-main-time {
        font-size: 22px;
        font-weight: 900;
        line-height: 1.05;
        color: #07132f;
      }

      .br-itin-airport-code {
        font-size: 14px;
        font-weight: 900;
        margin-top: 4px;
        color: #07132f;
      }

      .br-itin-city {
        color: #475569;
        margin-top: 3px;
        line-height: 1.35;
      }

      .br-itin-middle-line {
        text-align: center;
        color: #334155;
        font-size: 12px;
      }

      .br-itin-blue-line {
        height: 1px;
        background: #315cf5;
        margin: 10px 0;
        position: relative;
      }

      .br-itin-blue-line::after {
        content: "";
        position: absolute;
        right: -1px;
        top: -4px;
        border-left: 7px solid #315cf5;
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
      }

      .br-itin-class-side {
        font-size: 12px;
        line-height: 1.6;
        color: #07132f;
      }

      .br-itin-layover-row {
        grid-column: 1 / -1;
        margin-top: 4px;
        padding: 12px 0 0;
        text-align: center;
        border-top: 1px solid #dbe3ee;
        color: #334155;
        font-size: 13px;
      }

      @media (max-width: 900px) {
        .br-itin-segment {
          grid-template-columns: 1fr;
          text-align: left;
        }

        .br-itin-airline-side {
          text-align: left;
        }

        .br-itin-airline-logo {
          margin: 0 0 6px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function renderSegments(segments, flight) {
    const safeSegments = Array.isArray(segments) ? segments : [];

    return `
      <div class="br-itin-panel">
        <div class="br-itin-top-head">
          <strong>Depart • ${escapeHtml(formatDate(safeSegments[0]?.departureTime || safeSegments[0]?.departureDateTime || flight.departureTime))}</strong>
          <span>${escapeHtml(flight.duration || safeSegments[0]?.duration || "")}</span>
        </div>

        <div class="br-itin-list">
          ${safeSegments
            .map((segment, index) => {
              const nextSegment = safeSegments[index + 1];
              const airlineCode =
                segment.airlineCode ||
                segment.carrier ||
                flight.airlineCode ||
                flight.airline ||
                "";
              const flightNo =
                segment.flightNo ||
                segment.flightNumber ||
                segment.marketingFlightNumber ||
                "";
              const logo =
                segment.logo ||
                flight.airlineLogo ||
                flight.logo ||
                flight.logoUrl ||
                "";
              const from =
                segment.from ||
                segment.origin ||
                segment.departureAirport ||
                getSegmentValue(segment, ["departure.airport"], "—");
              const to =
                segment.to ||
                segment.destination ||
                segment.arrivalAirport ||
                getSegmentValue(segment, ["arrival.airport"], "—");
              const fromCity =
                segment.fromCity ||
                segment.departureCity ||
                segment.departureAirportName ||
                segment.departureAirport ||
                "";
              const toCity =
                segment.toCity ||
                segment.arrivalCity ||
                segment.arrivalAirportName ||
                segment.arrivalAirport ||
                "";
              const departValue =
                segment.departureDateTime ||
                segment.departureTime ||
                getSegmentValue(segment, ["departure.dateTime", "departure.time"], "");
              const arriveValue =
                segment.arrivalDateTime ||
                segment.arrivalTime ||
                getSegmentValue(segment, ["arrival.dateTime", "arrival.time"], "");
              const layover = nextSegment ? calculateLayover(segment, nextSegment) : "";
              const cabin =
                segment.cabin ||
                segment.cabinClass ||
                flight.fareClass ||
                flight.cabin ||
                "Economy";
              const baggage =
                segment.baggage ||
                segment.checkedBaggage ||
                flight.checkIn ||
                flight.checkInBaggage ||
                flight.baggage?.checkIn?.allowance ||
                "Check Rules";

              return `
                <div class="br-itin-segment">
                  <div class="br-itin-airline-side">
                    ${logo ? `<img src="${escapeHtml(logo)}" class="br-itin-airline-logo" alt="${escapeHtml(airlineCode || "Airline")}" />` : `<div class="br-airline-logo-fallback">${escapeHtml(String(airlineCode || "AI").slice(0, 2).toUpperCase())}</div>`}
                    <div>${escapeHtml(segmentAirlineName(segment, flight))}</div>
                    <strong>${escapeHtml([airlineCode, flightNo].filter(Boolean).join(" "))}</strong>
                  </div>

                  <div class="br-itin-point-left">
                    <div class="br-itin-main-time">${escapeHtml(formatTime(departValue))}</div>
                    <div class="br-itin-airport-code">${escapeHtml(from)}</div>
                    <div>${escapeHtml(formatDate(departValue))}</div>
                    <div class="br-itin-city">${escapeHtml(fromCity)}</div>
                    <div>Terminal: ${escapeHtml(segment.fromTerminal || segment.departureTerminal || segment.departure?.terminal || "-")}</div>
                  </div>

                  <div class="br-itin-middle-line">
                    <div>${escapeHtml(segment.duration || flight.duration || "")} ${safeSegments.length === 1 ? "(Non Stop)" : ""}</div>
                    <div class="br-itin-blue-line"></div>
                    <div>${escapeHtml(segment.aircraft || segment.equipment || "")}</div>
                  </div>

                  <div class="br-itin-point-right">
                    <div class="br-itin-main-time">${escapeHtml(formatTime(arriveValue))}</div>
                    <div class="br-itin-airport-code">${escapeHtml(to)}</div>
                    <div>${escapeHtml(formatDate(arriveValue))}</div>
                    <div class="br-itin-city">${escapeHtml(toCity)}</div>
                    <div>Terminal: ${escapeHtml(segment.toTerminal || segment.arrivalTerminal || segment.arrival?.terminal || "-")}</div>
                  </div>

                  <div class="br-itin-class-side">
                    <div>Class : ${escapeHtml(cabin)}</div>
                    <div>Checkin Luggage : ${escapeHtml(baggage)}</div>
                  </div>

                  ${
                    layover
                      ? `<div class="br-itin-layover-row">${escapeHtml(layover)} layover ${escapeHtml(toCity || to)} (${escapeHtml(to)})</div>`
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

  function renderFlightCard(reviewData) {
    const flight = reviewData.flight || {};
    const outboundSegments = getSegments(flight);
    const returnSegments = getReturnSegments(flight);
    const first = outboundSegments[0] || {};
    const last = outboundSegments[outboundSegments.length - 1] || first;
    const stops = Math.max(
      outboundSegments.length - 1,
      Number(flight.stops || 0),
    );
    const logo = flight.airlineLogo || flight.logo || flight.logoUrl || "";
    const airline =
      flight.airline || first.airline || first.airlineName || "Airline";

    return `
      <div class="br-card">
        <div class="br-card-head">
          <div>
            <div class="br-card-title">Flight Summary</div>
            <div class="br-card-subtitle">Outbound${returnSegments.length ? " and return flight details" : " flight details"}</div>
          </div>
          <button type="button" class="br-link-btn" data-toggle="flight-details">View details</button>
        </div>

        <div class="br-flight-main">
          <div class="br-airline-box">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(airline)} logo" class="br-airline-logo">` : `<div class="br-airline-logo-fallback">${escapeHtml(String(airline).slice(0, 2).toUpperCase())}</div>`}
            <div>
              <strong>${escapeHtml(airline)}</strong>
              <span>${escapeHtml(flight.fareClass || flight.cabin || "Economy")}</span>
            </div>
          </div>

          <div class="br-route-box">
            <div>
              <strong>${escapeHtml(first.origin || flight.origin || "—")}</strong>
              <span>${escapeHtml(formatTime(first.departureTime || flight.departureTime))}</span>
            </div>
            <div class="br-route-line">
              <span>${escapeHtml(flight.duration || first.duration || "—")}</span>
              <i></i>
              <small>${stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}</small>
            </div>
            <div>
              <strong>${escapeHtml(last.destination || flight.destination || "—")}</strong>
              <span>${escapeHtml(formatTime(last.arrivalTime || flight.arrivalTime))}</span>
            </div>
          </div>
        </div>

        <div class="br-expand-panel" data-panel="flight-details">
          <div class="br-section-label">Outbound</div>
          ${renderSegments(outboundSegments, flight)}
          ${
            returnSegments.length
              ? `
            <div class="br-section-label br-return-label">Return</div>
            ${renderSegments(returnSegments, flight)}
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  function renderPassengerCard(reviewData) {
    const passengers = Array.isArray(reviewData.passengers)
      ? reviewData.passengers
      : [];
    const safePassengers = passengers.length ? passengers : [{}];

    return `
      <div class="br-card">
        <div class="br-card-head">
          <div>
            <div class="br-card-title">Passenger Summary</div>
            <div class="br-card-subtitle">${safePassengers.length} passenger${safePassengers.length > 1 ? "s" : ""}</div>
          </div>
          <button type="button" class="br-link-btn" data-action="edit-passengers">Edit</button>
        </div>

        <div class="br-passenger-list">
          ${safePassengers
            .map(
              (pax, index) => `
            <div class="br-pax-item">
              <button type="button" class="br-pax-top" data-toggle="pax-${index}">
                <div>
                  <strong>${escapeHtml(getPassengerName(pax))}</strong>
                  <span>${escapeHtml(formatDate(pax.birthDate || pax.dob))} · ${escapeHtml(pax.nationality || "—")}</span>
                </div>
                <em>${escapeHtml(getPassengerType(pax, index))}</em>
              </button>

              <div class="br-pax-details" data-panel="pax-${index}">
                <div><span>Email</span><strong>${escapeHtml(getPassengerEmail(pax))}</strong></div>
                <div><span>Phone</span><strong>${escapeHtml(getPassengerPhone(pax))}</strong></div>
                <div><span>Passport</span><strong>${escapeHtml(getPassportNumber(pax))}</strong></div>
                <div><span>Passport Expiry</span><strong>${escapeHtml(formatDate(getPassportExpiry(pax)))}</strong></div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderFareCard(reviewData) {
    const flight = reviewData.flight || {};
    const currency = flight.currency || reviewData.currency || "AED";
    const selectedBundles =
      reviewData.selectedBundles || flight.selectedBundles || [];
    const bundleTotal = selectedBundles.reduce(
      (sum, item) => sum + Number(item.price || item.amount || 0),
      0,
    );

    const baseFare = Number(
      flight.baseAmount || flight.baseFare || reviewData.baseFare || 0,
    );
    const taxes = Number(
      flight.taxAmount || flight.taxes || reviewData.taxes || 0,
    );
    const serviceFee = Number(reviewData.serviceFee || flight.serviceFee || 0);
    const discount = Number(reviewData.discount || flight.discount || 0);
    const total = Number(
      flight.totalAmount ||
        reviewData.total ||
        baseFare + taxes + serviceFee + bundleTotal - discount,
    );

    return `
      <div class="br-card">
        <div class="br-card-head">
          <div>
            <div class="br-card-title">Fare Breakdown</div>
            <div class="br-card-subtitle">Price includes selected fare and available extras</div>
          </div>
        </div>

        <div class="br-fare-table">
          <div><span>Base Fare</span><strong>${money(baseFare, currency)}</strong></div>
          <div><span>Taxes &amp; Fees</span><strong>${money(taxes, currency)}</strong></div>

          ${
            selectedBundles.length
              ? selectedBundles
                  .map(
                    (bundle) => `
            <div>
              <span>Bundle / Ancillary <small>${escapeHtml(bundle.bundleName || bundle.name || bundle.selectedBundleCode || "")}</small></span>
              <strong>${money(bundle.price || bundle.amount || 0, currency)}</strong>
            </div>
          `,
                  )
                  .join("")
              : `
            <div><span>Bundle / Ancillary</span><strong>Not selected</strong></div>
          `
          }

          ${flight.carryOn || flight.handCarry ? `<div><span>Hand Carry</span><strong>${escapeHtml(flight.carryOn || flight.handCarry)}</strong></div>` : ""}
          ${flight.checkIn || flight.checkInBaggage ? `<div><span>Check-in Baggage</span><strong>${escapeHtml(flight.checkIn || flight.checkInBaggage)}</strong></div>` : ""}

          <div><span>Service Fee</span><strong>${money(serviceFee, currency)}</strong></div>
          ${discount ? `<div><span>Customer Discount</span><strong>- ${money(discount, currency)}</strong></div>` : ""}

          <div class="br-grand-total">
            <span>Total Payable</span>
            <strong>${money(total, currency)}</strong>
          </div>
        </div>
      </div>
    `;
  }

  function renderActions() {
    return `
    <div class="br-payment-gate">
      <label class="br-terms-check">
        <input type="checkbox" id="acceptTermsCheck" />
        <span>I accept the Terms & Conditions and fare rules for this booking.</span>
      </label>

      <div id="paymentMethodsBox" class="br-payment-methods">
        <div class="br-payment-title">Select Payment Method</div>

        <button type="button" class="br-pay-option" data-payment="card">
          Credit / Debit Card
        </button>

        <button type="button" class="br-pay-option" data-payment="wallet">
          Wallet Pay
        </button>

        <button type="button" class="br-pay-option" data-payment="bank">
          Bank Transfer
        </button>
      </div>
    </div>

    <div class="br-actions">
      <button type="button" class="br-secondary-btn" data-action="edit-flight">Edit Flight</button>
      <button type="button" class="br-secondary-btn" data-action="edit-passengers">Edit Passengers</button>
      <button type="button" class="br-primary-btn" data-action="proceed-payment" disabled>
        Proceed to Payment
      </button>
    </div>
  `;
  }

  function bindEvents(container) {
    container.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", function () {
        const key = btn.getAttribute("data-toggle");
        const panel = container.querySelector(`[data-panel="${key}"]`);
        if (!panel) return;
        panel.classList.toggle("is-open");
        btn.classList.toggle("is-open");
        if (key === "flight-details") {
          btn.textContent = panel.classList.contains("is-open")
            ? "Hide details"
            : "View details";
        }
      });
    });

    const termsCheck = container.querySelector("#acceptTermsCheck");
    const paymentMethodsBox = container.querySelector("#paymentMethodsBox");
    const proceedBtn = container.querySelector(
      '[data-action="proceed-payment"]',
    );

    if (termsCheck && paymentMethodsBox && proceedBtn) {
      termsCheck.addEventListener("change", function () {
        paymentMethodsBox.classList.toggle("is-open", termsCheck.checked);
        proceedBtn.disabled = !termsCheck.checked;
      });
    }

    container.querySelectorAll("[data-payment]").forEach((btn) => {
      btn.addEventListener("click", function () {
        container
          .querySelectorAll("[data-payment]")
          .forEach((x) => x.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        localStorage.setItem("keenan_payment_method", btn.dataset.payment);
      });
    });

    container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", function () {
        const action = btn.getAttribute("data-action");

        if (action === "edit-passengers") {
          window.location.href = "../passenger-details/passenger-details.html";
          return;
        }

        if (action === "edit-flight") {
          window.location.href = "../results/index.html";
          return;
        }

        if (action === "proceed-payment") {
          const paymentMethod = localStorage.getItem("keenan_payment_method");

          if (!paymentMethod) {
            alert("Please select a payment method.");
            return;
          }

          if (paymentMethod === "card") {
            window.location.href = "../../payments/payments.html";
            return;
          }

          if (paymentMethod === "wallet") {
            alert("Wallet payment will be connected next.");
            return;
          }

          if (paymentMethod === "bank") {
            alert("Bank transfer will be connected next.");
            return;
          }
        }
      });
    });
  }
  async function render(containerSelector) {
    const container =
      typeof containerSelector === "string"
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!container) return;

    injectItineraryStyles();

    const localData = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
    const bookingId = localData.bookingId;

    let reviewData = localData;

    if (bookingId) {
      try {
        const bookingRef =
          localData.reference ||
          localData.bookingReference ||
          `FLT-${bookingId}`;

        const apiBase =
          (window.KEENAN_CONFIG && window.KEENAN_CONFIG.apiBaseUrl) ||
          "http://localhost:3000";

        const session = JSON.parse(
          localStorage.getItem("keenanTravelSession") || "null",
        );

        const headers = {
          "Content-Type": "application/json",
        };

        if (session && session.token) {
          headers.Authorization = `Bearer ${session.token}`;
        }

        const res = await fetch(
          `${apiBase}/v1/ndc/ticketing/track/${bookingRef}`,
          {
            method: "GET",
            headers,
          },
        );

        const apiData = await res.json();

        console.log("BOOKING REVIEW API RESPONSE:", apiData);

        if (!res.ok) {
          throw new Error(
            apiData.message || apiData.error || "Booking API failed",
          );
        }

        reviewData = {
          ...localData,
          ...(apiData.data || apiData.booking || apiData),
        };
      } catch (err) {
        console.error("Booking review API error:", err);
      }
    }

    if (!reviewData || Object.keys(reviewData).length === 0) {
      container.innerHTML = `
      <div class="br-empty">
        <h3>No booking review data found</h3>
        <p>Please select a flight and complete passenger details first.</p>
        <button type="button" class="br-primary-btn" data-action="edit-flight">Back to Flights</button>
      </div>
    `;
      bindEvents(container);
      return;
    }

    container.innerHTML = `
    ${renderFlightCard(reviewData)}
    ${renderPassengerCard(reviewData)}
    ${renderFareCard(reviewData)}
    ${renderActions()}
  `;

    bindEvents(container);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector("#bookingReviewRoot");
    if (root) render(root);
  });

  window.bookingReviewStep = { render };
})();
