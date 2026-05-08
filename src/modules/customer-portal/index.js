(function() {
  const moduleName = 'customer-portal';
  
  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules[moduleName] = {
    mount(target) {
      if (!target) return;
      // Initialize if needed
    }
  };

  window.openCustomerPortal = async function(tab = 'profile') {
    if (typeof window.isCustomerSession === 'function' && !window.isCustomerSession()) {
      if (typeof window.openAuthModal === 'function') window.openAuthModal('customer');
      return;
    }

    if (typeof window.openModal === 'function') {
      window.openModal('m-customer-portal');
    } else {
      document.getElementById('m-customer-portal').classList.add('open');
    }

    await loadPortalData();
    switchPortalTab(tab);
  };

  async function loadPortalData() {
    try {
      const response = await fetch(`${window.KEENAN_CONFIG?.apiBaseUrl || 'http://localhost:3000/v1'}/customers/me/bookings`, {
        headers: { 'Authorization': `Bearer ${getStoredToken()}` }
      });
      const bookings = await response.json();
      
      const meResponse = await fetch(`${window.KEENAN_CONFIG?.apiBaseUrl || 'http://localhost:3000/v1'}/auth/me`, {
        headers: { 'Authorization': `Bearer ${getStoredToken()}` }
      });
      const meData = await meResponse.json();
      const user = meData.user;

      updatePortalUI(user, bookings.data || []);
    } catch (err) {
      console.error('Portal load error:', err);
      if (typeof window.toast === 'function') window.toast('Failed to load profile data', 't-red');
    }
  }

  function getStoredToken() {
    try {
      return JSON.parse(localStorage.getItem('keenanTravelSession') || '{}')?.token || '';
    } catch { return ''; }
  }

  function updatePortalUI(user, bookings) {
    const apiBase = (window.KEENAN_CONFIG?.apiBaseUrl || 'http://localhost:3000/v1').replace('/v1', '');
    
    // Header & Sidebar
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
    document.getElementById('portal-display-name').textContent = name;
    
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('portal-avatar-initials').textContent = initials;
    
    const imgEl = document.getElementById('portal-avatar-img');
    const initialsEl = document.getElementById('portal-avatar-initials');
    
    if (user.profile_picture) {
      imgEl.src = user.profile_picture.startsWith('http') ? user.profile_picture : `${apiBase}${user.profile_picture}`;
      imgEl.style.display = 'block';
      initialsEl.style.display = 'none';
    } else {
      imgEl.style.display = 'none';
      initialsEl.style.display = 'block';
    }

    // Profile Form
    const form = document.getElementById('portal-profile-form');
    if (form) {
      form.first_name.value = user.first_name || '';
      form.last_name.value = user.last_name || '';
      form.email.value = user.email || '';
      form.phone.value = user.phone || '';
      form.address.value = user.address || '';
    }

    // Account Stats
    document.getElementById('portal-stat-count').textContent = bookings.length;
    const total = bookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    document.getElementById('portal-stat-spend').textContent = `AED ${total.toLocaleString()}`;

    // History Table
    const tbody = document.getElementById('portal-history-body');
    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--slate2)">No history found.</td></tr>';
    } else {
      tbody.innerHTML = bookings.map((b, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="td-mono">${b.reference}</td>
          <td class="semi">${b.service_name || b.service_type}</td>
          <td>${b.currency || 'AED'} ${Number(b.amount).toLocaleString()}</td>
          <td>${new Date(b.created_at).toLocaleDateString()}</td>
          <td><span class="badge ${getStatusClass(b.status)}">${b.status.toUpperCase()}</span></td>
          <td><span class="badge ${getPaymentStatusClass(b.payment_status)}">${(b.payment_status || 'pending').toUpperCase()}</span></td>
        </tr>
      `).join('');
    }
  }

  function getStatusClass(status) {
    if (status === 'confirmed') return 'b-green';
    if (status === 'pending') return 'b-gold';
    if (status === 'cancelled') return 'b-red';
    return 'b-slate';
  }

  function getPaymentStatusClass(status) {
    if (status === 'received') return 'b-green';
    if (status === 'pending') return 'b-gold';
    if (status === 'cancelled') return 'b-red';
    return 'b-slate';
  }

  window.switchPortalTab = function(tab) {
    document.querySelectorAll('.pn-item').forEach(el => el.classList.remove('act'));
    document.querySelector(`.pn-item[data-tab="${tab}"]`)?.classList.add('act');
    
    document.querySelectorAll('.portal-tab-view').forEach(el => el.classList.remove('act'));
    document.getElementById(`pt-${tab}`).classList.add('act');
    
    document.getElementById('portal-tab-title').textContent = tab === 'profile' ? 'My Profile' : 'My Account';
  };

  window.handleAvatarUpload = async function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const session = JSON.parse(localStorage.getItem('keenanTravelSession') || '{}');
      const userId = session.user?.id;
      if (!userId) throw new Error('User not found in session');

      const response = await fetch(`${window.KEENAN_CONFIG?.apiBaseUrl || 'http://localhost:3000/v1'}/customers/${userId}/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.token}` },
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        // Update Session via integration.js helper for state sync
        session.user.profile_picture = result.profile_picture;
        if (typeof window.persistSession === 'function') {
          window.persistSession(session);
        } else {
          localStorage.setItem('keenanTravelSession', JSON.stringify(session));
          if (typeof window.updateSessionUi === 'function') window.updateSessionUi();
        }
        
        await loadPortalData();
        if (typeof window.toast === 'function') window.toast('Profile picture updated!', 't-green');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      if (typeof window.toast === 'function') window.toast(err.message, 't-red');
    }
  };

  window.submitProfileUpdate = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('profile-save-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const form = e.target;
    const payload = {
      first_name: form.first_name.value,
      last_name: form.last_name.value,
      phone: form.phone.value,
      address: form.address.value
    };

    try {
      const session = JSON.parse(localStorage.getItem('keenanTravelSession') || '{}');
      const userId = session.user?.id;
      
      const response = await fetch(`${window.KEENAN_CONFIG?.apiBaseUrl || 'http://localhost:3000/v1'}/customers/${userId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (response.ok) {
        // Update Session via integration.js helper for state sync
        session.user = { ...session.user, ...result.data };
        if (typeof window.persistSession === 'function') {
          window.persistSession(session);
        } else {
          localStorage.setItem('keenanTravelSession', JSON.stringify(session));
          if (typeof window.updateSessionUi === 'function') window.updateSessionUi();
        }
        
        if (typeof window.toast === 'function') window.toast('Profile updated successfully!', 't-green');
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      if (typeof window.toast === 'function') window.toast(err.message, 't-red');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };
})();
