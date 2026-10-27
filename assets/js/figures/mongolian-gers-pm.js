/* Mongolian gers: indoor PM2.5 by ger type, against the air outside.
 * Bars are the average indoor PM2.5 for each class of ger; the dashed line is the
 * outdoor average at the U.S. Embassy monitor over the same period. The figure
 * steps through the whole day, daytime (5 am to 8 pm, cooking) and nighttime
 * (8 pm to 5 am, heating). At night the outdoor air is dirtier than most gers,
 * so opening the door lets PM2.5 in. All values (µg/m³) are from the paper. */
(function () {
  "use strict";
  var U = Fig.util;

  var CLASSES = [
    { name: "Unmodified, coal", short: "Unmodified" },
    { name: "Insulated, coal", short: "Ins. coal" },
    { name: "Insulated, coal + electric", short: "Ins. hybrid" },
    { name: "Insulated, electric only", short: "Ins. electric" }
  ];
  var MODES = [
    { name: "Whole day", values: [187.0, 154.3, 151.4, 95.5], outside: 153.5 },
    { name: "Daytime, 5 am to 8 pm", short: "Daytime", values: [180.3, 126.2, 142.0, 84.4], outside: 108.4 },
    { name: "Nighttime, 8 pm to 5 am", short: "Nighttime", values: [198.3, 200.5, 167.5, 113.4], outside: 229.0 }
  ];

  Fig.register("mongolian-gers-pm", {
    config: {
      who: 15,             // µg/m³, WHO guideline the paper compares against (paper)
      xMax: 250,           // µg/m³, right edge of the scale
      tween: 0.9,          // s for bars to move between views
      dwell: 4.2,          // s each view is shown when cycling on its own
      stillAt: 10.5        // s: frame shown when motion is reduced (nighttime view)
    },

    setup: function (f) {
      var s = f.state;
      if (s.pick == null) s.pick = -1;    // -1: cycle through the views
      if (!s.btns) {
        s.btns = MODES.map(function (m, i) {
          return f.button(m.short || m.name, function () { s.pick = i; f.restart(true); });
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f);
      var narrow = W < 480;
      var lh = Math.max(15 * u, 13);

      // Which view, and how far into the tween from the previous one
      var cur, prev, k;
      if (s.pick >= 0) { cur = s.pick; prev = -1; k = U.ease(t, 0, cfg.tween); }
      else {
        var n = Math.floor(t / cfg.dwell);
        cur = n % MODES.length; prev = n === 0 ? -1 : (n - 1) % MODES.length;
        k = U.ease(t - n * cfg.dwell, 0, cfg.tween);
      }
      var from = prev < 0 ? { values: [0, 0, 0, 0], outside: 0 } : MODES[prev];
      var to = MODES[cur];

      var labelW = narrow ? W * 0.27 : W * 0.3;
      var x0 = labelW, x1 = W * 0.9;
      var X = function (v) { return x0 + (x1 - x0) * v / cfg.xMax; };
      var top = H * 0.24, bottom = H * 0.8;
      var rowH = (bottom - top) / CLASSES.length, bh = Math.min(rowH * 0.55, 26 * u + 4);

      /* ---- Title ---- */
      ctx.textAlign = "left"; ctx.font = f.font(14 * u, 620); ctx.fillStyle = c.ink;
      ctx.fillText(narrow ? (to.short || to.name) : to.name, W * 0.04, H * 0.03 + lh);
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
      ctx.fillText("Average indoor PM2.5, µg/m³", W * 0.04, H * 0.03 + lh * 2.1);

      /* ---- Axis ---- */
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, bottom); ctx.lineTo(x1, bottom); ctx.stroke();
      ctx.font = f.mono(10.5 * u); ctx.textAlign = "center"; ctx.fillStyle = c.ink3;
      [0, 100, 200].forEach(function (v) { ctx.fillText(String(v), X(v), bottom + lh); });

      // WHO guideline
      ctx.strokeStyle = c.ink3; ctx.setLineDash([2 * u, 3 * u]);
      ctx.beginPath(); ctx.moveTo(X(cfg.who), top - 6 * u); ctx.lineTo(X(cfg.who), bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = f.font(10.5 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink3;
      ctx.fillText("WHO " + cfg.who, X(cfg.who) + 4 * u, bottom + lh * 2);

      /* ---- Outdoor air (drawn first so bar values sit on top) ---- */
      var ov = U.lerp(from.outside, to.outside, k);
      if (ov > 1) {
        var ox = X(ov);
        ctx.strokeStyle = c.signal; ctx.lineWidth = 2 * u; ctx.setLineDash([6 * u, 4 * u]);
        ctx.beginPath(); ctx.moveTo(ox, top - 10 * u); ctx.lineTo(ox, bottom); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.signal;
        var lab = (narrow ? "Outside " : "Outside (U.S. Embassy) ") + ov.toFixed(1);
        var lw = ctx.measureText(lab).width;
        ctx.textAlign = "left";
        ctx.fillText(lab, U.clamp(ox - lw / 2, 4, W - lw - 4), top - 14 * u);
      }
      /* ---- Bars ---- */
      CLASSES.forEach(function (cl, i) {
        var y = top + rowH * (i + 0.5);
        var v = U.lerp(from.values[i], to.values[i], k);
        ctx.textAlign = "right"; ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u, 560);
        ctx.fillText(narrow ? cl.short : cl.name, x0 - 8 * u, y + 4 * u);
        U.rr(ctx, x0, y - bh / 2, Math.max(1, X(v) - x0), bh, 3 * u);
        ctx.fillStyle = c.accent; ctx.fill();
        ctx.textAlign = "left"; ctx.font = f.mono(11 * u, 600);
        ctx.strokeStyle = c.bg; ctx.lineWidth = 4; ctx.lineJoin = "round";
        ctx.strokeText(v.toFixed(1), X(v) + 6 * u, y + 4 * u);
        ctx.fillStyle = c.ink; ctx.fillText(v.toFixed(1), X(v) + 6 * u, y + 4 * u);
      });

    }
  });
})();
