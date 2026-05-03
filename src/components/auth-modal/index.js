window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["auth-modal"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "auth-modal";
  },
};
