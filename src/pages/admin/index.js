window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["page-admin"] = {
  type: "page",
  mount(root) {
    if (!root) return;
    root.dataset.module = "page-admin";
    if (typeof window.initAdminNotifications === 'function') {
      window.initAdminNotifications();
    }
  },
};

// ── Admin helper: get auth token ─────────────────────────────────────────────
function _adminToken() {
  try { return JSON.parse(localStorage.getItem('keenanTravelSession') || 'null')?.token || ''; } catch { return ''; }
}

let _umrahPackages = [];

function _adminApiBase() {
  return ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
}

let _adminAbortController = null;

window.resetState = function resetState() {
  if (_adminAbortController) {
    _adminAbortController.abort();
  }
  _adminAbortController = new AbortController();

  document.querySelectorAll('.btn-navy, .btn-gold, .btn-outline').forEach(btn => {
    if (btn.textContent.includes('⏳') || btn.disabled) {
      if (btn.dataset.origText) btn.textContent = btn.dataset.origText;
      btn.disabled = false;
    }
  });

  const tbodies = ['refunds-tbody', 'reissues-tbody'];
  tbodies.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
};

async function _adminFetch(path, options = {}) {
  try {
    const res = await fetch(_adminApiBase() + path, {
      cache: 'no-store',
      ...options,
      signal: _adminAbortController ? _adminAbortController.signal : undefined,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _adminToken(), ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    return data;
  } catch (e) {
    if (e.name === 'AbortError') return { success: false, aborted: true };
    return { success: false, error: e.message };
  }
}

// ── NDC config ───────────────────────────────────────────────────────────────
window.saveNdcConfig = async function saveNdcConfig() {
  const body = JSON.stringify({
    keyName:  'ndc_wonder_travel',
    keyLabel: 'Wonder Travel NDC Flight API',
    baseUrl:  document.getElementById('ndc-base-url').value.trim(),
    apiKey:   document.getElementById('ndc-api-key').value,
    env:      document.getElementById('ndc-env').value,
  });
  const data = await _adminFetch('/admin/api-keys', { method: 'PUT', body });
  const badge = document.getElementById('ndc-status-badge');
  if (data.success !== false) {
    if (badge) { badge.textContent = 'Configured ✓'; badge.style.cssText = 'background:var(--green-bg);color:var(--green)'; }
    if (typeof window.toast === 'function') window.toast('NDC configuration saved', 't-green');
  } else {
    if (typeof window.toast === 'function') window.toast('Save failed: ' + (data.error || 'unknown'), 't-red');
  }
};

window.testNdcConnection = async function testNdcConnection() {
  const btn = document.getElementById('ndc-test-btn');
  const res = document.getElementById('ndc-test-result');
  if (btn) { btn.textContent = '⏳ Testing…'; btn.disabled = true; }
  if (res) { res.style.display = 'block'; res.style.cssText += ';background:var(--surface2);color:var(--slate)'; res.textContent = 'Connecting to Wonder Travel NDC API…'; }
  const data = await _adminFetch('/admin/api-keys/test/ndc_wonder_travel');
  if (res) {
    if (data.success !== false) {
      res.style.cssText += ';background:var(--green-bg,#f0fdf4);color:var(--green,#0f7b5b)';
      res.innerHTML = `✓ Connected · Agency Balance: <strong>${data.balance?.available ?? 'N/A'}</strong>`;
    } else {
      res.style.cssText += ';background:var(--red-bg,#fef2f2);color:var(--red,#dc2626)';
      res.textContent = '✕ ' + (data.error || 'Connection failed');
    }
  }
  if (btn) { btn.textContent = '🔗 Test Connection'; btn.disabled = false; }
};

// ── Stripe config ────────────────────────────────────────────────────────────
window.saveStripeConfig = async function saveStripeConfig() {
  const env = document.getElementById('stripe-env').value;
  const body = JSON.stringify({
    keyName:        'stripe_payment',
    keyLabel:       'Stripe Payment Gateway',
    baseUrl:        'https://api.stripe.com',
    apiKey:         document.getElementById('stripe-secret-key').value,
    publishableKey: document.getElementById('stripe-pub-key').value,
    env,
  });
  const data = await _adminFetch('/admin/api-keys', { method: 'PUT', body });
  const badge = document.getElementById('stripe-status-badge');
  if (data.success !== false) {
    if (badge) {
      badge.textContent = env === 'production' ? 'Live ✓' : 'Sandbox ✓';
      badge.style.cssText = env === 'production'
        ? 'background:var(--green-bg);color:var(--green)'
        : 'background:var(--blue-bg,#eff6ff);color:var(--blue,#1d4ed8)';
    }
    if (typeof window.toast === 'function') window.toast('Stripe keys saved', 't-green');
  } else {
    if (typeof window.toast === 'function') window.toast('Save failed: ' + (data.error || 'unknown'), 't-red');
  }
};

window.testStripeConnection = async function testStripeConnection() {
  const btn = document.getElementById('stripe-test-btn');
  const res = document.getElementById('stripe-test-result');
  if (btn) { btn.textContent = '⏳ Testing…'; btn.disabled = true; }
  if (res) { res.style.display = 'block'; res.textContent = 'Connecting to Stripe…'; }
  const data = await _adminFetch('/admin/api-keys/test/stripe_payment');
  if (res) {
    if (data.success !== false) {
      res.style.cssText = 'display:block;background:var(--green-bg,#f0fdf4);color:var(--green,#0f7b5b);padding:12px;border-radius:var(--r,8px);font-size:13px';
      res.textContent = '✓ Stripe connection verified';
    } else {
      res.style.cssText = 'display:block;background:var(--red-bg,#fef2f2);color:var(--red,#dc2626);padding:12px;border-radius:var(--r,8px);font-size:13px';
      res.textContent = '✕ ' + (data.error || 'Connection failed');
    }
  }
  if (btn) { btn.textContent = '🔗 Test Connection'; btn.disabled = false; }
};

// ── Admin logout ─────────────────────────────────────────────────────────────
window.adminLogout = function adminLogout() {
  if (!confirm('Are you sure you want to log out?')) return;
  if (typeof window.persistSession === 'function') {
    window.persistSession(null);
  } else {
    try { localStorage.removeItem('keenanTravelSession'); } catch {}
  }
  try { sessionStorage.clear(); } catch {}
  if (typeof window.go === 'function') window.go('admin-login');
  else window.location.hash = '#/admin-login';
};

// ── Refunds panel ─────────────────────────────────────────────────────────────
function _refundStatusBadge(status) {
  const map = {
    pending:   'background:#fef3c7;color:#92400e',
    approved:  'background:var(--blue-bg,#eff6ff);color:var(--blue,#1d4ed8)',
    processed: 'background:var(--green-bg,#f0fdf4);color:var(--green,#0f7b5b)',
    rejected:  'background:var(--red-bg,#fef2f2);color:var(--red,#dc2626)',
  };
  return `<span style="${map[status] || ''};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">${status}</span>`;
}

window.loadRefunds = async function loadRefunds() {
  const tbody = document.getElementById('refunds-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--slate);padding:20px">Loading…</td></tr>';
  const status = document.getElementById('refund-status-filter')?.value || '';
  const data = await _adminFetch('/refunds' + (status ? '?status=' + status : ''));
  if (data && data.aborted) return;
  const rows = data.data || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--slate);padding:30px">No refund requests found</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td><span class="mono">${r.reference}</span></td>
      <td><span class="mono">${r.booking_reference || '—'}</span></td>
      <td>${r.customer_name || '—'}</td>
      <td><strong>${Number(r.amount).toLocaleString()} ${r.currency}</strong></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.reason || '—'}</td>
      <td>${r.requested_at ? new Date(r.requested_at).toLocaleDateString() : '—'}</td>
      <td>${_refundStatusBadge(r.status)}</td>
      <td>
        ${r.status === 'pending' ? `
          <button class="btn-navy btn-sm" onclick="updateRefundStatus(${r.id},'approved')">Approve</button>
          <button class="btn-outline btn-sm" onclick="updateRefundStatus(${r.id},'rejected')">Reject</button>
        ` : r.status === 'approved' ? `
          <button class="btn-navy btn-sm" onclick="updateRefundStatus(${r.id},'processed')">Process</button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
};

window.updateRefundStatus = async function updateRefundStatus(id, status) {
  const notes = status === 'rejected' ? prompt('Reason for rejection (optional):') : null;
  const data = await _adminFetch('/refunds/' + id + '/status', {
    method: 'PATCH',
    body: JSON.stringify({ status, notes: notes || undefined }),
  });
  if (data.data) {
    if (typeof window.toast === 'function') window.toast('Refund ' + status, 't-green');
    loadRefunds();
  } else {
    if (typeof window.toast === 'function') window.toast('Update failed: ' + (data.error || 'unknown'), 't-red');
  }
};

// ── Reissues panel ────────────────────────────────────────────────────────────
window.loadReissues = async function loadReissues() {
  const tbody = document.getElementById('reissues-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--slate);padding:20px">Loading…</td></tr>';
  const status = document.getElementById('reissue-status-filter')?.value || '';
  const data = await _adminFetch('/reissues' + (status ? '?status=' + status : ''));
  if (data && data.aborted) return;
  const rows = data.data || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--slate);padding:30px">No re-issue requests found</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td><span class="mono">${r.reference}</span></td>
      <td><span class="mono">${r.booking_reference || '—'}</span></td>
      <td>${r.customer_name || '—'}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${r.original_flight || '—'}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${r.new_flight || '—'}</td>
      <td><strong>${Number(r.fee).toLocaleString()} ${r.currency}</strong></td>
      <td>${_refundStatusBadge(r.status)}</td>
      <td>
        ${r.status === 'pending' ? `
          <button class="btn-navy btn-sm" onclick="updateReissueStatus(${r.id},'approved')">Approve</button>
          <button class="btn-outline btn-sm" onclick="updateReissueStatus(${r.id},'rejected')">Reject</button>
        ` : r.status === 'approved' ? `
          <button class="btn-navy btn-sm" onclick="updateReissueStatus(${r.id},'processed')">Mark Done</button>
        ` : '—'}
      </td>
    </tr>
  `).join('');
};

window.updateReissueStatus = async function updateReissueStatus(id, status) {
  const notes = status === 'rejected' ? prompt('Reason for rejection (optional):') : null;
  const data = await _adminFetch('/reissues/' + id + '/status', {
    method: 'PATCH',
    body: JSON.stringify({ status, notes: notes || undefined }),
  });
  if (data.data) {
    if (typeof window.toast === 'function') window.toast('Re-issue ' + status, 't-green');
    loadReissues();
  } else {
    if (typeof window.toast === 'function') window.toast('Update failed: ' + (data.error || 'unknown'), 't-red');
  }
};

// ── Payment Settings panel ────────────────────────────────────────────────────
window.savePaymentSettings = async function savePaymentSettings() {
  const env = document.getElementById('ps-stripe-env')?.value || 'sandbox';
  const body = JSON.stringify({
    keyName:        'stripe_payment',
    keyLabel:       'Stripe Payment Gateway',
    baseUrl:        'https://api.stripe.com',
    apiKey:         document.getElementById('ps-stripe-secret-key')?.value || '',
    publishableKey: document.getElementById('ps-stripe-pub-key')?.value || '',
    env,
  });
  const data = await _adminFetch('/admin/api-keys', { method: 'PUT', body });
  const badge = document.getElementById('ps-gateway-status-badge');
  const envBadge = document.getElementById('ps-env-badge');
  const statusDiv = document.getElementById('ps-stripe-status');
  if (data.success !== false) {
    if (badge) { badge.textContent = 'Configured ✓'; badge.style.cssText = 'background:var(--green-bg);color:var(--green)'; }
    if (envBadge) envBadge.textContent = env === 'production' ? '🟢 Live' : '🔵 Sandbox';
    if (statusDiv) { statusDiv.style.display = 'block'; statusDiv.style.cssText = 'display:block;background:var(--green-bg,#f0fdf4);color:var(--green,#0f7b5b);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;width:fit-content'; statusDiv.textContent = env === 'production' ? 'Live ✓' : 'Sandbox ✓'; }
    if (typeof window.toast === 'function') window.toast('Payment settings saved', 't-green');
  } else {
    if (typeof window.toast === 'function') window.toast('Save failed: ' + (data.error || 'unknown'), 't-red');
  }
};

window.testPaymentSettings = async function testPaymentSettings() {
  const btn = document.getElementById('ps-stripe-test-btn');
  const res = document.getElementById('ps-stripe-test-result');
  if (btn) { btn.textContent = '⏳ Testing…'; btn.disabled = true; }
  if (res) { res.style.display = 'block'; res.textContent = 'Connecting to Stripe…'; res.style.cssText = 'display:block;background:var(--surface2);color:var(--slate);padding:12px;border-radius:8px;font-size:13px'; }
  const data = await _adminFetch('/admin/api-keys/test/stripe_payment');
  if (res) {
    if (data.success !== false) {
      res.style.cssText = 'display:block;background:var(--green-bg,#f0fdf4);color:var(--green,#0f7b5b);padding:12px;border-radius:8px;font-size:13px';
      res.textContent = '✓ Stripe connection verified — keys are valid';
    } else {
      res.style.cssText = 'display:block;background:var(--red-bg,#fef2f2);color:var(--red,#dc2626);padding:12px;border-radius:8px;font-size:13px';
      res.textContent = '✕ ' + (data.error || 'Connection failed');
    }
  }
  if (btn) { btn.textContent = '🔗 Test Connection'; btn.disabled = false; }
};


// ── Airline Discounts panel ───────────────────────────────────────────────────

window.loadAirlineDiscounts = async function loadAirlineDiscounts() {
  const tbody = document.getElementById('ad-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">Loading…</td></tr>';
  
  const data = await _adminFetch('/airline-discounts');
  if (data && data.success && Array.isArray(data.data)) {
    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">No discounts found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.data.map(d => {
      const pctStr = parseFloat(d.percentage_discount) > 0 ? `${parseFloat(d.percentage_discount)}%` : '-';
      const flatStr = parseFloat(d.flat_discount) > 0 ? `AED ${parseFloat(d.flat_discount)}` : '-';
      const activeStr = d.is_active ? '<span class="badge b-green">Active</span>' : '<span class="badge b-slate">Inactive</span>';
      
      return `
        <tr>
          <td class="semi">${d.airline_name}</td>
          <td>${d.origin_airport || 'ALL'}</td>
          <td>${d.destination_airport || 'ALL'}</td>
          <td>${pctStr}</td>
          <td class="semi">${flatStr}</td>
          <td>${d.booking_deadline ? new Date(d.booking_deadline).toLocaleDateString() : '-'}</td>
          <td>${d.travel_deadline ? new Date(d.travel_deadline).toLocaleDateString() : '-'}</td>
          <td class="td-actions">
            ${activeStr}
            <button class="btn-icon" onclick='editDiscount(${JSON.stringify(d).replace(/'/g, "&#39;")})'>✏</button>
            <button class="btn-icon" style="color:var(--red)" onclick="deleteDiscount(${d.id})">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:red">Failed to load discounts</td></tr>';
  }
};

window.openDiscountModal = function openDiscountModal() {
  document.getElementById('discount-form').reset();
  document.getElementById('ad-id').value = '';
  document.getElementById('discount-modal-title').textContent = 'Add Airline Discount';
  openModal('m-add-discount');
};

window.editDiscount = function editDiscount(d) {
  document.getElementById('discount-form').reset();
  document.getElementById('ad-id').value = d.id;
  document.getElementById('discount-modal-title').textContent = 'Edit Airline Discount';
  
  document.getElementById('ad-airline').value = d.airline_name || '';
  document.getElementById('ad-origin').value = d.origin_airport || '';
  document.getElementById('ad-destination').value = d.destination_airport || '';
  document.getElementById('ad-percentage').value = d.percentage_discount || '';
  document.getElementById('ad-flat').value = d.flat_discount || '';
  
  if (d.booking_deadline) document.getElementById('ad-booking-deadline').value = d.booking_deadline.substring(0, 10);
  if (d.travel_deadline) document.getElementById('ad-travel-deadline').value = d.travel_deadline.substring(0, 10);
  
  document.getElementById('ad-active').checked = d.is_active;
  
  openModal('m-add-discount');
};

window.submitDiscountForm = async function submitDiscountForm(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const id = formData.get('id');
  
  const submitData = {};
  for (let [key, val] of formData.entries()) {
    if (key === 'id') continue;
    submitData[key] = val;
  }
  
  submitData.is_active = document.getElementById('ad-active').checked;

  try {
    const url = id ? `/airline-discounts/${id}` : `/airline-discounts`;
    const method = id ? 'PUT' : 'POST';
    
    const data = await _adminFetch(url, {
      method,
      body: JSON.stringify(submitData)
    });
    
    if (data && data.success) {
      if (typeof window.toast === 'function') window.toast(id ? 'Discount updated' : 'Discount created', 't-green');
      closeModal('m-add-discount');
      loadAirlineDiscounts();
    } else {
      if (typeof window.toast === 'function') window.toast('Error: ' + (data ? data.error : 'Unknown error'), 't-red');
    }
  } catch (err) {
    if (typeof window.toast === 'function') window.toast('Request failed', 't-red');
  }
};

window.deleteDiscount = async function deleteDiscount(id) {
  if (!confirm('Are you sure you want to delete this discount?')) return;
  const data = await _adminFetch(`/airline-discounts/${id}`, { method: 'DELETE' });
  if (data && data.success) {
    if (typeof window.toast === 'function') window.toast('Discount deleted', 't-green');
    loadAirlineDiscounts();
  } else {
    if (typeof window.toast === 'function') window.toast('Delete failed: ' + (data.error || 'unknown'), 't-red');
  }
};

// ── Umrah Packages panel ───────────────────────────────────────────────────

window.adminLoadUmrahPackages = async function adminLoadUmrahPackages() {
  const tbody = document.getElementById('tbody-um');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;">Loading…</td></tr>';
  
  const data = await _adminFetch('/umrah/packages');
  if (data && data.data && Array.isArray(data.data)) {
    _umrahPackages = data.data; // Cache the packages
    
    if (_umrahPackages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;">No packages found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = _umrahPackages.map(p => {
      let typeBadge = '';
      if (p.type === 'vip') typeBadge = '<span class="badge b-gold">VIP</span>';
      else if (p.type === 'premium') typeBadge = '<span class="badge b-blue">Premium</span>';
      else if (p.type === 'standard') typeBadge = '<span class="badge b-slate">Standard</span>';
      else typeBadge = '<span class="badge b-slate">Economy</span>';

      return `
        <tr data-package-id="${p.id}" data-type="${p.type}" data-nights="${p.nights}" data-visa="${p.visa_included ? 'yes' : 'no'}">
          <td class="semi">${p.name}</td>
          <td>${typeBadge}</td>
          <td>${p.nights}</td>
          <td>${p.makkah_hotel}</td>
          <td>${p.madinah_hotel}</td>
          <td class="semi">AED ${Number(p.price_per_person).toLocaleString()}</td>
          <td>${p.visa_included ? '<span class="badge b-green">Yes</span>' : '<span class="badge b-slate">No</span>'}</td>
          <td><select class="ss ${p.is_active ? 'ss-active' : 'ss-inactive'}" onchange="chgStatus(this)"><option value="active" ${p.is_active ? 'selected' : ''}>Active</option><option value="inactive" ${!p.is_active ? 'selected' : ''}>Inactive</option></select></td>
          <td>${p.bookings_count || 0}</td>
          <td class="td-actions">
            <button class="btn-icon" title="View" onclick='viewUmrahPackage(${p.id})'>👁️</button>
            <button class="btn-icon" title="Edit" onclick='editUmrahPackage(${p.id})'>✏</button>
            <button class="btn-icon" title="Delete" style="color:var(--red)" onclick="deleteUmrahPackage(${p.id})">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:red">Failed to load packages</td></tr>';
  }
};

window.viewUmrahPackage = function viewUmrahPackage(id) {
  const p = _umrahPackages.find(pkg => pkg.id === id);
  if (!p) return;
  document.getElementById('vp-title').textContent = p.name;
  document.getElementById('vp-name').textContent = p.name;
  document.getElementById('vp-type-nights').textContent = `${p.type.charAt(0).toUpperCase() + p.type.slice(1)} • ${p.nights} Nights`;
  document.getElementById('vp-price').textContent = `AED ${Number(p.price_per_person).toLocaleString()}`;
  document.getElementById('vp-country').textContent = p.country_code === 'AE' ? 'UAE' : 'Pakistan';
  document.getElementById('vp-makkah').textContent = p.makkah_hotel;
  document.getElementById('vp-madinah').textContent = p.madinah_hotel;
  document.getElementById('vp-visa').textContent = p.visa_included ? 'Yes' : 'No';
  document.getElementById('vp-flights').textContent = p.flights_included ? 'Yes' : 'No';
  document.getElementById('vp-transport').textContent = p.transport_type;
  document.getElementById('vp-capacity').textContent = p.max_capacity || 'N/A';
  document.getElementById('vp-description').textContent = p.description || 'No description provided.';

  let images = [];
  try {
    images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
  } catch(e) {}

  const coverContainer = document.getElementById('vp-cover-container');
  const coverImage = document.getElementById('vp-cover-image');
  const gallerySection = document.getElementById('vp-gallery-section');
  const gallery = document.getElementById('vp-gallery');
  
  if (images.length > 0) {
    coverContainer.style.display = 'block';
    coverImage.src = _adminApiBase().replace('/v1', '') + images[0];
    
    if (images.length > 1) {
      gallerySection.style.display = 'block';
      gallery.innerHTML = images.slice(1).map(img => 
        `<img src="${_adminApiBase().replace('/v1', '')}${img}" style="height:100px;border-radius:8px;object-fit:cover;cursor:pointer" onclick="document.getElementById('vp-cover-image').src=this.src" />`
      ).join('');
    } else {
      gallerySection.style.display = 'none';
      gallery.innerHTML = '';
    }
  } else {
    coverContainer.style.display = 'none';
    gallerySection.style.display = 'none';
    gallery.innerHTML = '';
  }

  openModal('m-view-pkg');
};

window.addUmrahImageSlot = function addUmrahImageSlot() {
  const container = document.getElementById('up-image-list');
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.style.alignItems = 'center';
  
  const input = document.createElement('input');
  input.type = 'file';
  input.className = 'up-image-file';
  input.accept = 'image/*';
  input.style.flex = '1';
  
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-icon';
  removeBtn.style.color = 'var(--red)';
  removeBtn.textContent = '✖';
  removeBtn.onclick = () => div.remove();
  
  div.appendChild(input);
  div.appendChild(removeBtn);
  container.appendChild(div);
};

window.renderUmrahExistingImages = function renderUmrahExistingImages() {
  const container = document.getElementById('up-image-list');
  container.innerHTML = '';
  
  const existingImgsEl = document.getElementById('up-existing-images');
  if (!existingImgsEl) return;
  
  let images = [];
  try {
    images = JSON.parse(existingImgsEl.value);
  } catch(e) {}
  
  images.forEach((img, idx) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.alignItems = 'center';
    div.style.padding = '8px';
    div.style.background = 'var(--surface2)';
    div.style.borderRadius = '6px';
    
    const preview = document.createElement('img');
    preview.src = _adminApiBase().replace('/v1', '') + img;
    preview.style.width = '40px';
    preview.style.height = '40px';
    preview.style.objectFit = 'cover';
    preview.style.borderRadius = '4px';
    
    const label = document.createElement('span');
    label.style.flex = '1';
    label.style.fontSize = '13px';
    label.style.color = 'var(--slate)';
    label.textContent = img.split('/').pop();
    if (idx === 0) {
      const badge = document.createElement('span');
      badge.className = 'badge b-gold';
      badge.style.marginLeft = '8px';
      badge.textContent = 'Cover';
      label.appendChild(badge);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-icon';
    removeBtn.style.color = 'var(--red)';
    removeBtn.textContent = '🗑';
    removeBtn.onclick = () => {
      images.splice(idx, 1);
      existingImgsEl.value = JSON.stringify(images);
      renderUmrahExistingImages();
    };
    
    div.appendChild(preview);
    div.appendChild(label);
    div.appendChild(removeBtn);
    container.appendChild(div);
  });
};

window.editUmrahPackage = function editUmrahPackage(id) {
  const p = _umrahPackages.find(pkg => pkg.id === id);
  if (!p) return;
  document.getElementById('up-form').reset();
  document.getElementById('up-id').value = p.id;
  document.getElementById('up-modal-title').textContent = 'Edit Umrah Package';
  
  document.getElementById('up-name').value = p.name || '';
  document.getElementById('up-portal').value = p.country_code || 'AE';
  document.getElementById('up-type').value = p.type || 'economy';
  document.getElementById('up-nights').value = p.nights || 14;
  document.getElementById('up-makkah').value = p.makkah_hotel || '';
  document.getElementById('up-madinah').value = p.madinah_hotel || '';
  document.getElementById('up-price').value = p.price_per_person || '';
  document.getElementById('up-capacity').value = p.max_capacity || '';
  document.getElementById('up-visa').value = p.visa_included ? '1' : '0';
  document.getElementById('up-flights').value = p.flights_included ? '1' : '0';
  document.getElementById('up-status').value = p.is_active ? '1' : '0';
  document.getElementById('up-transport').value = p.transport_type || 'shared';
  document.getElementById('up-description').value = p.description || '';
  
  let existingImgs = document.getElementById('up-existing-images');
  if (!existingImgs) {
    existingImgs = document.createElement('input');
    existingImgs.type = 'hidden';
    existingImgs.id = 'up-existing-images';
    existingImgs.name = 'existing_images';
    document.getElementById('up-form').appendChild(existingImgs);
  }
  existingImgs.value = p.images ? (typeof p.images === 'string' ? p.images : JSON.stringify(p.images)) : '[]';
  renderUmrahExistingImages();

  openModal('m-add-pkg');
};

window.submitUmrahPackage = async function submitUmrahPackage() {
  const id = document.getElementById('up-id').value;
  const formData = new FormData();
  
  formData.append('name', document.getElementById('up-name').value);
  formData.append('country_code', document.getElementById('up-portal').value);
  formData.append('type', document.getElementById('up-type').value);
  formData.append('nights', document.getElementById('up-nights').value);
  formData.append('makkah_hotel', document.getElementById('up-makkah').value);
  formData.append('madinah_hotel', document.getElementById('up-madinah').value);
  formData.append('price_per_person', document.getElementById('up-price').value);
  const maxCap = document.getElementById('up-capacity').value;
  if (maxCap) formData.append('max_capacity', maxCap);
  formData.append('visa_included', document.getElementById('up-visa').value);
  formData.append('flights_included', document.getElementById('up-flights').value);
  formData.append('is_active', document.getElementById('up-status').value);
  formData.append('transport_type', document.getElementById('up-transport').value);
  formData.append('description', document.getElementById('up-description').value);
  
  const existingImgs = document.getElementById('up-existing-images');
  if (existingImgs) {
    formData.append('existing_images', existingImgs.value);
  }

  const fileInputs = document.querySelectorAll('.up-image-file');
  fileInputs.forEach(input => {
    if (input.files && input.files.length > 0) {
      formData.append('images', input.files[0]);
    }
  });

  const url = id ? '/umrah/packages/' + id : '/umrah/packages';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(_adminApiBase() + url, {
      method,
      headers: { 'Authorization': 'Bearer ' + _adminToken() },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data) {
      if (typeof window.toast === 'function') window.toast(id ? 'Package updated' : 'Package created', 't-green');
      closeModal('m-add-pkg');
      adminLoadUmrahPackages();
    } else {
      if (typeof window.toast === 'function') window.toast('Error: ' + (data ? data.error : 'Unknown error'), 't-red');
    }
  } catch (err) {
    if (typeof window.toast === 'function') window.toast('Request failed', 't-red');
  }
};

window.deleteUmrahPackage = async function deleteUmrahPackage(id) {
  if (!confirm('Are you sure you want to delete this package?')) return;
  const data = await _adminFetch('/umrah/packages/' + id, { method: 'DELETE' });
  if (data && data.success !== false) {
    if (typeof window.toast === 'function') window.toast('Package deleted', 't-green');
    adminLoadUmrahPackages();
  } else {
    if (typeof window.toast === 'function') window.toast('Delete failed', 't-red');
  }
};

window.openUmrahModal = function openUmrahModal() {
  document.getElementById('up-form').reset();
  document.getElementById('up-id').value = '';
  document.getElementById('up-modal-title').textContent = 'Add Umrah Package';
  let existingImgs = document.getElementById('up-existing-images');
  if (!existingImgs) {
    existingImgs = document.createElement('input');
    existingImgs.type = 'hidden';
    existingImgs.id = 'up-existing-images';
    existingImgs.name = 'existing_images';
    document.getElementById('up-form').appendChild(existingImgs);
  }
  existingImgs.value = '[]';
  renderUmrahExistingImages();
  addUmrahImageSlot(); // add one empty slot by default
  openModal('m-add-pkg');
};

window.adminLoadUmrahBookings = async function adminLoadUmrahBookings() {
  const tbody = document.getElementById('tbody-um-bookings');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">Loading Umrah Bookings…</td></tr>';
  
  const data = await _adminFetch('/umrah/bookings');
  if (data && data.data && Array.isArray(data.data)) {
    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">No Umrah bookings found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.data.map(b => {
      const statusClass = (b.status || 'pending').toLowerCase();
      const pColor = b.payment_status === 'received' ? 'ss-confirmed' : (b.payment_status === 'cancelled' ? 'ss-cancelled' : 'ss-pending');

      return `
        <tr>
          <td class="td-mono">${b.reference}</td>
          <td>${b.customer_name}</td>
          <td class="semi">${b.package_name}</td>
          <td>${b.num_pilgrims}</td>
          <td>${b.departure_date ? new Date(b.departure_date).toLocaleDateString() : '—'}</td>
          <td class="semi">${b.currency || 'AED'} ${Number(b.amount).toLocaleString()}</td>
          <td>
            <select class="ss ss-${statusClass}" onchange="updateUmrahBookingStatus(${b.id}, this.value)">
              <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="on_hold" ${b.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
              <option value="rejected" ${b.status === 'rejected' ? 'selected' : ''}>Rejected</option>
              <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>
            <select class="ss ${pColor}" onchange="updateUmrahPaymentStatus(${b.id}, this.value)">
              <option value="pending" ${b.payment_status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="received" ${b.payment_status === 'received' ? 'selected' : ''}>Received</option>
              <option value="cancelled" ${b.payment_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td class="td-actions">
            <button class="btn-icon" onclick="viewUmrahBooking(${b.id})" title="View Details">👁️</button>
            <button class="btn-icon" onclick="editUmrahBooking(${b.id})" title="Edit Booking">✏️</button>
            <button class="btn-icon" style="color:var(--red)" onclick="deleteUmrahBooking(${b.id})" title="Delete Booking">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:red">Failed to load Umrah bookings</td></tr>';
  }
};

window.viewUmrahBooking = async function viewUmrahBooking(id) {
  const data = await _adminFetch(`/umrah/bookings/${id}`);
  if (data && data.data) {
    const b = data.data;
    const content = `
      <div class="field"><label>Reference</label><div class="semi">${b.reference}</div></div>
      <div class="field"><label>Customer</label><div class="semi">${b.customer_name}</div></div>
      <div class="field"><label>Package</label><div class="semi">${b.package_name}</div></div>
      <div class="field"><label>Total Pax</label><div class="semi">${b.num_pilgrims} Pilgrims</div></div>
      <div class="field"><label>Departure</label><div class="semi">${b.departure_date ? new Date(b.departure_date).toLocaleDateString() : '—'}</div></div>
      <div class="field"><label>Departure City</label><div class="semi">${b.departure_city}</div></div>
      <div class="field"><label>Total Amount</label><div class="semi">${b.currency} ${Number(b.amount).toLocaleString()}</div></div>
      <div class="field"><label>Booking Status</label><div class="semi upper">${b.status}</div></div>
      <div class="field full" style="grid-column:span 2"><label>Admin Notes</label><div class="slate fs13">${b.notes || 'No notes available.'}</div></div>
    `;
    document.getElementById('view-umrah-details-content').innerHTML = content;
    openModal('m-view-umrah-booking');
  }
};

window.editUmrahBooking = async function editUmrahBooking(id) {
  const data = await _adminFetch(`/umrah/bookings/${id}`);
  if (data && data.data) {
    const b = data.data;
    document.getElementById('edit-um-booking-id').value = b.id;
    document.getElementById('edit-um-pax').value = b.num_pilgrims;
    document.getElementById('edit-um-amount').value = b.amount;
    openModal('m-edit-umrah-booking');
  }
};

window.saveUmrahBookingEdit = async function saveUmrahBookingEdit(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.booking_id.value;
  const payload = {
    num_pilgrims: form.num_pilgrims.value,
    amount: form.amount.value
  };

  const data = await _adminFetch(`/umrah/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  if (data && data.success !== false) {
    if (typeof window.toast === 'function') window.toast('Booking updated', 't-green');
    closeModal('m-edit-umrah-booking');
    adminLoadUmrahBookings();
  } else {
    if (typeof window.toast === 'function') window.toast('Update failed', 't-red');
  }
};

window.deleteUmrahBooking = async function deleteUmrahBooking(id) {
  if (!confirm('Are you sure you want to delete this booking record? This action cannot be undone.')) return;
  
  const data = await _adminFetch(`/umrah/bookings/${id}`, { method: 'DELETE' });
  if (data && data.success !== false) {
    if (typeof window.toast === 'function') window.toast('Booking deleted', 't-green');
    adminLoadUmrahBookings();
  } else {
    if (typeof window.toast === 'function') window.toast('Delete failed', 't-red');
  }
};

window.updateUmrahBookingStatus = async function updateUmrahBookingStatus(id, status) {
  const data = await _adminFetch(`/admin/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  if (data && data.success !== false) {
    if (typeof window.toast === 'function') window.toast('Booking status updated', 't-green');
    adminLoadUmrahBookings();
  } else {
    if (typeof window.toast === 'function') window.toast('Update failed', 't-red');
  }
};

window.updateUmrahPaymentStatus = async function updateUmrahPaymentStatus(id, status) {
  const data = await _adminFetch(`/admin/bookings/${id}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  if (data && data.success !== false) {
    if (typeof window.toast === 'function') window.toast('Payment status updated', 't-green');
    adminLoadUmrahBookings();
  } else {
    if (typeof window.toast === 'function') window.toast('Update failed', 't-red');
  }
};

// ── Umrah Accounts Panel ──────────────────────────────────────────────────────

// In-memory store keyed by account id — avoids JSON.stringify inside onclick attrs
const _accountsStore = {};

function _fmtCurrency(amount, currency) {
  const n = Number(amount || 0);
  const pfx = currency ? currency + ' ' : '';
  if (n >= 1000000) return pfx + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return pfx + (n / 1000).toFixed(1) + 'K';
  return pfx + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

window.adminLoadUmrahAccounts = async function adminLoadUmrahAccounts() {
  const tbody = document.getElementById('tbody-um-accounts');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--slate)">Loading\u2026</td></tr>';

  const data = await _adminFetch('/umrah/accounts');
  if (data && data.aborted) return;

  const rows = (data && data.data) || [];
  const summary = (data && data.summary) || { total_profit: 0, total_revenue: 0, total_count: 0 };

  const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setEl('um-acc-total-profit',  _fmtCurrency(summary.total_profit,  'AED'));
  setEl('um-acc-total-revenue', _fmtCurrency(summary.total_revenue, 'AED'));
  setEl('um-acc-avg-profit',    _fmtCurrency(summary.total_count > 0 ? summary.total_profit / summary.total_count : 0, 'AED'));
  setEl('um-acc-count-note',    summary.total_count + ' account record' + (summary.total_count !== 1 ? 's' : ''));

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--slate)">No account records found. Confirm Umrah bookings to auto-populate.</td></tr>';
    return;
  }

  // Cache all records in the store for safe onclick references
  rows.forEach(r => { _accountsStore[r.id] = r; });

  tbody.innerHTML = rows.map(r => {
    const profit = Number(r.profit || 0);
    const profitStyle = profit > 0 ? 'color:var(--green);font-weight:700' : profit < 0 ? 'color:var(--red);font-weight:700' : '';
    return `
      <tr>
        <td class="td-mono">${r.reference}</td>
        <td>
          <div class="semi fs14">${r.customer_name}</div>
          <div class="fs12 slate2">${r.package_details || '\u2014'}</div>
        </td>
        <td class="semi">AED ${Number(r.cost_price || 0).toLocaleString()}</td>
        <td class="semi">AED ${Number(r.selling_price || 0).toLocaleString()}</td>
        <td style="${profitStyle}">AED ${profit.toLocaleString()}</td>
        <td class="td-actions">
          <button class="btn-icon" title="Edit prices" onclick="editUmrahAccount(${r.id})">&#9999; Edit</button>
          <button class="btn-icon" style="color:var(--red)" title="Remove from ledger" onclick="deleteUmrahAccount(${r.id})">&#128465; Delete</button>
        </td>
      </tr>`;
  }).join('');
};

window.editUmrahAccount = function editUmrahAccount(idOrRecord) {
  // onclick passes numeric id; legacy callers may pass a full record object
  const record = (typeof idOrRecord === 'object' && idOrRecord !== null)
    ? idOrRecord
    : _accountsStore[idOrRecord];

  if (!record) {
    if (typeof window.toast === 'function') window.toast('Record not found — please refresh the Accounts tab', 't-red');
    return;
  }

  const idEl   = document.getElementById('edit-ua-id');
  const costEl = document.getElementById('edit-ua-cost');
  const saleEl = document.getElementById('edit-ua-sale');
  const refEl  = document.getElementById('edit-ua-ref-label');

  if (!idEl || !costEl || !saleEl) {
    if (typeof window.toast === 'function') window.toast('Edit modal not found. Try logging in again.', 't-red');
    return;
  }

  idEl.value   = record.id;
  costEl.value = record.cost_price;
  saleEl.value = record.selling_price;
  if (refEl) refEl.textContent = record.reference + ' · ' + record.customer_name;

  // Wire live profit preview (idempotent hooks)
  [costEl, saleEl].forEach(el => {
    if (!el._profitHooked) {
      el.addEventListener('input', _updateProfitPreview);
      el._profitHooked = true;
    }
  });

  _updateProfitPreview();
  openModal('m-edit-umrah-account');
};

function _updateProfitPreview() {
  const cost    = parseFloat(document.getElementById('edit-ua-cost')?.value || 0);
  const sale    = parseFloat(document.getElementById('edit-ua-sale')?.value || 0);
  const preview = document.getElementById('edit-ua-profit-preview');
  if (!preview) return;
  const profit = sale - cost;
  preview.textContent = 'AED ' + profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  preview.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
}

// (profit preview inputs are now hooked inside editUmrahAccount — no global listener needed)

window.saveUmrahAccountEdit = async function saveUmrahAccountEdit(e) {
  e.preventDefault();
  const id      = document.getElementById('edit-ua-id').value;
  const cost    = parseFloat(document.getElementById('edit-ua-cost').value);
  const selling = parseFloat(document.getElementById('edit-ua-sale').value);

  if (isNaN(cost) || isNaN(selling)) {
    if (typeof window.toast === 'function') window.toast('Please enter valid prices', 't-red');
    return;
  }

  const data = await _adminFetch('/umrah/accounts/' + id, {
    method: 'PUT',
    body: JSON.stringify({ cost_price: cost, selling_price: selling }),
  });

  if (data && data.data) {
    // Update local store so next edit gets fresh values
    if (_accountsStore[id]) {
      _accountsStore[id].cost_price    = cost;
      _accountsStore[id].selling_price = selling;
      _accountsStore[id].profit        = selling - cost;
    }
    if (typeof window.toast === 'function') window.toast('Account updated — profit recalculated', 't-green');
    closeModal('m-edit-umrah-account');
    // Refresh table + dashboard instantly
    adminLoadUmrahAccounts();
    if (typeof window.loadAdminDashboard === 'function') loadAdminDashboard();
  } else {
    const msg = (data && (data.message || data.error)) || 'Update failed';
    if (typeof window.toast === 'function') window.toast(msg, 't-red');
  }
};

window.deleteUmrahAccount = async function deleteUmrahAccount(id) {
  if (!confirm('Remove this record from the Accounts ledger? The booking itself will NOT be deleted.')) return;
  try {
    const res = await fetch(_adminApiBase() + '/umrah/accounts/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + _adminToken() },
    });
    if (res.ok || res.status === 204) {
      if (typeof window.toast === 'function') window.toast('Account record removed', 't-green');
      adminLoadUmrahAccounts();
    } else {
      if (typeof window.toast === 'function') window.toast('Delete failed', 't-red');
    }
  } catch { if (typeof window.toast === 'function') window.toast('Delete failed', 't-red'); }
};

// ── Dashboard Live Data ───────────────────────────────────────────────────────

window.loadAdminDashboard = async function loadAdminDashboard() {
  const portalEl = document.getElementById('admin-portal-selector');
  const countryCode = portalEl ? portalEl.value : '';
  const url = '/admin/dashboard' + (countryCode ? '?country_code=' + countryCode : '');

  const data = await _adminFetch(url);
  if (!data || data.aborted || data.error) return;

  const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  // KPI Cards
  setEl('dash-total-bookings',   Number(data.total_bookings   || 0).toLocaleString());
  setEl('dash-total-revenue',    _fmtCurrency(data.total_revenue, 'AED'));
  setEl('dash-active-customers', Number(data.active_customers || 0).toLocaleString());
  setEl('dash-pending-actions',  Number(data.pending_actions  || 0).toLocaleString());
  setEl('dash-bookings-change',  Number(data.total_bookings   || 0).toLocaleString() + ' total bookings');
  setEl('dash-revenue-change',   'Gross from all services');
  setEl('dash-customers-change', 'Currently active accounts');
  setEl('dash-pending-change',   'Require attention');

  // Revenue by Service (live DB data)
  const rev = data.revenue_by_service || {};
  setEl('dash-rev-flights', _fmtCurrency(rev.flights || 0, ''));
  setEl('dash-rev-holiday', _fmtCurrency(rev.holiday || 0, ''));
  setEl('dash-rev-cruise',  _fmtCurrency(rev.cruise  || 0, ''));
  setEl('dash-rev-visa',    _fmtCurrency(rev.visa    || 0, ''));
  // Umrah uses the dedicated accounts ledger revenue
  setEl('dash-rev-umrah',  _fmtCurrency(data.umrah_revenue || rev.umrah || 0, ''));

  setEl('dash-count-umrah',   (data.umrah_count || 0) + ' bkgs');
  setEl('dash-count-flights', rev.flights > 0 ? '\u2713 active' : '0 bkgs');
  setEl('dash-count-holiday', rev.holiday > 0 ? '\u2713 active' : '0 bkgs');
  setEl('dash-count-cruise',  rev.cruise  > 0 ? '\u2713 active' : '0 bkgs');
  setEl('dash-count-visa',    rev.visa    > 0 ? '\u2713 active' : '0 apps');
};

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// HOLIDAY MODULE \u2014 Admin Functions (isolated, all prefixed holiday_)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

let _holidayPackages   = [];
let _holidaySuppliers  = [];
let _hoCurrentPkgId    = null;

const HOLIDAY_POLICIES = [
  { key: 'flight_included',    icon: '\u2708', label: 'Flights',           detail: 'flight_details' },
  { key: 'visa_included',      icon: '\ud83d\udec2', label: 'Visa Service',      detail: 'visa_details' },
  { key: 'hotel_included',     icon: '\ud83c\udfe8', label: 'Accommodation',     detail: 'hotel_details' },
  { key: 'transfer_included',  icon: '\ud83d\ude8c', label: 'Airport Transfers',  detail: 'transfer_details' },
  { key: 'travel_insurance',   icon: '\ud83e\udc61', label: 'Travel Insurance',   detail: 'insurance_details' },
  { key: 'meals_included',     icon: '\ud83c\udf7d', label: 'Meals',             detail: 'meals_details' },
  { key: 'guide_included',     icon: '\ud83e\udd1d', label: 'Tour Guide',        detail: 'guide_details' },
];

// \u2500\u2500 Package Table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

window.holiday_adminLoadPackages = async function holiday_adminLoadPackages() {
  const tbody = document.getElementById('tbody-ho');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px">Loading\u2026</td></tr>';

  const data = await _adminFetch('/holiday/packages?limit=100');
  if (data && data.aborted) return;

  _holidayPackages = (data && data.data) || [];

  const sub = document.getElementById('ho-pkg-sub');
  if (sub) sub.textContent = _holidayPackages.length + ' package' + (_holidayPackages.length !== 1 ? 's' : '');

  if (!_holidayPackages.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--slate2)">No holiday packages yet. Click + Add Package to create one.</td></tr>';
    return;
  }
  holiday_renderPackageTable(_holidayPackages);
};

function holiday_renderPackageTable(pkgs) {
  const tbody = document.getElementById('tbody-ho');
  if (!tbody) return;

  const typeBadge = t => {
    const map = { luxury: 'b-gold', premium: 'b-blue', standard: 'b-slate' };
    return `<span class="badge ${map[t] || 'b-slate'}">${(t||'standard').charAt(0).toUpperCase()+(t||'standard').slice(1)}</span>`;
  };
  const stars = n => '\u2605'.repeat(Number(n || 0));

  tbody.innerHTML = pkgs.map(p => {
    let hotels = [];
    try { hotels = typeof p.hotels === 'string' ? JSON.parse(p.hotels) : (p.hotels || []); } catch {}
    let images = [];
    try { images = typeof p.gallery_images === 'string' ? JSON.parse(p.gallery_images) : (p.gallery_images || []); } catch {}

    return `
      <tr data-id="${p.id}" data-type="${p.package_type||''}" data-stars="${p.star_rating||0}" data-portal="${p.country_code}" data-status="${p.is_active}">
        <td class="semi">${p.name}</td>
        <td>${p.destination}</td>
        <td>${p.nights}N</td>
        <td style="color:var(--gold3)">${stars(p.star_rating)}</td>
        <td>${typeBadge(p.package_type)}</td>
        <td class="semi">${p.currency || 'AED'} ${Number(p.price_per_person).toLocaleString()}</td>
        <td style="text-align:center">${hotels.length || 0}</td>
        <td style="text-align:center">${images.length || 0}</td>
        <td>
          <select class="ss ${p.is_active ? 'ss-active' : 'ss-inactive'}" onchange="holiday_changeStatus(${p.id},this.value)">
            <option value="1" ${p.is_active ? 'selected' : ''}>Active</option>
            <option value="0" ${!p.is_active ? 'selected' : ''}>Inactive</option>
          </select>
        </td>
        <td class="td-actions">
          <button class="btn-icon" title="Edit" onclick="holiday_editPackage(${p.id})">\u270f</button>
          <button class="btn-icon" title="Images" onclick="holiday_openImageManager(${p.id})">\ud83d\uddbc</button>
          <button class="btn-icon" title="Delete" style="color:var(--red)" onclick="holiday_deletePackage(${p.id})">\ud83d\uddd1</button>
        </td>
      </tr>`;
  }).join('');
}

window.holiday_filterPackages = function holiday_filterPackages() {
  const srch   = (document.getElementById('ho-srch')?.value || '').toLowerCase();
  const type   = document.getElementById('ho-flt-type')?.value || '';
  const stars  = document.getElementById('ho-flt-stars')?.value || '';
  const portal = document.getElementById('ho-flt-portal')?.value || '';
  const status = document.getElementById('ho-flt-status')?.value;

  const filtered = _holidayPackages.filter(p => {
    if (srch   && !p.name?.toLowerCase().includes(srch) && !p.destination?.toLowerCase().includes(srch)) return false;
    if (type   && p.package_type !== type)    return false;
    if (stars  && Number(p.star_rating) < Number(stars)) return false;
    if (portal && p.country_code !== portal)  return false;
    if (status !== undefined && status !== '' && String(p.is_active) !== status) return false;
    return true;
  });

  holiday_renderPackageTable(filtered);
};

window.holiday_changeStatus = async function holiday_changeStatus(id, val) {
  await _adminFetch('/holiday/packages/' + id, {
    method: 'PUT',
    body: JSON.stringify({ is_active: Number(val) }),
  });
  if (typeof window.toast === 'function') window.toast('Status updated', 't-green');
};

window.holiday_deletePackage = async function holiday_deletePackage(id) {
  if (!confirm('Delete this holiday package? This cannot be undone.')) return;
  const res = await _adminFetch('/holiday/packages/' + id, { method: 'DELETE' });
  if (res && res.success !== false) {
    if (typeof window.toast === 'function') window.toast('Package deleted', 't-green');
    holiday_adminLoadPackages();
  } else {
    if (typeof window.toast === 'function') window.toast('Delete failed', 't-red');
  }
};

// \u2500\u2500 Package Form \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

window.holiday_openPackageModal = function holiday_openPackageModal() {
  document.getElementById('ho-modal-title').textContent = 'Add Holiday Package';
  document.getElementById('ho-pkg-id').value = '';
  document.getElementById('ho-pkg-form').reset();
  _hoCurrentPkgId = null;
  holiday_clearImagePreview();

  holiday_renderPoliciesUI({});
  holiday_renderHotelList([]);
  holiday_renderItineraryList([]);
  openModal('m-add-holiday');
};

window.holiday_editPackage = function holiday_editPackage(id) {
  const pkg = _holidayPackages.find(p => p.id === id);
  if (!pkg) return;
  _hoCurrentPkgId = id;

  document.getElementById('ho-modal-title').textContent = 'Edit Holiday Package';
  document.getElementById('ho-pkg-id').value        = id;
  document.getElementById('ho-name').value          = pkg.name || '';
  document.getElementById('ho-portal').value        = pkg.country_code || 'AE';
  document.getElementById('ho-type').value          = pkg.package_type || 'standard';
  document.getElementById('ho-destination').value   = pkg.destination || '';
  document.getElementById('ho-departure-city').value= pkg.departure_city || '';
  document.getElementById('ho-nights').value        = pkg.nights || 7;
  document.getElementById('ho-stars').value         = pkg.star_rating || 4;
  document.getElementById('ho-max-persons').value   = pkg.max_persons || 20;
  document.getElementById('ho-price').value         = pkg.price_per_person || '';
  document.getElementById('ho-meal').value          = pkg.meal_plan || 'bed_breakfast';
  document.getElementById('ho-status').value        = pkg.is_active ? '1' : '0';
  document.getElementById('ho-description').value   = pkg.description || '';

  holiday_clearImagePreview();

  let hotels = [];
  try { hotels = typeof pkg.hotels === 'string' ? JSON.parse(pkg.hotels) : (pkg.hotels || []); } catch {}
  let policies = {};
  try { policies = typeof pkg.policies === 'string' ? JSON.parse(pkg.policies) : (pkg.policies || {}); } catch {}
  let itinerary = [];
  try { itinerary = typeof pkg.itinerary === 'string' ? JSON.parse(pkg.itinerary) : (pkg.itinerary || []); } catch {}

  holiday_renderPoliciesUI(policies);
  holiday_renderHotelList(hotels);
  holiday_renderItineraryList(itinerary);
  openModal('m-add-holiday');
};

async function holiday_loadSuppliersIntoSelect(selectedId) {
  const sel = document.getElementById('ho-supplier');
  if (!sel) return;
  const data = await _adminFetch('/holiday/suppliers');
  _holidaySuppliers = (data && data.data) || [];
  sel.innerHTML = '<option value="">\u2014 No Supplier \u2014</option>' +
    _holidaySuppliers.map(s =>
      `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${s.name}</option>`
    ).join('');
}

// \u2500\u2500 Hotel Blocks \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function holiday_renderHotelList(hotels) {
  const container = document.getElementById('ho-hotel-list');
  if (!container) return;
  container.innerHTML = '';
  if (!hotels.length) { holiday_addHotelBlock(); return; }
  hotels.forEach((h, i) => holiday_addHotelBlock(h, i));
}

window.holiday_addHotelBlock = function holiday_addHotelBlock(data = {}, idx = null) {
  const container = document.getElementById('ho-hotel-list');
  if (!container) return;
  const i = idx !== null ? idx : container.children.length;
  const div = document.createElement('div');
  div.className = 'ho-hotel-block';
  div.dataset.idx = i;
  div.style.cssText = 'background:var(--surface2);border:1px solid var(--surface3);border-radius:var(--r);padding:14px;position:relative';
  div.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--gold3);margin-bottom:10px">Hotel ${i + 1}
      <button type="button" onclick="this.closest('.ho-hotel-block').remove();holiday_renumberHotels()" style="float:right;background:none;border:none;color:var(--red);cursor:pointer;font-size:16px">\u2715</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Hotel Name</label><input type="text" class="ho-h-name" value="${data.name||''}"></div>
      <div class="field"><label>Destination/City</label><input type="text" class="ho-h-dest" value="${data.destination||''}"></div>
      <div class="field"><label>Nights</label><input type="number" class="ho-h-nights" value="${data.nights||0}" min="0"></div>
      <div class="field"><label>Room Type</label><input type="text" class="ho-h-room" value="${data.room_type||''}"></div>
      <div class="field"><label>Meal Plan</label><select class="ho-h-meal">
        <option value="all_inclusive" ${data.meal_plan==='all_inclusive'?'selected':''}>All Inclusive</option>
        <option value="full_board" ${data.meal_plan==='full_board'?'selected':''}>Full Board</option>
        <option value="half_board" ${data.meal_plan==='half_board'?'selected':''}>Half Board</option>
        <option value="bed_breakfast" ${data.meal_plan==='bed_breakfast'?'selected':''}>B&amp;B</option>
        <option value="room_only" ${data.meal_plan==='room_only'?'selected':''}>Room Only</option>
      </select></div>
      <div class="field"><label>Stars</label><select class="ho-h-stars">
        ${[5,4,3,2].map(n=>`<option value="${n}" ${Number(data.stars||4)===n?'selected':''}>${'\u2605'.repeat(n)}</option>`).join('')}
      </select></div>
    </div>
    <div class="field" style="margin-top:8px"><label>Description</label><textarea class="ho-h-desc" rows="2">${data.description||''}</textarea></div>
  `;
  container.appendChild(div);
};

window.holiday_renumberHotels = function holiday_renumberHotels() {
  const blocks = document.querySelectorAll('.ho-hotel-block');
  blocks.forEach((b, i) => {
    const title = b.querySelector('div');
    if (title) title.childNodes[0].textContent = `Hotel ${i + 1}\n`;
  });
};

function holiday_collectHotels() {
  const blocks = document.querySelectorAll('.ho-hotel-block');
  return Array.from(blocks).map((b, i) => ({
    order:       i + 1,
    name:        b.querySelector('.ho-h-name')?.value || '',
    destination: b.querySelector('.ho-h-dest')?.value || '',
    nights:      Number(b.querySelector('.ho-h-nights')?.value || 0),
    room_type:   b.querySelector('.ho-h-room')?.value || '',
    meal_plan:   b.querySelector('.ho-h-meal')?.value || '',
    stars:       Number(b.querySelector('.ho-h-stars')?.value || 4),
    description: b.querySelector('.ho-h-desc')?.value || '',
  }));
}

// \u2500\u2500 Policies UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function holiday_renderPoliciesUI(policies) {
  const container = document.getElementById('ho-policies-list');
  if (!container) return;
  container.innerHTML = HOLIDAY_POLICIES.map(pol => {
    const enabled = policies[pol.key] === true || policies[pol.key] === 1;
    const detail  = policies[pol.detail] || '';
    return `
      <div style="border:1px solid var(--surface3);border-radius:var(--r);padding:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:${enabled?'8px':'0'}">
          <span style="font-size:18px">${pol.icon}</span>
          <span style="flex:1;font-size:14px;font-weight:600">${pol.label}</span>
          <label class="toggle-switch">
            <input type="checkbox" id="pol-${pol.key}" ${enabled?'checked':''} onchange="holiday_togglePolicyDetail('${pol.key}','${pol.detail}')">
            <span class="toggle-thumb"></span>
          </label>
        </div>
        <div id="pol-detail-${pol.key}" style="display:${enabled?'block':'none'}">
          <textarea id="pol-text-${pol.detail}" rows="2" placeholder="Details (optional)\u2026" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--surface3);border-radius:6px;font-size:13px;background:var(--surface2);color:var(--ink)">${detail}</textarea>
        </div>
      </div>`;
  }).join('');

  // Cancellation policy
  const canc = policies.cancellation_policy || '';
  container.insertAdjacentHTML('beforeend', `
    <div style="grid-column:1/-1">
      <div class="field"><label>Cancellation Policy</label><textarea id="pol-cancellation" rows="2" placeholder="e.g. Free cancellation up to 30 days before departure\u2026">${canc}</textarea></div>
    </div>
  `);
}

window.holiday_togglePolicyDetail = function holiday_togglePolicyDetail(key, detailKey) {
  const checked = document.getElementById('pol-' + key)?.checked;
  const detail  = document.getElementById('pol-detail-' + key);
  if (detail) detail.style.display = checked ? 'block' : 'none';
};

function holiday_collectPolicies() {
  const pol = {};
  HOLIDAY_POLICIES.forEach(p => {
    pol[p.key]    = document.getElementById('pol-' + p.key)?.checked || false;
    pol[p.detail] = document.getElementById('pol-text-' + p.detail)?.value || '';
  });
  pol.cancellation_policy = document.getElementById('pol-cancellation')?.value || '';
  return pol;
}

// \u2500\u2500 Itinerary Builder \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function holiday_renderItineraryList(days) {
  const container = document.getElementById('ho-itinerary-list');
  if (!container) return;
  container.innerHTML = '';
  days.forEach((d, i) => holiday_addItineraryDay(d, i));
}

window.holiday_addItineraryDay = function holiday_addItineraryDay(data = {}, idx = null) {
  const container = document.getElementById('ho-itinerary-list');
  if (!container) return;
  const i = idx !== null ? idx : container.children.length;
  const acts = Array.isArray(data.activities) ? data.activities.join(', ') : (data.activities || '');
  const meals = data.meals || [];
  const div = document.createElement('div');
  div.className = 'ho-itin-day';
  div.style.cssText = 'background:var(--surface2);border:1px solid var(--surface3);border-radius:var(--r);padding:14px';
  div.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--slate2);margin-bottom:10px">Day ${i + 1}
      <button type="button" onclick="this.closest('.ho-itin-day').remove();holiday_renumberDays()" style="float:right;background:none;border:none;color:var(--red);cursor:pointer;font-size:16px">\u2715</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="field"><label>Title</label><input type="text" class="ho-d-title" value="${data.title||''}"></div>
      <div class="field"><label>Accommodation</label><input type="text" class="ho-d-accom" value="${data.accommodation||''}"></div>
    </div>
    <div class="field" style="margin-top:8px"><label>Description</label><textarea class="ho-d-desc" rows="2">${data.description||''}</textarea></div>
    <div class="field" style="margin-top:8px"><label>Activities (comma-separated)</label><input type="text" class="ho-d-acts" value="${acts}"></div>
    <div style="margin-top:8px;display:flex;gap:16px;align-items:center">
      <span style="font-size:13px;color:var(--slate2)">Meals:</span>
      ${['Breakfast','Lunch','Dinner'].map(m=>`<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" class="ho-d-meal" value="${m}" ${meals.includes(m)?'checked':''}> ${m}</label>`).join('')}
    </div>
  `;
  container.appendChild(div);
};

window.holiday_renumberDays = function holiday_renumberDays() {
  document.querySelectorAll('.ho-itin-day').forEach((d, i) => {
    const title = d.querySelector('div');
    if (title) title.childNodes[0].textContent = `Day ${i + 1}\n`;
  });
};

function holiday_collectItinerary() {
  return Array.from(document.querySelectorAll('.ho-itin-day')).map((d, i) => ({
    day:           i + 1,
    title:         d.querySelector('.ho-d-title')?.value || '',
    description:   d.querySelector('.ho-d-desc')?.value  || '',
    activities:    (d.querySelector('.ho-d-acts')?.value || '').split(',').map(s=>s.trim()).filter(Boolean),
    accommodation: d.querySelector('.ho-d-accom')?.value || '',
    meals:         Array.from(d.querySelectorAll('.ho-d-meal:checked')).map(c => c.value),
  }));
}

// \u2500\u2500 Submit Package \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

window.holiday_submitPackage = async function holiday_submitPackage() {
  const id     = document.getElementById('ho-pkg-id').value;
  const portal = document.getElementById('ho-portal').value;

  const nameVal = document.getElementById('ho-name').value.trim();
  const priceVal = document.getElementById('ho-price').value;
  if (!nameVal) { if (typeof window.toast === 'function') window.toast('Package name is required', 't-red'); return; }
  if (!priceVal) { if (typeof window.toast === 'function') window.toast('Price per person is required', 't-red'); return; }

  const btn = document.getElementById('ho-save-btn');
  if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

  const payload = {
    name:             nameVal,
    portal_country:   portal,
    currency:         portal === 'PK' ? 'PKR' : 'AED',
    package_type:     document.getElementById('ho-type').value,
    destination:      document.getElementById('ho-destination').value,
    departure_city:   document.getElementById('ho-departure-city').value,
    nights:           Number(document.getElementById('ho-nights').value),
    star_rating:      Number(document.getElementById('ho-stars').value),
    max_persons:      Number(document.getElementById('ho-max-persons').value),
    price_per_person: Number(priceVal),
    meal_plan:        document.getElementById('ho-meal').value,
    is_active:        document.getElementById('ho-status').value === '1',
    description:      document.getElementById('ho-description').value,
    hotels:           JSON.stringify(holiday_collectHotels()),
    policies:         JSON.stringify(holiday_collectPolicies()),
    itinerary:        JSON.stringify(holiday_collectItinerary()),
  };

  try {
    const url    = id ? '/holiday/packages/' + id : '/holiday/packages';
    const method = id ? 'PUT' : 'POST';
    const data   = await _adminFetch(url, { method, body: JSON.stringify(payload) });

    if (!data || !data.data) {
      throw new Error(data?.message || data?.error || 'Save failed');
    }

    const pkgId = data.data.id || id;

    // Upload images if any were selected
    const imgInput = document.getElementById('ho-img-files');
    if (imgInput?.files?.length) {
      await holiday_uploadImagesToPackage(pkgId, imgInput.files);
    }

    if (typeof window.toast === 'function') window.toast(id ? 'Package updated' : 'Package created', 't-green');
    closeModal('m-add-holiday');
    holiday_adminLoadPackages();
  } catch (err) {
    if (typeof window.toast === 'function') window.toast(err.message || 'Save failed', 't-red');
  } finally {
    if (btn) { btn.textContent = 'Save Package'; btn.disabled = false; }
  }
};

// ── Image preview in Add/Edit form ───────────────────────────────────────────

window.holiday_previewImages = function holiday_previewImages(input) {
  const grid = document.getElementById('ho-img-preview-grid');
  if (!grid) return;
  const files = Array.from(input.files).slice(0, 15);
  grid.innerHTML = '';
  files.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;border:2px solid var(--surface3)';
      if (i === 0) {
        wrap.style.borderColor = 'var(--gold)';
        wrap.title = 'Cover photo';
      }
      wrap.innerHTML = `
        <img src="${e.target.result}" style="width:100%;height:80px;object-fit:cover;display:block">
        ${i === 0 ? '<div style="position:absolute;top:3px;left:3px;background:var(--gold);color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px">COVER</div>' : ''}
      `;
      grid.appendChild(wrap);
    };
    reader.readAsDataURL(file);
  });
};

window.holiday_clearImagePreview = function holiday_clearImagePreview() {
  const grid  = document.getElementById('ho-img-preview-grid');
  const input = document.getElementById('ho-img-files');
  if (grid)  grid.innerHTML = '';
  if (input) input.value   = '';
};

async function holiday_uploadImagesToPackage(pkgId, files) {
  const formData = new FormData();
  Array.from(files).forEach(f => formData.append('images', f));
  try {
    const res = await fetch(_adminApiBase() + '/holiday/packages/' + pkgId + '/images', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + _adminToken() },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) console.warn('[holiday] image upload failed:', json.message);
  } catch (err) {
    console.warn('[holiday] image upload error:', err.message);
  }
}

// \u2500\u2500 Image Manager \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

window.holiday_openImageManager = async function holiday_openImageManager(pkgId) {
  _hoCurrentPkgId = pkgId;
  const pkg = _holidayPackages.find(p => p.id === pkgId);
  const titleEl = document.getElementById('ho-img-modal-title');
  if (titleEl) titleEl.textContent = 'Image Gallery \u2014 ' + (pkg?.name || 'Package');

  await holiday_refreshImageGrid(pkgId);
  openModal('m-ho-images');
};

async function holiday_refreshImageGrid(pkgId) {
  const data = await _adminFetch('/holiday/packages/' + pkgId);
  const pkg  = data?.data;
  const grid = document.getElementById('ho-img-grid');
  if (!grid) return;

  let images = [];
  try { images = typeof pkg?.gallery_images === 'string' ? JSON.parse(pkg.gallery_images) : (pkg?.gallery_images || []); } catch {}

  if (!images.length) {
    grid.innerHTML = '<div style="color:var(--slate2);font-size:13px;text-align:center;padding:20px;grid-column:1/-1">No images yet. Upload some above.</div>';
    return;
  }

  const base = _adminApiBase().replace('/v1', '');
  grid.innerHTML = images.map((img, i) => `
    <div style="position:relative;border-radius:var(--r);overflow:hidden;border:2px solid ${img.is_featured?'var(--gold)':'var(--surface3)'}">
      <img src="${img.url?.startsWith('http') ? img.url : base + img.url}" style="width:100%;height:110px;object-fit:cover;display:block" onerror="this.style.background='var(--surface2)'">
      ${img.is_featured ? '<div style="position:absolute;top:4px;left:4px;background:var(--gold);color:var(--ink);font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px">PRIMARY</div>' : ''}
      <div style="display:flex;gap:4px;padding:6px;background:var(--surface)">
        ${!img.is_featured ? `<button class="btn-icon" title="Set as primary" onclick="holiday_setImagePrimary(${pkgId},${i})" style="flex:1;font-size:10px">\u2b50 Primary</button>` : ''}
        <button class="btn-icon" title="Delete" onclick="holiday_deleteImage(${pkgId},${i})" style="color:var(--red);font-size:12px">\ud83d\uddd1</button>
      </div>
    </div>
  `).join('');
}

window.holiday_uploadImages = async function holiday_uploadImages(input) {
  const pkgId = _hoCurrentPkgId;
  if (!pkgId || !input.files?.length) return;

  const formData = new FormData();
  Array.from(input.files).forEach(f => formData.append('images', f));

  try {
    const res = await fetch(_adminApiBase() + '/holiday/packages/' + pkgId + '/images', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + _adminToken() },
      body: formData,
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (typeof window.toast === 'function') window.toast('Images uploaded', 't-green');
      await holiday_refreshImageGrid(pkgId);
      holiday_adminLoadPackages();
    } else {
      if (typeof window.toast === 'function') window.toast(data.message || 'Upload failed', 't-red');
    }
  } catch {
    if (typeof window.toast === 'function') window.toast('Upload failed', 't-red');
  }
  input.value = '';
};

window.holiday_setImagePrimary = async function holiday_setImagePrimary(pkgId, idx) {
  const data = await _adminFetch('/holiday/packages/' + pkgId + '/images/' + idx + '/primary', { method: 'PATCH', body: '{}' });
  if (data && data.success) {
    await holiday_refreshImageGrid(pkgId);
  }
};

window.holiday_deleteImage = async function holiday_deleteImage(pkgId, idx) {
  if (!confirm('Remove this image?')) return;
  const res = await fetch(_adminApiBase() + '/holiday/packages/' + pkgId + '/images/' + idx, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + _adminToken() },
  });
  if (res.ok || res.status === 200) {
    await holiday_refreshImageGrid(pkgId);
    holiday_adminLoadPackages();
    if (typeof window.toast === 'function') window.toast('Image removed', 't-green');
  } else {
    if (typeof window.toast === 'function') window.toast('Remove failed', 't-red');
  }
};

// \u2500\u2500 Bookings Tab \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

window.holiday_adminLoadBookings = async function holiday_adminLoadBookings() {
  const tbody = document.getElementById('tbody-ho-bookings');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Loading\u2026</td></tr>';

  const data = await _adminFetch('/holiday/bookings');
  if (data && data.aborted) return;
  const rows = (data && data.data) || [];

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--slate2)">No holiday bookings found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(b => {
    const statusMap = { confirmed:'ss-confirmed', pending:'ss-pending', on_hold:'ss-hold', cancelled:'ss-cancelled', rejected:'ss-cancelled' };
    const sc = statusMap[b.status] || 'ss-pending';
    const guests = `${b.num_adults}A${b.num_children?', '+b.num_children+'C':''}${b.num_infants?', '+b.num_infants+'I':''}`;
    return `
      <tr>
        <td class="td-mono">${b.reference}</td>
        <td>${b.customer_name}<br><span class="fs12 slate2">${b.customer_email||''}</span></td>
        <td class="semi">${b.package_name}</td>
        <td>${b.check_in_date ? new Date(b.check_in_date).toLocaleDateString() : '\u2014'}</td>
        <td>${guests}</td>
        <td class="semi">${b.currency||'AED'} ${Number(b.amount).toLocaleString()}</td>
        <td>${b.created_at ? new Date(b.created_at).toLocaleDateString() : '\u2014'}</td>
        <td>
          <select class="ss ${sc}" onchange="holiday_updateBookingStatus(${b.id},this.value)">
            ${['pending','confirmed','on_hold','cancelled'].map(s=>`<option value="${s}" ${b.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
          </select>
        </td>
        <td class="td-actions">
          <button class="btn-icon" onclick="holiday_viewBooking(${b.id})">\ud83d\udc41\ufe0f</button>
        </td>
      </tr>`;
  }).join('');
};

window.holiday_viewBooking = async function holiday_viewBooking(id) {
  const data = await _adminFetch('/holiday/bookings/' + id);
  const b    = data?.data;
  if (!b) return;

  const body = document.getElementById('ho-booking-detail-body');
  if (!body) return;

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="field"><label>Reference</label><div class="semi td-mono">${b.reference}</div></div>
      <div class="field"><label>Status</label><div class="semi upper">${b.status}</div></div>
      <div class="field"><label>Customer</label><div class="semi">${b.customer_name}</div></div>
      <div class="field"><label>Email</label><div>${b.customer_email||'\u2014'}</div></div>
      <div class="field"><label>Phone</label><div>${b.customer_phone||'\u2014'}</div></div>
      <div class="field"><label>Package</label><div class="semi">${b.package_name}</div></div>
      <div class="field"><label>Destination</label><div>${b.destination||'\u2014'}</div></div>
      <div class="field"><label>Nights</label><div>${b.nights||'\u2014'}</div></div>
      <div class="field"><label>Check-in</label><div>${b.check_in_date ? new Date(b.check_in_date).toLocaleDateString() : '\u2014'}</div></div>
      <div class="field"><label>Check-out</label><div>${b.check_out_date ? new Date(b.check_out_date).toLocaleDateString() : '\u2014'}</div></div>
      <div class="field"><label>Adults</label><div>${b.num_adults}</div></div>
      <div class="field"><label>Children / Infants</label><div>${b.num_children} / ${b.num_infants}</div></div>
      <div class="field"><label>Room Type</label><div>${b.room_type||'\u2014'}</div></div>
      <div class="field"><label>Total Amount</label><div class="semi">${b.currency||'AED'} ${Number(b.amount).toLocaleString()}</div></div>
      <div class="field" style="grid-column:span 2"><label>Special Requests</label><div style="color:var(--slate)">${b.special_requests||'None'}</div></div>
      ${b.stripe_payment_intent_id ? `<div class="field" style="grid-column:span 2"><label>Payment Ref</label><div class="td-mono fs13">${b.stripe_payment_intent_id}</div></div>` : ''}
    </div>
  `;
  openModal('m-view-ho-booking');
};

window.holiday_updateBookingStatus = async function holiday_updateBookingStatus(id, status) {
  const data = await _adminFetch('/holiday/bookings/' + id + '/status', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (data && data.success !== false) {
    if (typeof window.toast === 'function') window.toast('Status updated', 't-green');
  } else {
    if (typeof window.toast === 'function') window.toast('Update failed', 't-red');
    holiday_adminLoadBookings();
  }
};

// \u2500\u2500 Suppliers Tab \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

window.holiday_adminLoadSuppliers = async function holiday_adminLoadSuppliers() {
  const tbody = document.getElementById('tbody-ho-suppliers');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Loading\u2026</td></tr>';

  const data = await _adminFetch('/holiday/suppliers');
  if (data && data.aborted) return;
  _holidaySuppliers = (data && data.data) || [];

  if (!_holidaySuppliers.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--slate2)">No suppliers yet. Click + Add Supplier to add one.</td></tr>';
    return;
  }

  tbody.innerHTML = _holidaySuppliers.map(s => `
    <tr>
      <td class="semi">${s.name}</td>
      <td>${s.contact_name||'\u2014'}<br><span class="fs12 slate2">${s.email||''}</span></td>
      <td>${s.country_code === 'AE' ? '\ud83c\udde6\ud83c\uddea UAE' : '\ud83c\uddf5\ud83c\uddf0 Pakistan'}</td>
      <td>${Number(s.commission_pct||0)}%</td>
      <td>${s.contract_start ? new Date(s.contract_start).toLocaleDateString() : '\u2014'} \u2192 ${s.contract_end ? new Date(s.contract_end).toLocaleDateString() : '\u2014'}</td>
      <td style="text-align:center">${s.packages_count||0}</td>
      <td><span class="badge ${s.is_active?'b-green':'b-slate'}">${s.is_active?'Active':'Inactive'}</span></td>
      <td class="td-actions">
        <button class="btn-icon" onclick="holiday_editSupplier(${s.id})">\u270f</button>
      </td>
    </tr>
  `).join('');
};

window.holiday_openSupplierModal = function holiday_openSupplierModal() {
  document.getElementById('ho-supp-modal-title').textContent = 'Add Supplier';
  document.getElementById('ho-supp-form').reset();
  document.getElementById('ho-supp-id').value = '';
  openModal('m-add-ho-supplier');
};

window.holiday_editSupplier = function holiday_editSupplier(id) {
  const s = _holidaySuppliers.find(x => x.id === id);
  if (!s) return;
  document.getElementById('ho-supp-modal-title').textContent = 'Edit Supplier';
  document.getElementById('ho-supp-id').value        = s.id;
  document.getElementById('ho-supp-name').value      = s.name || '';
  document.getElementById('ho-supp-contact').value   = s.contact_name || '';
  document.getElementById('ho-supp-email').value     = s.email || '';
  document.getElementById('ho-supp-phone').value     = s.phone || '';
  document.getElementById('ho-supp-country').value   = s.country_code || 'AE';
  document.getElementById('ho-supp-commission').value= s.commission_pct || 0;
  document.getElementById('ho-supp-status').value    = s.is_active ? '1' : '0';
  document.getElementById('ho-supp-start').value     = s.contract_start ? s.contract_start.split('T')[0] : '';
  document.getElementById('ho-supp-end').value       = s.contract_end   ? s.contract_end.split('T')[0]   : '';
  document.getElementById('ho-supp-notes').value     = s.notes || '';
  openModal('m-add-ho-supplier');
};

window.holiday_submitSupplier = async function holiday_submitSupplier() {
  const id = document.getElementById('ho-supp-id').value;
  const payload = {
    name:           document.getElementById('ho-supp-name').value,
    contact_name:   document.getElementById('ho-supp-contact').value,
    email:          document.getElementById('ho-supp-email').value,
    phone:          document.getElementById('ho-supp-phone').value,
    country_code:   document.getElementById('ho-supp-country').value,
    commission_pct: Number(document.getElementById('ho-supp-commission').value || 0),
    is_active:      document.getElementById('ho-supp-status').value === '1',
    contract_start: document.getElementById('ho-supp-start').value || null,
    contract_end:   document.getElementById('ho-supp-end').value   || null,
    notes:          document.getElementById('ho-supp-notes').value,
  };

  const url    = id ? '/holiday/suppliers/' + id : '/holiday/suppliers';
  const method = id ? 'PUT' : 'POST';

  const data = await _adminFetch(url, { method, body: JSON.stringify(payload) });
  if (data && data.data) {
    if (typeof window.toast === 'function') window.toast(id ? 'Supplier updated' : 'Supplier added', 't-green');
    closeModal('m-add-ho-supplier');
    holiday_adminLoadSuppliers();
  } else {
    if (typeof window.toast === 'function') window.toast(data?.message || 'Save failed', 't-red');
  }
};
