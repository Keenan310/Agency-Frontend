window.KEENAN_CONFIG = {
  apiBaseUrl: "http://localhost:3000/v1",
  requestTimeout: 8000,
  environment: "development",
  // To enable Google Sign-In:
  // 1. Create a project at https://console.cloud.google.com
  // 2. Enable "Google Identity Services" and create an OAuth 2.0 Client ID
  // 3. Add your domain to "Authorized JavaScript origins"
  // 4. Paste the Client ID below
  googleClientId: "",
};

window.COUNTRY_CONTEXTS = {
  AE: {
    code:       'AE',
    name:       'UAE',
    flag:       '🇦🇪',
    currency:   'AED',
    symbol:     'AED',
    locale:     'en-AE',
    apiBase:    'https://api.keenantravel.com/v1',
    lang:       ['EN', 'AR'],
    depCities:  ['Dubai', 'Abu Dhabi', 'Sharjah'],
    depAirports:['DXB', 'AUH', 'SHJ'],
    umrahDep:   'Dubai',
    phone:      '+971 4 000 0000',
    tz:         'Asia/Dubai',
  },
  PK: {
    code:       'PK',
    name:       'Pakistan',
    flag:       '🇵🇰',
    currency:   'PKR',
    symbol:     '₨',
    locale:     'en-PK',
    apiBase:    'https://api.keenantravel.pk/v1',
    lang:       ['EN', 'UR'],
    depCities:  ['Karachi', 'Lahore', 'Islamabad', 'Peshawar'],
    depAirports:['KHI', 'LHE', 'ISB', 'PEW'],
    umrahDep:   'Karachi',
    phone:      '+92 21 000 0000',
    tz:         'Asia/Karachi',
  }
};

window.formatPrice = function(amount, currency) {
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[^0-9.-]+/g,""));
  }
  const opts = {
    AED: { symbol: 'AED', locale: 'en-AE', decimals: 0 },
    PKR: { symbol: '₨',   locale: 'en-PK', decimals: 0 },
  };
  const { symbol, locale, decimals } = opts[currency] || opts.AED;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${symbol} ${formatted}`;
};

window.KT = {
  country: null,

  init() {
    const saved = localStorage.getItem('kt_country') || 'AE';
    this.set(saved, false);
  },

  set(code, save = true) {
    this.country = window.COUNTRY_CONTEXTS[code] || window.COUNTRY_CONTEXTS['AE'];
    window.__KT_COUNTRY = this.country;
    if (save) localStorage.setItem('kt_country', code);
    this._broadcast();
  },

  get() { return this.country || window.COUNTRY_CONTEXTS['AE']; },
  currency() { return this.get().currency; },
  format(amount) { return window.formatPrice(amount, this.currency()); },
  apiBase() { return this.get().apiBase; },

  _broadcast() {
    if (typeof window.updateNavPortalUI === 'function') window.updateNavPortalUI();
    if (typeof window.updateSearchWidgetDefaults === 'function') window.updateSearchWidgetDefaults();
    
    // Check if view is starting with results-
    const hashRoute = (window.location.hash || '').replace('#/', '');
    if (hashRoute.startsWith('results/') && typeof window.buildResults === 'function') {
      window.buildResults(hashRoute.split('/')[1]);
    }

    if (typeof window.updateDestinationCards === 'function') window.updateDestinationCards();
  }
};

// Auto-initialize on load
window.KT.init();
