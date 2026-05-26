(function () {
  "use strict";

  function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function safeParse(value) {
    try {
      return JSON.parse(value || "{}");
    } catch (e) {
      return {};
    }
  }

  const confirmation = safeParse(
    localStorage.getItem("keenan_booking_confirmation")
  );

  const ref =
    getQueryParam("ref") ||
    confirmation.reference ||
    confirmation.data?.reference ||
    confirmation.bookingReference ||
    confirmation.bookingId ||
    "PENDING";

  const bookingId =
    confirmation.bookingId ||
    confirmation.data?.bookingId ||
    confirmation.id ||
    "—";

  const status =
    confirmation.message ||
    confirmation.status ||
    "Payment received successfully. Ticketing is pending.";

  const refEl = document.getElementById("confirmReference");
  const bookingEl = document.getElementById("confirmBookingId");
  const statusEl = document.getElementById("confirmStatus");

  if (refEl) refEl.textContent = ref;
  if (bookingEl) bookingEl.textContent = bookingId;
  if (statusEl) statusEl.textContent = status;
})();
