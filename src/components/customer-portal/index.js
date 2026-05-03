window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["customer-portal"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "customer-portal";
  },
};
