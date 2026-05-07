window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["site-nav"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "site-nav";
    
    // Set initial lang options based on current KT country
    if (window.KT) {
      window.updateLangOptions(window.KT.get().lang);
    }
  },
};

window.switchCountry = function(code) {
  if (window.KT) {
    window.KT.set(code);
  }
};

window.toggleCountryMenu = function() {
  document.getElementById('country-menu').classList.toggle('open');
};

window.updateLangOptions = function(langs) {
  const el = document.getElementById('cm-langs');
  if (!el) return;
  el.innerHTML = langs.map(l =>
    `<button class="cm-lang-btn" onclick="setLang('${l}')">${l}</button>`
  ).join('');
};

window.updateNavPortalUI = function() {
  if (!window.KT) return;
  const ctx = window.KT.get();
  
  const flagEl = document.getElementById('cs-flag');
  const nameEl = document.getElementById('cs-name');
  const currEl = document.getElementById('cs-currency');
  
  if (flagEl) flagEl.textContent = ctx.flag;
  if (nameEl) nameEl.textContent = ctx.name;
  if (currEl) currEl.textContent = ctx.currency;
  
  ['AE', 'PK'].forEach(c => {
    const el = document.getElementById(`cm-check-${c}`);
    if (el) el.style.display = c === ctx.code ? 'inline' : 'none';
  });
  
  window.updateLangOptions(ctx.lang);
  
  const menu = document.getElementById('country-menu');
  if (menu) menu.classList.remove('open');
  
  if (typeof window.toast === 'function') {
    window.toast(`Portal switched to ${ctx.flag} ${ctx.name} — prices in ${ctx.currency}`, 't-gold');
  }
};

// Close menu when clicking outside
document.addEventListener('click', e => {
  const selector = document.getElementById('country-selector');
  const menu = document.getElementById('country-menu');
  if (selector && menu && !selector.contains(e.target)) {
    menu.classList.remove('open');
  }
});
