window.KeenanFrontend = window.KeenanFrontend || { modules: {} };

window.KeenanFrontend.modules['page-results-umrah'] = {
  type: 'page',
  async mount(root) {
    if (!root) return;
    root.dataset.module = 'page-results-umrah';
    
    // Setup observer to render data when this view becomes active
    const viewEl = root.querySelector('#view-results-umrah');
    
    // Helper to render packages
    const renderPackages = async () => {
      const container = root.querySelector('#umrah-results-container');
      const countLabel = root.querySelector('#umrah-packages-count');
      
      if (!container || !countLabel) return;
      
      try {
        const countryCode = (window.KT && window.KT.get().code) || 'AE';
        const durationSelect = root.querySelector('#umrah-filter-duration');
        const sortSelect = root.querySelector('#umrah-filter-sort');
        const filters = {};
        if (durationSelect && durationSelect.value) filters.duration = durationSelect.value;
        if (sortSelect && sortSelect.value) filters.sort = sortSelect.value;
        
        const packages = await window.loadUmrahPackages(countryCode, filters);
        
        countLabel.textContent = `${packages.length} package${packages.length !== 1 ? 's' : ''} available`;
        
        if (packages.length === 0) {
          container.innerHTML = `<div style="padding: 40px; text-align: center; grid-column: 1 / -1; color: var(--slate2);">No packages found.</div>`;
          return;
        }
        
        container.innerHTML = packages.map(p => {
          const typeLabel = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : '';
          const nightsLabel = `${p.nights || 0} Nights`;
          const hotels = [p.makkah_hotel, p.madinah_hotel].filter(Boolean).join(' & ');
          const formattedPrice = typeof window.KT?.format === 'function' ? window.KT.format(p.price_per_person) : `${p.currency || 'AED'} ${Number(p.price_per_person || 0).toLocaleString()}`;
          
          let coverImageUrl = null;
          try {
            const images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
            if (images.length > 0) {
              const apiBaseUrl = (window.KEENAN_CONFIG && window.KEENAN_CONFIG.apiBaseUrl) ? window.KEENAN_CONFIG.apiBaseUrl.replace('/v1', '') : 'http://localhost:3000';
              coverImageUrl = apiBaseUrl + images[0];
            }
          } catch(e) {}
          
          const bgStyle = coverImageUrl ? `background:url('${coverImageUrl}') center/cover no-repeat` : `background:linear-gradient(160deg,#1a1a35,#2d2d60,#111128)`;

          return `
            <div class="dest-card" onclick="go('detail')">
              <div class="dc-img" style="${bgStyle}">
                <span class="dc-ribbon">Umrah</span>
              </div>
              <div class="dc-body">
                <div class="dc-name">${p.name || typeLabel + ' Package'}</div>
                <div class="dc-info"><span style="font-weight:600; color:var(--ink);">${nightsLabel}</span> · ${hotels} ${p.visa_included ? '· Visa Included' : ''}</div>
                <div class="dc-foot" style="margin-top: 16px; align-items: flex-end;">
                  <div>
                    <div class="dc-price"><span class="from">from</span><span class="amount">${formattedPrice}</span></div>
                    <div class="dc-stars">★★★★★ 5.0</div>
                  </div>
                  <button class="btn-gold" style="padding: 8px 16px; font-size: 13px;" onclick="event.stopPropagation(); go('detail')">View Package</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
        
      } catch (err) {
        console.error(err);
        countLabel.textContent = 'Failed to load packages.';
      }
    };

    // Use MutationObserver to detect when the view is made active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (viewEl.classList.contains('on')) {
            renderPackages();
          }
        }
      });
    });
    
    if (viewEl) {
      observer.observe(viewEl, { attributes: true });
      
      // Wire up filters
      const durationSelect = root.querySelector('#umrah-filter-duration');
      const sortSelect = root.querySelector('#umrah-filter-sort');
      if (durationSelect) durationSelect.addEventListener('change', renderPackages);
      if (sortSelect) sortSelect.addEventListener('change', renderPackages);

      // Render initially if it's already active
      if (viewEl.classList.contains('on')) {
        renderPackages();
      }
    }
  }
};
