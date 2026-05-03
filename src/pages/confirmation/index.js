window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["page-confirmation"] = {
  type: "page",
  mount(root) {
    if (!root) return;
    root.dataset.module = "page-confirmation";
  },
};
