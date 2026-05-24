window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["home-showcase"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "home-showcase";
  },
};
