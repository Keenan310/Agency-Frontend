window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["page-admin"] = {
  type: "page",
  mount(root) {
    if (!root) return;
    root.dataset.module = "page-admin";
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
