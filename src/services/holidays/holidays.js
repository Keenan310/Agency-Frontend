(function () {
  'use strict';

  function apiBase() {
    return ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
  }

  function imgRoot() {
    return apiBase().replace('/v1', '');
  }

  async function apiFetch(path) {
    const res  = await fetch(apiBase() + path);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  // ── Card helpers ──────────────────────────────────────────────────────────────
  const DEST_ICONS = {
    AE:'🏙️', TR:'🕌', MY:'🌴', GB:'🎡', SG:'🦁', EG:'🏺',
    JO:'🏺', FR:'🗼', TH:'🌺', ID:'🌊', IT:'🍕', GR:'⛵',
    US:'🗽', JP:'🌸', AU:'🦘', MV:'🐚', CH:'🏔️',
  };

  const POLICY_ICONS = [
    { key:'flight_included',    icon:'✈️', label:'Flights' },
    { key:'visa_included',      icon:'🛂', label:'Visa' },
    { key:'hotel_included',     icon:'🏨', label:'Hotel' },
    { key:'transfer_included',  icon:'🚌', label:'Transfers' },
    { key:'meals_included',     icon:'🍽️', label:'Meals' },
    { key:'insurance_included', icon:'🛡️', label:'Insurance' },
  ];

  function featuredImg(pkg) {
    if (pkg.featured_image) {
      const u = pkg.featured_image;
      return u.startsWith('http') ? u : imgRoot() + u;
    }
    const gal = Array.isArray(pkg.gallery_images) ? pkg.gallery_images : [];
    if (gal.length) {
      const first = gal[0];
      const u = typeof first === 'object' ? (first.url || '') : first;
      if (u) return u.startsWith('http') ? u : imgRoot() + u;
    }
    return '';
  }

  function cap(s) {
    return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function buildHolidayCard(pkg) {
    const price    = Number(pkg.price_per_person || 0);
    const currency = pkg.currency || 'AED';
    const icon     = DEST_ICONS[pkg.destination_code] || '✈️';
    const imgUrl   = featuredImg(pkg);
    const policies = (pkg.policies && typeof pkg.policies === 'object') ? pkg.policies : {};
    const stars    = '★'.repeat(Number(pkg.star_rating || 0));

    const incIcons = POLICY_ICONS.filter(p => policies[p.key])
      .map(p => `<span class="ho-feat-icon" title="${p.label}">${p.icon}</span>`)
      .join('');

    const bgStyle = imgUrl
      ? `background-image:url('${imgUrl}');background-size:cover;background-position:center;`
      : 'background:linear-gradient(135deg,#1a2744,#2a3f6b);';

    return `
      <div class="ho-card" onclick="holiday_goDetail(${pkg.id})">
        <div class="ho-card-img" style="${bgStyle}">
          ${!imgUrl ? `<span class="ho-card-icon">${icon}</span>` : ''}
          <div class="ho-card-overlay">
            <span class="ho-card-type">${cap(pkg.package_type || 'standard')}</span>
          </div>
        </div>
        <div class="ho-card-body">
          <div class="ho-card-dest">${pkg.destination || ''}</div>
          <div class="ho-card-name">${pkg.name || 'Holiday Package'}</div>
          ${stars ? `<div class="ho-card-stars">${stars}</div>` : ''}
          <div class="ho-card-meta">
            ${pkg.nights   ? `<span class="ho-tag">🌙 ${pkg.nights}N</span>` : ''}
            ${pkg.meal_plan ? `<span class="ho-tag">${cap(pkg.meal_plan)}</span>` : ''}
          </div>
          ${incIcons ? `<div class="ho-card-feats">${incIcons}</div>` : ''}
          <div class="ho-card-footer">
            <div>
              <div class="ho-card-price">${currency} ${price.toLocaleString()}</div>
              <div class="ho-card-plabel">per person</div>
            </div>
            <button class="ho-btn">View Details</button>
          </div>
        </div>
      </div>`;
  }

  function renderHolidayResults(packages) {
    const el = document.getElementById('view-results-holiday');
    if (!el) return;

    if (!packages.length) {
      el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--slate)">No holiday packages available</div>';
      return;
    }

    el.innerHTML = `
      <div class="results-hero">
        <div class="results-inner">
          <div class="breadcrumb">
            <span onclick="go('home')" style="cursor:pointer">Home</span>
            <span>›</span>
            <span style="color:rgba(255,255,255,.7)">Holidays</span>
          </div>
          <div style="font-family:var(--serif);font-size:28px;font-weight:700;color:var(--white);margin-bottom:6px">Holiday Packages</div>
          <div style="color:rgba(255,255,255,.5);font-size:14px">${packages.length} package${packages.length !== 1 ? 's' : ''} available</div>
        </div>
      </div>
      <div class="results-layout">
        <div class="filter-panel">
          <div class="fp-head">
            <div style="font-size:14px;font-weight:700;color:var(--ink)">Filters</div>
          </div>
          <div class="fp-section">
            <div class="fp-label">Star Rating</div>
            <label class="fp-check"><input type="checkbox" checked> 5 Stars</label>
            <label class="fp-check"><input type="checkbox" checked> 4+ Stars</label>
            <label class="fp-check"><input type="checkbox"> 3+ Stars</label>
          </div>
          <div class="fp-section">
            <div class="fp-label">Includes</div>
            <label class="fp-check"><input type="checkbox" checked> Flights</label>
            <label class="fp-check"><input type="checkbox" checked> Hotel</label>
            <label class="fp-check"><input type="checkbox"> Visa</label>
            <label class="fp-check"><input type="checkbox"> Meals</label>
          </div>
        </div>
        <div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
            ${packages.map(p => buildHolidayCard(p)).join('')}
          </div>
        </div>
      </div>`;
  }

  // ── Navigate to detail page ───────────────────────────────────────────────────
  window.holiday_goDetail = function (id) {
    if (typeof window.goHolidayDetail === 'function') {
      window.goHolidayDetail(id);
    } else {
      window.location.hash = `#/holiday/${id}`;
    }
  };

  // ── Load packages from API ────────────────────────────────────────────────────
  window.loadHolidayPackages = async function (countryCode) {
    const q = countryCode ? `?country_code=${countryCode}` : '';
    try {
      const data     = await apiFetch(`/holiday/packages${q}`);
      const packages = data.data || data || [];
      renderHolidayResults(packages);
      return packages;
    } catch (err) {
      console.warn('[holidays service]', err.message);
      renderHolidayResults([]);
      return [];
    }
  };

  // Patch buildResults so go('results-holiday') triggers our API load
  const _origBuild = window.buildResults;
  window.buildResults = function (type) {
    if (type === 'holiday') {
      const code = (window.KT && window.KT.get().code) || 'AE';
      window.loadHolidayPackages(code);
      return;
    }
    if (typeof _origBuild === 'function') _origBuild(type);
  };

  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules['service-holidays'] = { type: 'service', mount() {} };
})();
