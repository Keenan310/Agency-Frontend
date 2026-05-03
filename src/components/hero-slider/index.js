window.KeenanFrontend = window.KeenanFrontend || { modules: {} };
window.KeenanFrontend.modules["hero-slider"] = {
  type: "component",
  mount(root) {
    if (!root) return;
    root.dataset.module = "hero-slider";
  },
};
