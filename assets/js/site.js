/* kitras.dev — theme toggle, on-page navigation, reveal-on-scroll, cite copy. */
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

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    var mode = currentMode();
    applyMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]);
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (currentMode() === "system") window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: "system" } }));
    });
  }
  syncToggles();

  /* ---- Table of contents for explainer pages ---- */
  var prose = document.querySelector("[data-prose]");
  var tocList = document.querySelector("[data-toc]");
  if (prose && tocList) {
    var heads = prose.querySelectorAll("h2[id]");
    if (heads.length < 2) {
      tocList.closest(".toc").style.visibility = "hidden";
    } else {
      heads.forEach(function (h) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        tocList.appendChild(li);
      });
      spy(heads, tocList.querySelectorAll("a"));
    }
  }

  /* ---- Sticky sub-nav on index pages ---- */
  var subnav = document.querySelector("[data-subnav]");
  if (subnav) {
    var links = subnav.querySelectorAll("a[href^='#']");
    var targets = [];
    links.forEach(function (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (t) targets.push(t);
    });
    spy(targets, links, function (a) {
      a.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  /* Marks the link whose section is nearest the top of the viewport. */
  function spy(sections, links, onActive) {
    if (!("IntersectionObserver" in window) || !sections.length) return;
    var visible = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible.set(en.target, en.isIntersecting ? en.boundingClientRect.top : null); });
      var best = null, bestTop = Infinity;
      sections.forEach(function (s, i) {
        var top = visible.get(s);
        if (top != null && top < bestTop) { bestTop = top; best = i; }
      });
      if (best == null) return;
      links.forEach(function (a, i) {
        var on = i === best;
        a.classList.toggle("is-active", on);
        if (on && onActive) onActive(a);
      });
    }, { rootMargin: "-20% 0px -55% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---- One entrance: rows fade up once as they arrive ---- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); rio.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Copy citation ---- */
  document.querySelectorAll("[data-cite]").forEach(function (pre) {
    if (!navigator.clipboard) return;
    var text = pre.textContent.trim();
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm cite-copy";
    btn.textContent = "Copy BibTeX";
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy BibTeX"; }, 1600);
      }, function () {
        btn.textContent = "Copy failed";
      });
    });
    pre.appendChild(btn);
  });
})();
