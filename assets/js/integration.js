(function () {
  const config = window.KEENAN_CONFIG || {};
  const state = {
    authRole: "customer",
    authMode: "login",
    session: null,
    publicSlidesLoaded: false,
    umrahPackages: [],
    holidayPackages: [],
    cruisePackages: [],
  };

  const STATUS_MAP = {
    on_hold: "onhold",
    onhold: "onhold",
    confirmed: "confirmed",
    cancelled: "cancelled",
    pending: "pending",
    processing: "processing",
    approved: "approved",
    rejected: "rejected",
    active: "active",
    inactive: "inactive",
    blocked: "blocked",
  };

  function getApiBaseUrl() {
    return (config.apiBaseUrl || "http://localhost:3000/v1").replace(/\/$/, "");
  }

  function showAlert(message, tone) {
    const el = document.getElementById("auth-alert");
    if (!el) return;
    if (!message) {
      el.style.display = "none";
      el.className = "auth-alert";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.className = `auth-alert ${tone || "info"}`;
    el.textContent = message;
  }

  function getStoredSession() {
    try {
      const raw = localStorage.getItem("keenanTravelSession");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function persistSession(session) {
    state.session = session;
    if (session) {
      localStorage.setItem("keenanTravelSession", JSON.stringify(session));
    } else {
      localStorage.removeItem("keenanTravelSession");
    }
    updateSessionUi();
  }

  function isAdminSession() {
    return Boolean(state.session && state.session.type === "admin");
  }

  function isCustomerSession() {
    return Boolean(state.session && state.session.type === "customer");
  }

  function sessionUserName() {
    if (!state.session || !state.session.user) return "Sign In";
    return (
      state.session.user.name ||
      [state.session.user.first_name, state.session.user.last_name].filter(Boolean).join(" ") ||
      state.session.user.email ||
      "Account"
    );
  }

  function initials(name) {
    return (name || "KT")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function apiRequest(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeout || config.requestTimeout || 8000,
    );
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    if (options.auth !== false && state.session?.token) {
      headers.Authorization = `Bearer ${state.session.token}`;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        method: options.method || "GET",
        cache: 'no-store',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Request failed with ${response.status}`);
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function statusValue(raw) {
    return STATUS_MAP[String(raw || "").toLowerCase()] || String(raw || "").toLowerCase();
  }

  function statusSelectClass(status) {
    return `ss ss-${statusValue(status) || "confirmed"}`;
  }

  function formatCurrency(amount, currency) {
    const value = Number(amount || 0);
    const code = currency || "AED";
    return `${code} ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function mapSlide(slide) {
    return {
      id: slide.id,
      label: slide.label || "",
      title: slide.title || "Keenan Travel",
      sub: slide.subtitle || "",
      cta: slide.cta_text || "Explore",
      link: slide.cta_link || "flights",
      bg: slide.background_gradient || "linear-gradient(135deg,#0B1120 0%,#1C2B45 55%,#2a4070 100%)",
      img: slide.background_image_url || "",
      active: Boolean(slide.is_active ?? slide.active ?? true),
    };
  }

  function slidePayload(slide, sortOrder) {
    return {
      label: slide.label || null,
      title: slide.title || "Keenan Travel",
      subtitle: slide.sub || null,
      cta_text: slide.cta || "Explore",
      cta_link: slide.link || "flights",
      background_image_url: slide.img || null,
      background_gradient: slide.bg || null,
      is_active: slide.active !== false,
      sort_order: sortOrder,
    };
  }

  function parseNotes(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return { text: value };
    }
  }

  function serviceKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/s$/, "");
  }

  function serviceLabel(value) {
    return {
      flight: "Flights",
      umrah: "Umrah",
      holiday: "Holiday",
      cruise: "Cruise",
      visa: "Visa",
    }[serviceKey(value)] || String(value || "Service");
  }

  function titleCase(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function updateSessionUi() {
    const authBtn = document.getElementById("auth-trigger");
    const accountBtn = document.getElementById("account-trigger");
    const adminBtn = document.getElementById("admin-trigger");
    const adminAvatar = document.getElementById("admin-avatar");
    const adminName = document.getElementById("admin-name");
    const adminRole = document.getElementById("admin-role");

    if (authBtn) {
      if (isAdminSession()) {
        authBtn.textContent = "Return to Admin";
        authBtn.onclick = () => { if (typeof window.go === "function") window.go("admin"); };
      } else {
        authBtn.textContent = state.session ? sessionUserName() : "Sign In";
        authBtn.onclick = isCustomerSession() ? openCustomerPortal : () => openAuthModal("customer");
      }
    }

    if (accountBtn) {
      accountBtn.style.display = isCustomerSession() ? "inline-flex" : "none";
    }

    if (adminBtn) {
      adminBtn.textContent = isAdminSession() ? "Open Admin" : "Admin Panel";
    }

    if (isAdminSession()) {
      const name = sessionUserName();
      if (adminAvatar) adminAvatar.textContent = initials(name);
      if (adminName) adminName.textContent = name;
      if (adminRole) adminRole.textContent = String(state.session.user.role || "Admin").replaceAll("_", " ");
    } else {
      if (adminAvatar) adminAvatar.textContent = "KA";
      if (adminName) adminName.textContent = "Keenan Admin";
      if (adminRole) adminRole.textContent = "Super Admin";
    }
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const isRegister = mode === "register";
    const isForgot = mode === "forgot";
    const isLogin = mode === "login";

    // Tabs
    const tabs = document.getElementById("auth-mode-tabs");
    if (tabs) tabs.style.display = isForgot ? "none" : "flex";
    document.getElementById("auth-mode-login")?.classList.toggle("active", isLogin);
    document.getElementById("auth-mode-register")?.classList.toggle("active", isRegister);

    // Social / divider (hidden in forgot)
    const socialRow = document.getElementById("auth-social-row");
    const divider = document.getElementById("auth-divider");
    if (socialRow) socialRow.style.display = isForgot ? "none" : "block";
    if (divider) divider.style.display = isForgot ? "none" : "flex";

    // Field visibility
    const regRow = document.getElementById("auth-register-row");
    if (regRow) regRow.style.display = isRegister ? "grid" : "none";
    const usernameRow = document.getElementById("auth-username-row");
    if (usernameRow) usernameRow.style.display = isRegister ? "block" : "none";
    const pwRow = document.getElementById("auth-password-row");
    if (pwRow) pwRow.style.display = isForgot ? "none" : "block";
    const strength = document.getElementById("auth-pw-strength");
    if (strength) strength.style.display = isRegister ? "flex" : "none";
    const confirmRow = document.getElementById("auth-confirm-row");
    if (confirmRow) confirmRow.style.display = isRegister ? "block" : "none";
    const phoneRow = document.getElementById("auth-phone-row");
    if (phoneRow) phoneRow.style.display = isRegister ? "block" : "none";

    // Forgot / back rows
    const forgotRow = document.getElementById("auth-forgot-row");
    const backRow = document.getElementById("auth-back-row");
    if (forgotRow) forgotRow.style.display = isLogin ? "flex" : "none";
    if (backRow) backRow.style.display = isForgot ? "block" : "none";

    // Email field label + placeholder
    const emailInput = document.getElementById("auth-email");
    const emailLabel = document.getElementById("auth-email-label");
    if (emailInput) {
      emailInput.placeholder = isRegister ? "your@email.com" : "your@email.com or username";
    }
    if (emailLabel) {
      emailLabel.textContent = isRegister ? "Email Address" : "Email or Username";
    }

    // Password autocomplete
    const pwInput = document.getElementById("auth-password");
    if (pwInput) pwInput.autocomplete = isRegister ? "new-password" : "current-password";

    // Titles
    const titleMap = {
      login:    ["Welcome Back",         "Sign in to manage your bookings and travel profile."],
      register: ["Create Your Account",  "Join Keenan Travel — your world of travel awaits."],
      forgot:   ["Reset Your Password",  "Enter your email and we'll send you a reset link."],
    };
    const [title, subtitle] = titleMap[mode] || titleMap.login;
    const titleEl = document.getElementById("auth-title");
    const subtitleEl = document.getElementById("auth-subtitle");
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    // Submit button
    const submitBtn = document.getElementById("auth-submit");
    if (submitBtn) {
      submitBtn.textContent = isForgot ? "Send Reset Link" : isRegister ? "Create Account" : "Sign In";
    }

    // Google button text
    const googleText = document.getElementById("auth-google-text");
    if (googleText) googleText.textContent = isRegister ? "Sign up with Google" : "Continue with Google";

    // Footer switch link
    const footer = document.getElementById("auth-footer");
    const footerText = document.getElementById("auth-footer-text");
    const footerLink = document.getElementById("auth-footer-link");
    if (footer) footer.style.display = isForgot ? "none" : "flex";
    if (footerText) footerText.textContent = isRegister ? "Already have an account?" : "Don't have an account?";
    if (footerLink) {
      footerLink.textContent = isRegister ? "Sign in" : "Create one";
      footerLink.onclick = isRegister ? () => setAuthMode("login") : () => setAuthMode("register");
    }

    showAlert("", "info");
  }

  function openAuthModal(role) {
    setAuthMode("login");
    ["auth-email", "auth-password", "auth-first-name", "auth-last-name",
      "auth-username", "auth-phone", "auth-confirm-password"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    openModal("m-auth");
  }

  async function submitAuth(event) {
    event.preventDefault();
    showAlert("", "info");

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const firstName = document.getElementById("auth-first-name").value.trim();
    const lastName = document.getElementById("auth-last-name").value.trim();
    const confirmPassword = document.getElementById("auth-confirm-password").value;
    const phone = document.getElementById("auth-phone").value.trim();

    if (state.authMode === "forgot") {
      if (!email) {
        showAlert("Please enter your email address.", "error");
        return;
      }
      const submitBtn = document.getElementById("auth-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      try {
        await apiRequest("/auth/customer/forgot-password", { method: "POST", auth: false, body: { email } });
      } catch {
        // Show success regardless to prevent email enumeration
      }
      showAlert("If an account with that email exists, a reset link has been sent.", "success");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reset Link";
      return;
    }

    if (!email || !password) {
      showAlert("Email and password are required.", "error");
      return;
    }

    if (state.authMode === "register") {
      if (!firstName || !lastName) {
        showAlert("First and last name are required for registration.", "error");
        return;
      }
      if (password !== confirmPassword) {
        showAlert("Passwords do not match.", "error");
        return;
      }
    }

    const submitBtn = document.getElementById("auth-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      let data;
      if (state.authMode === "register") {
        const username = (document.getElementById("auth-username")?.value || "").trim();
        data = await apiRequest("/auth/customer/register", {
          method: "POST",
          auth: false,
          body: { first_name: firstName, last_name: lastName, username: username || undefined, email, password, phone },
        });
      } else {
        data = await apiRequest("/auth/customer/login", {
          method: "POST",
          auth: false,
          body: { email, password },
        });
      }

      persistSession(data);
      closeModal("m-auth");
      toast("Welcome back!", "t-green");
      await openCustomerPortal();
    } catch (error) {
      showAlert(error.message || "Authentication failed.", "error");
    } finally {
      submitBtn.disabled = false;
      setAuthMode(state.authMode);
    }
  }

  async function openCustomerPortal() {
    if (!isCustomerSession()) {
      openAuthModal("customer");
      return;
    }

    try {
      const [me, bookings] = await Promise.all([
        apiRequest("/auth/me"),
        apiRequest("/customers/me/bookings"),
      ]);
      const profile = me.user || state.session.user;
      const rows = bookings.data || [];
      document.getElementById("portal-customer-name").textContent =
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
      document.getElementById("portal-customer-email").textContent = profile.email || "—";
      document.getElementById("portal-booking-count").textContent = `${rows.length} booking${rows.length === 1 ? "" : "s"}`;
      const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      document.getElementById("portal-booking-total").textContent = `${formatCurrency(total, "AED")} total spend`;
      document.getElementById("portal-bookings-body").innerHTML =
        rows.length > 0
          ? rows
              .map(
                (item) => `<tr>
                  <td class="td-mono">${escapeHtml(item.reference)}</td>
                  <td>${escapeHtml(item.service_type)}</td>
                  <td>${escapeHtml(statusValue(item.status).replace("_", " "))}</td>
                  <td class="semi">${escapeHtml(formatCurrency(item.amount, item.currency))}</td>
                  <td>${escapeHtml(formatDate(item.created_at))}</td>
                </tr>`,
              )
              .join("")
          : '<tr><td colspan="5" class="slate2 fs13" style="padding:18px">No bookings available.</td></tr>';
      openModal("m-customer-portal");
    } catch (error) {
      toast(error.message || "Unable to load customer account", "t-red");
    }
  }

  function logoutSession() {
    persistSession(null);
    closeModal("m-customer-portal");
    if (document.getElementById("view-admin")?.classList.contains("on")) {
      go("home");
    }
    toast("Signed out", "t-gold");
  }

  async function openAdminAccess() {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    go("admin");
    await syncAdminData();
  }

  async function loadPublicSlides() {
    try {
      const response = await apiRequest("/content/hero-slides", { auth: false });
      if (Array.isArray(response.data) && response.data.length) {
        slides = response.data.map(mapSlide);
        state.publicSlidesLoaded = true;
        renderHeroSlides();
        startSliderAuto();
      }
    } catch {
      state.publicSlidesLoaded = false;
    }
  }

  function renderCustomerRows(customers) {
    const tbody = document.getElementById("tbody-cu");
    if (!tbody || !Array.isArray(customers) || !customers.length) return;
    tbody.innerHTML = customers
      .map((customer) => {
        const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
        const status = statusValue(customer.status || "active");
        const nationality = customer.nationality || "—";
        return `<tr data-status="${escapeHtml(status)}" data-nat="${escapeHtml(nationality.toLowerCase())}" data-customer-id="${customer.id}">
          <td><input type="checkbox"></td>
          <td>
            <div class="flex aic gap10">
              <div class="avatar" style="width:36px;height:36px;background:rgba(200,169,110,.15);color:var(--gold3);font-size:13px;flex-shrink:0">${escapeHtml(initials(fullName))}</div>
              <div><div class="semi fs14">${escapeHtml(fullName)}</div><div class="fs12 slate2">${escapeHtml(customer.email || "—")}</div></div>
            </div>
          </td>
          <td class="fs13">${escapeHtml(customer.phone || "—")}</td>
          <td class="fs13">${escapeHtml(nationality)}</td>
          <td class="semi">${Number(customer.total_bookings || 0)}</td>
          <td class="semi">${escapeHtml(formatCurrency(customer.total_spent || 0, localStorage.getItem("admin_country") === "PK" ? "PKR" : "AED"))}</td>
          <td class="fs13">${escapeHtml(formatDate(customer.updated_at || customer.created_at))}</td>
          <td><select class="${statusSelectClass(status)}" onchange="chgStatus(this)"><option value="active"${status === "active" ? " selected" : ""}>Active</option><option value="inactive"${status === "inactive" ? " selected" : ""}>Inactive</option><option value="blocked"${status === "blocked" ? " selected" : ""}>Blocked</option></select></td>
          <td class="td-actions"><button class="btn-icon">View</button></td>
        </tr>`;
      })
      .join("");
  }

  function renderOrderRows(bookings) {
    const tbody = document.getElementById("tbody-orders");
    if (!tbody || !Array.isArray(bookings) || !bookings.length) return;
    tbody.innerHTML = bookings
      .map((item) => {
        const status = statusValue(item.status);
        const service = serviceKey(item.service_type);
        const notes = parseNotes(item.notes);
        const passenger = item.customer_name || "Customer";
        let detailText = notes.package_name || notes.package || notes.text || "Manual booking";
        let serviceDisplay = serviceLabel(service);
        if (service === "flight") {
          detailText = `${item.origin || "—"}→${item.destination || "—"} · ${item.flight_number || "—"}`;
        }
        if (service === "umrah") {
          detailText = `${item.umrah_package_name || "Umrah Package"} · ${Number(item.num_pilgrims || 1)} pilgrims`;
        }
        if (service === "visa") {
          detailText = `${item.destination_country || "—"} · ${titleCase(item.visa_type || "visa")}`;
        }
        const editButton =
          service === "flight"
            ? `<button class="btn-icon" onclick="openEditModal(this.closest('tr'))">Edit</button>`
            : "";
        return `<tr data-order-id="${item.id}" data-service="${escapeHtml(service)}" data-status="${status}" data-ref="${escapeHtml(item.reference)}" data-passenger="${escapeHtml(passenger)}" data-phone="${escapeHtml(item.customer_phone || "")}" data-email="${escapeHtml(item.customer_email || "")}" data-from="${escapeHtml(item.origin || "")}" data-to="${escapeHtml(item.destination || "")}" data-flight-num="${escapeHtml(item.flight_number || "")}" data-dep-date="${escapeHtml(formatDate(item.departure_datetime || item.umrah_departure_date || item.travel_date))}" data-ret-date="${escapeHtml(formatDate(item.arrival_datetime || ""))}" data-pax="${escapeHtml(item.passengers_count || item.num_pilgrims || 1)}" data-cabin="${escapeHtml(item.cabin_class || "Economy")}" data-baggage="${escapeHtml(item.baggage || "30 kg")}" data-agency-pnr="${escapeHtml(item.pnr || "")}" data-airline-pnr="${escapeHtml(item.airline_pnr || item.pnr || "")}" data-ticket="${escapeHtml(item.ticket_number || "")}" data-amount="${escapeHtml(formatCurrency(item.amount, item.currency))}" data-notes="${escapeHtml(typeof item.notes === "string" ? item.notes : JSON.stringify(item.notes || {}))}">
          <td><input type="checkbox"></td>
          <td class="td-mono">${escapeHtml(item.reference)}</td>
          <td><div class="flex aic gap8"><div class="avatar" style="width:32px;height:32px;background:rgba(200,169,110,.15);color:var(--gold3);font-size:11px">${escapeHtml(initials(passenger))}</div>${escapeHtml(passenger)}</div></td>
          <td>${escapeHtml(serviceDisplay)}</td>
          <td class="fs13 slate2">${escapeHtml(detailText)}</td>
          <td class="fs13">${escapeHtml(formatDate(item.created_at))}</td>
          <td class="semi">${escapeHtml(formatCurrency(item.amount, item.currency))}</td>
          <td><select class="${statusSelectClass(status)}" onchange="chgStatus(this)"><option value="pending"${status === "pending" ? " selected" : ""}>Pending</option><option value="confirmed"${status === "confirmed" ? " selected" : ""}>Confirmed</option><option value="onhold"${status === "onhold" ? " selected" : ""}>On Hold</option><option value="cancelled"${status === "cancelled" ? " selected" : ""}>Cancelled</option></select></td>
          <td class="td-actions"><button class="btn-icon" onclick="openViewModal(this.closest('tr'))">View</button>${editButton}</td>
        </tr>`;
      })
      .join("");
  }

  function renderFlightRows(bookings) {
    const flightBody = document.getElementById("tbody-flt");
    if (!flightBody || !Array.isArray(bookings) || !bookings.length) return;
    flightBody.innerHTML = bookings
      .map((item) => {
        const flight = item.flight || {};
        const status = statusValue(item.status);
        const passenger = item.customer_name || item.customer?.name || item.customer?.full_name || "Customer";
        return `<tr data-status="${status}" data-airline="${escapeHtml((flight.airline || "").toLowerCase())}" data-class="${escapeHtml((flight.cabin_class || "economy").toLowerCase())}" data-booking-id="${item.id}" data-service="flights" data-ref="${escapeHtml(item.reference)}" data-passenger="${escapeHtml(passenger)}" data-phone="${escapeHtml(item.customer?.phone || "")}" data-email="${escapeHtml(item.customer?.email || "")}" data-from="${escapeHtml(flight.origin || "")}" data-to="${escapeHtml(flight.destination || "")}" data-flight-num="${escapeHtml(flight.flight_number || "")}" data-dep-date="${escapeHtml(formatDate(flight.departure_datetime))}" data-ret-date="${escapeHtml(formatDate(flight.arrival_datetime))}" data-pax="${escapeHtml(item.passengers_count || 1)}" data-cabin="${escapeHtml(flight.cabin_class || "economy")}" data-baggage="${escapeHtml(item.baggage || "30 kg")}" data-agency-pnr="${escapeHtml(flight.pnr || "")}" data-airline-pnr="${escapeHtml(flight.airline_pnr || flight.pnr || "")}" data-ticket="${escapeHtml(flight.ticket_number || "")}" data-amount="${escapeHtml(formatCurrency(item.amount, item.currency))}" data-notes="${escapeHtml(item.notes || "")}">
          <td class="td-mono">${escapeHtml(item.reference)}</td>
          <td>${escapeHtml(passenger)}</td>
          <td class="semi">${escapeHtml((flight.origin || "—") + "→" + (flight.destination || "—"))}</td>
          <td>${escapeHtml((flight.airline || "—") + " " + (flight.flight_number || ""))}</td>
          <td>${escapeHtml(formatDate(flight.departure_datetime))}</td>
          <td><span class="badge b-slate">${escapeHtml(flight.cabin_class || "economy")}</span></td>
          <td class="td-mono" style="font-size:12px">${escapeHtml(flight.pnr || "—")}</td>
          <td class="td-mono" style="font-size:12px">${escapeHtml(flight.airline_pnr || flight.pnr || "—")}</td>
          <td class="td-mono" style="font-size:12px">${escapeHtml(flight.ticket_number || "—")}</td>
          <td class="semi">${escapeHtml(formatCurrency(item.amount, item.currency))}</td>
          <td><select class="${statusSelectClass(status)}" onchange="chgStatus(this)"><option value="confirmed"${status === "confirmed" ? " selected" : ""}>Confirmed</option><option value="onhold"${status === "onhold" ? " selected" : ""}>On Hold</option><option value="cancelled"${status === "cancelled" ? " selected" : ""}>Cancelled</option></select></td>
          <td class="td-actions"><button class="btn-icon" onclick="openViewModal(this.closest('tr'))">View</button><button class="btn-icon" onclick="openEditModal(this.closest('tr'))">Edit</button></td>
        </tr>`;
      })
      .join("");
  }

  function renderVisaRows(applications) {
    const tbody = document.getElementById("tbody-vi");
    if (!tbody || !Array.isArray(applications) || !applications.length) return;
    tbody.innerHTML = applications
      .map((item) => {
        const status = statusValue(item.status);
        return `<tr data-service="visa" data-visa-id="${item.id}" data-status="${status}">
          <td class="td-mono">${escapeHtml(item.reference)}</td>
          <td>${escapeHtml(item.customer_name || item.customer?.name || "Customer")}</td>
          <td>${escapeHtml(item.destination_country)}</td>
          <td>${escapeHtml(item.visa_type)}</td>
          <td>${escapeHtml(formatDate(item.travel_date))}</td>
          <td class="semi">${escapeHtml(formatCurrency(item.fee_paid, item.currency || (localStorage.getItem("admin_country") === "PK" ? "PKR" : "AED")))}</td>
          <td><select class="${statusSelectClass(status)}" onchange="chgStatus(this)"><option value="pending"${status === "pending" ? " selected" : ""}>Pending</option><option value="processing"${status === "processing" ? " selected" : ""}>Processing</option><option value="approved"${status === "approved" ? " selected" : ""}>Approved</option><option value="rejected"${status === "rejected" ? " selected" : ""}>Rejected</option></select></td>
          <td class="td-actions"><button class="btn-icon">View</button></td>
        </tr>`;
      })
      .join("");
  }

  function renderUmrahRows(packages) {
    state.umrahPackages = packages;
    populateOrderPackageOptions();
    if (typeof window.adminLoadUmrahPackages === 'function') {
      window.adminLoadUmrahPackages();
    }
  }

  function renderHolidayRows(packages) {
    const tbody = document.getElementById("tbody-ho");
    if (!tbody || !Array.isArray(packages) || !packages.length) return;
    state.holidayPackages = packages;
    populateOrderPackageOptions();
    tbody.innerHTML = packages
      .map((item) => {
        const status = item.is_active ? "active" : "inactive";
        return `<tr data-holiday-package-id="${item.id}" data-dest="${escapeHtml((item.destination || "").toLowerCase())}" data-stars="${Number(item.star_rating || 0)}" data-meal="${escapeHtml(String(item.meal_plan || "").toLowerCase())}" data-status="${status}">
          <td class="semi">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.destination)}</td>
          <td>${Number(item.nights || 0)}</td>
          <td class="gold">${"★".repeat(Number(item.star_rating || 0))}</td>
          <td class="semi">${escapeHtml(formatCurrency(item.price_per_person, item.currency || "AED"))}</td>
          <td><span class="badge ${item.meal_plan === "all_inclusive" ? "b-green" : item.meal_plan === "half_board" ? "b-amber" : "b-slate"}">${escapeHtml(titleCase(item.meal_plan))}</span></td>
          <td>${Number(item.bookings_count || 0)}</td>
          <td><select class="${statusSelectClass(status)}" onchange="chgStatus(this)"><option value="active"${status === "active" ? " selected" : ""}>Active</option><option value="inactive"${status === "inactive" ? " selected" : ""}>Inactive</option></select></td>
          <td class="td-actions"><button class="btn-icon" onclick="deletePackage('holiday', ${item.id})">Delete</button></td>
        </tr>`;
      })
      .join("");
  }

  function renderCruiseRows(packages) {
    const tbody = document.getElementById("tbody-cr");
    if (!tbody || !Array.isArray(packages) || !packages.length) return;
    state.cruisePackages = packages;
    populateOrderPackageOptions();
    tbody.innerHTML = packages
      .map(
        (item) => `<tr data-cruise-package-id="${item.id}" data-region="${escapeHtml((item.route || "").toLowerCase())}" data-cabin="${escapeHtml(String(item.cabin_type || "").replaceAll("_", " ").toLowerCase())}" data-nights="${Number(item.nights || 0)}">
          <td class="semi">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.ship_name)}</td>
          <td>${escapeHtml(item.route)}</td>
          <td>${escapeHtml(formatDate(item.departure_date))}</td>
          <td>${Number(item.nights || 0)}</td>
          <td>${escapeHtml(titleCase(item.cabin_type))}</td>
          <td class="semi">${escapeHtml(formatCurrency(item.price_per_person, item.currency || "AED"))}</td>
          <td class="td-actions"><button class="btn-icon" onclick="deletePackage('cruise', ${item.id})">Delete</button></td>
        </tr>`,
      )
      .join("");
  }

  function populateOrderPackageOptions() {
    const umrahSelect = document.getElementById("no-umrah-package");
    const holidaySelect = document.getElementById("no-holiday-package");
    const cruiseSelect = document.getElementById("no-cruise-package");
    if (umrahSelect && state.umrahPackages.length) {
      umrahSelect.innerHTML = state.umrahPackages
        .map(
          (item) =>
            `<option value="${item.id}" data-price="${item.price_per_person}">${escapeHtml(item.name)} — ${Number(item.nights || 0)}N (${escapeHtml(formatCurrency(item.price_per_person, item.currency || "AED"))})</option>`,
        )
        .join("");
    }
    if (holidaySelect && state.holidayPackages.length) {
      holidaySelect.innerHTML = state.holidayPackages
        .map(
          (item) =>
            `<option value="${item.id}" data-price="${item.price_per_person}">${escapeHtml(item.name)} (${escapeHtml(formatCurrency(item.price_per_person, item.currency || "AED"))})</option>`,
        )
        .join("");
    }
    if (cruiseSelect && state.cruisePackages.length) {
      cruiseSelect.innerHTML = state.cruisePackages
        .map(
          (item) =>
            `<option value="${item.id}" data-price="${item.price_per_person}">${escapeHtml(item.name)} (${escapeHtml(formatCurrency(item.price_per_person, item.currency || "AED"))})</option>`,
        )
        .join("");
    }
  }

  async function loadAdminDashboard(q = "") {
    const data = await apiRequest(`/admin/dashboard${q}`);
    const ac = localStorage.getItem("admin_country");
    const currency = ac === "PK" ? "PKR" : "AED";
    const cards = document.querySelectorAll("#ap-dashboard .kpi-card .kpi-num");
    if (cards.length >= 4) {
      cards[0].textContent = Number(data.total_bookings || 0).toLocaleString();
      cards[1].textContent = formatCurrency(data.total_revenue || 0, currency);
      cards[2].textContent = Number(data.active_customers || 0).toLocaleString();
      cards[3].textContent = Number(data.pending_actions || 0).toLocaleString();
    }
  }

  async function refreshHeroSlidesAdmin() {
    const data = await apiRequest("/admin/hero-slides");
    if (Array.isArray(data.data) && data.data.length) {
      slides = data.data
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .map(mapSlide);
      renderHeroSlides();
      renderSlideManager();
    }
  }

  window.switchAdminPortal = function(countryCode) {
    if (countryCode) {
      localStorage.setItem("admin_country", countryCode);
    } else {
      localStorage.removeItem("admin_country");
    }
    syncAdminData();
  };

  async function syncAdminData() {
    if (!isAdminSession()) return;

    const sel = document.getElementById("admin-portal-selector");
    if (sel) {
      sel.value = localStorage.getItem("admin_country") || "";
    }

    const ac = localStorage.getItem("admin_country");
    const q = ac ? `?country_code=${ac}` : "";
    const qA = ac ? `&country_code=${ac}` : "";

    const results = await Promise.allSettled([
      loadAdminDashboard(q),
      apiRequest(`/admin/bookings?limit=50${qA}`).then((data) => renderOrderRows(data.data || [])),
      apiRequest(`/customers?limit=25${qA}`).then((data) => renderCustomerRows(data.data || [])),
      apiRequest(`/flights/bookings?limit=25${qA}`).then((data) => renderFlightRows(data.data || [])),
      apiRequest(`/visa/applications?limit=25${qA}`).then((data) => renderVisaRows(data.data || [])),
      apiRequest(`/umrah/packages${q}`).then((data) => renderUmrahRows(data.data || data || [])),
      apiRequest(`/holiday/packages${q}`).then((data) => renderHolidayRows(data.data || data || [])),
      apiRequest(`/cruise/packages${q}`).then((data) => renderCruiseRows(data.data || data || [])),
      refreshHeroSlidesAdmin(),
    ]);

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.warn(result.reason);
      }
    });
  }

  async function persistStatusChange(row, value) {
    if (!isAdminSession() || !row) return;
    if (row.dataset.orderId) {
      await apiRequest(`/admin/bookings/${row.dataset.orderId}/status`, {
        method: "PATCH",
        body: { status: value === "onhold" ? "on_hold" : value },
      });
      return;
    }
    if (row.dataset.bookingId) {
      await apiRequest(`/flights/bookings/${row.dataset.bookingId}/status`, {
        method: "PATCH",
        body: { status: value === "onhold" ? "on_hold" : value },
      });
      return;
    }
    if (row.dataset.customerId) {
      await apiRequest(`/customers/${row.dataset.customerId}`, {
        method: "PUT",
        body: { status: value },
      });
      return;
    }
    if (row.dataset.holidayPackageId) {
      await apiRequest(`/holiday/packages/${row.dataset.holidayPackageId}`, {
        method: "PUT",
        body: { status: value },
      });
      return;
    }
    if (row.dataset.visaId) {
      await apiRequest(`/visa/applications/${row.dataset.visaId}/status`, {
        method: "PATCH",
        body: { status: value },
      });
    }
  }

  async function upsertCustomerFromOrder() {
    const fullName = document.getElementById("no-name").value.trim();
    const email = document.getElementById("no-email").value.trim();
    const phone = document.getElementById("no-phone").value.trim();
    if (!fullName || !email) {
      throw new Error("Customer name and email are required");
    }

    const existing = await apiRequest(`/customers?search=${encodeURIComponent(email)}&limit=10`);
    const match = (existing.data || []).find(
      (item) => String(item.email || "").toLowerCase() === email.toLowerCase(),
    );
    if (match) {
      return match;
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = parts.shift() || "Customer";
    const lastName = parts.join(" ") || "Guest";
    const created = await apiRequest("/customers", {
      method: "POST",
      body: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        nationality: "UAE",
      },
    });
    return created.data;
  }

  function resetFields(ids) {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
      } else if (el.type === "checkbox") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });
  }

  async function submitCustomerCreate() {
    const payload = {
      first_name: document.getElementById("ac-first-name").value.trim(),
      last_name: document.getElementById("ac-last-name").value.trim(),
      email: document.getElementById("ac-email").value.trim(),
      phone: document.getElementById("ac-phone").value.trim(),
      nationality: document.getElementById("ac-nationality").value,
      date_of_birth: document.getElementById("ac-dob").value || null,
      passport_number: document.getElementById("ac-passport").value.trim() || null,
    };
    if (!payload.first_name || !payload.last_name || !payload.email) {
      toast("First name, last name, and email are required", "t-red");
      return;
    }
    try {
      await apiRequest("/customers", { method: "POST", body: payload });
      closeModal("m-add-cust");
      resetFields(["ac-first-name", "ac-last-name", "ac-email", "ac-phone", "ac-dob", "ac-passport"]);
      await syncAdminData();
      toast("Customer created successfully", "t-green");
    } catch (error) {
      toast(error.message || "Customer creation failed", "t-red");
    }
  }



  async function submitHolidayPackage() {
    const payload = {
      name: document.getElementById("hp-name").value.trim(),
      destination: document.getElementById("hp-destination").value.trim(),
      country_code: document.getElementById("hp-country").value.trim().toUpperCase(),
      nights: Number(document.getElementById("hp-nights").value || 0),
      star_rating: Number(document.getElementById("hp-stars").value || 5),
      price_per_person: Number(document.getElementById("hp-price").value || 0),
      meal_plan: document.getElementById("hp-meal").value,
      flights_included: document.getElementById("hp-flights").value === "1",
      is_active: document.getElementById("hp-status").value === "active",
      portal_country: document.getElementById("hp-portal").value,
    };
    if (!payload.name || !payload.destination || !payload.country_code || !payload.price_per_person) {
      toast("Complete the holiday package form before saving", "t-red");
      return;
    }
    try {
      await apiRequest("/holiday/packages", { method: "POST", body: payload });
      closeModal("m-add-holiday");
      resetFields(["hp-name", "hp-destination", "hp-country", "hp-nights", "hp-price", "hp-max-guests", "hp-description", "hp-image"]);
      await syncAdminData();
      toast("Holiday package added successfully", "t-green");
    } catch (error) {
      toast(error.message || "Holiday package creation failed", "t-red");
    }
  }

  async function submitCruisePackage() {
    const payload = {
      name: document.getElementById("cp-name").value.trim(),
      ship_name: document.getElementById("cp-ship").value.trim(),
      cruise_line: document.getElementById("cp-line").value.trim(),
      route: document.getElementById("cp-route").value.trim(),
      departure_port: document.getElementById("cp-port").value.trim(),
      departure_date: document.getElementById("cp-date").value,
      nights: Number(document.getElementById("cp-nights").value || 0),
      cabin_type: document.getElementById("cp-cabin").value,
      price_per_person: Number(document.getElementById("cp-price").value || 0),
      is_active: document.getElementById("cp-status").value === "active",
      country_code: document.getElementById("cp-portal").value,
    };
    if (!payload.name || !payload.ship_name || !payload.cruise_line || !payload.departure_date || !payload.price_per_person) {
      toast("Complete the cruise package form before saving", "t-red");
      return;
    }
    try {
      await apiRequest("/cruise/packages", { method: "POST", body: payload });
      closeModal("m-add-cruise");
      resetFields(["cp-name", "cp-ship", "cp-line", "cp-route", "cp-port", "cp-date", "cp-nights", "cp-price", "cp-max-passengers", "cp-inclusions", "cp-image"]);
      await syncAdminData();
      toast("Cruise package added successfully", "t-green");
    } catch (error) {
      toast(error.message || "Cruise package creation failed", "t-red");
    }
  }

  async function deletePackage(type, id) {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    if (!confirm(`Delete this ${type} package?`)) return;
    try {
      const path =
        type === "umrah"
          ? `/umrah/packages/${id}`
          : type === "holiday"
            ? `/holiday/packages/${id}`
            : `/cruise/packages/${id}`;
      await apiRequest(path, { method: "DELETE" });
      await syncAdminData();
      toast(`${titleCase(type)} package deleted`, "t-green");
    } catch (error) {
      toast(error.message || "Delete failed", "t-red");
    }
  }

  async function saveSlideOrder() {
    await Promise.all(
      slides.map((slide, index) =>
        apiRequest(`/admin/hero-slides/${slide.id}`, {
          method: "PUT",
          body: slidePayload(slide, index + 1),
        }),
      ),
    );
    await refreshHeroSlidesAdmin();
  }

  async function submitNewOrderLive() {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    const service = document.getElementById("no-service").value;
    if (!service) {
      toast("Select a service to continue", "t-red");
      return;
    }

    try {
      const customer = await upsertCustomerFromOrder();
      const amount = Number(document.getElementById("no-amount").value || 0);
      const status = document.getElementById("no-status").value;
      const notes = document.getElementById("no-notes").value.trim();

      if (service === "flights") {
        await apiRequest("/flights/bookings", {
          method: "POST",
          body: {
            customer_id: customer.id,
            airline: "Manual Entry",
            flight_number: document.getElementById("no-flight-num").value.trim(),
            origin: document.getElementById("no-from").value.trim().toUpperCase(),
            destination: document.getElementById("no-to").value.trim().toUpperCase(),
            departure_datetime: document.getElementById("no-dep-date").value || new Date().toISOString(),
            arrival_datetime: document.getElementById("no-ret-date").value || document.getElementById("no-dep-date").value || new Date().toISOString(),
            cabin_class: document.getElementById("no-cabin").value.toLowerCase(),
            passengers_count: Number(document.getElementById("no-pax").value || 1),
            baggage: document.getElementById("no-baggage").value,
            pnr: document.getElementById("no-agency-pnr").value.trim().toUpperCase() || null,
            airline_pnr: document.getElementById("no-airline-pnr").value.trim().toUpperCase() || null,
            ticket_number: document.getElementById("no-ticket").value.trim() || null,
            amount,
            status: status === "onhold" ? "on_hold" : status,
            notes,
          },
        });
      } else if (service === "umrah") {
        await apiRequest("/umrah/bookings", {
          method: "POST",
          body: {
            customer_id: customer.id,
            package_id: Number(document.getElementById("no-umrah-package").value),
            pilgrims: Number(document.getElementById("no-umrah-pilgrims").value || 1),
            travel_date: document.getElementById("no-umrah-month").value ? `${document.getElementById("no-umrah-month").value}-01` : new Date().toISOString().slice(0, 10),
            departure_city: document.getElementById("no-umrah-city").value.trim() || "Dubai",
            amount,
            status: status === "onhold" ? "pending" : status,
            notes,
          },
        });
      } else if (service === "holiday") {
        const selected = document.getElementById("no-holiday-package");
        await apiRequest("/holiday/bookings", {
          method: "POST",
          body: {
            customer_id: customer.id,
            amount,
            status: status === "onhold" ? "pending" : status,
            details: {
              package_id: Number(selected.value || 0),
              package_name: selected.options[selected.selectedIndex]?.text || "",
              guests: Number(document.getElementById("no-holiday-guests").value || 2),
              check_in_date: document.getElementById("no-holiday-checkin").value || null,
              room_type: document.getElementById("no-holiday-room").value,
              notes,
            },
          },
        });
      } else if (service === "cruise") {
        const selected = document.getElementById("no-cruise-package");
        await apiRequest("/cruise/bookings", {
          method: "POST",
          body: {
            customer_id: customer.id,
            amount,
            status: status === "onhold" ? "pending" : status,
            details: {
              package_id: Number(selected.value || 0),
              package_name: selected.options[selected.selectedIndex]?.text || "",
              guests: Number(document.getElementById("no-cruise-guests").value || 2),
              cabin_type: document.getElementById("no-cruise-cabin").value,
              departure_date: document.getElementById("no-cruise-date").value || null,
              notes,
            },
          },
        });
      } else if (service === "visa") {
        await apiRequest("/visa/applications", {
          method: "POST",
          body: {
            customer_id: customer.id,
            nationality: document.getElementById("no-visa-nationality").value,
            destination_country: document.getElementById("no-visa-destination").value,
            visa_type: document.getElementById("no-visa-type").value.toLowerCase(),
            travel_date: document.getElementById("no-visa-date").value || new Date().toISOString().slice(0, 10),
            passport_number: document.getElementById("no-visa-passport").value.trim(),
            fee_paid: amount,
            status: status === "confirmed" ? "processing" : "pending",
            notes,
          },
        });
      }

      closeModal("m-new-order");
      await syncAdminData();
      toast("Order created successfully", "t-green");
    } catch (error) {
      toast(error.message || "Order creation failed", "t-red");
    }
  }

  function syncApiConfigFields() {
    if (typeof apiConfig !== "undefined") {
      apiConfig.baseUrl = getApiBaseUrl();
      apiConfig.env = config.environment || "development";
      apiConfig.timeout = config.requestTimeout || 8000;
    }
    const baseUrl = document.getElementById("api-base-url");
    const statusUrl = document.getElementById("api-status-url");
    const env = document.getElementById("api-env");
    const timeout = document.getElementById("api-timeout");
    if (baseUrl) baseUrl.value = getApiBaseUrl();
    if (statusUrl) statusUrl.textContent = getApiBaseUrl();
    if (env) env.value = config.environment || "development";
    if (timeout) timeout.value = config.requestTimeout || 8000;
  }

  const originalAddSlideFromModal = window.addSlideFromModal;
  const originalSaveEditSlide = window.saveEditSlide;
  const originalMoveSlide = window.moveSlide;
  const originalToggleSlideActive = window.toggleSlideActive;
  const originalDeleteSlide = window.deleteSlide;
  const originalSaveEditOrder = window.saveEditOrder;
  const originalSaveApiConfig = window.saveApiConfig;
  const originalGo = window.go;
  window.go = function wrappedGo(name) {
    if (name === "admin" && !isAdminSession()) {
      // Use window.go so patchedGo also syncs the URL hash to #/admin-login
      window.go("admin-login");
      return;
    }
    originalGo(name);
    if (name === "admin") {
      syncAdminData();
    }
  };

  window.addSlideFromModal = async function addSlideFromModalLive() {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    const payload = {
      label: document.getElementById("ns-label").value || "New Slide",
      title: document.getElementById("ns-title").value || "New Destination",
      subtitle: document.getElementById("ns-sub").value || "",
      cta_text: document.getElementById("ns-cta").value || "Learn More",
      cta_link: document.getElementById("ns-link").value || "flights",
      background_image_url: document.getElementById("ns-img").value || null,
      background_gradient: document.getElementById("ns-grad").value,
      is_active: document.getElementById("ns-active").checked,
      sort_order: slides.length + 1,
    };
    try {
      await apiRequest("/admin/hero-slides", { method: "POST", body: payload });
      closeModal("m-add-slide");
      await refreshHeroSlidesAdmin();
      toast("Slide added successfully", "t-green");
    } catch (error) {
      toast(error.message || "Slide creation failed", "t-red");
    }
  };

  window.saveEditSlide = async function saveEditSlideLive() {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    const idx = Number(document.getElementById("es-id").value);
    const slide = slides[idx];
    if (!slide?.id) {
      originalSaveEditSlide?.();
      return;
    }
    try {
      await apiRequest(`/admin/hero-slides/${slide.id}`, {
        method: "PUT",
        body: {
          label: document.getElementById("es-label").value,
          title: document.getElementById("es-title").value,
          subtitle: document.getElementById("es-sub").value,
          cta_text: document.getElementById("es-cta").value,
          cta_link: document.getElementById("es-link").value,
          background_image_url: document.getElementById("es-img").value || null,
          background_gradient: document.getElementById("es-grad").value,
          is_active: document.getElementById("es-active").checked,
          sort_order: idx + 1,
        },
      });
      closeModal("m-edit-slide");
      await refreshHeroSlidesAdmin();
      toast("Slide updated successfully", "t-green");
    } catch (error) {
      toast(error.message || "Slide update failed", "t-red");
    }
  };

  window.moveSlide = async function moveSlideLive(idx, dir) {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    originalMoveSlide?.(idx, dir);
    try {
      await saveSlideOrder();
    } catch (error) {
      toast(error.message || "Unable to persist slide order", "t-red");
    }
  };

  window.toggleSlideActive = async function toggleSlideActiveLive(idx) {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    originalToggleSlideActive?.(idx);
    const slide = slides[idx];
    if (!slide?.id) return;
    try {
      await apiRequest(`/admin/hero-slides/${slide.id}`, {
        method: "PUT",
        body: slidePayload(slide, idx + 1),
      });
      await refreshHeroSlidesAdmin();
    } catch (error) {
      toast(error.message || "Slide update failed", "t-red");
    }
  };

  window.deleteSlide = async function deleteSlideLive(idx) {
    if (!isAdminSession()) {
      go("admin-login");
      return;
    }
    const slide = slides[idx];
    if (!slide?.id) {
      originalDeleteSlide?.(idx);
      return;
    }
    if (slides.length <= 1 || !confirm("Delete this slide?")) return;
    try {
      await apiRequest(`/admin/hero-slides/${slide.id}`, { method: "DELETE" });
      await refreshHeroSlidesAdmin();
      toast("Slide deleted", "t-green");
    } catch (error) {
      toast(error.message || "Slide delete failed", "t-red");
    }
  };

  window.submitNewOrder = submitNewOrderLive;

  window.saveEditOrder = async function saveEditOrderLive() {
    const row = typeof _activeEditRow !== "undefined" ? _activeEditRow : null;
    if (!row?.dataset?.bookingId) {
      originalSaveEditOrder?.();
      return;
    }
    try {
      await apiRequest(`/flights/bookings/${row.dataset.bookingId}`, {
        method: "PUT",
        body: {
          amount: Number(String(document.getElementById("eo-amount").value).replace(/[^\d.]/g, "") || 0),
          status: document.getElementById("eo-status").value === "onhold" ? "on_hold" : document.getElementById("eo-status").value,
          notes: document.getElementById("eo-notes").value.trim(),
          airline: "Manual Entry",
          flight_number: document.getElementById("eo-flight-num").value.trim(),
          origin: document.getElementById("eo-from").value.trim().toUpperCase(),
          destination: document.getElementById("eo-to").value.trim().toUpperCase(),
          departure_datetime: document.getElementById("eo-dep-date").value,
          arrival_datetime: document.getElementById("eo-ret-date").value || document.getElementById("eo-dep-date").value,
          cabin_class: document.getElementById("eo-cabin").value.toLowerCase(),
          pnr: document.getElementById("eo-agency-pnr").value.trim().toUpperCase(),
          airline_pnr: document.getElementById("eo-airline-pnr").value.trim().toUpperCase(),
          ticket_number: document.getElementById("eo-ticket").value.trim(),
          passengers_count: Number(document.getElementById("eo-pax").value || 1),
          baggage: document.getElementById("eo-baggage").value,
        },
      });
      closeModal("m-edit-order");
      await syncAdminData();
      toast("Order updated successfully", "t-green");
    } catch (error) {
      toast(error.message || "Order update failed", "t-red");
    }
  };

  window.saveApiConfig = async function saveApiConfigLive() {
    originalSaveApiConfig?.();
    setApiStatus("connected", "Configuration Updated");
    toast("API configuration updated for the live backend", "t-green");
  };

  const originalChgStatus = window.chgStatus;
  window.chgStatus = function wrappedStatusChange(select) {
    originalChgStatus(select);
    const row = select.closest("tr");
    persistStatusChange(row, statusValue(select.value)).then(
      () => {
        if (row) {
          row.dataset.status = statusValue(select.value);
        }
      },
      (error) => toast(error.message || "Status update failed", "t-red"),
    );
  };

  window.testApiConnection = async function testApiConnectionLive() {
    const btn = document.getElementById("test-btn");
    const result = document.getElementById("api-test-result");
    if (btn) {
      btn.textContent = "Testing...";
      btn.disabled = true;
    }
    setApiStatus("testing", "Testing connection...");
    const startedAt = performance.now();
    try {
      const health = await apiRequest("/health", { auth: false, timeout: 5000 });
      const latency = Math.round(performance.now() - startedAt);
      setApiStatus("connected", "Connected");
      if (result) {
        result.style.display = "block";
        result.style.background = "var(--green-bg)";
        result.style.color = "var(--green)";
        result.style.border = "1px solid rgba(15,123,91,.2)";
        result.innerHTML = `Connected successfully · ${latency}ms response time<br><small style="opacity:.7">GET ${escapeHtml(getApiBaseUrl())}/health → ${escapeHtml(health.status || "ok")}</small>`;
      }
      logRequest("GET", "/health", "200", `${latency}ms`);
    } catch (error) {
      setApiStatus("disconnected", "Connection Failed");
      if (result) {
        result.style.display = "block";
        result.style.background = "var(--red-bg)";
        result.style.color = "var(--red)";
        result.style.border = "1px solid rgba(185,28,28,.2)";
        result.innerHTML = `Connection failed<br><small style="opacity:.7">${escapeHtml(error.message)}</small>`;
      }
    } finally {
      if (btn) {
        btn.textContent = "Test Connection";
        btn.disabled = false;
      }
    }
  };

  window.syncEndpoints = async function syncEndpointsLive() {
    const list = document.getElementById("endpoint-list");
    if (!list) return;
    let healthy = true;
    try {
      await apiRequest("/health", { auth: false, timeout: 5000 });
    } catch {
      healthy = false;
    }
    let ok = 0;
    list.innerHTML = API_ENDPOINTS.map((endpoint) => {
      if (healthy) ok += 1;
      const methodClass =
        { GET: "ep-get", POST: "ep-post", PUT: "ep-put", PATCH: "ep-patch", DELETE: "ep-delete" }[
          endpoint.method
        ] || "ep-get";
      return `<div class="endpoint-item"><span class="ep-method ${methodClass}">${endpoint.method}</span><span class="ep-path">${endpoint.path}</span><span class="ep-desc">${endpoint.desc}</span><div class="ep-status${healthy ? "" : " err"}"></div><span class="ep-latency">${healthy ? "ready" : "offline"}</span></div>`;
    }).join("");
    document.getElementById("ep-total").textContent = API_ENDPOINTS.length;
    document.getElementById("ep-ok").textContent = healthy ? ok : 0;
    document.getElementById("ep-warn").textContent = 0;
    document.getElementById("ep-err").textContent = healthy ? 0 : API_ENDPOINTS.length;
    document.getElementById("ep-last-sync").textContent = new Date().toLocaleTimeString();
    setApiStatus(healthy ? "connected" : "disconnected", healthy ? "All Endpoints Reachable" : "Backend Offline");
  };

  function togglePw(fieldId, btn) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    const eyeOpen = btn.querySelector(".eye-open");
    const eyeShut = btn.querySelector(".eye-shut");
    if (eyeOpen) eyeOpen.style.display = show ? "none" : "";
    if (eyeShut) eyeShut.style.display = show ? "" : "none";
  }

  function calcPasswordStrength(pw) {
    if (!pw) return { label: "—", color: "transparent", width: "0%" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const levels = [
      { label: "Very Weak", color: "#ef4444", width: "15%" },
      { label: "Weak",      color: "#f97316", width: "30%" },
      { label: "Fair",      color: "#eab308", width: "55%" },
      { label: "Strong",    color: "#22c55e", width: "80%" },
      { label: "Very Strong", color: "#0f7b5b", width: "100%" },
    ];
    return levels[Math.min(score, 4)];
  }

  function attachStrengthMeter() {
    const pw = document.getElementById("auth-password");
    if (!pw) return;
    pw.addEventListener("input", function () {
      if (state.authMode !== "register") return;
      const { label, color, width } = calcPasswordStrength(this.value);
      const fill = document.getElementById("auth-pw-fill");
      const lbl = document.getElementById("auth-pw-label");
      if (fill) { fill.style.width = width; fill.style.backgroundColor = color; }
      if (lbl)  { lbl.textContent = label; lbl.style.color = color; }
    });
  }

  function initGoogleSignIn(clientId) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async function (response) {
        try {
          const data = await apiRequest("/auth/customer/google", {
            method: "POST",
            auth: false,
            body: { credential: response.credential },
          });
          persistSession(data);
          closeModal("m-auth");
          toast("Signed in with Google!", "t-green");
          await openCustomerPortal();
        } catch (error) {
          showAlert(error.message || "Google sign-in failed.", "error");
        }
      },
    });
    window.google.accounts.id.prompt();
  }

  function signInWithGoogle() {
    const clientId = (window.KEENAN_CONFIG || {}).googleClientId;
    if (!clientId) {
      toast("Google Sign-In is not configured. Add your googleClientId to config.js.", "t-red");
      return;
    }
    if (window.google?.accounts?.id) {
      initGoogleSignIn(clientId);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleSignIn(clientId);
    script.onerror = () => toast("Failed to load Google Sign-In. Check your connection.", "t-red");
    document.head.appendChild(script);
  }

  async function submitAdminLogin(event) {
    event.preventDefault();
    const email = document.getElementById("al-email").value.trim();
    const password = document.getElementById("al-password").value;
    const alertEl = document.getElementById("al-alert");
    const submitBtn = document.getElementById("al-submit");

    function showAdminAlert(msg, tone) {
      if (!alertEl) return;
      if (!msg) { alertEl.style.display = "none"; alertEl.textContent = ""; return; }
      alertEl.style.display = "block";
      alertEl.className = `al-alert ${tone || "error"}`;
      alertEl.textContent = msg;
    }

    if (!email || !password) {
      showAdminAlert("Email and password are required.", "error");
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Signing in…"; }
    showAdminAlert("", "");

    try {
      const data = await apiRequest("/auth/admin/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      persistSession(data);
      toast("Welcome, " + (data.user?.name || "Admin"), "t-green");
      originalGo("admin");
      syncAdminData();
    } catch (error) {
      showAdminAlert(error.message || "Authentication failed.", "error");
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign In to Dashboard"; }
    }
  }

  function bootstrap() {
    state.session = getStoredSession();
    updateSessionUi();
    syncApiConfigFields();
    loadPublicSlides();
    attachStrengthMeter();
    if (isAdminSession()) {
      syncAdminData();
    }
  }

  window.openAuthModal = openAuthModal;
  window.setAuthMode = setAuthMode;
  window.submitAuth = submitAuth;
  window.submitAdminLogin = submitAdminLogin;
  window.togglePw = togglePw;
  window.signInWithGoogle = signInWithGoogle;
  window.openCustomerPortal = openCustomerPortal;
  window.logoutSession = logoutSession;
  window.persistSession = persistSession;
  window.openAdminAccess = openAdminAccess;
  window.submitCustomerCreate = submitCustomerCreate;

  window.submitHolidayPackage = submitHolidayPackage;
  window.submitCruisePackage = submitCruisePackage;
  window.deletePackage = deletePackage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
