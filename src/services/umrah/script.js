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
  window.loadUmrahPackages = async function loadUmrahPackages(countryCode, filters = {}) {
    const params = new URLSearchParams();
    if (countryCode) params.append('country_code', countryCode);
    if (filters.duration) params.append('duration', filters.duration);
    if (filters.sort) params.append('sort', filters.sort);
    
    const q = params.toString() ? `?${params.toString()}` : '';
    try {
      const data = await get(`/umrah/packages${q}`);
      const packages = data.data || data || [];
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
