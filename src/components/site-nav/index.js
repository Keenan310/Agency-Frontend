window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["site-nav"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "site-nav";
    
    // Navbar initialized
  },
};

window.switchCountry = function(code) {
  if (window.KT) {
    window.KT.set(code);
  }
};

window.toggleUserDropdown = function() {
  const trigger = document.getElementById('user-profile-trigger');
  const dropdown = document.getElementById('user-dropdown');
  if (trigger && dropdown) {
    trigger.classList.toggle('open');
    dropdown.classList.toggle('open');
  }
};

// Close menus when clicking outside
document.addEventListener('click', e => {
  const countrySelector = document.getElementById('country-selector');
  const countryMenu = document.getElementById('country-menu');
  if (countrySelector && countryMenu && !countrySelector.contains(e.target)) {
    countryMenu.classList.remove('open');
  }

  const userMenu = document.getElementById('user-menu-root');
  const userDropdown = document.getElementById('user-dropdown');
  const userTrigger = document.getElementById('user-profile-trigger');
  if (userMenu && userDropdown && !userMenu.contains(e.target)) {
    userDropdown.classList.remove('open');
    if (userTrigger) userTrigger.classList.remove('open');
  }
});
