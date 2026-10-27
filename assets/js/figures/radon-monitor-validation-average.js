/* Radon monitor validation: what a 24 h moving average keeps and loses.
 * The industrial monitor (Model 1028 XP) logs an hourly average; the consumer
 * Lüft logs only the average of the last 24 hours. A 24 h window slides along two
 * weeks of hourly radon and traces out the moving average the Lüft reports.
 * The study averaged the 1028 XP's hourly values the same way to compare them.
 * The hourly series is synthetic (HVAC on during school hours, off at night and
 * on weekends); only the 4.0 pCi/L EPA action level is a value from the paper. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("radon-monitor-validation-average", {
    config: {
      days: 14,            // days drawn, starting on a Monday (illustrative)
      ingress: 0.24,       // pCi/L per hour entering the room (illustrative)
      ventOff: 0.045,      // fraction removed per hour with the HVAC off (illustrative)
      ventOn: 0.45,        // fraction removed per hour with the HVAC on (illustrative)
      hvacOn: 6,           // h, HVAC switches on on school days (06:00, as in the HVAC study)
      hvacOff: 17,         // h, HVAC switches off (17:00)
      noise: 0.12,         // relative hour-to-hour noise (illustrative)
      action: 4.0,         // pCi/L, EPA action level (paper)
      yMax: 6,             // pCi/L, top of the plot
      sweep: 8,            // s for the window to cross the two weeks
      hold: 3,             // s to hold the finished trace
      stillAt: 5.2         // s: frame shown when motion is reduced
    },

    setup: function (f) {
      var s = f.state;
      s.hide = s.hide || false;
      s.series = series(f.cfg);
      if (!s.btn) {
        s.btn = f.button("Show only what the Lüft reports", function (b) {
          s.hide = !s.hide;
          b.textContent = s.hide ? "Show the hourly readings too" : "Show only what the Lüft reports";
          f.restart(true);
        });
      }
    },

    reset: function (f) { f.state.series = series(f.cfg); },

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f);
      var narrow = W < 480;
      var hourly = s.series.hourly, avg = s.series.avg, N = hourly.length;
      var lt = t % (cfg.sweep + cfg.hold);
      var head = 24 + (N - 24) * U.clamp(lt / cfg.sweep, 0, 1);   // hour index of the window's right edge

      var x0 = W * 0.07, x1 = W * 0.97, y0 = H * 0.2, y1 = H * 0.78;
      var X = function (h) { return x0 + (x1 - x0) * h / (N - 1); };
      var Y = function (v) { return y1 - (y1 - y0) * U.clamp(v, 0, cfg.yMax) / cfg.yMax; };
      var lh = Math.max(15 * u, 13);

      /* ---- Weekend bands and day ticks ---- */
      for (var d = 0; d < cfg.days; d++) {
        if (d % 7 >= 5) {
          ctx.fillStyle = f.alpha(c.ink3, 0.08);
          ctx.fillRect(X(d * 24), y0, X((d + 1) * 24) - X(d * 24), y1 - y0);
        }
      }
      ctx.font = f.font(10.5 * u); ctx.textAlign = "center"; ctx.fillStyle = c.ink3;
      [5, 12].forEach(function (d) { if (d < cfg.days) ctx.fillText("weekend", X(d * 24 + 24), y1 + lh); });
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();

      /* ---- EPA action level ---- */
      ctx.strokeStyle = c.ink2; ctx.setLineDash([4 * u, 4 * u]);
      ctx.beginPath(); ctx.moveTo(x0, Y(cfg.action)); ctx.lineTo(x1, Y(cfg.action)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.ink2; ctx.textAlign = "left";
      ctx.fillText(narrow ? "4.0 action level" : "EPA action level, 4.0 pCi/L", x0 + 4 * u, Y(cfg.action) - 6 * u);

      /* ---- Hourly readings (1028 XP) ---- */
      if (!s.hide) {
        ctx.strokeStyle = f.alpha(c.signal, 0.85); ctx.lineWidth = 1.2 * u;
        ctx.beginPath();
        for (var h = 0; h < N; h++) { if (h === 0) ctx.moveTo(X(h), Y(hourly[h])); else ctx.lineTo(X(h), Y(hourly[h])); }
        ctx.stroke();
      }

      /* ---- Sliding 24 h window ---- */
      var sweeping = lt < cfg.sweep;
      if (sweeping) {
        var wx = X(head - 24), ww = X(head) - wx;
        ctx.fillStyle = f.alpha(c.accent, 0.12);
        ctx.fillRect(wx, y0, ww, y1 - y0);
        ctx.strokeStyle = f.alpha(c.accent, 0.6); ctx.lineWidth = 1;
        ctx.strokeRect(wx, y0, ww, y1 - y0);
        ctx.fillStyle = c.accent; ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "center";
        ctx.fillText("24 h", wx + ww / 2, y0 - 6 * u);
      }

      /* ---- Moving average (what the Lüft logs) ---- */
      var upto = Math.floor(head);
      ctx.strokeStyle = c.accent; ctx.lineWidth = 2.6 * u; ctx.lineJoin = "round";
      ctx.beginPath();
      for (var k = 23; k <= upto && k < N; k++) {
        if (k === 23) ctx.moveTo(X(k), Y(avg[k])); else ctx.lineTo(X(k), Y(avg[k]));
      }
      ctx.stroke();
      if (sweeping && upto < N) {
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(X(upto), Y(avg[upto]), 4 * u, 0, Math.PI * 2); ctx.fill();
      }

      /* ---- Legend ---- */
      ctx.textAlign = "left"; ctx.font = f.font(10.5 * u);
      var lx = x0, ly = H * 0.03 + lh * 0.8;
      key(f, lx, ly, c.accent, narrow ? "24 h average (Lüft)" : "24 h moving average, what the Lüft logs", u, 2.6);
      if (!s.hide) key(f, lx, ly + lh, c.signal, narrow ? "Hourly (1028 XP)" : "Hourly average, what the 1028 XP logs", u, 1.2);
      else { ctx.fillStyle = c.ink3; ctx.fillText(narrow ? "Daily dips: not recoverable" : "The school-hours dips cannot be recovered from this line", lx, ly + lh); }
    }
  });

  /* Two weeks of hourly radon from a one-box model, plus its trailing 24 h mean. */
  function series(cfg) {
    var rnd = U.seeded(11);
    var r = 1, hourly = [], avg = [];
    var total = cfg.days * 24, warm = 7 * 24;
    for (var h = -warm; h < total; h++) {
      var day = Math.floor((h + warm) / 24) % 7, hr = ((h % 24) + 24) % 24;
      var on = day < 5 && hr >= cfg.hvacOn && hr < cfg.hvacOff;
      r = r + cfg.ingress - (on ? cfg.ventOn : cfg.ventOff) * r;
      if (h >= 0) hourly.push(Math.max(0.1, r * (1 + (rnd() - 0.5) * 2 * cfg.noise)));
    }
    var sum = 0;
    for (var i = 0; i < total; i++) {
      sum += hourly[i];
      if (i >= 24) sum -= hourly[i - 24];
      avg.push(i >= 23 ? sum / 24 : null);
    }
    return { hourly: hourly, avg: avg };
  }

  function key(f, x, y, color, text, u, wdt) {
    var ctx = f.ctx;
    ctx.strokeStyle = color; ctx.lineWidth = wdt * u;
    ctx.beginPath(); ctx.moveTo(x, y - 4 * u); ctx.lineTo(x + 18 * u, y - 4 * u); ctx.stroke();
    ctx.fillStyle = f.c.ink2; ctx.textAlign = "left";
    ctx.fillText(text, x + 24 * u, y);
  }
})();
