window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["page-admin"] = {
  type: "page",
  mount(root) {
    if (!root) return;
    root.dataset.module = "page-admin";
  },
};
