(function () {
  "use strict";

  const REQUIRED_FIELD_KEYS = [
    "title",
    "fname",
    "lname",
    "dob",
    "nationality",
    "gender",
    "passport",
    "passportExpiry",
  ];
  const CONTACT_FIELD_KEYS = ["email", "phone"];

  const passengerCounts = {
    adults: 1,
    children: 1,
    infants: 1,
  };

  const TITLE_RULES = {
    ADT: { Male: "MR", Female: "MRS" },
    CHD: { Male: "MSTR", Female: "MISS" },
    INF: { Male: "MSTR", Female: "MISS" },
  };

  const TITLE_OPTIONS = ["MR", "MRS", "MS", "MSTR", "MISS"];

  let selectedOffer = {
    offerId: "OFF-DEMO-784512",
    fareCategory: "Economy Classic",
    segments: [
      {
        id: "SEG-001",
        departureCode: "RKT",
        departureAirport: "Ras Al Khaimah International Airport",
        departureDate: "25 May 2026",
        departureTime: "08:25",
        arrivalCode: "ISB",
        arrivalAirport: "Islamabad International Airport",
        arrivalDate: "25 May 2026",
        arrivalTime: "12:40",
        airline: "Demo Air",
      },
      {
        id: "SEG-002",
        departureCode: "ISB",
        departureAirport: "Islamabad International Airport",
        departureDate: "25 May 2026",
        departureTime: "16:10",
        arrivalCode: "AUH",
        arrivalAirport: "Zayed International Airport",
        arrivalDate: "25 May 2026",
        arrivalTime: "19:05",
        airline: "Demo Air",
      },
    ],
    baggage: {
      cabin: {
        allowance: "7 KG",
        description: "1 cabin bag included with the selected fare option.",
      },
      checkIn: {
        allowance: "30 KG",
        description:
          "Included check-in baggage allowance for this selected offer.",
      },
    },
    price: {
      currency: "AED",
      baseFare: 1850,
      taxesFees: 275,
      ancillary: 0,
      serviceFee: 50,
      paymentGatewayFee: 0,
      customerDiscount: 25,
    },
  };

  function loadBookingData() {
    const raw = localStorage.getItem("keenan_selected_flight");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const { flight, fare, params, selectedBundle, pricing, baggage } = data;

      console.log("[Booking] Loading data from localStorage:", data);

      // Update passenger counts
      passengerCounts.adults = params.adults || 1;
      passengerCounts.children = params.children || 0;
      passengerCounts.infants = params.infants || 0;

      // Map flight to selectedOffer
      selectedOffer.offerId = fare.offerId || flight.id;
      selectedOffer.fareCategory = fare.name || flight.cabin || "Economy";

      selectedOffer.segments = flight.segments.map((seg) => ({
        id: seg.flightNo || "SEG-" + Math.random().toString(36).substr(2, 5),
        airlineCode: seg.airlineCode || flight.airlineCode || "",
        flightNo: seg.flightNo || "",
        aircraft: seg.aircraft || "",
        duration: seg.duration || "",
        departureCode: seg.from,
        departureAirport: seg.fromCity || seg.fromAirport || seg.from,
        departureTerminal: seg.fromTerminal || "-",
        departureDate: new Date(seg.departureDateTime).toLocaleDateString(
          "en-GB",
          { day: "2-digit", month: "short", year: "numeric" },
        ),
        departureTime: new Date(seg.departureDateTime).toLocaleTimeString(
          "en-GB",
          { hour: "2-digit", minute: "2-digit", hour12: false },
        ),
        arrivalCode: seg.to,
        arrivalAirport: seg.toCity || seg.toAirport || seg.to,
        arrivalTerminal: seg.toTerminal || "-",
        arrivalDate: new Date(seg.arrivalDateTime).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        arrivalTime: new Date(seg.arrivalDateTime).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        airline: seg.airline,
      }));

      selectedOffer.duration = flight.duration || "";

      selectedOffer.baggage = {
        cabin: {
          allowance: data.baggage?.cabin || flight.baggage?.cabin || "7 KG",
          description: "Cabin baggage allowance",
        },
        checkIn: {
          allowance:
            data.baggage?.checked ||
            fare.checkedBaggage ||
            flight.baggage?.checked ||
            "20 KG",
          description: "Check-in baggage allowance",
        },
      };

      const total =
        data.pricing?.total ||
        flight.selectedTotal ||
        fare.priceAmount ||
        flight.priceAmount ||
        0;
      // Rough breakdown if not provided
      selectedOffer.price = {
        currency: flight.currency || "AED",
        baseFare: Math.floor(total * 0.85),
        taxesFees: Math.floor(total * 0.12),
        ancillary: 0,
        serviceFee: Math.floor(total * 0.03),
        paymentGatewayFee: Number(pricing?.paymentGatewayFee || 0),
        customerDiscount: 0,
      };
      // Adjust baseFare to match total
      selectedOffer.price.baseFare =
        total -
        (selectedOffer.price.taxesFees +
          selectedOffer.price.serviceFee +
          selectedOffer.price.paymentGatewayFee);

      // Initialize state
      const savedSelectedBundles = Array.isArray(data.selectedBundles)
        ? data.selectedBundles
        : selectedBundle
          ? [
              {
                JourneyKey: selectedBundle.journeyKey || "journey-1",
                SelectedBundleCode: selectedBundle.bundleCode,
                price: pricing?.bundleAmount || 0,
              },
            ]
          : [];

      window.bookingState = {
        offerId:
          data.confirmedOfferId ||
          flight.selectedOfferId ||
          fare.offerId ||
          selectedOffer.offerId,
        confirmedOfferId:
          data.confirmedOfferId ||
          flight.selectedOfferId ||
          fare.offerId ||
          selectedOffer.offerId,
        haveBundles: data.haveBundles === true || !!selectedBundle,
        selectedBundles: savedSelectedBundles,
        cabin_held:
          data.canBeHeld === true ||
          data.cabin_held === true ||
          data.canBeHeld === "true",
        amount: total,
        currency: selectedOffer.price.currency,
      };
    } catch (e) {
      console.error("[Booking] Error loading data:", e);
    }
  }

  function initializeDefaultState() {
    if (!window.bookingState) {
      const total =
        selectedOffer.price.baseFare +
        selectedOffer.price.taxesFees +
        selectedOffer.price.serviceFee;
      window.bookingState = {
        offerId: selectedOffer.offerId,
        confirmedOfferId: null,
        haveBundles: false,
        selectedBundles: [],
        cabin_held: false,
        amount: total,
        currency: selectedOffer.price.currency,
      };
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function money(value) {
    return (
      selectedOffer.price.currency +
      " " +
      Number(value || 0).toLocaleString("en-AE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function passengerTypeName(type) {
    if (type === "ADT") return "Adult";
    if (type === "CHD") return "Child";
    if (type === "INF") return "Infant";
    return type;
  }

  function createPassengersFromCounts() {
    const adults = Math.max(0, Number(passengerCounts.adults || 0));
    const children = Math.max(0, Number(passengerCounts.children || 0));
    const infants = Math.max(0, Number(passengerCounts.infants || 0));
    const passengers = [];

    for (let i = 1; i <= adults; i += 1)
      passengers.push({ type: "ADT", label: "Adult " + i });
    for (let i = 1; i <= children; i += 1)
      passengers.push({ type: "CHD", label: "Child " + i });
    for (let i = 1; i <= infants; i += 1)
      passengers.push({ type: "INF", label: "Infant " + i });

    return passengers;
  }

  function passengerSummaryText() {
    const parts = [];
    if (passengerCounts.adults)
      parts.push(
        passengerCounts.adults +
          " Adult" +
          (passengerCounts.adults > 1 ? "s" : ""),
      );
    if (passengerCounts.children)
      parts.push(
        passengerCounts.children +
          " Child" +
          (passengerCounts.children > 1 ? "ren" : ""),
      );
    if (passengerCounts.infants)
      parts.push(
        passengerCounts.infants +
          " Infant" +
          (passengerCounts.infants > 1 ? "s" : ""),
      );
    return parts.length ? parts.join(", ") : "No passenger selected";
  }

  function fieldId(index, key) {
    return "pax-" + index + "-" + key;
  }

  function getDefaultTitle(passengerType, gender) {
    return (
      (TITLE_RULES[passengerType] && TITLE_RULES[passengerType][gender]) || ""
    );
  }

  function updateTitleForPassenger(card) {
    if (!card) return;

    const passengerType = card.dataset.passengerType;
    const genderField = card.querySelector('[data-field-key="gender"]');
    const titleSelect = card.querySelector('[data-field-key="title"]');
    const gender = genderField ? genderField.value : "";
    const nextTitle = getDefaultTitle(passengerType, gender);

    if (titleSelect && nextTitle) {
      titleSelect.value = nextTitle;
    }
  }

  function titleOptionsHtml() {
    return TITLE_OPTIONS.map(function (title) {
      const safeTitle = escapeHtml(title);
      return '<option value="' + safeTitle + '">' + safeTitle + "</option>";
    }).join("");
  }

  function bindPassengerFormEvents() {
    document
      .querySelectorAll('.passenger-form-card [data-field-key="gender"]')
      .forEach(function (genderSelect) {
        genderSelect.addEventListener("change", function () {
          updateTitleForPassenger(this.closest(".passenger-form-card"));
        });
      });
  }

  function renderPassengerItineraryBox() {
    const segments = selectedOffer.segments || [];

    if (!segments.length) {
      return '<div class="panel-compact"><div class="itin-top-head">No itinerary found</div></div>';
    }

    return `
      <div class="panel-compact">
        <div class="itin-top-head">
          <strong>Depart • ${escapeHtml(segments[0]?.departureDate || "")}</strong>
          <span>${escapeHtml(selectedOffer.duration || "")}</span>
        </div>

        <div class="itin-new-list">
          ${segments
            .map(function (segment, index) {
              const nextSegment = segments[index + 1];
              const flightLabel = [
                segment.airlineCode,
                segment.flightNo || segment.id,
              ]
                .filter(Boolean)
                .join(" ");

              return `
                <div class="itin-new-segment">
                  <div class="itin-airline-side">
                    <div class="itin-airline-logo-fallback">✈</div>
                    <div>${escapeHtml(segment.airlineCode || segment.airline || "Airline")}</div>
                    <strong>${escapeHtml(flightLabel || segment.id || "")}</strong>
                  </div>

                  <div class="itin-point-left">
                    <div class="itin-main-time">${escapeHtml(segment.departureTime || "--:--")}</div>
                    <div class="itin-airport-code">${escapeHtml(segment.departureCode || "")}</div>
                    <div>${escapeHtml(segment.departureDate || "")}</div>
                    <div>Terminal: ${escapeHtml(segment.departureTerminal || "-")}</div>
                  </div>

                  <div class="itin-middle-line">
                    <div>${escapeHtml(segment.duration || "")}</div>
                    <div class="itin-blue-line"></div>
                    <div>${escapeHtml(segment.aircraft || "")}</div>
                  </div>

                  <div class="itin-point-right">
                    <div class="itin-main-time">${escapeHtml(segment.arrivalTime || "--:--")}</div>
                    <div class="itin-airport-code">${escapeHtml(segment.arrivalCode || "")}</div>
                    <div>${escapeHtml(segment.arrivalDate || "")}</div>
                    <div>Terminal: ${escapeHtml(segment.arrivalTerminal || "-")}</div>
                  </div>

                  <div class="itin-class-side">
                    <div>Class : ${escapeHtml(selectedOffer.fareCategory || "Economy")}</div>
                    <div>Checkin Luggage : ${escapeHtml(selectedOffer.baggage?.checkIn?.allowance || "Check Rules")}</div>
                  </div>

                  ${
                    nextSegment
                      ? `<div class="itin-layover-row">Layover ${escapeHtml(segment.arrivalCode || "")}</div>`
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

  function renderSelectedOfferDetails() {
    // byId("selectedFareCategory").textContent = selectedOffer.fareCategory;

    byId("segmentList").innerHTML = renderPassengerItineraryBox();

    const paymentGatewayFee = Number(
      selectedOffer.price.paymentGatewayFee || 0,
    );

    const total =
      selectedOffer.price.baseFare +
      selectedOffer.price.taxesFees +
      selectedOffer.price.ancillary +
      selectedOffer.price.serviceFee +
      paymentGatewayFee -
      selectedOffer.price.customerDiscount;

    byId("baseFare").textContent = money(selectedOffer.price.baseFare);
    byId("taxesFees").textContent = money(selectedOffer.price.taxesFees);
    byId("ancillaryCost").textContent = money(selectedOffer.price.ancillary);
    byId("serviceFee").textContent = money(selectedOffer.price.serviceFee);
    byId("paymentGatewayFee").textContent = money(paymentGatewayFee);
    byId("customerDiscount").textContent =
      "- " + money(selectedOffer.price.customerDiscount);
    byId("totalPayable").textContent = money(total);
  }

  function renderPassengerForms() {
    const passengers = createPassengersFromCounts();
    byId("passengerCountTag").textContent =
      passengers.length +
      " Passenger" +
      (passengers.length !== 1 ? "s" : "") +
      " · " +
      passengerSummaryText();
    byId("passengerPriceLabel").textContent = passengerSummaryText();

    const options = titleOptionsHtml();

    byId("passengerForms").innerHTML = passengers
      .map(function (passenger, index) {
        const isFirstPassenger = index === 0;
        const typeName = passengerTypeName(passenger.type);

        let html =
          "" +
          '<div class="passenger-form-card" data-passenger-index="' +
          index +
          '" data-passenger-type="' +
          escapeHtml(passenger.type) +
          '">' +
          '<div class="passenger-card-head">' +
          '<h3 class="passenger-card-title">' +
          escapeHtml(passenger.label) +
          " Information</h3>" +
          '<span class="pd-pax-tag">Passenger ' +
          (index + 1) +
          " · " +
          escapeHtml(passenger.type) +
          "</span>" +
          "</div>" +
          '<section class="pd-section">' +
          '<div class="pd-section-title">Personal Information</div>' +
          '<div class="pd-grid g3">' +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "title") +
          '">Title</label>' +
          '<select id="' +
          fieldId(index, "title") +
          '" data-field-key="title">' +
          '<option value="">Select title</option>' +
          options +
          "</select>" +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "fname") +
          '">First Name</label>' +
          '<input id="' +
          fieldId(index, "fname") +
          '" data-field-key="fname" type="text" placeholder="' +
          escapeHtml(typeName) +
          ' first name" />' +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "lname") +
          '">Last Name</label>' +
          '<input id="' +
          fieldId(index, "lname") +
          '" data-field-key="lname" type="text" placeholder="' +
          escapeHtml(typeName) +
          ' last name" />' +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "dob") +
          '">Date of Birth</label>' +
          '<input id="' +
          fieldId(index, "dob") +
          '" data-field-key="dob" type="date" />' +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "nationality") +
          '">Nationality</label>' +
          '<input id="' +
          fieldId(index, "nationality") +
          '" data-field-key="nationality" type="text" placeholder="Country code" />' +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "gender") +
          '">Gender</label>' +
          '<select id="' +
          fieldId(index, "gender") +
          '" data-field-key="gender">' +
          '<option value="">Select gender</option>' +
          '<option value="Male">Male</option>' +
          '<option value="Female">Female</option>' +
          "</select>" +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          "</div>" +
          "</section>" +
          '<section class="pd-section">' +
          '<div class="pd-section-title">Passport Information</div>' +
          '<div class="pd-grid g3">' +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "passport") +
          '">Passport Number</label>' +
          '<input id="' +
          fieldId(index, "passport") +
          '" data-field-key="passport" type="text" placeholder="Passport number" />' +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "passportIssue") +
          '">Issue Date</label>' +
          '<input id="' +
          fieldId(index, "passportIssue") +
          '" data-field-key="passportIssue" type="date" />' +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          '<div class="pd-field">' +
          '<label for="' +
          fieldId(index, "passportExpiry") +
          '">Expiry Date</label>' +
          '<input id="' +
          fieldId(index, "passportExpiry") +
          '" data-field-key="passportExpiry" type="date" />' +
          '<div class="pd-error-msg"></div>' +
          "</div>" +
          "</div>" +
          "</section>";

        if (isFirstPassenger) {
          html +=
            "" +
            '<section class="pd-section">' +
            '<div class="pd-section-title">Contact Information</div>' +
            '<div class="pd-grid">' +
            '<div class="pd-field">' +
            '<label for="' +
            fieldId(index, "email") +
            '">Email</label>' +
            '<input id="' +
            fieldId(index, "email") +
            '" data-field-key="email" type="email" placeholder="passenger@email.com" />' +
            '<div class="pd-error-msg"></div>' +
            "</div>" +
            '<div class="pd-field">' +
            '<label for="' +
            fieldId(index, "phone") +
            '">Phone</label>' +
            '<input id="' +
            fieldId(index, "phone") +
            '" data-field-key="phone" type="tel" placeholder="971501234567" />' +
            '<div class="pd-error-msg"></div>' +
            "</div>" +
            "</div>" +
            "</section>";
        }

        html += "</div>";
        return html;
      })
      .join("");

    bindPassengerFormEvents();
  }

  function validatePassengerForm() {
    let valid = true;
    const passengerCards = document.querySelectorAll(".passenger-form-card");

    passengerCards.forEach(function (card, index) {
      const requiredKeys =
        index === 0
          ? REQUIRED_FIELD_KEYS.concat(CONTACT_FIELD_KEYS)
          : REQUIRED_FIELD_KEYS;

      requiredKeys.forEach(function (key) {
        const el = card.querySelector('[data-field-key="' + key + '"]');
        if (!el) return;

        const empty = !String(el.value || "").trim();
        el.classList.toggle("error", empty);

        const msg = el.parentElement.querySelector(".pd-error-msg");
        if (msg) msg.textContent = empty ? "This field is required" : "";
        if (empty) valid = false;
      });
    });

    return valid;
  }

  function clearValidation() {
    document
      .querySelectorAll(
        ".passenger-form-card input, .passenger-form-card select",
      )
      .forEach(function (el) {
        el.classList.remove("error");
        const msg = el.parentElement.querySelector(".pd-error-msg");
        if (msg) msg.textContent = "";
      });
  }

  function getPassengerData() {
    return Array.from(document.querySelectorAll(".passenger-form-card")).map(
      function (card) {
        function value(key) {
          const el = card.querySelector('[data-field-key="' + key + '"]');
          return el ? String(el.value || "").trim() : "";
        }

        return {
          passengerTypeCode: card.dataset.passengerType,
          title: value("title"),
          firstName: value("fname"),
          lastName: value("lname"),
          birthDate: value("dob"),
          nationality: value("nationality"),
          gender: value("gender"),
          email: value("email"),
          phone: value("phone"),
          passportNumber: value("passport"),
          passportExpiry: value("passportExpiry"),
          passportIssue: value("passportIssue"),
        };
      },
    );
  }

  function buildNdcPassengerPayload(offerId) {
    const finalOfferId = offerId || selectedOffer.offerId;
    const passengers = getPassengerData();

    return {
      OfferId: finalOfferId,
      SegmentIds: selectedOffer.segments.map(function (segment) {
        return segment.id;
      }),
      Baggage: selectedOffer.baggage,
      Price: selectedOffer.price,
      Passengers: passengers.map(function (pax) {
        return {
          PassengerTypeCode: pax.passengerTypeCode,
          Title: pax.title,
          FirstName: pax.firstName,
          LastName: pax.lastName,
          BirthDate: pax.birthDate,
          Nationality: pax.nationality,
          Gender: pax.gender,
          Email: pax.email,
          Phone: pax.phone,
          PassportNumber: pax.passportNumber,
          PassportExpiry: pax.passportExpiry,
          PassportIssue: pax.passportIssue,
        };
      }),
    };
  }

  function setPassengerCounts(counts) {
    const safeCounts = counts || {};
    passengerCounts.adults = Math.max(0, Number(safeCounts.adults || 0));
    passengerCounts.children = Math.max(0, Number(safeCounts.children || 0));
    passengerCounts.infants = Math.max(0, Number(safeCounts.infants || 0));
    renderPassengerForms();
  }

  function openAncillaries() {
    alert("Ancillaries panel will open here.");
  }

  function runSelfTests() {
    console.group("Passenger Details Self Tests");
    setPassengerCounts({ adults: 1, children: 1, infants: 1 });
    console.assert(
      document.querySelectorAll(".passenger-form-card").length === 3,
      "Test 1 failed: 1 adult + 1 child + 1 infant should render 3 forms.",
    );
    const payload = buildNdcPassengerPayload("TEST-OFFER-ID");
    console.assert(
      payload.OfferId === "TEST-OFFER-ID",
      "Test 2 failed: payload should use provided offer ID.",
    );
    console.assert(
      payload.Passengers.length === 3,
      "Test 3 failed: payload should include 3 passengers.",
    );
    console.assert(
      payload.Passengers[0].PassengerTypeCode === "ADT",
      "Test 4 failed: first passenger should be ADT.",
    );
    console.assert(
      payload.Passengers[1].PassengerTypeCode === "CHD",
      "Test 5 failed: second passenger should be CHD.",
    );
    console.assert(
      payload.Passengers[2].PassengerTypeCode === "INF",
      "Test 6 failed: third passenger should be INF.",
    );
    console.assert(
      selectedOffer.price.serviceFee === 50,
      "Test 6A failed: service fee should exist in selectedOffer.price.",
    );
    console.assert(
      selectedOffer.price.customerDiscount === 25,
      "Test 6B failed: customer discount should exist in selectedOffer.price.",
    );

    const firstCard = document.querySelector(
      '.passenger-form-card[data-passenger-type="ADT"]',
    );
    const firstGender = firstCard.querySelector('[data-field-key="gender"]');
    const firstTitle = firstCard.querySelector('[data-field-key="title"]');
    firstGender.value = "Male";
    firstGender.dispatchEvent(new Event("change"));
    console.assert(
      firstTitle.value === "MR",
      "Test 7 failed: Adult Male should auto-select MR.",
    );

    const childCard = document.querySelector(
      '.passenger-form-card[data-passenger-type="CHD"]',
    );
    const childGender = childCard.querySelector('[data-field-key="gender"]');
    const childTitle = childCard.querySelector('[data-field-key="title"]');
    childGender.value = "Female";
    childGender.dispatchEvent(new Event("change"));
    console.assert(
      childTitle.value === "MISS",
      "Test 8 failed: Child Female should auto-select MISS.",
    );

    const infantCard = document.querySelector(
      '.passenger-form-card[data-passenger-type="INF"]',
    );
    const infantGender = infantCard.querySelector('[data-field-key="gender"]');
    const infantTitle = infantCard.querySelector('[data-field-key="title"]');
    infantGender.value = "Male";
    infantGender.dispatchEvent(new Event("change"));
    console.assert(
      infantTitle.value === "MSTR",
      "Test 9 failed: Infant Male should auto-select MSTR.",
    );

    const femaleAdultTitle = getDefaultTitle("ADT", "Female");
    console.assert(
      femaleAdultTitle === "MRS",
      "Test 10 failed: Adult Female should map to MRS.",
    );
    setPassengerCounts({ adults: 2, children: 0, infants: 0 });
    console.assert(
      document.querySelectorAll(".passenger-form-card").length === 2,
      "Test 11 failed: 2 adults should render 2 forms.",
    );
    setPassengerCounts({ adults: 1, children: 1, infants: 1 });
    console.groupEnd();
  }

  window.passengerDetailsStep = {
    selectedOffer,
    passengerCounts,
    setPassengerCounts,
    validate: validatePassengerForm,
    clearErrors: clearValidation,
    getData: getPassengerData,
    buildPayload: buildNdcPassengerPayload,
    renderOffer: renderSelectedOfferDetails,
    renderPassengers: renderPassengerForms,
    openAncillaries,
    getDefaultTitle,
    titleRules: TITLE_RULES,
    runSelfTests,
  };

  loadBookingData();
  initializeDefaultState();
  renderSelectedOfferDetails();
  renderPassengerForms();
  // runSelfTests(); // Disabled to avoid overwriting real data

  byId("addAncillariesBtn").addEventListener("click", openAncillaries);

  async function apiPost(path, body) {
    const apiBase =
      (window.KEENAN_CONFIG && window.KEENAN_CONFIG.apiBaseUrl) ||
      "http://localhost:3000/v1";

    const headers = {
      "Content-Type": "application/json",
    };

    const customerToken = localStorage.getItem("customerToken");

    console.log("[apiPost] path:", path);
    console.log("[apiPost] customerToken:", customerToken);

    if (customerToken) {
      headers.Authorization = `Bearer ${customerToken}`;
    }

    console.log("[apiPost] headers:", headers);
    console.log("[apiPost] body:", body);

    const res = await fetch(apiBase + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    let data = {};

    try {
      data = await res.json();
    } catch (e) {
      console.error("[apiPost] Invalid JSON response");
    }

    console.log("[apiPost] response status:", res.status);
    console.log("[apiPost] response data:", data);

    if (!res.ok) {
      throw new Error(
        data.message || data.error || `Request failed (${res.status})`,
      );
    }

    return data;
  }

  /* byId("confirmSelectionBtn").addEventListener("click", async function () {
    const btn = this;
    const loader = byId("fareConfirmLoader");
    btn.disabled = true;
    loader.style.display = "block";

    try {
      if (!window.bookingState) {
        throw new Error("No flight selected");
      }

      const data = await apiPost("/flights/fare-confirm", {
        offerId: window.bookingState.offerId,
      });
      console.log("Fare Confirmed:", data);

      window.bookingState.confirmedOfferId =
        data.offerId || data.confirmed?.offerId;
      window.bookingState.haveBundles = data.confirmed?.haveBundles || false;
      window.bookingState.cabin_held =
        data.confirmed?.canBeHeld || data.confirmed?.cabin_held || false;

      // Update UI Status
      btn.textContent = "Confirmed ✓";
      btn.classList.add("confirmed");
      byId("fareStatus").textContent = "Confirmed";
      byId("fareStatus").style.background = "#d1fae5";
      byId("fareStatus").style.color = "#065f46";
      loader.style.display = "none";

      // Show next steps
      if (
        window.bookingState.haveBundles &&
        data.bundles &&
        data.bundles.length > 0
      ) {
        renderBundles(data.bundles);
        byId("bundlesSection").style.display = "block";
      } else {
        byId("passengerSection").style.display = "block";
        updateBookingButtons();
      }
    } catch (err) {
      console.error(err);
      alert("Error confirming fare: " + err.message);
      btn.disabled = false;
      loader.style.display = "none";
    }
  }); 
  */

  function renderBundles(bundles) {
    const list = byId("bundleList");
    list.innerHTML = bundles
      .map(
        (b, i) => `
      <label style="display: flex; gap: 10px; align-items: flex-start; padding: 14px; border: 1px solid var(--surface3); border-radius: 10px; cursor: pointer;">
        <input type="checkbox" name="bundleSelect" value="${b.bundleCode || b.id}" data-journey="${b.journeyKey || ""}" style="margin-top: 4px;" />
        <div style="flex: 1;">
          <strong style="display: block; font-size: 14px; color: var(--ink);">${b.name || b.title}</strong>
          <span style="font-size: 12px; color: var(--slate);">${b.description}</span>
        </div>
        <div style="font-size: 14px; font-weight: 700; color: var(--gold);">${money(b.price)}</div>
      </label>
    `,
      )
      .join("");
  }

  byId("confirmBundlesBtn")?.addEventListener("click", function () {
    const selected = Array.from(
      document.querySelectorAll('input[name="bundleSelect"]:checked'),
    ).map((cb) => ({
      JourneyKey: cb.dataset.journey || "journey-1",
      SelectedBundleCode: cb.value,
    }));
    window.bookingState.selectedBundles = selected;
    byId("bundlesSection").style.display = "none";
    byId("passengerSection").style.display = "block";
    updateBookingButtons();
  });

  function updateBookingButtons() {
    if (window.bookingState.cabin_held) {
      byId("holdBtn").style.display = "inline-block";
    } else {
      byId("holdBtn").style.display = "none";
    }
  }

  function toReviewDateTime(dateText, timeText) {
    if (!dateText && !timeText) return "";
    return [dateText, timeText].filter(Boolean).join(" ");
  }

  function buildReviewFlightData() {
    const price = selectedOffer.price || {};
    const segments = (selectedOffer.segments || []).map(function (segment) {
      return {
        id: segment.id,
        airline: segment.airline,
        airlineCode: segment.airlineCode || segment.carrier || "",
        flightNumber: segment.flightNumber || segment.id || "",
        origin: segment.departureCode,
        destination: segment.arrivalCode,
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime: toReviewDateTime(
          segment.departureDate,
          segment.departureTime,
        ),
        arrivalTime: toReviewDateTime(segment.arrivalDate, segment.arrivalTime),
        departureDate: segment.departureDate,
        arrivalDate: segment.arrivalDate,
        duration: segment.duration || "",
      };
    });

    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;
    const bundleTotal = (window.bookingState.selectedBundles || []).reduce(
      function (sum, item) {
        return sum + Number(item.price || item.amount || 0);
      },
      0,
    );

    const baseFare = Number(price.baseFare || 0);
    const taxes = Number(price.taxesFees || price.taxes || 0);
    const ancillary = Number(price.ancillary || 0) + bundleTotal;
    const serviceFee = Number(price.serviceFee || 0);
    const paymentGatewayFee = Number(price.paymentGatewayFee || 0);
    const discount = Number(price.customerDiscount || price.discount || 0);
    const totalAmount =
      baseFare + taxes + ancillary + serviceFee + paymentGatewayFee - discount;

    return {
  offerId: selectedOffer.offerId,
  airline: firstSegment.airline || "Selected Flight",
  airlineCode: firstSegment.airlineCode || "",
  flightNumber: firstSegment.flightNumber || "",

  fareClass: selectedOffer.fareCategory,
  cabin: selectedOffer.fareCategory,
  cabinClass: selectedOffer.fareCategory || "",

  currency: price.currency || window.bookingState.currency || "AED",

  origin: firstSegment.origin || "",
  destination: lastSegment.destination || "",

  departureTime: firstSegment.departureTime || "",
  arrivalTime: lastSegment.arrivalTime || "",
  departureDateTime: firstSegment.departureTime || "",
  arrivalDateTime: lastSegment.arrivalTime || "",

  duration: selectedOffer.duration || "",
  stops: Math.max(0, segments.length - 1),

  segments: segments,
  journeys: [],

  baggage: selectedOffer.baggage,
  carryOn: selectedOffer.baggage?.cabin?.allowance || "",
  handCarry: selectedOffer.baggage?.cabin?.allowance || "",
  checkIn: selectedOffer.baggage?.checkIn?.allowance || "",
  checkInBaggage: selectedOffer.baggage?.checkIn?.allowance || "",

  baseFare: baseFare,
  baseAmount: baseFare,
  taxes: taxes,
  taxAmount: taxes,
  ancillary: ancillary,
  serviceFee: serviceFee,
  paymentGatewayFee: paymentGatewayFee,
  discount: discount,
  totalAmount: totalAmount,
};

  }

  function buildBookingReviewData(paxData) {
    const reviewFlight = buildReviewFlightData();

    return {
      flight: reviewFlight,
      passengers: paxData,
      price: {
        currency: reviewFlight.currency,
        baseFare: reviewFlight.baseFare,
        taxesFees: reviewFlight.taxes,
        ancillary: reviewFlight.ancillary,
        serviceFee: reviewFlight.serviceFee,
        paymentGatewayFee: reviewFlight.paymentGatewayFee,
        customerDiscount: reviewFlight.discount,
        totalAmount: reviewFlight.totalAmount,
      },
      currency: reviewFlight.currency,
      baseFare: reviewFlight.baseFare,
      taxes: reviewFlight.taxes,
      serviceFee: reviewFlight.serviceFee,
      paymentGatewayFee: reviewFlight.paymentGatewayFee,
      discount: reviewFlight.discount,
      total: reviewFlight.totalAmount,
      bookingId: window.bookingState.bookingId,
      offerId:
        window.bookingState.confirmedOfferId ||
        window.bookingState.offerId ||
        selectedOffer.offerId,
      selectedBundles: window.bookingState.selectedBundles || [],
    };
  }

  async function submitPassengersAndProceed(action) {
    if (!validatePassengerForm()) {
      alert("Please fill out all required passenger details.");
      return;
    }

    const accepted = byId("acceptTermsCheckbox")?.checked;
    if (!accepted) {
      alert(
        "Please accept the payment terms and conditions before continuing.",
      );
      return;
    }

    const finalOfferId =
      window.bookingState?.confirmedOfferId ||
      window.bookingState?.offerId ||
      selectedOffer.offerId;

    if (!finalOfferId) {
      alert("Confirmed offer ID is missing. Please select the flight again.");
      return;
    }

    window.bookingState.confirmedOfferId = finalOfferId;
    window.bookingState.offerId = finalOfferId;

    const paxData = getPassengerData();
    const reviewFlight = buildReviewFlightData();

    const payload = {
      OfferId: finalOfferId,
      offerId: finalOfferId,
      flight: reviewFlight,
      price: {
        currency: reviewFlight.currency,
        totalAmount: reviewFlight.totalAmount,
        baseFare: reviewFlight.baseFare,
        taxes: reviewFlight.taxes,
        serviceFee: reviewFlight.serviceFee,
      },
      selectedBundles: window.bookingState.selectedBundles || [],
      SelectedBundles: window.bookingState.selectedBundles || [],
      Passengers: {},
    };

    paxData.forEach((p, i) => {
      const countryCode = "PK";

      payload.Passengers[`Pax${i + 1}`] = {
        passengerTypeCode: p.passengerTypeCode,
        title: p.title,
        gender: p.gender,

        name: {
          first: p.firstName,
          middle: "",
          last: p.lastName,
        },

        birthDate: p.birthDate,

        nationalityCountryCode: countryCode,
        birthCountryCode: countryCode,
        residenceCountryCode: countryCode,

        contact: {
          email: p.email,
          phone: {
            type: "Mobile",
            countryDialingCode: "+971",
            phoneNumber: p.phone,
          },
          address: {
            line1: "Dubai",
            line2: "Dubai",
            cityCode: "DXB",
            countryCode: "AE",
          },
        },

        travelDocument: {
          documentType: "Passport",
          documentNumber: p.passportNumber,
          expirationDate: p.passportExpiry,
          issuanceDate: p.passportIssue,
          issuanceCountryCode: countryCode,
          birthCountryCode: countryCode,
          nationalityCountryCode: countryCode,
          gender: p.gender,
          birthDate: p.birthDate,
          name: {
            first: p.firstName,
            middle: "",
            last: p.lastName,
          },
        },
      };
    });

    try {
      console.log("Adding passengers...", payload);
      console.log("FINAL OFFER ID:", finalOfferId);

      const addPassengerRes = await apiPost("/flights/add-passengers", payload);
      console.log("ADD PASSENGER RESPONSE:", addPassengerRes);

      if (
        addPassengerRes.statusCode >= 400 ||
        addPassengerRes.data?.statusCode >= 400 ||
        addPassengerRes.data?.validationErrors
      ) {
        throw new Error(
          addPassengerRes.message ||
            addPassengerRes.data?.message ||
            "Add passenger validation failed",
        );
      }

      window.bookingState.confirmedOfferId =
        addPassengerRes.offerId ||
        addPassengerRes.data?.offerId ||
        addPassengerRes.data?.OfferId ||
        window.bookingState.confirmedOfferId;

      window.bookingState.passengerId =
        addPassengerRes.passengerId ||
        addPassengerRes.data?.passengerId ||
        addPassengerRes.data?.PassengerId ||
        "Pax1";

      window.bookingState.bookingId =
        addPassengerRes.bookingId ||
        addPassengerRes.data?.bookingId ||
        addPassengerRes.booking?.id ||
        addPassengerRes.id;

      console.log(
        "UPDATED OFFER ID AFTER ADD PASSENGER:",
        window.bookingState.confirmedOfferId,
      );
      console.log(
        "PASSENGER ID AFTER ADD PASSENGER:",
        window.bookingState.passengerId,
      );

      const reviewData = buildBookingReviewData(paxData);
      console.log("BOOKING REVIEW DATA:", reviewData);
      localStorage.setItem("keenan_booking_review", JSON.stringify(reviewData));

      let finalResponse;

      if (action === "hold") {
        console.log("CALLING HOLD API");

        finalResponse = await apiPost("/ticketing/hold", {
          offerId: window.bookingState.confirmedOfferId,
          OfferId: window.bookingState.confirmedOfferId,
          passengerId: window.bookingState.passengerId,
          PassengerId: window.bookingState.passengerId,
          selectedBundles: window.bookingState.selectedBundles || [],
          SelectedBundles: window.bookingState.selectedBundles || [],
          bookingId: window.bookingState.bookingId,
        });
      } else if (action === "book") {
        console.log("CALLING BOOK AND PAY API");

        finalResponse = await apiPost("/ticketing/book", {
          offerId: window.bookingState.confirmedOfferId,
          OfferId: window.bookingState.confirmedOfferId,
          passengerId: window.bookingState.passengerId,
          PassengerId: window.bookingState.passengerId,
          selectedBundles: window.bookingState.selectedBundles || [],
          SelectedBundles: window.bookingState.selectedBundles || [],
          bookingId: window.bookingState.bookingId,
        });
      } else {
        throw new Error("Unknown booking action");
      }

      console.log("FINAL BOOKING RESPONSE:", finalResponse);

      localStorage.setItem(
        "keenan_booking_confirmation",
        JSON.stringify(finalResponse),
      );

      window.location.href =
        "/src/components/flight-payment-confirmation/payment-confirmation.html";
    } catch (err) {
      console.error(err);
      alert("Error saving passenger details: " + err.message);
    }
  }

  byId("holdBtn")?.addEventListener("click", () =>
    submitPassengersAndProceed("hold"),
  );

  byId("bookAndPayBtn")?.addEventListener("click", () =>
    submitPassengersAndProceed("book"),
  );

  // passengerForm submit is disabled in favor of hold/book buttons
  byId("passengerForm").addEventListener("submit", function (e) {
    e.preventDefault();
  });
})();
