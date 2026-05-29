(function () {
  const moduleRegistry = (window.KeenanFrontend = window.KeenanFrontend || {
    modules: {},
  });
  const loadedStyles = new Set();
  const loadedScripts = new Set();
  let suppressNextHashChange = false;

  // Single timestamp for all resources in this load — busts browser cache on every page load
  const BUST = "?v=" + Date.now();

  function localUrl(url) {
    // Only bust local paths; leave CDN URLs untouched
    return url.startsWith("http") ? url : url + BUST;
  }

  const shellMarkup = `
    <div class="app-shell">
      <div data-module-slot="toast"></div>
      <div data-module-slot="site-nav"></div>
      <main class="app-shell__pages" id="app-pages">
        <div data-module-slot="page-home"></div>
        <div data-module-slot="page-booking"></div>
        <div data-module-slot="page-confirmation"></div>
        <div data-module-slot="page-track"></div>
        <div data-module-slot="page-admin"></div>
        <div data-module-slot="page-results-umrah"></div>
        <div data-module-slot="page-umrah-detail"></div>
        <div data-module-slot="page-holiday-detail"></div>
      </main>
      <div data-module-slot="order-modals"></div>
      <div data-module-slot="auth-modal"></div>
      <div data-module-slot="customer-portal"></div>
      <div data-module-slot="page-admin-login"></div>
      <!-- service modules: logic-only, not visible -->
      <div data-module-slot="service-flights"></div>
      <div data-module-slot="service-umrah"    style="display:none"></div>
      <div data-module-slot="service-holidays" style="display:none"></div>
      <div data-module-slot="service-payments" style="display:none"></div>
    </div>
  `;

  const modules = [
    {
      name: "toast",
      slot: '[data-module-slot="toast"]',
      html: "./src/components/toast/toast.html",
      css: "./src/components/toast/toast.css",
      js: "./src/components/toast/toast.js",
    },
    {
      name: "site-nav",
      slot: '[data-module-slot="site-nav"]',
      html: "./src/components/site-nav/site-nav.html",
      css: "./src/components/site-nav/site-nav.css",
      js: "./src/components/site-nav/site-nav.js",
    },
    {
      name: "page-home",
      slot: '[data-module-slot="page-home"]',
      html: "./src/pages/home/home.html",
      css: "./src/pages/home/home.css",
      js: "./src/pages/home/home.js",
    },

    {
      name: "page-booking",
      slot: '[data-module-slot="page-booking"]',
      html: "./src/pages/booking/booking.html",
      css: "./src/pages/booking/booking.css",
      js: "./src/pages/booking/booking.js",
    },
    {
      name: "page-confirmation",
      slot: '[data-module-slot="page-confirmation"]',
      html: "./src/pages/confirmation/confirmation.html",
      css: "./src/pages/confirmation/confirmation.css",
      js: "./src/pages/confirmation/confirmation.js",
    },

    {
      name: "page-track",
      slot: '[data-module-slot="page-track"]',
      html: "./src/components/flight-track/flight-track.html",
      css: "./src/components/flight-track/flight-track.css",
      js: "./src/components/flight-track/flight-track.js",
    },

    {
      name: "page-admin",
      slot: '[data-module-slot="page-admin"]',
      html: "./src/pages/admin/admin.html",
      css: "./src/pages/admin/admin.css",
      js: "./src/pages/admin/admin.js",
    },

    {
      name: "page-results-umrah",
      slot: '[data-module-slot="page-results-umrah"]',
      html: "./src/pages/results-umrah/results-umrah.html",
      css: "./src/pages/results-umrah/results-umrah.css",
      js: "./src/pages/results-umrah/results-umrah.js",
    },
    {
      name: "page-umrah-detail",
      slot: '[data-module-slot="page-umrah-detail"]',
      html: "./src/pages/umrah-detail/umrah-detail.html",
      css: "./src/pages/umrah-detail/umrah-detail.css",
      js: "./src/pages/umrah-detail/umrah-detail.js",
    },
    {
      name: "page-holiday-detail",
      slot: '[data-module-slot="page-holiday-detail"]',
      html: "./src/pages/holiday-detail/holiday-detail.html",
      css: "./src/pages/holiday-detail/holiday-detail.css",
      js: "./src/pages/holiday-detail/holiday-detail.js",
    },
    {
      name: "hero-slider",
      slot: '[data-module-slot="hero-slider"]',
      html: "./src/components/hero-slider/hero-slider.html",
      css: "./src/components/hero-slider/hero-slider.css",
      js: "./src/components/hero-slider/hero-slider.js",
    },
    {
      name: "home-showcase",
      slot: '[data-module-slot="home-showcase"]',
      html: "./src/components/home-showcase/home-showcase.html",
      css: "./src/components/home-showcase/home-showcase.css",
      js: "./src/components/home-showcase/home-showcase.js",
    },
    {
      name: "site-footer",
      slot: '[data-module-slot="site-footer"]',
      html: "./src/components/site-footer/site-footer.html",
      css: "./src/components/site-footer/site-footer.css",
      js: "./src/components/site-footer/site-footer.js",
    },
    {
      name: "order-modals",
      slot: '[data-module-slot="order-modals"]',
      html: "./src/components/order-modals/order-modals.html",
      css: "./src/components/order-modals/order-modals.css",
      js: "./src/components/order-modals/order-modals.js",
    },
    {
      name: "auth-modal",
      slot: '[data-module-slot="auth-modal"]',
      html: "./src/components/auth-modal/auth-modal.html",
      css: "./src/components/auth-modal/auth-modal.css",
      js: "./src/components/auth-modal/auth-modal.js",
    },
    {
      name: "customer-portal",
      slot: '[data-module-slot="customer-portal"]',
      html: "./src/modules/customer-portal/customer-portal.html",
      css: "./src/modules/customer-portal/customer-portal.css",
      js: "./src/modules/customer-portal/customer-portal.js",
    },
    {
      name: "page-admin-login",
      slot: '[data-module-slot="page-admin-login"]',
      html: "./src/pages/admin-login/admin-login.html",
      css: "./src/pages/admin-login/admin-login.css",
      js: "./src/pages/admin-login/admin-login.js",
    },
    // ── Service modules (logic-only, no visible HTML) ──────────────────────────

    {
      name: "service-flights",
      slot: '[data-module-slot="service-flights"]',
      html: "./src/services/flights/flight-search/flight-search.html",
      css: "./src/services/flights/flight-search/flight-search.css",
      js: "./src/services/flights/flight-search/flight-search.js",
    },
    {
      name: "service-umrah",
      slot: '[data-module-slot="service-umrah"]',
      html: "./src/services/umrah/umrah.html",
      css: "./src/services/umrah/umrah.css",
      js: "./src/services/umrah/umrah.js",
    },
    {
      name: "service-holidays",
      slot: '[data-module-slot="service-holidays"]',
      html: "./src/services/holidays/holidays.html",
      css: "./src/services/holidays/holidays.css",
      js: "./src/services/holidays/holidays.js",
    },
    {
      name: "service-payments",
      slot: '[data-module-slot="service-payments"]',
      html: "./src/services/payments/payments.html",
      css: "./src/services/payments/payments.css",
      js: "./src/services/payments/payments.js",
    },
  ];

  function showLoadingState() {
    const root = document.getElementById("app-root");
    document.body.dataset.appReady = "false";
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
    const link = document.createElement("link");
    link.rel = "stylesheet";
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
      const script = document.createElement("script");
      script.src = localUrl(filePath);
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(`Failed to load script: ${filePath}`));
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
    if (typeof legacyGo === "function") {
      legacyGo("home");
    }
    window.setTimeout(() => {
      document
        .querySelectorAll(".sw-tab")
        .forEach((node) => node.classList.remove("act"));
      const selected = document.querySelector(`.sw-tab[data-tab="${tab}"]`);
      if (selected) {
        selected.classList.add("act");
        if (typeof window.swTab === "function") {
          window.swTab(tab, selected);
        }
      }
      document
        .querySelector(".search-widget")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function viewToHash(view) {
    const viewMap = {
      home: "#/",
      booking: "#/booking",
      confirmation: "#/confirmation",
      track: "#/track",
      admin: "#/admin",
      "admin-login": "#/admin-login",
      detail: "#/detail",
      "results-flights": "#/results/flights",
      "results-umrah": "#/results/umrah",
      "results-holiday": "#/results/holiday",
      "results-cruise": "#/results/cruise",
      "results-visa": "#/results/visa",
      "umrah-detail": "#/umrah",
      "holiday-detail": "#/holiday",
    };
    return viewMap[view] || "#/";
  }

  function parseHash(hashValue) {
    const hash = (hashValue || "#/").replace(/^#/, "");
    if (hash === "" || hash === "/") return { type: "view", value: "home" };
    if (hash === "/booking") return { type: "view", value: "booking" };
    if (hash === "/confirmation")
      return { type: "view", value: "confirmation" };
    if (hash === "/track") return { type: "view", value: "track" };
    if (hash === "/admin") return { type: "view", value: "admin" };
    if (hash === "/admin-login") return { type: "view", value: "admin-login" };
    if (hash === "/detail") return { type: "view", value: "detail" };
    if (hash.startsWith("/results/"))
      return { type: "view", value: "results-" + hash.split("/")[2] };
    if (hash.startsWith("/umrah/"))
      return { type: "view", value: "umrah-detail-" + hash.split("/")[2] };
    if (hash.startsWith("/holiday/"))
      return { type: "view", value: "holiday-detail-" + hash.split("/")[2] };
    if (hash.startsWith("/search/"))
      return { type: "search", value: hash.split("/")[2] || "flights" };
    return { type: "view", value: "home" };
  }

  function applyRouteFromHash() {
    console.log("[Router] Applying route for hash:", window.location.hash);
    const route = parseHash(window.location.hash);
    console.log("[Router] Parsed route:", route);

    if (route.type === "search") {
      activateSearchTab(route.value);
      return;
    }
    let viewValue = route.value;
    if (viewValue.startsWith("umrah-detail-")) {
      const id = viewValue.replace("umrah-detail-", "");
      viewValue = "page-umrah-detail";
      console.log("[Router] Umrah Detail detected, ID:", id);
      if (typeof window.loadUmrahDetail === "function") {
        window.loadUmrahDetail(id);
      } else {
        console.log("[Router] loadUmrahDetail not ready, waiting for event...");
        window.addEventListener(
          "umrah-detail-ready",
          () => {
            console.log(
              "[Router] umrah-detail-ready event received, loading ID:",
              id,
            );
            window.loadUmrahDetail(id);
          },
          { once: true },
        );
      }
    }
    if (viewValue.startsWith("holiday-detail-")) {
      const id = viewValue.replace("holiday-detail-", "");
      viewValue = "page-holiday-detail";
      console.log("[Router] Holiday Detail detected, ID:", id);
      if (typeof window.holiday_loadDetail === "function") {
        window.holiday_loadDetail(id);
      } else {
        window.addEventListener(
          "holiday-detail-ready",
          () => {
            window.holiday_loadDetail(id);
          },
          { once: true },
        );
      }
    }
    const legacyName = viewValue.replace("page-", "");
    console.log("[Router] Navigating to view:", legacyName);
    if (typeof window.__keenanLegacyGo === "function") {
      window.__keenanLegacyGo(legacyName);
    } else {
      console.warn("[Router] __keenanLegacyGo is not defined!");
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

    window.goUmrahDetail = function (id) {
      syncHash(`#/umrah/${id}`);
      applyRouteFromHash();
    };

    window.goHolidayDetail = function (id) {
      syncHash(`#/holiday/${id}`);
      applyRouteFromHash();
    };

    window.addEventListener("hashchange", () => {
      if (suppressNextHashChange) {
        suppressNextHashChange = false;
        return;
      }
      applyRouteFromHash();
    });

    if (!window.location.hash) {
      syncHash("#/");
    }
    applyRouteFromHash();
  }

  async function bootstrap() {
    showLoadingState();
    const root = document.getElementById("app-root");
    if (!root) throw new Error("Missing #app-root container");
    root.innerHTML = shellMarkup;

    await ensureScript("./src/config.js");
    await ensureScript(
      "https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js",
    );
    await ensureScript(
      "https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js",
    );
    await ensureScript("./assets/js/app.js");
    await ensureScript("./assets/js/integration.js");

    for (const moduleConfig of modules) {
      await mountModule(moduleConfig);
    }

    wireRoutes();
    document.body.dataset.appReady = "true";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bootstrap().catch((err) => {
        console.error("[Bootstrap Error]", err);
        const root = document.getElementById("app-root");
        if (root) {
          root.innerHTML = `
            <div style="padding:24px;font-family:Arial,sans-serif">
              <h2 style="margin:0 0 8px;color:#b91c1c">Frontend module loading error</h2>
              <p style="margin:0 0 12px;color:#475569">${err.message}</p>
              <pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;white-space:pre-wrap">Check src/app.js module paths after file rename.</pre>
            </div>
          `;
        }
      });
    });
  } else {
    bootstrap().catch((err) => {
      console.error("[Bootstrap Error]", err);
      const root = document.getElementById("app-root");
      if (root) {
        root.innerHTML = `
          <div style="padding:24px;font-family:Arial,sans-serif">
            <h2 style="margin:0 0 8px;color:#b91c1c">Frontend module loading error</h2>
            <p style="margin:0 0 12px;color:#475569">${err.message}</p>
            <pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;white-space:pre-wrap">Check src/app.js module paths after file rename.</pre>
          </div>
        `;
      }
    });
  }
})();
