/* Radon HVAC (poster): same low radon, fewer HVAC hours.
 * Left, a simplified floor plan of Naples Elementary with its HVAC zones and the
 * six SunRADON 1028XP monitors. Right, the poster's "Health Impact" chart: average
 * radon during occupied hours per weekday under the Control, Extended and Optimized
 * schedules, against the EPA (4 pCi/L) and WHO (2.7 pCi/L) limits. Below, the HVAC
 * on-hours of the highlighted day for each schedule, so the low bars sit next to
 * how long the HVAC ran to get them.
 * Real: bar values (poster, Health Impact chart), optimized start times (poster
 * schedule table: Mon 5:33, Tue 6:23, Wed 5:48, Thu 5:38, Fri 6:12), control
 * 06:00 to 17:00, extended 05:00 to 18:00, optimized end 16:00 (CHASE 2025 paper,
 * Sec. 2.2), EPA 4 and WHO 2.7 pCi/L (paper; both limits drawn on the poster's
 * sensor plot). Hours are computed from those times.
 * Synthetic: the floor plan geometry (traced loosely from the poster) and the
 * monitor pulse animation. */
(function () {
  "use strict";
  var U = Fig.util;

  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  // Poster, Health Impact: average radon (pCi/L) during occupied hours, [Control, Extended, Optimized].
  var RADON = [[1.85, 2.08, 1.52], [1.81, 1.62, 1.2], [1.74, 1.11, 1.11], [1.56, 1.3, 1.34], [1.67, 1.54, 1.19]];
  // Poster, schedule table: optimized HVAC start per weekday (h).
  var OPT_START = ["5:33", "6:23", "5:48", "5:38", "6:12"];

  // Simplified floor plan, in poster-image units (x0, y0, x1, y1). Geometry is approximate.
  var SHELL = [[70, 18, 1060, 858], [8, 538, 70, 684], [1060, 543, 1102, 688]];
  var ZONES = [
    { name: "Zone 1", a: 0.3, rects: [[150, 18, 483, 297]] },
    { name: "Zone 2", a: 0.17, rects: [[483, 18, 712, 297]] },
    { name: "RT-3", a: 0.24, rects: [[712, 18, 970, 257]] },
    { name: "Misc", a: 0.11, rects: [[880, 157, 1060, 297]] },
    { name: "Zone 3", a: 0.21, label: [150, 470], rects: [[70, 389, 307, 538], [8, 538, 153, 684], [70, 684, 322, 828]] },
    { name: "Zone 4", a: 0.14, label: [935, 470], rects: [[518, 496, 749, 858], [617, 356, 749, 496], [586, 451, 617, 496], [810, 395, 1060, 543], [977, 543, 1102, 688], [810, 688, 1060, 835]] },
    { name: "Zone 5", a: 0.36, label: [400, 330], rects: [[359, 353, 475, 462], [359, 462, 420, 616], [475, 451, 586, 496], [443, 496, 518, 858], [360, 678, 443, 858]] }
  ];
  var MONITORS = [[281, 419], [480, 570], [647, 531], [493, 829], [664, 843], [908, 727]];
  var PLAN_W = 1102, PLAN_H = 858;

  Fig.register("radon-hvac-impact", {
    config: {
      control: [6, 17],    // h, control HVAC on/off (paper)
      extended: [5, 18],   // h, extended HVAC on/off (paper)
      optimizedEnd: 16,    // h, optimized HVAC off (paper)
      epa: 4,              // pCi/L, EPA action level
      who: 2.7,            // pCi/L, WHO reference level (paper; drawn on the poster's sensor plot)
      yMax: 4.5,           // pCi/L, top of the bar chart
      from: 4,             // h, left edge of the on-hours axis
      to: 19,              // h, right edge of the on-hours axis
      grow: 1.4,           // s for the bars to grow in
      stagger: 0.04,       // s between bars starting to grow
      dayHold: 2.6,        // s each weekday stays highlighted
      pulse: 2.2,          // s per monitor pulse
      stillAt: 2.2         // s: frame shown as the thumbnail and when motion is reduced (bars up, Monday)
    },

    setup: function (f) {
      var s = f.state;
      if (s.auto == null) s.auto = true;
      if (s.day == null) s.day = 0;
      if (!s.btn) {
        s.btn = f.button("Next day", function () {
          var cur = s.shown == null ? 0 : s.shown;
          s.auto = false;
          s.day = (cur + 1) % 5;
          f.redraw();
        });
      }
    },

    reset: function (f) { f.state.auto = true; f.state.day = 0; },

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f), narrow = W < 480, compact = f.compact;
      var colors = [c.signal, c.third, c.accent];
      var names = ["Control", "Extended", "Optimized"];
      var L = layout(f, narrow, compact);

      var loop = cfg.grow + 5 * cfg.dayHold;
      var lt = t % loop;
      var day = s.auto ? (lt < cfg.grow ? 0 : Math.min(4, Math.floor((lt - cfg.grow) / cfg.dayHold))) : s.day;
      if (!s.auto) lt = Math.max(t, cfg.grow);   // manual: bars stay up
      s.shown = day;
      var hl = !compact;                       // thumbnails show every day at full strength

      /* ---- Title ---- */
      if (!compact) {
        ctx.textAlign = "left"; ctx.fillStyle = c.ink; ctx.font = f.font(13.5 * u, 640);
        ctx.fillText(narrow ? "Same low radon, fewer HVAC hours" : "Same low radon, fewer HVAC hours", L.left, L.titleY);
      }

      /* ---- Floor plan ---- */
      plan(f, L, t, compact, narrow);

      /* ---- Bar chart ---- */
      var Y = function (v) { return L.cBot - (L.cBot - L.cTop) * v / cfg.yMax; };
      var gw = (L.cx1 - L.cx0) / 5;
      ctx.lineWidth = 1;
      if (!compact) {
        ctx.font = f.mono(10.5 * u); ctx.textAlign = "right"; ctx.fillStyle = c.ink3;
        [0, 1, 2, 3, 4].forEach(function (v) {
          ctx.strokeStyle = c.line;
          ctx.beginPath(); ctx.moveTo(L.cx0, Y(v)); ctx.lineTo(L.cx1, Y(v)); ctx.stroke();
          ctx.fillText(String(v), L.cx0 - 6 * u, Y(v) + 4 * u);
        });
        ctx.save(); ctx.translate(L.cx0 - (narrow ? 22 : 26) * u - 4, (L.cTop + L.cBot) / 2); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center"; ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
        ctx.fillText(narrow ? "pCi/L, school hours" : "avg radon, school hours (pCi/L)", 0, 0);
        ctx.restore();
      }
      // highlighted day band
      if (hl) {
        ctx.fillStyle = f.alpha(c.ink, 0.06);
        U.rr(ctx, L.cx0 + gw * day + gw * 0.04, L.cTop, gw * 0.92, L.cBot - L.cTop + (narrow ? 34 : 38) * u, 6 * u); ctx.fill();
      }
      var bw = gw * (compact ? 0.27 : 0.26), bg = gw * 0.03;
      for (var d = 0; d < 5; d++) {
        var gx = L.cx0 + gw * d + gw / 2;
        for (var k = 0; k < 3; k++) {
          var v = RADON[d][k];
          var g = U.ease(lt, (d * 3 + k) * cfg.stagger, cfg.grow * 0.8);
          var bx = gx + (k - 1) * (bw + bg) - bw / 2;
          var top = Y(v * g);
          U.rr(ctx, bx, top, bw, L.cBot - top, [Math.min(3 * u, bw / 3), Math.min(3 * u, bw / 3), 0, 0]);
          ctx.fillStyle = hl && d !== day ? f.alpha(colors[k], 0.4) : colors[k];
          ctx.fill();
        }
        if (!compact) {
          ctx.textAlign = "center";
          ctx.font = f.font(11 * u, d === day ? 650 : 520); ctx.fillStyle = d === day ? c.ink : c.ink2;
          ctx.fillText(DAYS[d], gx, L.cBot + Math.max(14 * u, 13));
          ctx.font = f.mono(10.5 * u, 600); ctx.fillStyle = c.accent;
          ctx.fillText((narrow ? "" : "on ") + OPT_START[d], gx, L.cBot + Math.max(14 * u, 13) + Math.max(13 * u, 12.5));
        }
      }
      ctx.strokeStyle = c.lineStrong; ctx.lineWidth = compact ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(L.cx0, L.cBot); ctx.lineTo(L.cx1, L.cBot); ctx.stroke();

      // limits
      [[cfg.epa, narrow ? "EPA 4" : "EPA limit, 4 pCi/L", [6, 4]], [cfg.who, narrow ? "WHO 2.7" : "WHO, 2.7 pCi/L", [2, 3]]].forEach(function (lim, i) {
        ctx.strokeStyle = i === 0 ? c.ink : c.ink2; ctx.lineWidth = (compact ? (i === 0 ? 3 : 2) : 1.4 * u);
        var dash = compact ? (i === 0 ? [12, 8] : [4, 6]) : [lim[2][0] * u, lim[2][1] * u];
        ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(L.cx0, Y(lim[0])); ctx.lineTo(L.cx1, Y(lim[0])); ctx.stroke();
        ctx.setLineDash([]);
        if (!compact) {
          ctx.font = f.font(10.5 * u, i === 0 ? 600 : 500); ctx.fillStyle = i === 0 ? c.ink : c.ink2; ctx.textAlign = "right";
          ctx.fillText(lim[1], L.cx1, Y(lim[0]) - 5 * u);
        }
      });

      /* ---- Legend ---- */
      if (!compact) {
        ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "left";
        var lx = L.legX, ly = L.legY;
        names.forEach(function (n, i) {
          ctx.fillStyle = colors[i]; U.rr(ctx, lx, ly - 9 * u, 10 * u, 10 * u, 2); ctx.fill();
          ctx.fillStyle = c.ink2; ctx.fillText(n, lx + 14 * u, ly);
          lx += ctx.measureText(n).width + 28 * u;
        });
      }
      if (compact) return;

      /* ---- HVAC on-hours for the highlighted day ---- */
      var spans = [cfg.control, cfg.extended, [hours(OPT_START[day]), cfg.optimizedEnd]];
      if (narrow) {
        // a compact text card beside the plan
        var cy = L.kTop;
        ctx.textAlign = "left"; ctx.font = f.font(11 * u, 650); ctx.fillStyle = c.ink;
        ctx.fillText(DAY_NAMES[day], L.kx0, cy);
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "right";
        ctx.fillText("pCi/L", L.kx1 - 50, cy);
        ctx.fillText("HVAC", L.kx1, cy);
        for (var r = 0; r < 3; r++) {
          cy += 17;
          ctx.fillStyle = colors[r]; U.rr(ctx, L.kx0, cy - 9, 9, 9, 2); ctx.fill();
          ctx.textAlign = "left"; ctx.font = f.font(10.5, 560); ctx.fillStyle = c.ink2;
          ctx.fillText(names[r], L.kx0 + 13, cy);
          ctx.textAlign = "right"; ctx.font = f.mono(10.5, 600); ctx.fillStyle = c.ink;
          ctx.fillText(fmt(RADON[day][r]), L.kx1 - 50, cy);
          ctx.fillStyle = r === 2 ? c.accent : c.ink;
          ctx.fillText(dur(spans[r][1] - spans[r][0]) + " h", L.kx1, cy);
        }
        return;
      }

      var X = function (h) { return L.kx0 + (L.kx1 - L.kx0) * (h - cfg.from) / (cfg.to - cfg.from); };
      var ky = L.kTop;
      ctx.textAlign = "left"; ctx.font = f.font(11 * u, 650); ctx.fillStyle = c.ink;
      ctx.fillText("HVAC on, " + DAY_NAMES[day], L.left, ky);
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "right";
      ctx.fillText("radon", L.radX, ky);
      ctx.fillText("hours", L.right, ky);
      var rowH = (L.kBot - L.kTop - 8 * u) / 3;
      var barH = Math.max(rowH * 0.42, 5);
      // school hours band and ticks
      var bandTop = ky + 6 * u, bandBot = L.kBot;
      ctx.fillStyle = f.alpha(c.ink, 0.045);
      ctx.fillRect(X(7), bandTop, X(16) - X(7), bandBot - bandTop);
      ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "center";
      [4, 7, 10, 13, 16, 19].forEach(function (h) { ctx.fillText(pad(h) + ":00", X(h), L.kBot + Math.max(13 * u, 12.5)); });
      for (var q = 0; q < 3; q++) {
        var yy = bandTop + rowH * (q + 0.5) + 2 * u;
        var sp = spans[q];
        ctx.textAlign = "left"; ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.ink2;
        ctx.fillText(names[q], L.left, yy + 4 * u);
        U.rr(ctx, X(sp[0]), yy - barH / 2, X(sp[1]) - X(sp[0]), barH, barH / 2);
        ctx.fillStyle = colors[q]; ctx.fill();
        ctx.font = f.mono(10.5 * u, 600); ctx.textAlign = "right"; ctx.fillStyle = c.ink2;
        ctx.fillText(hm(sp[0]), X(sp[0]) - 5 * u, yy + 4 * u);
        ctx.textAlign = "left";
        ctx.fillText(hm(sp[1]), X(sp[1]) + 5 * u, yy + 4 * u);
        ctx.textAlign = "right"; ctx.font = f.mono(12 * u, 650); ctx.fillStyle = c.ink;
        ctx.fillText(fmt(RADON[day][q]), L.radX, yy + 4 * u);
        ctx.fillStyle = q === 2 ? c.accent : c.ink;
        ctx.fillText(dur(sp[1] - sp[0]) + " h", L.right, yy + 4 * u);
      }
    }
  });

  function plan(f, L, t, compact, narrow) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, u = U.unit(f);
    var sc = Math.min((L.px1 - L.px0) / PLAN_W, (L.pBot - L.pTop) / PLAN_H);
    var ox = L.px0 + ((L.px1 - L.px0) - PLAN_W * sc) / 2, oy = L.pTop;
    var P = function (x, y) { return [ox + x * sc, oy + y * sc]; };
    var rect = function (r) { var a = P(r[0], r[1]); ctx.rect(a[0], a[1], (r[2] - r[0]) * sc, (r[3] - r[1]) * sc); };
    ctx.beginPath(); SHELL.forEach(rect);
    ctx.fillStyle = c.sunk; ctx.fill();
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke();
    ZONES.forEach(function (z) {
      z.rects.forEach(function (r) {
        ctx.beginPath(); rect(r);
        ctx.fillStyle = f.alpha(c.ink, z.a); ctx.fill();
        ctx.strokeStyle = c.bg; ctx.lineWidth = compact ? 2 : 1.2; ctx.stroke();
      });
    });
    if (!compact && !narrow) {
      ctx.font = f.font(10.5 * u, 600); ctx.textAlign = "center"; ctx.fillStyle = c.ink2;
      ZONES.forEach(function (z) {
        if (!z.label) return;
        var p = P(z.label[0], z.label[1]);
        ctx.fillText(z.name, p[0], p[1]);
      });
    }
    // monitors, each pulsing in turn
    var r0 = compact ? 9 : Math.max(3.6 * u, 3.2);
    MONITORS.forEach(function (m, i) {
      var p = P(m[0], m[1]);
      var ph = ((t / cfg.pulse) + i / MONITORS.length) % 1;
      if (!compact) {
        ctx.strokeStyle = f.alpha(c.ink, 0.5 * (1 - ph)); ctx.lineWidth = 1.2 * u;
        ctx.beginPath(); ctx.arc(p[0], p[1], r0 + ph * 9 * u, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = c.ink; ctx.strokeStyle = c.bg; ctx.lineWidth = compact ? 2.5 : 1.2;
      ctx.beginPath(); ctx.arc(p[0], p[1], r0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    if (!compact) {
      var by = oy + PLAN_H * sc + Math.max(15 * u, 14);
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(L.px0 + 4 * u, by - 4 * u, Math.max(3.6 * u, 3.2), 0, Math.PI * 2); ctx.fill();
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      ctx.fillText(narrow ? "6 radon monitors" : "6 radon monitors, Naples Elementary", L.px0 + 12 * u, by);
    }
  }

  function layout(f, narrow, compact) {
    var W = f.w, H = f.h, u = U.unit(f);
    var L = { left: W * 0.03, right: W * 0.97 };
    if (compact) {
      L.px0 = W * 0.02; L.px1 = W * 0.39; L.pTop = H * 0.3; L.pBot = H * 0.75;
      L.cx0 = W * 0.42; L.cx1 = W * 0.97; L.cTop = H * 0.06; L.cBot = H * 0.92;
    } else if (narrow) {
      L.titleY = Math.max(16 * u, 15);
      L.px0 = W * 0.03; L.px1 = W * 0.47; L.pTop = H * 0.1; L.pBot = H * 0.36;
      L.kx0 = W * 0.53; L.kx1 = W * 0.97; L.kTop = H * 0.14;
      L.cx0 = W * 0.13; L.cx1 = W * 0.97; L.cTop = H * 0.54; L.cBot = H * 0.86;
      L.legX = L.left; L.legY = H * 0.5;
    } else {
      L.titleY = H * 0.075;
      L.px0 = W * 0.03; L.px1 = W * 0.36; L.pTop = H * 0.14; L.pBot = H * 0.54;
      L.cx0 = W * 0.46; L.cx1 = W * 0.97; L.cTop = H * 0.15; L.cBot = H * 0.55;
      L.legY = H * 0.075;
      L.kx0 = W * 0.17; L.kx1 = W * 0.72; L.radX = W * 0.84; L.kTop = H * 0.73; L.kBot = H * 0.92;
      var ctx = f.ctx; ctx.font = f.font(10.5 * u, 560);
      var lw = ["Control", "Extended", "Optimized"].reduce(function (a, n) { return a + ctx.measureText(n).width + 28 * u; }, 0) - 14 * u;
      L.legX = L.right - lw;
    }
    return L;
  }

  function hours(s) { var p = s.split(":"); return +p[0] + +p[1] / 60; }
  function fmt(v) { return v.toFixed(2).replace(/0$/, "").replace(/\.$/, ""); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(h) { var mm = Math.round(h * 60); return pad(Math.floor(mm / 60)) + ":" + pad(mm % 60); }
  function dur(h) { var mm = Math.round(h * 60); return Math.floor(mm / 60) + ":" + pad(mm % 60); }
})();
