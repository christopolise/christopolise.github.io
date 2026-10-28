/* kitras.dev — theme toggle and the open-in-place work rows. */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---- Theme: system -> light -> dark -> system ---- */
  var ORDER = ["system", "light", "dark"];
  var LABEL = { system: "match system", light: "light", dark: "dark" };

  function currentMode() {
    var t = root.getAttribute("data-theme");
    return t === "light" || t === "dark" ? t : "system";
  }

  function applyMode(mode) {
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    try {
      if (mode === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", mode);
    } catch (e) {}
    syncToggles();
    window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: mode } }));
  }

  function syncToggles() {
    var mode = currentMode();
    var next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("data-mode", mode);
      btn.setAttribute("aria-label", "Theme: " + LABEL[mode] + ". Switch to " + LABEL[next] + ".");
      btn.title = "Theme: " + LABEL[mode];
    });
  }

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (currentMode() === "system") window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: "system" } }));
    });
  }
  syncToggles();

  /* ---- Work rows: the thumbnail and the Abstract/Summary button open the same panel ---- */
  function setOpen(item, open) {
    var btn = item.querySelector(".item-toggle");
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.setAttribute("aria-expanded", String(open));
    item.querySelector(".item-thumb").setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    item.classList.toggle("is-open", open);
    if (open && window.Fig) window.Fig.boot();
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest(".theme-toggle")) {
      var mode = currentMode();
      applyMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]);
      return;
    }
    /* The whole row is a target: the toggle button, the thumbnail, or anywhere else on
       the card. Links and anything inside the opened panel (figure controls, the
       abstract) keep their own behavior, and a click that ends a text selection
       doesn't toggle. */
    var item = e.target.closest(".item");
    if (!item || !item.querySelector(".item-toggle")) return;
    if (!e.target.closest("[data-toggle]")) {
      if (e.target.closest("a, .item-panel, button, input, label")) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && String(sel).length) return;
    }
    setOpen(item, item.querySelector(".item-toggle").getAttribute("aria-expanded") !== "true");
  });

  /* A link to /#slug opens that work's panel. */
  function openFromHash() {
    var id = location.hash.slice(1);
    var item = id && document.getElementById(id);
    if (item && item.classList.contains("item")) setOpen(item, true);
  }
  window.addEventListener("hashchange", openFromHash);
  window.addEventListener("load", openFromHash);
})();
