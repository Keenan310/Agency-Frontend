// Fixed payments.js file
// Replace your current payments.js with this file.

(function () {
  "use strict";

  let _stripe = null;
  let _elements = null;
  let _cardElement = null;

  function apiBase() {
    return (
      (window.KEENAN_CONFIG || {}).apiBaseUrl || "http://localhost:3000/v1"
    ).replace(/\/$/, "");
  }

  async function post(path, body) {
    const session = JSON.parse(
      localStorage.getItem("keenanTravelSession") || "null",
    );

    const headers = { "Content-Type": "application/json" };

    if (session?.token) {
      headers["Authorization"] = "Bearer " + session.token;
    }

    const res = await fetch(apiBase() + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || data.success === false) {
      throw new Error(data.error || data.message || "Request failed");
    }

    return data;
  }

  async function get(path) {
    const res = await fetch(apiBase() + path);
    return res.json();
  }

  function loadStripeJs() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }

      const s = document.createElement("script");

      s.src = "https://js.stripe.com/v3/";

      s.onload = resolve;

      s.onerror = () => reject(new Error("Failed to load Stripe.js"));

      document.head.appendChild(s);
    });
  }

  window.renderPaymentStep = async function renderPaymentStep(totalAmountObj) {
    const amountEl = document.getElementById("stripe-confirmed-amount");

    const amountData = totalAmountObj || window.__confirmedAmount;

    if (amountEl && amountData) {
      const fmt =
        typeof window.KT?.format === "function"
          ? window.KT.format(amountData.amount)
          : `${amountData.currency || "AED"} ${Number(amountData.amount || 0).toLocaleString()}`;

      amountEl.textContent = fmt;
    }

    if (amountData) {
      const payBtn =
        document.querySelector("[data-stripe-pay]") ||
        document.querySelector(".btn-gold.w100");

      if (payBtn) {
        payBtn.dataset.stripeAmount = JSON.stringify(amountData);
      }
    }

    const mountEl = document.getElementById("stripe-card-element");

    if (!mountEl) return;

    const { publishableKey } = await get("/payments/publishable-key");

    if (!publishableKey) {
      mountEl.innerHTML =
        '<div style="color:var(--red,#dc2626);padding:12px">⚠ Stripe not configured — contact admin.</div>';

      return;
    }

    await loadStripeJs();

    _stripe = window.Stripe(publishableKey);

    _elements = _stripe.elements();

    _cardElement = _elements.create("card", {
      style: {
        base: {
          fontFamily: '"Plus Jakarta Sans", Arial, sans-serif',
          fontSize: "14px",
          color: "#0B1120",
          "::placeholder": {
            color: "#94A3B8",
          },
        },
      },
    });

    _cardElement.mount("#stripe-card-element");
  };

  window.submitStripePayment = async function submitStripePayment() {
    const payBtn =
      document.querySelector("[data-stripe-pay]") ||
      document.querySelector(".btn-gold.w100");

    if (payBtn) {
      payBtn.textContent = "Processing…";
      payBtn.disabled = true;
    }

    const errEl = document.getElementById("stripe-card-errors");

    try {
      const rawAmount = payBtn?.dataset.stripeAmount;

      const amountData = rawAmount
        ? JSON.parse(rawAmount)
        : { amount: 0, currency: "AED" };

      // 1. Create PaymentIntent
      const { clientSecret } = await post("/payments/intent", {
        amount: amountData.amount,
        currency: amountData.currency,
      });

      // 2. Confirm Stripe card payment
      const billingEmail = document.getElementById("bk-email")?.value || "";

      const cardholderName =
        document.getElementById("stripe-cardholder")?.value || "";

      const { error: stripeError, paymentIntent } =
        await _stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: _cardElement,
            billing_details: {
              name: cardholderName,
              email: billingEmail,
            },
          },
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status !== "succeeded") {
        throw new Error("Payment did not complete");
      }

      // 3. Verify Stripe payment on backend
      const reviewData = JSON.parse(
        localStorage.getItem("keenan_booking_review") || "{}",
      );

      await post("/payments/verify", {
        paymentIntentId: paymentIntent.id,
        bookingId: reviewData.bookingId,
      });

      // 4. Finalise booking on backend
      const booking = await post("/payments/confirm-booking", {
        paymentIntentId: paymentIntent.id,

        bookingId: reviewData.bookingId,

        offerId: reviewData.offerId || reviewData.flight?.offerId,

        selectedBundles: reviewData.selectedBundles || [],

        passengers: reviewData.passengers || [],

        amount:
          reviewData.total ||
          reviewData.flight?.totalAmount ||
          amountData.amount,

        currency:
          reviewData.currency ||
          reviewData.flight?.currency ||
          amountData.currency,
      });

      localStorage.setItem(
        "keenan_booking_confirmation",
        JSON.stringify(booking),
      );

      const ref =
        booking.reference ||
        booking.data?.reference ||
        booking.bookingReference ||
        booking.bookingId ||
        "PENDING";

      window.location.href =
        "../../components/flight-payment-confirmation/payment-confirmation.html?ref=" +
        encodeURIComponent(ref);
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }

      if (payBtn) {
        payBtn.textContent = "Try Again";
        payBtn.disabled = false;
      }
    }
  };
})();
