(function() {
  const moduleName = 'page-umrah-detail';
  let currentPackage = null;
  let currentSlideIdx = 0;
  let images = [];

  window.loadUmrahDetail = async function(id) {
    // Reset state
    currentSlideIdx = 0;
    document.getElementById('ud-title').textContent = 'Loading Package...';
    document.getElementById('ud-booking-form').reset();
    
    try {
      const response = await fetch(`${window.apiBase || 'http://localhost:3000/v1'}/umrah/packages/${id}`);
      const result = await response.json();
      
      if (result && result.data) {
        currentPackage = result.data;
        renderPackageDetails(currentPackage);
      } else {
        throw new Error('Package not found');
      }
    } catch (err) {
      console.error('Failed to load Umrah package:', err);
      if (typeof window.toast === 'function') window.toast('Failed to load package details', 't-red');
      go('results-umrah');
    }
  };

  function renderPackageDetails(pkg) {
    // Basic Info
    document.getElementById('ud-breadcrumb-name').textContent = pkg.name;
    document.getElementById('ud-title').textContent = pkg.name;
    document.getElementById('ud-subtitle').textContent = `${pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)} • ${pkg.nights} Nights Journey`;
    
    document.getElementById('ud-nights').textContent = `${pkg.nights} Nights`;
    document.getElementById('ud-makkah').textContent = pkg.makkah_hotel || 'N/A';
    document.getElementById('ud-madinah').textContent = pkg.madinah_hotel || 'N/A';
    document.getElementById('ud-transport').textContent = pkg.transport_type.charAt(0).toUpperCase() + pkg.transport_type.slice(1);
    
    document.getElementById('ud-description').textContent = pkg.description || 'Experience a spiritual journey like no other with our carefully curated Umrah package.';
    
    // Inclusions visibility
    document.getElementById('ud-inc-visa').style.opacity = pkg.visa_included ? '1' : '0.4';
    document.getElementById('ud-inc-flights').style.opacity = pkg.flights_included ? '1' : '0.4';

    // Pricing
    const price = Number(pkg.price_per_person || 0);
    document.getElementById('ud-currency').textContent = pkg.currency || 'AED';
    document.getElementById('ud-unit-price').textContent = price.toLocaleString();
    
    // Reset pilgrims counter
    document.getElementById('ud-pilgrims').value = 1;
    updatePricingUI();

    // Slider
    try {
      images = typeof pkg.images === 'string' ? JSON.parse(pkg.images) : (pkg.images || []);
    } catch(e) {
      images = [];
    }
    renderSlider();
  }

  function renderSlider() {
    const slidesCont = document.getElementById('ud-slides');
    const dotsCont = document.getElementById('ud-dots');
    if (!slidesCont || !dotsCont) return;

    if (images.length === 0) {
      slidesCont.innerHTML = `<div class="ud-slide active" style="background-image: url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200')"></div>`;
      dotsCont.innerHTML = '';
      return;
    }

    slidesCont.innerHTML = images.map((img, i) => {
      const fullUrl = img.startsWith('http') ? img : `${(window.apiBase || 'http://localhost:3000/v1').replace('/v1', '')}${img}`;
      return `<div class="ud-slide ${i === 0 ? 'active' : ''}" style="background-image: url('${fullUrl}')"></div>`;
    }).join('');

    dotsCont.innerHTML = images.map((_, i) => `<div class="ud-dot ${i === 0 ? 'active' : ''}" onclick="udGoToSlide(${i})"></div>`).join('');
  }

  window.udGoToSlide = function(idx) {
    const slides = document.querySelectorAll('.ud-slide');
    const dots = document.querySelectorAll('.ud-dot');
    if (idx < 0 || idx >= slides.length) return;

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    slides[idx].classList.add('active');
    dots[idx].classList.add('active');
    currentSlideIdx = idx;
  };

  window.udNextSlide = function() {
    let next = currentSlideIdx + 1;
    if (next >= images.length) next = 0;
    udGoToSlide(next);
  };

  window.udPrevSlide = function() {
    let prev = currentSlideIdx - 1;
    if (prev < 0) prev = images.length - 1;
    udGoToSlide(prev);
  };

  window.udChangePilgrims = function(delta) {
    const input = document.getElementById('ud-pilgrims');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
    updatePricingUI();
  };

  function updatePricingUI() {
    const count = parseInt(document.getElementById('ud-pilgrims').value);
    const unitPrice = Number(currentPackage?.price_per_person || 0);
    const total = unitPrice * count;
    const currency = currentPackage?.currency || 'AED';

    document.getElementById('ud-count-label').textContent = count;
    document.getElementById('ud-base-total').textContent = `${currency} ${total.toLocaleString()}`;
    document.getElementById('ud-grand-total').textContent = `${currency} ${total.toLocaleString()}`;
  }

  window.handleUdBooking = async function(e) {
    e.preventDefault();
    
    if (!window.isCustomerSession()) {
      if (typeof window.toast === 'function') window.toast('Please sign in to book this package', 't-gold');
      if (typeof window.openAuthModal === 'function') window.openAuthModal('login');
      return;
    }

    const btn = document.getElementById('ud-submit-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    const payload = {
      package_id: currentPackage.id,
      pilgrims: parseInt(document.getElementById('ud-pilgrims').value),
      first_name: document.getElementById('ud-form-name').value.split(' ')[0],
      last_name: document.getElementById('ud-form-name').value.split(' ').slice(1).join(' ') || '.',
      email: document.getElementById('ud-form-email').value,
      phone: document.getElementById('ud-form-phone').value,
      notes: document.getElementById('ud-form-notes').value,
      departure_city: 'Dubai', // Default or could be a field
      travel_date: new Date().toISOString().split('T')[0] // Default
    };

    try {
      const isLogged = window.isCustomerSession();
      const session = JSON.parse(localStorage.getItem('keenanTravelSession') || '{}');
      const apiBase = window.getApiBaseUrl ? window.getApiBaseUrl() : 'http://localhost:3000/v1';
      
      const endpoint = isLogged ? `${apiBase}/umrah/bookings` : `${apiBase}/umrah/public/bookings`;
      const headers = { 'Content-Type': 'application/json' };
      if (isLogged && session.token) headers['Authorization'] = `Bearer ${session.token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (typeof window.toast === 'function') window.toast('Booking request submitted! We will contact you soon.', 't-green');
        document.getElementById('ud-booking-form').reset();
        // Redirect to confirmation or home
        setTimeout(() => go('home'), 2000);
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Booking error:', err);
      if (typeof window.toast === 'function') window.toast(err.message, 't-red');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };

  // Register module
  window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
  window.KeenanFrontend.modules[moduleName] = {
    mount: (target) => {
      // Dispatch ready event for initial routing
      window.dispatchEvent(new CustomEvent('umrah-detail-ready'));
    }
  };
})();
