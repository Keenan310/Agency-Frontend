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

  function apiBase() {
    return (
      (window.KEENAN_CONFIG && window.KEENAN_CONFIG.apiBaseUrl) ||
      "http://localhost:3000/v1"
    );
  }

  async function apiPost(endpoint, body = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  const session = safeParse(localStorage.getItem("keenanTravelSession"));

  if (session && session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${apiBase()}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API Error");
  }

  return data;
}

  const confirmation = safeParse(
    localStorage.getItem("keenan_booking_confirmation"),
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
  console.log("PAYMENT CONFIRMATION:", confirmation);
  console.log(
    "BOOKING REVIEW:",
    safeParse(localStorage.getItem("keenan_booking_review")),
  );
  const review = safeParse(localStorage.getItem("keenan_booking_review"));

  async function confirmTicket() {
    try {
      if (!review.offerId) {
        console.error("OfferId missing");
        return;
      }

      const payload = {
        bookingId: confirmation.bookingId,
        offerId: review.offerId,
        selectedBundles: review.selectedBundles || [],
      };

      console.log("BOOK AND PAY PAYLOAD:", payload);

      const result = await apiPost("/ndc/ticketing/book", payload);

      console.log("BOOK AND PAY RESPONSE:", result);

      localStorage.setItem("keenan_ticketing_result", JSON.stringify(result));
    } catch (err) {
      console.error("BOOK AND PAY ERROR:", err);
    }
  }

  confirmTicket();
})();
