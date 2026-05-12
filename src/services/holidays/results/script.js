(function () {
  'use strict';

  const DEST_ICONS = {
    AE: '🏙️', TR: '🕌', MY: '🌴', GB: '🎡', SG: '🦁',
    EG: '🏺', JO: '🏺', FR: '🗼', TH: '🌺', ID: '🌊',
    IT: '🍕', GR: '⛵', US: '🗽', JP: '🌸', AU: '🦘',
  };

  const POLICY_ICONS = [
    { key: 'flight_included',    icon: '✈️', label: 'Flights' },
    { key: 'visa_included',      icon: '🛂', label: 'Visa' },
    { key: 'hotel_included',     icon: '🏨', label: 'Hotel' },
    { key: 'transfer_included',  icon: '🚌', label: 'Transfers' },
    { key: 'meals_included',     icon: '🍽️', label: 'Meals' },
    { key: 'insurance_included', icon: '🛡️', label: 'Insurance' },
  ];

  function imgBase() {
    const cfg = (window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1';
    return cfg.replace('/v1', '');
  }

  function featuredImg(pkg) {
    if (pkg.featured_image) {
      const url = pkg.featured_image;
      return url.startsWith('http') ? url : imgBase() + url;
    }
    const gallery = Array.isArray(pkg.gallery_images) ? pkg.gallery_images : [];
    if (gallery.length) {
      const first = gallery[0];
      const url   = typeof first === 'object' ? (first.url || '') : first;
      return url.startsWith('http') ? url : imgBase() + url;
    }
    return '';
  }

  function buildCard(pkg) {
    const price    = Number(pkg.price_per_person || 0);
    const currency = pkg.currency || 'AED';
    const icon     = DEST_ICONS[pkg.destination_code] || '✈️';
    const imgUrl   = featuredImg(pkg);
    const policies = (typeof pkg.policies === 'object' && pkg.policies !== null) ? pkg.policies : {};
    const stars    = '★'.repeat(Number(pkg.star_rating || 0));

    const incIcons = POLICY_ICONS.filter(p => policies[p.key])
      .map(p => `<span class="ho-feat-icon" title="${p.label}">${p.icon}</span>`)
      .join('');

    const bgStyle = imgUrl
      ? `background-image: url('${imgUrl}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #1a2744, #2a3f6b);`;

    return `
      <div class="ho-card" onclick="holiday_goDetail(${pkg.id})">
        <div class="ho-card-img" style="${bgStyle}">
          ${!imgUrl ? `<span class="ho-card-icon">${icon}</span>` : ''}
          <div class="ho-card-overlay">
            <span class="ho-card-type">${_cap(pkg.package_type || 'standard')}</span>
          </div>
        </div>
        <div class="ho-card-body">
          <div class="ho-card-dest">${pkg.destination || ''}</div>
          <div class="ho-card-name">${pkg.name || 'Holiday Package'}</div>
          ${stars ? `<div class="ho-card-stars">${stars}</div>` : ''}
          <div class="ho-card-meta">
            ${pkg.nights ? `<span class="ho-tag">🌙 ${pkg.nights}N</span>` : ''}
            ${pkg.meal_plan ? `<span class="ho-tag">${_cap(pkg.meal_plan)}</span>` : ''}
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

  function render(container, packages) {
    if (!container) return;
    if (!packages?.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate)">No holiday packages available</div>';
      return;
    }
    container.innerHTML = packages.map(p => buildCard(p)).join('');
  }

  function _cap(str) {
    return String(str || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  window.holidayResultsStep = { render };
})();
