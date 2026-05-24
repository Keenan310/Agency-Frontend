window.KeenanFrontend = window.KeenanFrontend || { modules: {} };

window.KeenanFrontend.modules["page-results"] = {
  type: "page",

  mount(root) {
    if (!root) return;

    root.dataset.module = "page-results";
  },
};