/* BELLHOP: where one frame's time goes, CPU build vs GPU build.
 * Every frame re-runs the BELLHOP model and redraws its rays. The two lanes play
 * frames back to back on a shared time axis, slowed down, so the GPU build fits
 * more frames into the same window. "Compare one frame" shows each build's frame
 * as shares of 100%. All phase times are the report's Table II (1000 rays);
 * post-processing and vertex population (under 0.002 ms) are too small to draw. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("bellhop-frame", {
    config: {
      // ms per phase, from the report's Table II (1000 normal rays)
      cpu: { pre: 2.401, run: 3.81, draw: 10.17, swap: 0.41, tiny: 0.0018 },
      gpu: { pre: 1.96, run: 1.13, draw: 1.81, swap: 0.031, tiny: 0.00067 },
      windowMs: 40,       // ms of program time shown on the timeline
      play: 8,            // s of screen time to sweep the window (about 200x slower than real)
      hold: 2.5,          // s the finished timeline stays up before replaying
      shareGrow: 1.4,     // s for the share bars to fill in "compare" mode
      stillAt: 9          // s: frame shown when motion is reduced (timeline complete)
    },

    setup: function (f) {
      var s = f.state;
      if (s.share == null) s.share = false;
      if (!s.btn) {
        s.btn = f.button("Compare one frame as shares", function (b) {
          s.share = !s.share;
          b.textContent = s.share ? "Play frames on a timeline" : "Compare one frame as shares";
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f);
      var narrow = W < 480;
      var lh = Math.max(14 * u, 13);
      var phases = [
        { k: "pre", name: narrow ? "Preprocess" : "Preprocessing", col: f.alpha(c.ink3, 0.55) },
        { k: "run", name: narrow ? "BELLHOP" : "BELLHOP run", col: c.accent },
        { k: "draw", name: "Draw + misc", col: c.signal },
        { k: "swap", name: narrow ? "Swap" : "Swap buffers", col: c.ink }
      ];
      var lanes = [
        { key: "cpu", name: narrow ? "CPU (C++)" : "CPU only, C++ BELLHOP" },
        { key: "gpu", name: narrow ? "GPU (CUDA)" : "GPU, CUDA BELLHOP" }
      ];
      lanes.forEach(function (l) {
        var d = cfg[l.key];
        l.total = d.pre + d.run + d.draw + d.swap + d.tiny;
      });

      var x0 = W * 0.04, x1 = W * 0.96;

      // Legend
      ctx.font = f.font(11 * u); ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
      var sw = Math.max(12 * u, 9), ly = H * 0.1, lx = x0;
      phases.forEach(function (p, i) {
        if (narrow && i === 2) { lx = x0; ly += lh * 1.2; }
        ctx.fillStyle = p.col; ctx.fillRect(lx, ly - sw * 0.8, sw, sw * 0.8);
        ctx.fillStyle = c.ink2; ctx.fillText(p.name, lx + sw + 5, ly);
        lx += sw + 5 + ctx.measureText(p.name).width + Math.max(18 * u, 12);
      });

      var laneTop = narrow ? H * 0.34 : H * 0.3;
      var laneGap = narrow ? H * 0.27 : H * 0.28;
      var bh = Math.max(H * 0.13, 22);

      var period = cfg.play + cfg.hold;
      var lt = t % period;
      var nowMs = s.share ? 0 : Math.min(1, lt / cfg.play) * cfg.windowMs;
      var shareK = s.share ? U.ease(lt, 0, cfg.shareGrow) : 0;
      function MX(ms) { return x0 + (ms / cfg.windowMs) * (x1 - x0); }

      lanes.forEach(function (l, li) {
        var d = cfg[l.key];
        var y = laneTop + li * laneGap;
        // lane label row
        ctx.fillStyle = c.ink; ctx.font = f.font(12.5 * u, 600); ctx.textAlign = "left";
        ctx.fillText(l.name, x0, y - lh * 0.55);
        ctx.font = f.mono(11.5 * u); ctx.textAlign = "right"; ctx.fillStyle = c.ink2;
        var frames = s.share ? 1 : Math.floor(nowMs / l.total);
        var right = s.share
          ? l.total.toFixed(1) + " ms total"
          : l.total.toFixed(1) + (narrow ? " ms/frame · " : " ms per frame · ") + frames + (frames === 1 ? " frame" : " frames");
        ctx.fillText(right, x1, y - lh * 0.55);

        // track
        ctx.fillStyle = c.sunk; ctx.fillRect(x0, y, x1 - x0, bh);

        if (!s.share) {
          // frames laid back to back up to "now"
          var at = 0;
          while (at < nowMs) {
            phases.forEach(function (p) {
              var a = at, b = Math.min(at + d[p.k], nowMs);
              if (b > a) { ctx.fillStyle = p.col; ctx.fillRect(MX(a), y, Math.max(MX(b) - MX(a), 0.6), bh); }
              at += d[p.k];
            });
            at += d.tiny;
            if (at <= nowMs) {
              ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.moveTo(MX(at), y - 3); ctx.lineTo(MX(at), y + bh + 3); ctx.stroke();
            }
          }
        } else {
          // one frame stretched to 100%
          var acc = 0, span = (x1 - x0) * shareK;
          phases.forEach(function (p) {
            var frac = d[p.k] / l.total;
            var a = x0 + acc * span, wpx = frac * span;
            ctx.fillStyle = p.col; ctx.fillRect(a, y, Math.max(wpx, 0.6), bh);
            ctx.font = f.mono(11 * u, 560); ctx.textAlign = "center";
            var label = Math.round(frac * 100) + "%";
            if (shareK > 0.95 && wpx > ctx.measureText(label).width + 8) {
              ctx.fillStyle = p.k === "run" || p.k === "swap" ? c.bg : c.ink;
              ctx.fillText(label, a + wpx / 2, y + bh / 2 + 4);
            }
            acc += frac;
          });
        }
      });

      // Time axis (timeline mode) or note (share mode)
      var ay = laneTop + laneGap + bh + lh * 1.4;
      ctx.fillStyle = c.ink3; ctx.font = f.mono(10.5 * u); ctx.textAlign = "center";
      if (!s.share) {
        var step = narrow ? 20 : 10;
        for (var ms = 0; ms <= cfg.windowMs; ms += step) {
          ctx.textAlign = ms === 0 ? "left" : ms === cfg.windowMs ? "right" : "center";
          ctx.fillText(ms + (ms === cfg.windowMs ? " ms" : ""), MX(ms), ay);
        }
        // playhead
        if (nowMs < cfg.windowMs) {
          ctx.strokeStyle = c.ink2; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(MX(nowMs), laneTop - 4); ctx.lineTo(MX(nowMs), laneTop + laneGap + bh + 4); ctx.stroke();
        }
      } else {
        ctx.textAlign = "left"; ctx.font = f.font(11 * u);
        ctx.fillText(narrow ? "Each bar is one frame = 100%" : "Each bar is one frame, stretched to 100%", x0, ay);
      }
    }
  });
})();
