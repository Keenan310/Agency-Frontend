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

  // Load and render Umrah packages from the backend
  window.loadUmrahPackages = async function loadUmrahPackages(countryCode) {
    const q = countryCode ? `?country_code=${countryCode}` : '';
    try {
      const data = await get(`/umrah/packages${q}`);
      const packages = data.data || data || [];
      if (typeof window.RESULTS !== 'undefined') {
        window.RESULTS['umrah'] = {
          title: 'Umrah Packages',
          sub: `${packages.length} package${packages.length !== 1 ? 's' : ''} available`,
          items: packages.map((p) => ({
            id: p.id,
            name: p.name,
            tags: [
              p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : '',
              `${p.nights || 0} Nights`,
              p.visa_included ? 'Visa Included' : 'Visa Not Included',
            ].filter(Boolean),
            meta: [p.makkah_hotel, p.madinah_hotel].filter(Boolean),
            price: _fmt(p.price_per_person, p.currency),
            plabel: 'per person',
            rating: '',
            bg: '#2d1b69',
          })),
        };
        if (typeof window.buildResults === 'function') window.buildResults('umrah');
      }
      return packages;
    } catch (err) {
      console.warn('[umrah service]', err.message);
      return [];
    }
  };

  function _fmt(amount, currency) {
    if (typeof window.KT?.format === 'function') return window.KT.format(amount);
    return `${currency || 'AED'} ${Number(amount || 0).toLocaleString()}`;
  }

  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules['service-umrah'] = { type: 'service', mount() {} };
})();
