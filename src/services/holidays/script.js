(function () {
  'use strict';

  function apiBase() {
    return ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
  }

  async function get(path) {
    const res = await fetch(apiBase() + path);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  // Load and render Holiday packages from the backend
  window.loadHolidayPackages = async function loadHolidayPackages(countryCode) {
    const q = countryCode ? `?country_code=${countryCode}` : '';
    try {
      const data = await get(`/holiday/packages${q}`);
      const packages = data.data || data || [];
      if (typeof window.RESULTS !== 'undefined') {
        window.RESULTS['holiday'] = {
          title: 'Holiday Packages',
          sub: `${packages.length} package${packages.length !== 1 ? 's' : ''} available`,
          items: packages.map((p) => ({
            id: p.id,
            name: p.name,
            tags: [
              p.destination,
              `${p.nights || 0} Nights`,
              '★'.repeat(Number(p.star_rating || 0)),
              p.flights_included ? 'Flights Incl.' : '',
            ].filter(Boolean),
            meta: [_titleCase(p.meal_plan || '')].filter(Boolean),
            price: _fmt(p.price_per_person, p.currency),
            plabel: 'per person',
            rating: '',
            bg: '#1a472a',
          })),
        };
        if (typeof window.buildResults === 'function') window.buildResults('holiday');
      }
      return packages;
    } catch (err) {
      console.warn('[holidays service]', err.message);
      return [];
    }
  };

  function _titleCase(v) {
    return String(v || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function _fmt(amount, currency) {
    if (typeof window.KT?.format === 'function') return window.KT.format(amount);
    return `${currency || 'AED'} ${Number(amount || 0).toLocaleString()}`;
  }

  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules['service-holidays'] = { type: 'service', mount() {} };
})();
