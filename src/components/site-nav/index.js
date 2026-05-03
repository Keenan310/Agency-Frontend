window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["site-nav"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "site-nav";
  },
};
