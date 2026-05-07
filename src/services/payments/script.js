(function () {
  'use strict';

  let _stripe = null;
  let _elements = null;
  let _cardElement = null;

  function apiBase() {
    return ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
  }

  async function post(path, body) {
    const session = JSON.parse(localStorage.getItem('keenanTravelSession') || 'null');
    const headers = { 'Content-Type': 'application/json' };
    if (session?.token) headers['Authorization'] = 'Bearer ' + session.token;
    const res = await fetch(apiBase() + path, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  async function get(path) {
    const res = await fetch(apiBase() + path);
    const data = await res.json();
    return data;
  }

  // ── Inject Stripe.js SDK if not already loaded ───────────────────────────────
  function loadStripeJs() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(s);
    });
  }

  // ── Render Stripe Card Element into #stripe-card-element mount point ─────────
  window.renderPaymentStep = async function renderPaymentStep(totalAmountObj) {
    // Update displayed amount
    const amountEl = document.getElementById('stripe-confirmed-amount');
    const amountData = totalAmountObj || window.__confirmedAmount;
    if (amountEl && amountData) {
      const fmt = typeof window.KT?.format === 'function'
        ? window.KT.format(amountData.amount)
        : `${amountData.currency || 'AED'} ${Number(amountData.amount || 0).toLocaleString()}`;
      amountEl.textContent = fmt;
    }

    // Store amount on pay button for later use
    if (amountData) {
      const payBtn = document.querySelector('[data-stripe-pay]') || document.querySelector('.btn-gold.w100');
      if (payBtn) payBtn.dataset.stripeAmount = JSON.stringify(amountData);
    }

    const mountEl = document.getElementById('stripe-card-element');
    if (!mountEl) return;

    // Fetch publishable key from backend (set by admin)
    const { publishableKey } = await get('/payments/publishable-key');
    if (!publishableKey) {
      mountEl.innerHTML = '<div style="color:var(--red,#dc2626);padding:12px">⚠ Stripe not configured — contact admin.</div>';
      return;
    }

    await loadStripeJs();

    _stripe   = window.Stripe(publishableKey);
    _elements = _stripe.elements();
    _cardElement = _elements.create('card', {
      style: {
        base: {
          fontFamily: '"Plus Jakarta Sans", Arial, sans-serif',
          fontSize: '14px',
          color: '#0B1120',
          '::placeholder': { color: '#94A3B8' },
        },
      },
    });
    _cardElement.mount('#stripe-card-element');

    _cardElement.on('focus', () => { mountEl.classList.add('focused'); });
    _cardElement.on('blur',  () => { mountEl.classList.remove('focused'); });
    _cardElement.on('change', (e) => {
      const errEl = document.getElementById('stripe-card-errors');
      if (!errEl) return;
      errEl.textContent = e.error ? e.error.message : '';
      errEl.style.display = e.error ? 'block' : 'none';
    });
  };

  // ── Submit Stripe payment then finalize booking via backend ──────────────────
  window.submitStripePayment = async function submitStripePayment() {
    const payBtn = document.querySelector('[data-stripe-pay]') || document.querySelector('.btn-gold.w100');
    if (payBtn) { payBtn.textContent = 'Processing…'; payBtn.disabled = true; }

    const errEl = document.getElementById('stripe-card-errors');

    try {
      // Amount resolved from button data or confirmed state
      const rawAmount = payBtn?.dataset.stripeAmount;
      const amountData = rawAmount ? JSON.parse(rawAmount) : { amount: 0, currency: 'AED' };

      // 1. Create PaymentIntent on backend
      const { clientSecret } = await post('/payments/intent', {
        amount:   amountData.amount,
        currency: amountData.currency,
      });

      // 2. Confirm card payment with Stripe
      const billingEmail = document.getElementById('bk-email')?.value || '';
      const cardholderName = document.getElementById('stripe-cardholder')?.value || '';

      const { error: stripeError, paymentIntent } = await _stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: _cardElement,
          billing_details: { name: cardholderName, email: billingEmail },
        },
      });

      if (stripeError) throw new Error(stripeError.message);
      if (paymentIntent.status !== 'succeeded') throw new Error('Payment did not complete');

      // 3. Finalise booking on backend
      const offerId = window.__bookingOfferId || window.__confirmedOfferId || window.__selectedOfferId;
      const booking = await post('/flights/book', {
        offerId,
        selectedBundles:       window.__selectedBundles || [],
        stripePaymentIntentId: paymentIntent.id,
        amount:   amountData.amount,
        currency: amountData.currency,
      });

      // 4. Show confirmation
      if (typeof window.updateConfirmationPage === 'function') window.updateConfirmationPage(booking);
      if (typeof window.go === 'function') window.go('confirmation');

    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
      if (payBtn) { payBtn.textContent = 'Try Again'; payBtn.disabled = false; }
    }
  };

  // ── Update confirmation page with real booking data ──────────────────────────
  window.updateConfirmationPage = function updateConfirmationPage(booking) {
    const refEl = document.querySelector('.confirm-ref-num') || document.querySelector('[data-confirm-ref]');
    if (refEl) refEl.textContent = booking.reference || '—';

    const pnrEl = document.querySelector('[data-confirm-pnr]');
    if (pnrEl) pnrEl.textContent = booking.airlinePnr || '—';

    const ticketEl = document.querySelector('[data-confirm-ticket]');
    if (ticketEl) ticketEl.textContent = booking.ticketNumber || '—';
  };

  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules['service-payments'] = { type: 'service', mount() {} };
})();
