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
