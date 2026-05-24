window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["order-modals"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "order-modals";
  },
};
