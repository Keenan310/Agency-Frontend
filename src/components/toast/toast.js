window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["toast"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "toast";
  },
};
