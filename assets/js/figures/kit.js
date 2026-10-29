/* Figure kit: the shared runtime for every live figure on the site.
 *
 * A figure file registers itself:
 *
 *   Fig.register("my-figure", {
 *     config: { ... },              // every tunable number lives here
 *     setup: function (f) { ... },  // once, after the canvas is sized; build state on `f.state`
 *     draw: function (f, t, dt) {}, // every frame while visible; t = seconds since (re)start
 *     reset: function (f) { ... }   // optional: called on replay before t restarts at 0
 *   });
 *
 * The kit handles: HiDPI canvas sizing and resize, theme colors (re-read when the
 * theme changes), running only while on screen, play/pause/replay buttons,
 * prefers-reduced-motion (draws one still frame at `config.stillAt` seconds),
 * and a global speed multiplier.
 *
 * Tuning without touching figure code:
 *   window.FIG_SPEED = 0.5;                      // all figures at half speed
 *   Fig.tune("my-figure", { someParam: 3 });     // live-override one figure's config
 *
 * `f` (the figure handle) gives you:
 *   f.ctx, f.w, f.h        2D context and size in CSS pixels
 *   f.c                    theme colors: bg, sunk, ink, ink2, ink3, line, lineStrong, accent,
 *                          signal, third (+ accentSoft, signalSoft, thirdSoft), good, bad
 *   f.cfg                  the figure's config (with any overrides applied)
 *   f.state                your scratch object
 *   f.compact              true for a list thumbnail (no inputs; drawn at THUMB_W and scaled down)
 *   f.font(size, weight)   CSS font string in the site UI face; f.mono(size) for numbers
 *   f.alpha(color, a)      color with alpha
 *   f.slider({...})        adds a labelled range input under the figure; returns the input
 *   f.button(label, fn)    adds a button under the figure
 *   f.restart()            restart the timeline from 0
 *   f.redraw()             draw once now (use after an input changes while paused)
 */
(function () {
  "use strict";

  var registry = {};
  var instances = [];
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.FIG_SPEED == null) window.FIG_SPEED = 1;

  var TOKENS = {
    bg: "--bg", sunk: "--bg-sunk", ink: "--ink", ink2: "--ink-2", ink3: "--ink-3",
    line: "--line", lineStrong: "--line-strong", accent: "--accent", accentSoft: "--accent-soft",
    signal: "--signal", signalSoft: "--signal-soft", third: "--third", thirdSoft: "--third-soft",
    good: "--good", bad: "--bad"
  };

  /* Resolve CSS custom properties (which may be oklch) to rgb() strings canvas understands. */
  var probe;
  function readColors() {
    if (!probe) {
      probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
      document.body.appendChild(probe);
    }
    var out = {};
    var rootStyle = getComputedStyle(document.documentElement);
    Object.keys(TOKENS).forEach(function (k) {
      probe.style.color = rootStyle.getPropertyValue(TOKENS[k]).trim() || "#888";
      out[k] = getComputedStyle(probe).color;
    });
    return out;
  }

  function alpha(color, a) {
    var m = color.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).slice(0, 3);
      return "rgba(" + p.join(",") + "," + a + ")";
    }
    var o = color.match(/oklch\(([^)]+)\)/);
    if (o) return "oklch(" + o[1].split("/")[0].trim() + " / " + a + ")";
    var c = color.match(/color\(([^)]+)\)/);
    if (c) return "color(" + c[1].split("/")[0].trim() + " / " + a + ")";
    return color;
  }

  function Figure(el, def) {
    this.el = el;
    /* The <figure> holds the controls bar; home-page previews have none. */
    this.root = el.closest("figure") || el;
    this.def = def;
    this.canvas = el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.cfg = Object.assign({}, def.config || {}, (Fig.overrides[el.dataset.fig] || {}));
    this.state = {};
    this.c = readColors();
    this.t = 0;
    /* Thumbnails rest on their key frame and play only while their row is hovered or
       focused (no motion the visitor didn't ask for, WCAG 2.2.2). Full figures autoplay
       with controls once their panel is opened. */
    this.compact = el.classList.contains("thumb-fig");
    this.playing = !reduced && !this.compact;
    this.visible = false;
    this.last = 0;
    this.inputs = null;
    var ar = (el.dataset.aspect || "16/9").split("/");
    this.aspect = parseFloat(ar[0]) / parseFloat(ar[1] || 1);
    this.alpha = alpha;
    this._bind();
    this._resize();
    if (def.setup) def.setup(this);
    if (this.compact) { this.t = this.cfg.stillAt || 0; this._hoverPlay(); }
    this._frame(0);
    this._sync();
  }

  /* Thumbnails preview only for a real mouse hover or keyboard focus. Touch devices
     never preview: a tap opens the row, and the full figure plays in the drawer. */
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  Figure.prototype._hoverPlay = function () {
    var self = this, card = this.el.closest("[data-hover-play]");
    if (reduced || !card) return;
    function off() { self.playing = false; }
    card.addEventListener("pointerenter", function (e) {
      if (canHover && e.pointerType === "mouse" && !card.classList.contains("is-open")) self.playing = true;
    });
    card.addEventListener("pointerleave", off);
    card.addEventListener("focusin", function (e) {
      if (e.target.matches && e.target.matches(":focus-visible") && !card.classList.contains("is-open")) self.playing = true;
    });
    card.addEventListener("focusout", off);
  };

  /* Text never drops below a legible floor, even when the geometry scales down. */
  Figure.prototype.font = function (size, weight) {
    return (weight || 500) + " " + Math.max(size, this.minFont) + "px Geist, ui-sans-serif, system-ui, sans-serif";
  };
  Figure.prototype.mono = function (size, weight) {
    return (weight || 450) + " " + Math.max(size, this.minFont) + "px 'Geist Mono', ui-monospace, Menlo, monospace";
  };

  Figure.prototype._bind = function () {
    var self = this;
    this.root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-action]");
      if (!b) return;
      if (b.dataset.action === "toggle") self.toggle();
      if (b.dataset.action === "replay") self.restart(true);
    });
  };

  /* Thumbnails lay out as if THUMB_W wide and are scaled down to fit, like a real
     thumbnail, so their labels never collide. Full figures use their real width. */
  var THUMB_W = 520;

  Figure.prototype._resize = function () {
    var cw = this.el.clientWidth || 600;
    var w = this.compact ? Math.max(cw, THUMB_W) : cw;
    /* Narrow screens get a taller canvas so the text floor has room. */
    var aspect = cw < 480 && !this.compact ? Math.min(this.aspect, 1.25) : this.aspect;
    var h = Math.round(w / aspect);
    this.minFont = 10.5;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var scale = dpr * (cw / w);
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    this.canvas.style.width = cw + "px";
    this.canvas.style.height = Math.round(cw / aspect) + "px";
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.w = w;
    this.h = h;
  };

  Figure.prototype._frame = function (dt) {
    var ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.w, this.h);
    this.def.draw(this, this.t, dt);
    ctx.restore();
  };

  Figure.prototype._sync = function () {
    this.root.dataset.playing = String(this.playing);
    var b = this.root.querySelector('[data-action="toggle"]');
    if (b) b.setAttribute("aria-label", this.playing ? "Pause animation" : "Play animation");
  };

  Figure.prototype.tick = function (now) {
    if (!this.visible) { this.last = 0; return; }
    if (!this.playing) { this.last = 0; return; }
    var dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0;
    this.last = now;
    dt *= window.FIG_SPEED;
    this.t += dt;
    this._frame(dt);
  };

  Figure.prototype.toggle = function () {
    this.playing = !this.playing;
    this._sync();
  };

  Figure.prototype.restart = function (play) {
    this.t = 0;
    this.last = 0;
    if (this.def.reset) this.def.reset(this);
    else if (this.def.setup) { this.state = {}; this.def.setup(this); }
    if (play && !reduced) this.playing = true;
    if (reduced) this.t = this.cfg.stillAt || 0;
    this._frame(0);
    this._sync();
  };

  Figure.prototype.redraw = function () { this._frame(0); };

  /* Inputs go in the bar under the canvas, to the left of play/replay. */
  Figure.prototype._inputs = function () {
    if (!this.inputs) {
      var bar = this.root.querySelector(".fig-inputs");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "fig-inputs";
        this.el.after(bar);
      }
      this.inputs = document.createElement("div");
      this.inputs.className = "fig-input-group";
      bar.insertBefore(this.inputs, bar.querySelector(".fig-controls"));
    }
    return this.inputs;
  };

  /* f.slider({ label, min, max, step, value, format(v), onInput(v) }) */
  Figure.prototype.slider = function (o) {
    var self = this;
    if (this.compact) return document.createElement("input");
    var label = document.createElement("label");
    var input = document.createElement("input");
    var out = document.createElement("output");
    input.type = "range";
    input.min = o.min; input.max = o.max; input.step = o.step || 1; input.value = o.value;
    var fmt = o.format || function (v) { return v; };
    out.textContent = fmt(+input.value);
    label.append(o.label + " ", input, out);
    input.addEventListener("input", function () {
      out.textContent = fmt(+input.value);
      if (o.onInput) o.onInput(+input.value);
      if (!self.playing) self.redraw();
    });
    this._inputs().appendChild(label);
    return input;
  };

  Figure.prototype.button = function (text, fn) {
    var self = this;
    if (this.compact) return document.createElement("button");
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-sm";
    b.textContent = text;
    b.addEventListener("click", function () { fn(b); if (!self.playing) self.redraw(); });
    this._inputs().appendChild(b);
    return b;
  };

  /* ---- Shared drawing helpers (Fig.util) ---- */

  var util = {
    /* Seeded PRNG so a figure replays identically: var rnd = Fig.util.seeded(42); rnd() -> [0,1) */
    seeded: function (a) {
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp: function (a, b, k) { return a + (b - a) * k; },
    /* 0..1 progress of t through [start, start + dur], eased (exponential out) */
    ease: function (t, start, dur) {
      var k = Math.max(0, Math.min(1, (t - start) / dur));
      return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    },
    /* Rounded-rect path (does not fill or stroke). */
    rr: function (ctx, x, y, w, h, r) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    },
    /* Point at fraction q (0..1) along a polyline [{x,y},...] */
    along: function (path, q) {
      var segs = [], total = 0, i;
      for (i = 1; i < path.length; i++) {
        var d = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        segs.push(d); total += d;
      }
      var want = q * total;
      for (i = 0; i < segs.length; i++) {
        if (want <= segs[i] || i === segs.length - 1) {
          var k = segs[i] ? Math.min(want / segs[i], 1) : 0;
          return { x: path[i].x + (path[i + 1].x - path[i].x) * k, y: path[i].y + (path[i + 1].y - path[i].y) * k };
        }
        want -= segs[i];
      }
      return path[path.length - 1];
    },
    /* Unit that scales with the figure: 1 at a 640x360 canvas. */
    unit: function (f, bw, bh) { return Math.min(f.w / (bw || 640), f.h / (bh || 360)); }
  };

  /* ---- Public API ---- */

  var Fig = window.Fig = {
    util: util,
    overrides: {},
    register: function (id, def) {
      registry[id] = def;
      boot();
    },
    tune: function (id, cfg) {
      Fig.overrides[id] = Object.assign(Fig.overrides[id] || {}, cfg);
      instances.forEach(function (f) {
        if (f.el.dataset.fig === id) { Object.assign(f.cfg, cfg); f.restart(f.playing); }
      });
    },
    instances: instances,
    /* Start any figures that have become visible since load (e.g. an opened panel). */
    boot: function () { boot(); },
    /* Start every full-size figure inside `root` from the beginning (used when a
       drawer opens), or pause them (when it closes). Thumbnails rest on their still. */
    play: function (root) {
      boot();
      instances.forEach(function (f) {
        if (f.compact || !root.contains(f.el)) return;
        f.visible = true;
        if (f.def.reset) { f.restart(true); return; }
        /* No reset hook: rewind the clock without re-running setup (which may add controls). */
        f.t = reduced ? (f.cfg.stillAt || 0) : 0;
        f.last = 0;
        f.playing = !reduced;
        f._frame(0);
        f._sync();
      });
    },
    pause: function (root) {
      instances.forEach(function (f) {
        if (!root.contains(f.el)) return;
        if (f.compact) { f.playing = false; f.t = f.cfg.stillAt || 0; f._frame(0); }
        else { f.playing = false; f._sync(); }
      });
    }
  };

  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var f = en.target.__fig;
      if (f) f.visible = en.isIntersecting;
    });
  }, { rootMargin: "80px" }) : null;

  function boot() {
    document.querySelectorAll(".fig-frame[data-fig]").forEach(function (el) {
      if (el.__fig || !registry[el.dataset.fig]) return;
      if (!el.clientWidth) return; /* hidden (closed panel); Fig.boot() starts it when shown */
      var f;
      /* One broken figure must not stop the rest of the page's figures. */
      try { f = new Figure(el, registry[el.dataset.fig]); }
      catch (err) { el.__fig = true; console.error("Figure " + el.dataset.fig + " failed:", err); return; }
      if (reduced) { f.t = f.cfg.stillAt || 0; f._frame(0); }
      el.__fig = f;
      instances.push(f);
      if (io) io.observe(el); else f.visible = true;
    });
  }

  function loop(now) {
    for (var i = 0; i < instances.length; i++) instances[i].tick(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var rz;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      instances.forEach(function (f) {
        var oldW = f.w;
        f._resize();
        if (f.w !== oldW && f.def.resize) f.def.resize(f);
        f._frame(0);
      });
    }, 120);
  });

  window.addEventListener("themechange", function () {
    var c = readColors();
    instances.forEach(function (f) { f.c = c; f._frame(0); });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { instances.forEach(function (f) { f._frame(0); }); });
  }
})();
