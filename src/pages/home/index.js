window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["page-home"] = {
  type: "page",
  mount(root) {
    if (!root) return;
    root.dataset.module = "page-home";
  },
};
