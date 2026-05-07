(function () {
  const moduleRegistry = (window.KeenanFrontend = window.KeenanFrontend || { modules: {} });
  const loadedStyles = new Set();
  const loadedScripts = new Set();
  let suppressNextHashChange = false;

  // Single timestamp for all resources in this load — busts browser cache on every page load
  const BUST = '?v=' + Date.now();

  function localUrl(url) {
    // Only bust local paths; leave CDN URLs untouched
    return url.startsWith('http') ? url : url + BUST;
  }

  const shellMarkup = `
    <div class="app-shell">
      <div data-module-slot="toast"></div>
      <div data-module-slot="site-nav"></div>
      <main class="app-shell__pages" id="app-pages">
        <div data-module-slot="page-home"></div>
        <div data-module-slot="page-results"></div>
        <div data-module-slot="page-booking"></div>
        <div data-module-slot="page-confirmation"></div>
        <div data-module-slot="page-track"></div>
        <div data-module-slot="page-admin"></div>
        <div data-module-slot="page-results-umrah"></div>
      </main>
      <div data-module-slot="order-modals"></div>
      <div data-module-slot="auth-modal"></div>
      <div data-module-slot="customer-portal"></div>
      <div data-module-slot="page-admin-login"></div>
      <!-- service modules: logic-only, not visible -->
      <div data-module-slot="service-flights"  style="display:none"></div>
      <div data-module-slot="service-umrah"    style="display:none"></div>
      <div data-module-slot="service-holidays" style="display:none"></div>
      <div data-module-slot="service-payments" style="display:none"></div>
    </div>
  `;

  const modules = [
    { name: 'toast',           slot: '[data-module-slot="toast"]',           html: './src/components/toast/index.html',           css: './src/components/toast/index.css',           js: './src/components/toast/index.js' },
    { name: 'site-nav',        slot: '[data-module-slot="site-nav"]',        html: './src/components/site-nav/index.html',        css: './src/components/site-nav/index.css',        js: './src/components/site-nav/index.js' },
    { name: 'page-home',       slot: '[data-module-slot="page-home"]',       html: './src/pages/home/index.html',                 css: './src/pages/home/index.css',                 js: './src/pages/home/index.js' },
    { name: 'page-results',    slot: '[data-module-slot="page-results"]',    html: './src/pages/results/index.html',              css: './src/pages/results/index.css',              js: './src/pages/results/index.js' },
    { name: 'page-booking',    slot: '[data-module-slot="page-booking"]',    html: './src/pages/booking/index.html',              css: './src/pages/booking/index.css',              js: './src/pages/booking/index.js' },
    { name: 'page-confirmation', slot: '[data-module-slot="page-confirmation"]', html: './src/pages/confirmation/index.html',   css: './src/pages/confirmation/index.css',         js: './src/pages/confirmation/index.js' },
    { name: 'page-track',      slot: '[data-module-slot="page-track"]',      html: './src/pages/track/index.html',               css: './src/pages/track/index.css',                js: './src/pages/track/index.js' },
    { name: 'page-admin',      slot: '[data-module-slot="page-admin"]',      html: './src/pages/admin/index.html',               css: './src/pages/admin/index.css',                js: './src/pages/admin/index.js' },
    { name: 'page-results-umrah', slot: '[data-module-slot="page-results-umrah"]', html: './src/pages/results-umrah/index.html', css: './src/pages/results-umrah/index.css', js: './src/pages/results-umrah/index.js' },
    { name: 'hero-slider',     slot: '[data-module-slot="hero-slider"]',     html: './src/components/hero-slider/index.html',    css: './src/components/hero-slider/index.css',     js: './src/components/hero-slider/index.js' },
    { name: 'home-showcase',   slot: '[data-module-slot="home-showcase"]',   html: './src/components/home-showcase/index.html',  css: './src/components/home-showcase/index.css',   js: './src/components/home-showcase/index.js' },
    { name: 'site-footer',     slot: '[data-module-slot="site-footer"]',     html: './src/components/site-footer/index.html',    css: './src/components/site-footer/index.css',     js: './src/components/site-footer/index.js' },
    { name: 'order-modals',    slot: '[data-module-slot="order-modals"]',    html: './src/components/order-modals/index.html',   css: './src/components/order-modals/index.css',    js: './src/components/order-modals/index.js' },
    { name: 'auth-modal',      slot: '[data-module-slot="auth-modal"]',      html: './src/components/auth-modal/index.html',     css: './src/components/auth-modal/index.css',      js: './src/components/auth-modal/index.js' },
    { name: 'customer-portal', slot: '[data-module-slot="customer-portal"]', html: './src/components/customer-portal/index.html', css: './src/components/customer-portal/index.css', js: './src/components/customer-portal/index.js' },
    { name: 'page-admin-login', slot: '[data-module-slot="page-admin-login"]', html: './src/pages/admin-login/index.html',         css: './src/pages/admin-login/index.css',             js: './src/pages/admin-login/index.js' },
    // ── Service modules (logic-only, no visible HTML) ──────────────────────────
    { name: 'service-flights',  slot: '[data-module-slot="service-flights"]',  html: './src/services/flights/index.html',          css: './src/services/flights/style.css',             js: './src/services/flights/script.js' },
    { name: 'service-umrah',    slot: '[data-module-slot="service-umrah"]',    html: './src/services/umrah/index.html',            css: './src/services/umrah/style.css',               js: './src/services/umrah/script.js' },
    { name: 'service-holidays', slot: '[data-module-slot="service-holidays"]', html: './src/services/holidays/index.html',         css: './src/services/holidays/style.css',            js: './src/services/holidays/script.js' },
    { name: 'service-payments', slot: '[data-module-slot="service-payments"]', html: './src/services/payments/index.html',         css: './src/services/payments/style.css',            js: './src/services/payments/script.js' },
  ];

  function showLoadingState() {
    const root = document.getElementById('app-root');
    document.body.dataset.appReady = 'false';
    if (!root) return;
    root.innerHTML = `
      <div class="app-loading">
        <div class="app-loading__card">
          <div class="app-loading__eyebrow">Keenan Travel</div>
          <h1 class="app-loading__title">Loading frontend modules</h1>
          <p class="app-loading__text">Preparing pages, components, and API-aware interactions.</p>
        </div>
      </div>
    `;
  }

  async function fetchText(filePath) {
    const response = await fetch(localUrl(filePath));
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}: ${response.status}`);
    }
    return response.text();
  }

  function ensureStyle(filePath) {
    if (!filePath || loadedStyles.has(filePath)) return;
    loadedStyles.add(filePath);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = localUrl(filePath);
    document.head.appendChild(link);
  }

  function ensureScript(filePath) {
    return new Promise((resolve, reject) => {
      if (!filePath || loadedScripts.has(filePath)) {
        resolve();
        return;
      }
      loadedScripts.add(filePath);
      const script = document.createElement('script');
      script.src = localUrl(filePath);
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${filePath}`));
      document.body.appendChild(script);
    });
  }

  async function mountModule(moduleConfig) {
    const target = document.querySelector(moduleConfig.slot);
    if (!target) return;
    ensureStyle(moduleConfig.css);
    target.innerHTML = await fetchText(moduleConfig.html);
    if (moduleConfig.js) {
      await ensureScript(moduleConfig.js);
    }
    const moduleDef = moduleRegistry.modules[moduleConfig.name];
    moduleDef?.mount?.(target);
  }

  function syncHash(nextHash) {
    if (!nextHash || window.location.hash === nextHash) return;
    suppressNextHashChange = true;
    window.location.hash = nextHash;
  }

  function activateSearchTab(tab) {
    const legacyGo = window.__keenanLegacyGo;
    if (typeof legacyGo === 'function') {
      legacyGo('home');
    }
    window.setTimeout(() => {
      document.querySelectorAll('.sw-tab').forEach((node) => node.classList.remove('act'));
      const selected = document.querySelector(`.sw-tab[data-tab="${tab}"]`);
      if (selected) {
        selected.classList.add('act');
        if (typeof window.swTab === 'function') {
          window.swTab(tab, selected);
        }
      }
      document.querySelector('.search-widget')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  function viewToHash(view) {
    const viewMap = {
      home:              '#/',
      booking:           '#/booking',
      confirmation:      '#/confirmation',
      track:             '#/track',
      admin:             '#/admin',
      'admin-login':     '#/admin-login',
      detail:            '#/detail',
      'results-flights': '#/results/flights',
      'results-umrah':   '#/results/umrah',
      'results-holiday': '#/results/holiday',
      'results-cruise':  '#/results/cruise',
      'results-visa':    '#/results/visa',
    };
    return viewMap[view] || '#/';
  }

  function parseHash(hashValue) {
    const hash = (hashValue || '#/').replace(/^#/, '');
    if (hash === '' || hash === '/')      return { type: 'view', value: 'home' };
    if (hash === '/booking')              return { type: 'view', value: 'booking' };
    if (hash === '/confirmation')         return { type: 'view', value: 'confirmation' };
    if (hash === '/track')                return { type: 'view', value: 'track' };
    if (hash === '/admin')                return { type: 'view', value: 'admin' };
    if (hash === '/admin-login')          return { type: 'view', value: 'admin-login' };
    if (hash === '/detail')               return { type: 'view', value: 'detail' };
    if (hash.startsWith('/results/'))     return { type: 'view', value: 'results-' + hash.split('/')[2] };
    if (hash.startsWith('/search/'))      return { type: 'search', value: hash.split('/')[2] || 'flights' };
    return { type: 'view', value: 'home' };
  }

  function applyRouteFromHash() {
    const route = parseHash(window.location.hash);
    if (route.type === 'search') {
      activateSearchTab(route.value);
      return;
    }
    if (typeof window.__keenanLegacyGo === 'function') {
      window.__keenanLegacyGo(route.value);
    }
  }

  function wireRoutes() {
    if (window.__keenanRoutesReady) return;
    window.__keenanRoutesReady = true;
    window.__keenanLegacyGo = window.go;

    window.go = function patchedGo(view) {
      window.__keenanLegacyGo(view);
      syncHash(viewToHash(view));
    };

    window.goSearch = function patchedGoSearch(tab) {
      activateSearchTab(tab);
      syncHash(`#/search/${tab}`);
    };

    window.addEventListener('hashchange', () => {
      if (suppressNextHashChange) {
        suppressNextHashChange = false;
        return;
      }
      applyRouteFromHash();
    });

    if (!window.location.hash) {
      syncHash('#/');
    }
    applyRouteFromHash();
  }

  async function bootstrap() {
    showLoadingState();
    const root = document.getElementById('app-root');
    if (!root) throw new Error('Missing #app-root container');
    root.innerHTML = shellMarkup;

    for (const moduleConfig of modules) {
      await mountModule(moduleConfig);
    }

    await ensureScript('./assets/js/config.js');
    await ensureScript('https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js');
    await ensureScript('https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js');
    await ensureScript('./assets/js/app.js');
    await ensureScript('./assets/js/integration.js');

    wireRoutes();
    document.body.dataset.appReady = 'true';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
