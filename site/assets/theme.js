(() => {
  const KEY = "swarmladderlab.theme";
  let stored = "";
  try { stored = localStorage.getItem(KEY) || ""; } catch { /* storage can be disabled */ }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const active = stored === "light" || stored === "dark" ? stored : (prefersDark ? "dark" : "light");
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.textContent = theme === "dark" ? "☀" : "☾";
      button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      button.title = button.getAttribute("aria-label");
    });
  }
  apply(active);
  document.addEventListener("DOMContentLoaded", () => {
    apply(document.documentElement.dataset.theme);
    document.querySelectorAll(".theme-toggle").forEach((button) => button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch { /* theme still works for this page */ }
    }));
  });
})();
