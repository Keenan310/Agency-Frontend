/**
 * ── Admin Real-Time Notification System ──────────────────────────────────────
 * Lightweight polling module (no Socket.io needed).
 * Polls /admin/notifications/latest every 15 seconds.
 * Shows red badge, audio ping, and live dropdown feed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── Config ────────────────────────────────────────────────────────────── */
  const POLL_INTERVAL_MS = 15_000; // 15 s
  const MAX_FEED_ITEMS   = 20;
  const SVC_ICONS        = { umrah: '🕌', flights: '✈', holiday: '🌴', cruise: '🚢', visa: '🛂' };

  /* ── State ─────────────────────────────────────────────────────────────── */
  let _pollTimer      = null;
  let _lastSeenTime   = new Date().toISOString(); // mark session start
  let _unreadCount    = 0;
  let _notifFeed      = [];      // array of booking objects (newest first)
  let _dropdownOpen   = false;
  let _audioCtx       = null;
  let _initialized    = false;

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  function _token() {
    try { return JSON.parse(localStorage.getItem('keenanTravelSession') || 'null')?.token || ''; }
    catch { return ''; }
  }

  function _apiBase() {
    return ((window.KEENAN_CONFIG || {}).apiBaseUrl || 'http://localhost:3000/v1').replace(/\/$/, '');
  }

  function _timeSince(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  /* ── Audio ping (Web Audio API — no external files) ───────────────────── */
  function _initAudio() {
    if (_audioCtx) return;
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* silently fail */ }
  }

  function _playPing() {
    _initAudio();
    if (!_audioCtx) return;
    try {
      // Professional two-tone "ding": high then slight fall
      const now = _audioCtx.currentTime;
      [{ f: 880, t: 0 }, { f: 660, t: 0.12 }].forEach(({ f, t }) => {
        const osc  = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.25, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.45);
        osc.start(now + t);
        osc.stop(now + t + 0.5);
      });
    } catch { /* silently fail */ }
  }

  /* ── Badge ─────────────────────────────────────────────────────────────── */
  function _renderBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (_unreadCount > 0) {
      badge.textContent = _unreadCount > 9 ? '9+' : _unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  /* ── Dropdown feed ─────────────────────────────────────────────────────── */
  function _renderDropdown() {
    const feed = document.getElementById('notif-feed');
    if (!feed) return;

    if (!_notifFeed.length) {
      feed.innerHTML = '<div class="notif-empty">No new bookings yet</div>';
      return;
    }

    feed.innerHTML = _notifFeed.slice(0, MAX_FEED_ITEMS).map(b => {
      const icon  = SVC_ICONS[b.service_type] || '📋';
      const color = b.status === 'confirmed' ? 'var(--green)' : b.status === 'cancelled' ? 'var(--red)' : 'var(--amber)';
      return `
        <div class="notif-item" onclick="notifJumpTo(${b.id},'${b.service_type}')">
          <div class="notif-icon">${icon}</div>
          <div class="notif-body">
            <div class="notif-title">${b.reference} · ${b.customer_name}</div>
            <div class="notif-meta">
              <span>${b.service_type.charAt(0).toUpperCase() + b.service_type.slice(1)}</span>
              <span style="color:${color};font-weight:600">${b.status}</span>
              <span class="notif-time">${_timeSince(b.created_at)}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function _toggleDropdown() {
    const drop = document.getElementById('notif-dropdown');
    if (!drop) return;
    _dropdownOpen = !_dropdownOpen;

    if (_dropdownOpen) {
      // Mark all as read
      _unreadCount = 0;
      _renderBadge();
      _renderDropdown();
      drop.classList.add('open');

      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', _outsideClose, { once: true });
      }, 10);
    } else {
      drop.classList.remove('open');
    }
  }

  function _outsideClose(e) {
    const bell = document.getElementById('notif-bell-wrap');
    if (bell && bell.contains(e.target)) return;
    const drop = document.getElementById('notif-dropdown');
    if (drop) drop.classList.remove('open');
    _dropdownOpen = false;
  }

  /* ── Polling ───────────────────────────────────────────────────────────── */
  async function _poll() {
    const tok = _token();
    if (!tok) return; // not logged in

    try {
      const res = await fetch(
        `${_apiBase()}/admin/notifications/latest?since=${encodeURIComponent(_lastSeenTime)}&limit=20`,
        { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' }
      );
      if (!res.ok) return;
      const json = await res.json();
      const rows = json.data || [];

      // Update last-seen to server time so we stay in sync
      if (json.server_time) _lastSeenTime = json.server_time;

      if (rows.length > 0) {
        _unreadCount += rows.length;
        // Prepend to feed (newest first)
        _notifFeed = [...rows, ..._notifFeed].slice(0, MAX_FEED_ITEMS);
        _renderBadge();
        _playPing();
        // If dropdown is open, refresh it
        if (_dropdownOpen) _renderDropdown();
      }
    } catch { /* network error — try again next tick */ }
  }

  /* ── DOM injection ─────────────────────────────────────────────────────── */
  function _injectHTML() {
    const bellWrap = document.getElementById('notif-bell-wrap');
    if (bellWrap) return; // already injected

    // Find the existing bell placeholder by its known ID
    const oldBell = document.getElementById('notif-bell-wrap-placeholder');
    if (!oldBell) return;

    oldBell.outerHTML = `
      <div id="notif-bell-wrap" style="position:relative">
        <button id="notif-bell-btn" class="atb-btn" title="Notifications" aria-label="Notifications" style="position:relative;display:flex;align-items:center;justify-content:center">
          🔔
          <span id="notif-badge" style="
            display:none;
            position:absolute;
            top:-4px;right:-4px;
            min-width:18px;height:18px;
            background:#ef4444;color:#fff;
            border-radius:50%;
            font-size:10px;font-weight:700;
            align-items:center;justify-content:center;
            border:2px solid var(--surface,#1e2330);
            line-height:1;padding:0 3px;
            animation:notif-pop .3s cubic-bezier(.34,1.56,.64,1);
            box-shadow:0 0 0 3px rgba(239,68,68,.25)
          ">0</span>
        </button>
        <div id="notif-dropdown" style="
          display:none;position:absolute;top:calc(100% + 10px);right:0;
          width:320px;max-height:420px;overflow-y:auto;
          background:var(--surface,#1e2330);
          border:1px solid var(--surface3,#2c3347);
          border-radius:12px;
          box-shadow:0 8px 32px rgba(0,0,0,.4);
          z-index:9999;
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--surface3,#2c3347)">
            <span style="font-size:13px;font-weight:700;color:var(--ink,#f1f5f9)">🔔 Notifications</span>
            <button onclick="notifMarkAllRead()" style="font-size:11px;color:var(--slate2,#94a3b8);background:none;border:none;cursor:pointer;padding:0">Mark all read</button>
          </div>
          <div id="notif-feed" style="padding:8px 0">
            <div class="notif-empty">Listening for new bookings…</div>
          </div>
        </div>
      </div>`;

    // Re-select and wire click
    const btn = document.getElementById('notif-bell-btn');
    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); _toggleDropdown(); _initAudio(); });
  }

  function _injectStyles() {
    if (document.getElementById('notif-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.textContent = `
      #notif-dropdown.open { display:block !important; }
      @keyframes notif-pop {
        0%  { transform:scale(0); }
        80% { transform:scale(1.2); }
        100%{ transform:scale(1); }
      }
      .notif-item {
        display:flex;align-items:flex-start;gap:10px;
        padding:10px 16px;cursor:pointer;
        transition:background .15s;
        border-bottom:1px solid var(--surface3,#2c3347);
      }
      .notif-item:last-child { border-bottom:none; }
      .notif-item:hover { background:rgba(255,255,255,.04); }
      .notif-icon {
        font-size:18px;line-height:1;
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,.06);
        border-radius:8px;flex-shrink:0;
      }
      .notif-body { flex:1;min-width:0; }
      .notif-title { font-size:12px;font-weight:600;color:var(--ink,#f1f5f9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .notif-meta  { font-size:11px;color:var(--slate2,#94a3b8);display:flex;gap:6px;margin-top:2px;flex-wrap:wrap; }
      .notif-time  { margin-left:auto;font-style:italic; }
      .notif-empty { padding:24px 16px;text-align:center;font-size:12px;color:var(--slate2,#94a3b8); }
    `;
    document.head.appendChild(style);
  }

  /* ── Public API ────────────────────────────────────────────────────────── */
  window.notifMarkAllRead = function() {
    _unreadCount = 0;
    _renderBadge();
    const drop = document.getElementById('notif-dropdown');
    if (drop) drop.classList.remove('open');
    _dropdownOpen = false;
  };

  window.notifJumpTo = function(bookingId, serviceType) {
    notifMarkAllRead();
    // Navigate to the relevant panel
    if (typeof window.aPanel === 'function') {
      const panelMap = { umrah: 'umrah', flights: 'flights', holiday: 'holiday', cruise: 'cruise', visa: 'visa' };
      const panel = panelMap[serviceType] || 'orders';
      window.aPanel(panel, document.querySelector(`.an-item[onclick*="'${panel}'"]`));
    }
  };

  /* ── Init ──────────────────────────────────────────────────────────────── */
  function _init() {
    _injectStyles();
    _injectHTML();

    if (_initialized) return;
    _initialized = true;

    // Start polling — first poll after 3 s (let page settle), then every 15 s
    setTimeout(() => {
      _poll();
      _pollTimer = setInterval(_poll, POLL_INTERVAL_MS);
    }, 3000);
  }

  // Wait until the admin panel DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    // Module might be injected after DOMContentLoaded (dynamic module system)
    _init();
  }

  // Also expose for manual call after mount
  window.initAdminNotifications = _init;
})();
