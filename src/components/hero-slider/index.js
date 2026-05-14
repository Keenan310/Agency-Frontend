window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["hero-slider"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "hero-slider";
    initAutocomplete(root);
  },
};

function initAutocomplete(root) {
  // Legacy autocomplete removed in favor of centralized flight service autocomplete
}

function renderResults(input, container, items) {
  // Legacy autocomplete removed
}
// Global functions for inline event handlers in hero-slider/index.html
window.KT_PAX_COUNTS = { adult: 1, child: 0, infant: 0 };

window.handleTripTypeChange = function(el) {
  document.querySelectorAll('.tt-opt').forEach(lbl => lbl.classList.remove('sel'));
  el.parentElement.classList.add('sel');
  
  const retDate = document.getElementById('flight-ret-date');
  if (retDate) {
    if (el.value === 'o') {
      retDate.disabled = true;
      retDate.style.opacity = '0.5';
      retDate.value = '';
    } else {
      retDate.disabled = false;
      retDate.style.opacity = '1';
      window.validateDates();
    }
  }
};

window.validateDates = function() {
  const depEl = document.getElementById('flight-dep-date');
  const retInput = document.getElementById('flight-ret-date');
  
  if (depEl && retInput) {
    if (depEl.value) {
      // Calendar Restriction: Lock all previous dates
      retInput.min = depEl.value;
    }
    
    // Sequential Date Locking: If return date is before departure date, fix it
    if (!retInput.disabled && retInput.value && depEl.value && depEl.value > retInput.value) {
      retInput.value = depEl.value;
    }
  }
};

window.togglePaxPopup = function() {
  const popup = document.getElementById('pax-popup');
  if (popup) {
    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
  }
};

window.updatePax = function(type, delta) {
  const newPax = { ...window.KT_PAX_COUNTS };
  newPax[type] += delta;
  
  // Constraints
  if (newPax.adult < 1) newPax.adult = 1;
  if (newPax.child < 0) newPax.child = 0;
  if (newPax.infant < 0) newPax.infant = 0;
  
  if (newPax.infant > newPax.adult) {
    if (type === 'infant') newPax.infant = newPax.adult;
    if (type === 'adult') newPax.infant = newPax.adult; // if adult decreased
  }
  
  const total = newPax.adult + newPax.child + newPax.infant;
  const err = document.getElementById('pax-error');
  if (total > 9) {
    if (err) err.style.display = 'block';
    return;
  } else {
    if (err) err.style.display = 'none';
  }
  
  window.KT_PAX_COUNTS = newPax;
  
  const aCount = document.getElementById('pax-adult-count');
  if (aCount) aCount.textContent = newPax.adult;
  
  const cCount = document.getElementById('pax-child-count');
  if (cCount) cCount.textContent = newPax.child;
  
  const iCount = document.getElementById('pax-infant-count');
  if (iCount) iCount.textContent = newPax.infant;
  
  // Update summary
  const totalCount = newPax.adult + newPax.child + newPax.infant;
  const summary = document.getElementById('pax-summary');
  if (summary) summary.textContent = `${totalCount} Passenger${totalCount > 1 ? 's' : ''}`;
};

document.addEventListener('click', function(e) {
  const wrap = document.querySelector('.pax-dropdown-wrap');
  const popup = document.getElementById('pax-popup');
  if (wrap && popup && !wrap.contains(e.target)) {
    popup.style.display = 'none';
  }
});

window.performFlightSearch = function() {
  const fromVal = document.getElementById('flight-from')?.value || '';
  const toVal = document.getElementById('flight-to')?.value || '';
  const depDate = document.getElementById('flight-dep-date')?.value || '';
  const retDate = document.getElementById('flight-ret-date')?.value || '';
  const cabin = document.getElementById('flight-class')?.value || 'Economy';
  
  // Extract airport codes from "City (CODE)" format
  const extractCode = (str) => {
    const match = str.match(/\(([^)]+)\)/);
    return match ? match[1] : str.trim();
  };

  const origin = extractCode(fromVal);
  const destination = extractCode(toVal);
  const adults = window.KT_PAX_COUNTS?.adult || 1;
  const children = window.KT_PAX_COUNTS?.child || 0;
  const infants = window.KT_PAX_COUNTS?.infant || 0;

  const query = new URLSearchParams({
    origin,
    destination,
    departureDate: depDate,
    returnDate: retDate,
    adults,
    children,
    infants,
    cabinClass: cabin
  }).toString();

  // Redirect to results page with query params
  // Since we use hash routing, we put query before hash or use window.location.search
  // To keep it simple for flight-results.js which uses window.location.search:
  window.location.search = query;
  // Note: Changing search will reload the page, which is fine for result loading
  // The app.js bootstrap will then handle the hash or default to home, 
  // but flight-results.js is loaded specifically when #/results/flights is active.
  // Wait! If I change search, the hash might be lost. 
  window.location.href = `?${query}#/results/flights`;
};
