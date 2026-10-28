/* Radon HVAC: deriving the optimized start time.
 * Radon builds up overnight while the HVAC is off and drops once it turns on.
 * The decay after the control start time is fit with a straight line; that line
 * is slid later until it reaches the threshold exactly when the school opens,
 * and where it meets the overnight curve is the latest safe HVAC start.
 * The curve shape and rates are illustrative; the 4 pCi/L threshold and the
 * 06:00 / 07:00 / 16:00 / 17:00 schedule times are the values in the paper. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("radon-hvac-slope", {
    config: {
      threshold: 4,        // pCi/L, EPA action level used as the target (paper)
      controlStart: 6,     // h, control HVAC start, 06:00 (paper)
      controlEnd: 17,      // h, control HVAC end, 17:00 (paper)
      occupiedStart: 7,    // h, school opens, 07:00 (paper)
      occupiedEnd: 16,     // h, school closes; optimized HVAC end, 16:00 (paper)
      dayLow: 1.2,         // pCi/L, level the HVAC holds during the day (illustrative)
      saturation: 7.5,      // pCi/L, level radon approaches with the HVAC off (illustrative)
      buildTau: 14,        // h, time constant of overnight build-up (illustrative)
      decayTau: 1.6,       // h, time constant of the HVAC flush (illustrative)
      weekendHours: 61,    // h the HVAC is off from Friday 17:00 to Monday 06:00
      yMax: 9,             // pCi/L, top of the plot
      xFrom: 2,            // h, left edge of the plot (02:00)
      xTo: 12,             // h, right edge of the plot (noon); the schedules run off the edge
      phase: {             // seconds for each act
        curve: 3.0,
        fit: 1.4,
        shift: 2.0,
        start: 1.2,
        hold: 3.6
      },
      stillAt: 9           // s: frame shown when motion is reduced
    },

    setup: function (f) {
      var s = f.state;
      s.monday = s.monday || false;
      if (!s.btn) {
        s.btn = f.button("Monday, after the weekend", function (b) {
          s.monday = !s.monday;
          b.textContent = s.monday ? "A regular weekday" : "Monday, after the weekend";
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f);
      var P = cfg.phase;
      var total = P.curve + P.fit + P.shift + P.start + P.hold;
      var lt = t % total;
      var tFit = P.curve, tShift = tFit + P.fit, tStart = tShift + P.shift, tHold = tStart + P.start;

      var m = model(cfg, s.monday);

      /* ---- Plot frame ---- */
      var narrow = W < 480;
      var lh = Math.max(16 * u, 13.5);           // legend line height (fonts clamp at small sizes)
      var x0 = W * 0.08, x1 = W * 0.96, y0 = H * 0.06, y1 = H * 0.62;
      var X = function (h) { return x0 + (x1 - x0) * (h - cfg.xFrom) / (cfg.xTo - cfg.xFrom); };
      var Y = function (v) { return y1 - (y1 - y0) * U.clamp(v, 0, cfg.yMax) / cfg.yMax; };

      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.font = f.mono(10.5 * u); ctx.textAlign = "center";
      [4, cfg.occupiedStart, 10].forEach(function (h) {
        ctx.fillStyle = h === cfg.occupiedStart ? c.ink : c.ink3;
        ctx.fillText(pad(h) + ":00", X(h), y1 + Math.max(14 * u, 12));
      });
      ctx.textAlign = "right"; ctx.fillStyle = c.ink3;
      [4, 8].forEach(function (v) { ctx.fillText(String(v), x0 - 4 * u, Y(v) + 4 * u); });

      // Threshold and school opening
      ctx.strokeStyle = c.ink2; ctx.lineWidth = 1 * u; ctx.setLineDash([4 * u, 4 * u]);
      ctx.beginPath(); ctx.moveTo(x0, Y(cfg.threshold)); ctx.lineTo(x1, Y(cfg.threshold)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(cfg.occupiedStart), y0); ctx.lineTo(X(cfg.occupiedStart), y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.ink2; ctx.font = f.font(10.5 * u); ctx.textAlign = "right";
      ctx.fillText("4 pCi/L limit", x1, Y(cfg.threshold) - 6 * u);
      if (!narrow) { ctx.textAlign = "left"; ctx.fillText("School opens", X(cfg.occupiedStart) + 5 * u, y0 + 4 * u); }

      /* ---- Average radon curve, drawn left to right ---- */
      var reach = cfg.xFrom + (cfg.xTo - cfg.xFrom) * U.clamp(lt / P.curve, 0, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 - 8 * u, x1 - x0, y1 - y0 + 8 * u); ctx.clip();
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2 * u; ctx.lineJoin = "round";
      ctx.beginPath();
      for (var h = cfg.xFrom; h <= reach + 1e-6; h += 0.05) {
        var px = X(h), py = Y(m.radon(h));
        if (h === cfg.xFrom) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      /* ---- Fit the decay slope, then shift it ---- */
      if (lt >= tFit) {
        var kf = U.ease(lt, tFit, P.fit * 0.8);
        var shift = lt >= tShift ? U.ease(lt, tShift, P.shift * 0.8) : 0;
        // fitted line passes through (controlStart, peak) with slope m.slope
        var fitAt = function (hh) { return m.peak + m.slope * (hh - cfg.controlStart); };
        var projAt = function (hh) { return cfg.threshold + m.slope * (hh - cfg.occupiedStart); };
        var lineAt = function (hh) { return U.lerp(fitAt(hh), projAt(hh), shift); };
        var a = U.lerp(cfg.controlStart, m.start, shift) - 0.5;
        var b = a + 0.5 + Math.max(m.cross - cfg.controlStart, 0.5) * 1.6 * kf;
        ctx.strokeStyle = shift > 0.02 ? c.accent : c.signal;
        ctx.lineWidth = 2.5 * u; ctx.setLineDash(shift > 0.02 ? [6 * u, 4 * u] : []);
        ctx.beginPath(); ctx.moveTo(X(a), Y(lineAt(a))); ctx.lineTo(X(b), Y(lineAt(b))); ctx.stroke();
        ctx.setLineDash([]);
        if (shift > 0.98) {
          ctx.fillStyle = c.accent;
          ctx.beginPath(); ctx.arc(X(cfg.occupiedStart), Y(cfg.threshold), 4 * u, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      /* ---- Legend (top right, clear of the curve) ---- */
      var ly = y0 + lh * (narrow ? 0.8 : 1.6);
      legend(f, x1, ly, c.ink, false, narrow ? "Average radon" : "Average radon, HVAC on at 06:00", u);
      if (lt >= tFit) legend(f, x1, ly + lh, c.signal, false, narrow ? "Decay slope" : "Measured decay slope", u);
      if (lt >= tShift) legend(f, x1, ly + 2 * lh, c.accent, true, narrow ? "Shifted to 07:00" : "Same slope, ends at 07:00", u);

      /* ---- New start time ---- */
      var rowA = H * 0.74, rowB = H * 0.83, bh = Math.max(7 * u, 5);
      var ks = lt >= tStart ? U.ease(lt, tStart, P.start * 0.8) : 0;
      if (ks > 0) {
        var sx = X(m.start), sy = Y(m.radon(m.start));
        ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5 * u;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, U.lerp(sy, rowB, ks)); ctx.stroke();
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(sx, sy, 4 * u, 0, Math.PI * 2); ctx.fill();
      }

      /* ---- HVAC schedules (bars run past noon; labels sit before each bar) ---- */
      ctx.font = f.font(10.5 * u); ctx.textAlign = "right";
      var labX = X(Math.min(m.start, cfg.controlStart)) - 8 * u;   // clear of the start-time marker
      U.rr(ctx, X(cfg.controlStart), rowA - bh / 2, x1 - X(cfg.controlStart), bh, bh / 2);
      ctx.fillStyle = c.ink3; ctx.fill();
      ctx.fillText(narrow ? "Control, to 17:00" : "Control: 06:00 to 17:00", labX, rowA + 4 * u);
      if (ks > 0) {
        var end = U.lerp(m.start, cfg.xTo, ks);
        U.rr(ctx, X(m.start), rowB - bh / 2, Math.min(X(end), x1) - X(m.start), bh, bh / 2);
        ctx.fillStyle = c.accent; ctx.fill();
        if (ks > 0.9) ctx.fillText(narrow ? "Optimized, to 16:00" : "Optimized: " + hm(m.start) + " to 16:00", labX, rowB + 4 * u);
      }

      /* ---- Verdict ---- */
      if (lt >= tHold) {
        var saved = Math.round((m.start - cfg.controlStart) * 60);
        var later = saved >= 0;
        ctx.font = f.font(13 * u, 620); ctx.textAlign = "left";
        ctx.fillStyle = later ? c.good : c.bad;
        var lead = "Start " + hm(m.start) + ", " + hmDur(Math.abs(saved)) + (later ? " later" : " earlier");
        ctx.fillText(narrow ? lead : lead + "; switch off 1 h sooner", x0, H * 0.95);
      }
    }
  });

  /* Radon over one school day, plus the fitted slope and the optimized start. */
  function model(cfg, monday) {
    var span = cfg.saturation - cfg.dayLow;
    var offBefore = monday ? cfg.weekendHours - cfg.controlStart : 24 - cfg.controlEnd; // h off at 00:00
    var acc = function (hoursOff) { return cfg.dayLow + span * (1 - Math.exp(-hoursOff / cfg.buildTau)); };
    var peak = acc(offBefore + cfg.controlStart);
    var radon = function (h) {
      if (h < cfg.controlStart) return acc(offBefore + h);
      if (h < cfg.controlEnd) return cfg.dayLow + (peak - cfg.dayLow) * Math.exp(-(h - cfg.controlStart) / cfg.decayTau);
      return acc(h - cfg.controlEnd);
    };
    // time the control curve crosses the threshold
    var cross = cfg.controlStart + cfg.decayTau * Math.log((peak - cfg.dayLow) / (cfg.threshold - cfg.dayLow));
    // least-squares slope of the decay between HVAC on and the threshold crossing
    var n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var h = cfg.controlStart; h <= cross; h += 0.05) {
      var v = radon(h); n++; sx += h; sy += v; sxx += h * h; sxy += h * v;
    }
    var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    // latest start: where the shifted line meets the overnight build-up
    var proj = function (h) { return cfg.threshold + slope * (h - cfg.occupiedStart); };
    var lo = 0, hi = cfg.occupiedStart;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      if (proj(mid) > acc(offBefore + mid)) lo = mid; else hi = mid;
    }
    return { radon: radon, peak: peak, slope: slope, cross: cross, start: Math.min(lo, cfg.occupiedStart) };
  }

  function legend(f, x, y, color, dashed, text, u) {
    var ctx = f.ctx;
    ctx.font = f.font(10.5 * u); ctx.textAlign = "right"; ctx.fillStyle = f.c.ink2;
    ctx.fillText(text, x, y);
    var w = ctx.measureText(text).width;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5 * u; ctx.setLineDash(dashed ? [5 * u, 3 * u] : []);
    ctx.beginPath(); ctx.moveTo(x - w - 26 * u, y - 4 * u); ctx.lineTo(x - w - 8 * u, y - 4 * u); ctx.stroke();
    ctx.setLineDash([]);
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(h) { var mm = Math.round(h * 60); return pad(Math.floor(mm / 60)) + ":" + pad(mm % 60); }
  function hmDur(min) { return Math.floor(min / 60) + ":" + pad(min % 60); }
})();
