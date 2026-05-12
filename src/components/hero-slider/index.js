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
  const depInput = root.querySelector('[data-role="dep-city"]');
  const destInput = root.querySelector('input[placeholder="Destination"]');

  if (depInput) setupInput(depInput);
  if (destInput) setupInput(destInput);
}

function setupInput(input) {
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'ac-results';
  input.parentElement.appendChild(resultsDiv);

  let debounceTimer;

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (query.length < 2) {
      resultsDiv.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${window.KEENAN_CONFIG.apiBaseUrl}/airports/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderResults(input, resultsDiv, data);
      } catch (err) {
        console.error('Airport search error:', err);
      }
    }, 300);
  });

  // Hide on blur, but delay to allow click on item
  input.addEventListener('blur', () => {
    setTimeout(() => {
      resultsDiv.style.display = 'none';
    }, 200);
  });

  input.addEventListener('focus', () => {
    if (resultsDiv.innerHTML !== '') {
      resultsDiv.style.display = 'block';
    }
  });
}

function renderResults(input, container, items) {
  if (!items || items.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="ac-item" data-code="${item.iata}" data-city="${item.city}">
      <div class="ac-icon">✈</div>
      <div class="ac-info">
        <span class="ac-city">${item.city}, ${item.country}</span>
        <span class="ac-name">${item.name}</span>
      </div>
      <span class="ac-code">${item.iata}</span>
    </div>
  `).join('');

  container.style.display = 'block';

  container.querySelectorAll('.ac-item').forEach(el => {
    el.addEventListener('click', () => {
      const code = el.dataset.code;
      const city = el.dataset.city;
      input.value = `${city} (${code})`;
      container.style.display = 'none';
    });
  });
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
