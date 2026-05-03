window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["page-track"] = {
  type: "page",
  mount(root) {
    if (!root) return;
    root.dataset.module = "page-track";
  },
};
