/* Music DPO: mixing fine-tuned models from slider settings.
 * Each slider runs from -5 to 5. A positive value mixes in the model trained to
 * encourage that metric, a negative value the model trained to discourage it.
 * The base MusicGen model always joins with a fixed value of 5, and every model's
 * weight is its |slider value| divided by the sum of all of them (base included).
 * The rule and the -5..5 range are from the report; the slider settings are
 * examples (Energy and Acousticness move on their own; Danceability is yours). */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("music-mix", {
    config: {
      baseValue: 5,       // fixed slider value given to the base model (report)
      range: 5,           // sliders run from -range to +range (report)
      dance: 4,           // starting Danceability value (example; the reader's slider)
      energy: 3,          // where Energy moves to (example)
      acoustic: -2,       // where Acousticness moves to (example)
      phase: [1.2, 1.6, 1.6, 3.0], // s: all at zero, Energy moves, Acousticness moves, hold
      stillAt: 6          // s: frame shown when motion is reduced (all sliders set)
    },

    setup: function (f) {
      var s = f.state;
      if (s.dance == null) s.dance = f.cfg.dance;
      if (!s.input) {
        s.input = f.slider({
          label: "Danceability", min: -5, max: 5, step: 1, value: s.dance,
          format: function (v) { return (v > 0 ? "+" : "") + v; },
          onInput: function (v) { s.dance = v; }
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f);
      var narrow = W < 480;
      var lh = Math.max(14 * u, 13);
      var P = cfg.phase, period = P[0] + P[1] + P[2] + P[3];
      var lt = t % period;
      var energy = cfg.energy * U.ease(lt, P[0], P[1] * 0.6);
      var acoustic = cfg.acoustic * U.ease(lt, P[0] + P[1], P[2] * 0.6);

      var rows = [
        { name: narrow ? "Base" : "Base MusicGen", v: cfg.baseValue, base: true },
        { name: narrow ? "Dance" : "Danceability", v: s.dance, mine: true },
        { name: "Energy", v: energy },
        { name: narrow ? "Acoustic" : "Acousticness", v: acoustic }
      ];
      var sum = rows.reduce(function (a, r) { return a + Math.abs(r.v); }, 0);
      rows.forEach(function (r) { r.w = Math.abs(r.v) / sum; r.col = r.base ? c.ink3 : r.v >= 0 ? c.accent : c.signal; });

      var x0 = W * 0.04, x1 = W * 0.96;
      var tx0 = W * (narrow ? 0.25 : 0.24), tx1 = W * (narrow ? 0.62 : 0.66);
      var vx = W * (narrow ? 0.77 : 0.76);
      function SX(v) { return tx0 + ((v + cfg.range) / (2 * cfg.range)) * (tx1 - tx0); }

      // Header
      var hy = H * 0.1;
      ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      ctx.fillText("Slider", x0, hy);
      ctx.textAlign = "center";
      ctx.fillText("−5", tx0, hy); ctx.fillText("0", (tx0 + tx1) / 2, hy); ctx.fillText("+5", tx1, hy);
      ctx.textAlign = "right";
      ctx.fillText("Value", vx, hy);
      ctx.fillText(narrow ? "Weight" : "Weight in mix", x1, hy);

      var rowTop = H * 0.2, rowH = Math.max(H * 0.13, lh * 1.6);
      rows.forEach(function (r, i) {
        var y = rowTop + i * rowH;
        ctx.textAlign = "left"; ctx.font = f.font(11.5 * u, r.mine ? 650 : 500);
        ctx.fillStyle = r.base ? c.ink2 : c.ink;
        ctx.fillText(r.name, x0, y + 4);
        // track
        ctx.strokeStyle = c.line; ctx.lineWidth = 3 * u + 1; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(tx0, y); ctx.lineTo(tx1, y); ctx.stroke();
        // fill from zero to value
        ctx.strokeStyle = f.alpha(r.col, r.base ? 0.5 : 0.8);
        ctx.beginPath(); ctx.moveTo(SX(0), y); ctx.lineTo(SX(r.v), y); ctx.stroke();
        ctx.lineCap = "butt";
        // centre tick
        ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(SX(0), y - 6 * u - 2); ctx.lineTo(SX(0), y + 6 * u + 2); ctx.stroke();
        // knob
        ctx.fillStyle = c.bg; ctx.strokeStyle = r.base ? c.ink3 : r.col; ctx.lineWidth = 2 * u + 0.5;
        ctx.beginPath(); ctx.arc(SX(r.v), y, 6 * u + 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // value + weight
        ctx.textAlign = "right"; ctx.font = f.mono(11.5 * u); ctx.fillStyle = c.ink2;
        var rv = Math.round(r.v * 10) / 10;
        ctx.fillText(r.base ? (narrow ? "5" : "5 fixed") : (rv > 0 ? "+" : "") + rv.toFixed(Math.abs(rv % 1) > 0.05 ? 1 : 0), vx, y + 4);
        ctx.font = f.mono(12 * u, 650); ctx.fillStyle = r.w > 0.001 ? r.col : c.ink3;
        ctx.fillText(Math.round(r.w * 100) + "%", x1, y + 4);
      });

      // Stacked bar: the mix
      var by = rowTop + rows.length * rowH - rowH * 0.2, bh = Math.max(H * 0.08, 16);
      ctx.textAlign = "left"; ctx.font = f.font(11 * u); ctx.fillStyle = c.ink3;
      ctx.fillText(narrow ? "Mixed model" : "Weights of the mixed model", x0, by);
      var bx = x0, by2 = by + lh * 0.5;
      rows.forEach(function (r) {
        var wpx = r.w * (x1 - x0);
        if (wpx <= 0.5) return;
        ctx.fillStyle = r.base ? f.alpha(c.ink3, 0.45) : r.col;
        ctx.fillRect(bx, by2, Math.max(wpx - 2, 0.5), bh);
        bx += wpx;
      });

      // Legend
      var ly = by2 + bh + lh * 1.3, lx = x0;
      var items = [[c.accent, narrow ? "+ model" : "model trained to encourage"], [c.signal, narrow ? "− model" : "model trained to discourage"], [f.alpha(c.ink3, 0.6), "base"]];
      ctx.font = f.font(10.5 * u);
      items.forEach(function (it) {
        var sw = Math.max(10 * u, 8);
        ctx.fillStyle = it[0]; ctx.fillRect(lx, ly - sw, sw, sw);
        ctx.fillStyle = c.ink2; ctx.textAlign = "left"; ctx.fillText(it[1], lx + sw + 5, ly);
        lx += sw + 5 + ctx.measureText(it[1]).width + Math.max(16 * u, 10);
      });
    }
  });
})();
