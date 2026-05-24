window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["site-footer"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "site-footer";
  },
};
