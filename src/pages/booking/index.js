window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["page-booking"] = {
  type: "page",
  mount(root) {
    if (!root) return;
    root.dataset.module = "page-booking";
  },
};
