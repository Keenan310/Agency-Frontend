(function () {
  'use strict';
  const MOD = 'page-holiday-detail';

  // ── Module state ──────────────────────────────────────────────────────────────
  let _pkg      = null;
  let _gallery  = [];
  let _galIdx   = 0;

  function apiBase() {
    return ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
  }

  function imgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return apiBase().replace('/v1', '') + path;
  }

  // ── Public entry-point (called by router) ─────────────────────────────────────
  window.holiday_loadDetail = async function (idOrSlug) {
    _pkg = null;
    _gallery = [];
    _galIdx = 0;

    const title = document.getElementById('hd-pkg-title');
    if (title) title.textContent = 'Loading…';

    try {
      const res  = await fetch(`${apiBase()}/holiday/packages/${idOrSlug}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Not found');
      _pkg = json.data || json;
      _renderDetail(_pkg);
    } catch (err) {
      console.error('[holiday-detail]', err);
      if (typeof window.toast === 'function') window.toast('Failed to load package', 't-red');
      if (typeof window.go === 'function') window.go('results-holiday');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  function _renderDetail(p) {
    // Breadcrumb
    const bc = document.getElementById('hd-breadcrumb-name');
    if (bc) bc.textContent = p.name || 'Package';

    // Badge + stars
    const typeBadge = document.getElementById('hd-type-badge');
    if (typeBadge) typeBadge.textContent = _cap(p.package_type || 'standard');

    const stars = document.getElementById('hd-stars');
    if (stars) {
      const n = Number(p.star_rating || 0);
      stars.textContent = n ? '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n)) : '';
    }

    // Title
    const pkgTitle = document.getElementById('hd-pkg-title');
    if (pkgTitle) pkgTitle.textContent = p.name || '';

    // Meta row
    const meta = document.getElementById('hd-pkg-meta');
    if (meta) {
      const items = [
        p.destination   ? `✈ ${p.destination}` : null,
        p.nights        ? `🌙 ${p.nights} Nights` : null,
        p.meal_plan     ? `🍽 ${_cap(p.meal_plan)}` : null,
        p.departure_city ? `🛫 from ${p.departure_city}` : null,
      ].filter(Boolean);
      meta.innerHTML = items.map(i => `<span class="ho-pkg-meta-item">${i}</span>`).join('');
    }

    // Widget price
    const priceEl = document.getElementById('hd-price-per-person');
    if (priceEl) {
      const cur = p.currency || 'AED';
      const amt = Number(p.price_per_person || 0);
      priceEl.textContent = `${cur} ${amt.toLocaleString()}`;
    }

    // Date min
    const checkin = document.getElementById('hd-checkin');
    if (checkin) {
      const today = new Date().toISOString().split('T')[0];
      checkin.min = p.validity_start || today;
      checkin.value = '';
    }

    // Gallery
    _gallery = Array.isArray(p.gallery_images) ? p.gallery_images : [];
    _galIdx = 0;
    _renderGallery();

    // Policies
    _renderPolicies(p.policies || {});

    // Hotels
    _renderHotels(Array.isArray(p.hotels) ? p.hotels : []);

    // Itinerary
    _renderItinerary(Array.isArray(p.itinerary) ? p.itinerary : []);

    // Notes / cancellation
    const notesSection = document.getElementById('hd-notes-section');
    const notesBox     = document.getElementById('hd-cancellation-policy');
    const pol          = p.policies || {};
    if (notesBox && pol.cancellation_notes) {
      notesBox.textContent = pol.cancellation_notes;
      if (notesSection) notesSection.style.display = '';
    } else if (notesSection) {
      notesSection.style.display = 'none';
    }

    // Initial price calc
    holiday_recalcTotal();
  }

  // ── Gallery ───────────────────────────────────────────────────────────────────
  function _renderGallery() {
    const hero        = document.getElementById('hd-hero-img');
    const placeholder = document.getElementById('hd-hero-placeholder');
    const dotsEl      = document.getElementById('hd-gallery-dots');
    const thumbsEl    = document.getElementById('hd-gallery-thumbs');

    if (!hero) return;

    if (!_gallery.length) {
      hero.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
      if (dotsEl) dotsEl.innerHTML = '';
      if (thumbsEl) thumbsEl.innerHTML = '';
      return;
    }

    placeholder && (placeholder.style.display = 'none');
    hero.style.display = 'block';
    _showGallerySlide(0);

    // Dots
    if (dotsEl) {
      dotsEl.innerHTML = _gallery.map((_, i) =>
        `<button class="ho-gallery-dot ${i === 0 ? 'active' : ''}" onclick="holiday_galleryNav(${i - _galIdx})" aria-label="Image ${i+1}"></button>`
      ).join('');
    }

    // Thumbs
    if (thumbsEl) {
      thumbsEl.innerHTML = _gallery.map((img, i) =>
        `<img class="ho-gallery-thumb ${i === 0 ? 'active' : ''}"
             src="${imgUrl(img.url || img)}"
             alt="Photo ${i+1}"
             onclick="holiday_galleryGoTo(${i})"
             onerror="this.style.display='none'">`
      ).join('');
    }
  }

  function _showGallerySlide(idx) {
    const hero  = document.getElementById('hd-hero-img');
    const dots  = document.querySelectorAll('.ho-gallery-dot');
    const thumbs = document.querySelectorAll('.ho-gallery-thumb');

    if (!hero || !_gallery.length) return;

    const imgData = _gallery[idx];
    const url = typeof imgData === 'object' ? (imgData.url || '') : imgData;
    hero.src = imgUrl(url);
    hero.alt = typeof imgData === 'object' ? (imgData.alt || `Photo ${idx + 1}`) : `Photo ${idx + 1}`;

    dots.forEach((d, i)  => d.classList.toggle('active', i === idx));
    thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
  }

  window.holiday_galleryNav = function (delta) {
    if (!_gallery.length) return;
    _galIdx = (_galIdx + delta + _gallery.length) % _gallery.length;
    _showGallerySlide(_galIdx);
  };

  window.holiday_galleryGoTo = function (idx) {
    if (idx < 0 || idx >= _gallery.length) return;
    _galIdx = idx;
    _showGallerySlide(_galIdx);
  };

  // ── Policies ─────────────────────────────────────────────────────────────────
  const POLICY_DEFS = [
    { key: 'flight_included',    icon: '✈️',  label: 'Flights',    detail: 'flight_details' },
    { key: 'visa_included',      icon: '🛂',  label: 'Visa',       detail: 'visa_details' },
    { key: 'hotel_included',     icon: '🏨',  label: 'Hotel',      detail: 'hotel_details' },
    { key: 'transfer_included',  icon: '🚌',  label: 'Transfers',  detail: 'transfer_details' },
    { key: 'insurance_included', icon: '🛡️', label: 'Insurance',  detail: 'insurance_details' },
    { key: 'meals_included',     icon: '🍽️', label: 'Meals',      detail: 'meal_details' },
    { key: 'guide_included',     icon: '🎙️', label: 'Tour Guide', detail: 'guide_details' },
  ];

  function _renderPolicies(policies) {
    const grid    = document.getElementById('hd-policies-grid');
    const section = document.getElementById('hd-policies-section');
    if (!grid) return;

    const html = POLICY_DEFS.map(def => {
      const inc    = !!policies[def.key];
      const detail = policies[def.detail] || '';
      return `
        <div class="ho-policy-item ${inc ? 'included' : 'excluded'}">
          <div class="ho-policy-icon">${def.icon}</div>
          <div>
            <div class="ho-policy-label">${inc ? '✓' : '✗'} ${def.label}</div>
            ${detail ? `<div class="ho-policy-detail">${_esc(detail)}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;
    if (section) section.style.display = '';
  }

  // ── Hotels ───────────────────────────────────────────────────────────────────
  function _renderHotels(hotels) {
    const list    = document.getElementById('hd-hotels-list');
    const section = document.getElementById('hd-hotels-section');
    if (!list) return;

    if (!hotels.length) {
      if (section) section.style.display = 'none';
      return;
    }

    list.innerHTML = hotels.map(h => {
      const stars = '★'.repeat(Number(h.star_rating || h.stars || 0));
      const tags  = [
        h.star_rating || h.stars ? `${h.star_rating || h.stars}★` : null,
        h.room_type   ? _cap(h.room_type) : null,
        h.nights      ? `${h.nights} nights` : null,
        h.meal_plan   ? _cap(h.meal_plan) : null,
      ].filter(Boolean);

      const imgHtml = h.image
        ? `<img class="ho-hotel-img" src="${imgUrl(h.image)}" alt="${_esc(h.name)}" onerror="this.style.display='none'">`
        : `<div class="ho-hotel-img-placeholder">🏨</div>`;

      return `
        <div class="ho-hotel-card">
          ${imgHtml}
          <div class="ho-hotel-info">
            <div class="ho-hotel-name">${_esc(h.name || 'Hotel')}</div>
            <div class="ho-hotel-location">${h.location ? _esc(h.location) : ''}</div>
            <div class="ho-hotel-tags">
              ${tags.map(t => `<span class="ho-hotel-tag">${t}</span>`).join('')}
            </div>
          </div>
        </div>`;
    }).join('');

    if (section) section.style.display = '';
  }

  // ── Itinerary ─────────────────────────────────────────────────────────────────
  function _renderItinerary(days) {
    const list    = document.getElementById('hd-itinerary-list');
    const section = document.getElementById('hd-itinerary-section');
    if (!list) return;

    if (!days.length) {
      if (section) section.style.display = 'none';
      return;
    }

    list.innerHTML = days.map((day, i) => `
      <div class="ho-itinerary-day" id="ho-itin-day-${i}">
        <div class="ho-itinerary-day-header" onclick="holiday_toggleItinDay(${i})">
          <div class="ho-day-num">${i + 1}</div>
          <div class="ho-day-title">${_esc(day.title || `Day ${i + 1}`)}</div>
          <span class="ho-day-chevron">›</span>
        </div>
        <div class="ho-itinerary-day-body">${_esc(day.description || day.desc || '')}</div>
      </div>`
    ).join('');

    if (section) section.style.display = '';
  }

  window.holiday_toggleItinDay = function (idx) {
    const el = document.getElementById(`ho-itin-day-${idx}`);
    if (el) el.classList.toggle('open');
  };

  // ── Price Calculator ──────────────────────────────────────────────────────────
  window.holiday_adjustCount = function (type, delta) {
    const el = document.getElementById(`hd-${type}`);
    if (!el) return;
    let val = parseInt(el.textContent) + delta;
    if (type === 'adults')   val = Math.max(1, val);
    if (type === 'children') val = Math.max(0, val);
    if (type === 'infants')  val = Math.max(0, val);
    el.textContent = val;
    holiday_recalcTotal();
  };

  window.holiday_recalcTotal = function () {
    if (!_pkg) return;
    const ppp      = Number(_pkg.price_per_person || 0);
    const currency = _pkg.currency || 'AED';
    const adults   = parseInt(document.getElementById('hd-adults')?.textContent || 2);
    const children = parseInt(document.getElementById('hd-children')?.textContent || 0);
    const infants  = parseInt(document.getElementById('hd-infants')?.textContent || 0);

    const adultTotal    = ppp * adults;
    const childTotal    = ppp * 0.75 * children;
    const infantTotal   = 0;
    const grandTotal    = adultTotal + childTotal + infantTotal;

    const bd = document.getElementById('hd-price-breakdown');
    if (!bd) return;

    const rows = [
      adults   ? `<div class="ho-pb-row"><span>${adults} Adult${adults > 1 ? 's' : ''}</span><span>${currency} ${adultTotal.toLocaleString()}</span></div>` : '',
      children ? `<div class="ho-pb-row"><span>${children} Child${children > 1 ? 'ren' : ''} (75%)</span><span>${currency} ${childTotal.toLocaleString()}</span></div>` : '',
      infants  ? `<div class="ho-pb-row"><span>${infants} Infant${infants > 1 ? 's' : ''}</span><span>Free</span></div>` : '',
      `<div class="ho-pb-row"><span>Total</span><span>${currency} ${grandTotal.toLocaleString()}</span></div>`,
    ].filter(Boolean);

    bd.innerHTML = rows.join('');
  };

  // ── Booking Modal ─────────────────────────────────────────────────────────────
  window.holiday_openBookingModal = function () {
    if (!_pkg) return;

    const checkin = document.getElementById('hd-checkin')?.value;
    if (!checkin) {
      if (typeof window.toast === 'function') window.toast('Please select a check-in date', 't-gold');
      return;
    }

    // Build summary HTML
    const currency = _pkg.currency || 'AED';
    const adults   = parseInt(document.getElementById('hd-adults')?.textContent || 2);
    const children = parseInt(document.getElementById('hd-children')?.textContent || 0);
    const infants  = parseInt(document.getElementById('hd-infants')?.textContent || 0);
    const ppp      = Number(_pkg.price_per_person || 0);
    const grandTotal = ppp * adults + ppp * 0.75 * children;

    const nights    = _pkg.nights || 0;
    const checkout  = _addDays(checkin, nights);

    const summary = document.getElementById('ho-book-summary');
    if (summary) {
      summary.innerHTML = `
        <div style="background:var(--surface2);border-radius:10px;padding:14px;font-size:14px">
          <div style="font-weight:700;font-size:16px;margin-bottom:8px;color:var(--ink)">${_esc(_pkg.name)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;color:var(--slate)">
            <span>Check-in</span><span style="font-weight:600;color:var(--ink)">${checkin}</span>
            <span>Check-out</span><span style="font-weight:600;color:var(--ink)">${checkout}</span>
            <span>Guests</span><span style="font-weight:600;color:var(--ink)">${adults}A ${children > 0 ? children+'C ' : ''}${infants > 0 ? infants+'I' : ''}</span>
            <span>Total</span><span style="font-weight:700;color:var(--gold);font-size:16px">${currency} ${grandTotal.toLocaleString()}</span>
          </div>
        </div>`;
    }

    const modal = document.getElementById('m-ho-book');
    if (modal) modal.style.display = 'flex';
  };

  window.holiday_submitBooking = async function () {
    const fname    = document.getElementById('ho-bk-fname')?.value.trim();
    const lname    = document.getElementById('ho-bk-lname')?.value.trim();
    const email    = document.getElementById('ho-bk-email')?.value.trim();
    const phone    = document.getElementById('ho-bk-phone')?.value.trim();
    const requests = document.getElementById('ho-bk-requests')?.value.trim();

    if (!fname || !lname || !email || !phone) {
      if (typeof window.toast === 'function') window.toast('Please fill in all required fields', 't-red');
      return;
    }

    const checkin  = document.getElementById('hd-checkin')?.value;
    const adults   = parseInt(document.getElementById('hd-adults')?.textContent || 2);
    const children = parseInt(document.getElementById('hd-children')?.textContent || 0);
    const infants  = parseInt(document.getElementById('hd-infants')?.textContent || 0);
    const roomType = document.getElementById('hd-room-type')?.value || 'Standard Room';
    const ppp      = Number(_pkg.price_per_person || 0);
    const amount   = ppp * adults + ppp * 0.75 * children;

    const btn = document.getElementById('ho-bk-submit-btn');
    if (btn) { btn.textContent = 'Submitting…'; btn.disabled = true; }

    try {
      const headers = { 'Content-Type': 'application/json' };
      const session = _getSession();
      if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;

      const res = await fetch(`${apiBase()}/holiday/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          package_id:       _pkg.id,
          first_name:       fname,
          last_name:        lname,
          email,
          phone,
          num_adults:       adults,
          num_children:     children,
          num_infants:      infants,
          check_in_date:    checkin,
          room_type:        roomType,
          special_requests: requests,
          amount,
          currency:         _pkg.currency || 'AED',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Booking failed');

      const modal = document.getElementById('m-ho-book');
      if (modal) modal.style.display = 'none';

      if (typeof window.toast === 'function')
        window.toast(`Booking confirmed! Reference: ${json.data?.reference || ''}`, 't-green');

      setTimeout(() => { if (typeof window.go === 'function') window.go('home'); }, 3000);
    } catch (err) {
      console.error('[holiday-detail] booking error', err);
      if (typeof window.toast === 'function') window.toast(err.message || 'Booking failed', 't-red');
    } finally {
      if (btn) { btn.textContent = 'Confirm Booking'; btn.disabled = false; }
    }
  };

  // ── Enquiry Modal ─────────────────────────────────────────────────────────────
  window.holiday_openEnquiryModal = function () {
    const modal = document.getElementById('m-ho-enquiry');
    if (modal) modal.style.display = 'flex';

    // Pre-fill pax from widget
    const adults   = parseInt(document.getElementById('hd-adults')?.textContent || 2);
    const children = parseInt(document.getElementById('hd-children')?.textContent || 0);
    const paxEl    = document.getElementById('ho-enq-pax');
    if (paxEl) paxEl.value = adults + children;

    const dateEl  = document.getElementById('ho-enq-date');
    const checkin = document.getElementById('hd-checkin')?.value;
    if (dateEl && checkin) dateEl.value = checkin;
  };

  window.holiday_submitEnquiry = async function () {
    const name    = document.getElementById('ho-enq-name')?.value.trim();
    const phone   = document.getElementById('ho-enq-phone')?.value.trim();
    const email   = document.getElementById('ho-enq-email')?.value.trim();
    const message = document.getElementById('ho-enq-message')?.value.trim();

    if (!name || !email) {
      if (typeof window.toast === 'function') window.toast('Name and email are required', 't-red');
      return;
    }

    // For now, post to the booking endpoint with status enquiry; backend may have a dedicated endpoint
    try {
      const headers = { 'Content-Type': 'application/json' };
      const res = await fetch(`${apiBase()}/holiday/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          package_id:       _pkg?.id,
          first_name:       name.split(' ')[0],
          last_name:        name.split(' ').slice(1).join(' ') || '.',
          email,
          phone,
          special_requests: message,
          num_adults:       parseInt(document.getElementById('ho-enq-pax')?.value || 2),
          check_in_date:    document.getElementById('ho-enq-date')?.value || new Date().toISOString().split('T')[0],
          amount:           0,
          currency:         _pkg?.currency || 'AED',
          is_enquiry:       true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Enquiry failed');

      const modal = document.getElementById('m-ho-enquiry');
      if (modal) modal.style.display = 'none';

      if (typeof window.toast === 'function')
        window.toast('Enquiry sent! Our team will contact you soon.', 't-green');
    } catch (err) {
      console.error('[holiday-detail] enquiry error', err);
      if (typeof window.toast === 'function') window.toast(err.message || 'Failed to send enquiry', 't-red');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function _cap(str) {
    return String(str || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().split('T')[0];
  }

  function _getSession() {
    try { return JSON.parse(localStorage.getItem('keenanTravelSession') || 'null'); } catch { return null; }
  }

  // ── Module registration ───────────────────────────────────────────────────────
  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules[MOD] = {
    mount() {
      window.dispatchEvent(new CustomEvent('holiday-detail-ready'));
    }
  };
})();
