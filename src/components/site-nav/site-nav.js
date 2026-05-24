window.KeenanFrontend = window.KeenanFrontend || { modules: {} };

window.KeenanFrontend.modules["site-nav"] = {
  type: "component",

  mount(root) {
    if (!root) return;

    root.dataset.module = "site-nav";

    initializeNavbarSession();
  },
};

function initializeNavbarSession() {

  const authRaw = localStorage.getItem("customerAuth");

  let auth = null;

  try {
    auth = authRaw ? JSON.parse(authRaw) : null;
  } catch (e) {
    auth = null;
  }

  const guestSection = document.getElementById("ud-guest-section");
  const userSection = document.getElementById("ud-user-section");
  const logoutSection = document.getElementById("ud-logout-section");

  const navBriefName = document.getElementById("nav-brief-name");
  const navUserName = document.getElementById("nav-user-name");
  const navUserEmail = document.getElementById("nav-user-email");
  const navAvatarInitials = document.getElementById("nav-avatar-initials");

  if (!auth || !auth.user) {

    if (guestSection) guestSection.style.display = "block";
    if (userSection) userSection.style.display = "none";
    if (logoutSection) logoutSection.style.display = "none";

    if (navBriefName) navBriefName.textContent = "Sign In";

    if (navAvatarInitials) {
      navAvatarInitials.textContent = "?";
    }

    return;
  }

  const user = auth.user;

  const firstName =
    user.firstName ||
    user.first_name ||
    user.name ||
    "Customer";

  const lastName =
    user.lastName ||
    user.last_name ||
    "";

  const fullName = `${firstName} ${lastName}`.trim();

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || "C";

  if (guestSection) guestSection.style.display = "none";
  if (userSection) userSection.style.display = "block";
  if (logoutSection) logoutSection.style.display = "block";

  if (navBriefName) navBriefName.textContent = fullName;

  if (navUserName) navUserName.textContent = fullName;

  if (navUserEmail) {
    navUserEmail.textContent =
      user.email || user.username || "";
  }

  if (navAvatarInitials) {
    navAvatarInitials.textContent = initials.toUpperCase();
  }
}

window.logoutSession = function () {

  localStorage.removeItem("customerAuth");
  localStorage.removeItem("customerToken");

  window.location.reload();
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

document.addEventListener('click', e => {

  const userMenu = document.getElementById('user-menu-root');

  const userDropdown = document.getElementById('user-dropdown');

  const userTrigger = document.getElementById('user-profile-trigger');

  if (userMenu && userDropdown && !userMenu.contains(e.target)) {

    userDropdown.classList.remove('open');

    if (userTrigger) {
      userTrigger.classList.remove('open');
    }
  }
});