window.KeenanFrontend = window.KeenanFrontend || { modules: {} };

window.KeenanFrontend.modules["page-track"] = {
  type: "page",

  mount(root) {
    if (!root) return;

    root.dataset.module = "page-track";
  },
};

window.showTrackResult = async () => {
  try {
    const refInput = document.getElementById("track-ref");

    if (!refInput) {
      alert("Reference field not found");
      return;
    }

    const reference = String(refInput.value || "").trim();

    if (!reference) {
      alert("Please enter booking reference");
      return;
    }

    const response = await fetch(
      `${window.KEENAN_CONFIG.apiBaseUrl}/ticketing/track/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {},
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Booking not found");
    }

    const booking = result.data || {};
    const resultBox = document.getElementById("track-result");

    resultBox.style.display = "block";

    resultBox.innerHTML = `
      <div class="card">

        <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
          <div
            style="
              width:50px;
              height:50px;
              border-radius:12px;
              background:var(--green-bg);
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:24px;
              flex-shrink:0
            "
          >
            ✓
          </div>

          <div>
            <div
              style="
                font-size:19px;
                font-weight:700;
                color:var(--ink)
              "
            >
              ${booking.reference || "-"}
            </div>

            <span
              class="badge b-green"
              style="margin-top:4px;display:inline-flex"
            >
              ${booking.status || "Pending"}
            </span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:0">

          <div style="display:flex;justify-content:space-between;font-size:13.5px;padding:11px 0;border-bottom:1px solid var(--surface3)">
            <span style="color:var(--slate)">Service</span>
            <span style="font-weight:600">
              ${booking.airline || "-"} ${booking.flightNumber || ""} — ${booking.cabinClass || "-"}
            </span>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:13.5px;padding:11px 0;border-bottom:1px solid var(--surface3)">
            <span style="color:var(--slate)">Route</span>
            <span style="font-weight:600">
              ${booking.route?.origin || "-"} → ${booking.route?.destination || "-"}
            </span>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:13.5px;padding:11px 0;border-bottom:1px solid var(--surface3)">
            <span style="color:var(--slate)">Payment</span>
            <span style="font-weight:600">
              ${booking.paymentStatus || "-"}
            </span>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:13.5px;padding:11px 0;border-bottom:1px solid var(--surface3)">
            <span style="color:var(--slate)">PNR</span>
            <span style="font-weight:600">
              ${booking.pnr || "Pending"}
            </span>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:13.5px;padding:11px 0">
            <span style="color:var(--slate)">Ticket</span>
            <span style="font-weight:600">
              ${booking.ticketNumber || "Pending"}
            </span>
          </div>

        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    alert(err.message || "Unable to track booking");
  }
};
