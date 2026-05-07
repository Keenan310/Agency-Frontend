(function () {
  const API = () => ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
  const token = () => { try { return JSON.parse(localStorage.getItem('keenanTravelSession') || 'null')?.token || ''; } catch { return ''; } };

  let _stripe = null;
  let _cardElement = null;

  async function loadStripeJs() {
    if (window.Stripe) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function mount(containerSelector, totalAmountObj) {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!container) return;

    const amount = totalAmountObj?.amount || window.__selectedFlight?.totalAmount || 0;
    const currency = totalAmountObj?.currency || window.__selectedFlight?.currency || 'AED';

    container.innerHTML = `
      <div class="pay-section">
        <div class="pay-amount-badge">
          <div class="pay-amount-label">Total Due</div>
          <div class="pay-amount-value">${Number(amount).toLocaleString()} ${currency}</div>
        </div>
        <div class="pay-title">Card Details</div>
        <div class="pay-card-wrap" id="pay-card-element"></div>
        <div class="pay-card-error" id="pay-card-error"></div>
        <button class="pay-submit-btn" id="pay-submit-btn" onclick="window.flightPaymentStep.submit()">
          Pay ${Number(amount).toLocaleString()} ${currency}
        </button>
        <div class="pay-secure-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Secured by Stripe · Your card details are never stored
        </div>
      </div>
    `;

    try {
      await loadStripeJs();
      const pkRes = await fetch(API() + '/payments/publishable-key');
      const pkData = await pkRes.json();
      if (!pkData.publishableKey) {
        container.querySelector('#pay-card-element').innerHTML = '<div style="color:var(--slate);font-size:13px;padding:8px">Payment gateway not configured — contact support.</div>';
        return;
      }
      _stripe = window.Stripe(pkData.publishableKey);
      const elements = _stripe.elements();
      _cardElement = elements.create('card', {
        style: {
          base: { fontSize: '15px', color: 'var(--ink, #111)', '::placeholder': { color: 'var(--slate2, #9ca3af)' } },
        },
      });
      _cardElement.mount('#pay-card-element');
      _cardElement.on('change', (e) => {
        const errEl = document.getElementById('pay-card-error');
        if (errEl) errEl.textContent = e.error ? e.error.message : '';
      });
      _cardElement.on('focus', () => document.querySelector('.pay-card-wrap')?.classList.add('focused'));
      _cardElement.on('blur',  () => document.querySelector('.pay-card-wrap')?.classList.remove('focused'));
    } catch (err) {
      console.error('[payment/script] Stripe mount failed:', err);
    }
  }

  async function submit() {
    if (!_stripe || !_cardElement) return;
    const btn = document.getElementById('pay-submit-btn');
    const errEl = document.getElementById('pay-card-error');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="pay-spinner"></span>Processing…'; }
    if (errEl) errEl.textContent = '';

    try {
      const flight = window.__selectedFlight || {};
      const amount = flight.totalAmount || 0;
      const currency = (flight.currency || 'AED').toLowerCase();

      const intentRes = await fetch(API() + '/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ amount, currency }),
      });
      const intentData = await intentRes.json();
      if (!intentData.clientSecret) throw new Error(intentData.error || 'Failed to create payment');

      const { error, paymentIntent } = await _stripe.confirmCardPayment(intentData.clientSecret, {
        payment_method: { card: _cardElement },
      });
      if (error) throw new Error(error.message);
      if (paymentIntent.status !== 'succeeded') throw new Error('Payment not completed');

      window.__stripePaymentIntentId = paymentIntent.id;

      if (typeof window.submitStripePayment === 'function') {
        await window.submitStripePayment(paymentIntent.id);
      }
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Pay'; }
    }
  }

  window.flightPaymentStep = { mount, submit };
})();
