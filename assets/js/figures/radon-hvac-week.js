/* Radon HVAC: one school week under three HVAC schedules.
 * A clock sweeps through Monday to Friday. For each day, the top panel draws a
 * radon curve per schedule and the week grid below fills in the hours the HVAC
 * is on: Control 06:00 to 17:00, Extended 05:00 to 18:00, and Optimized from the
 * start time the algorithm derived for that day (Table 1 of the paper) to 16:00.
 * The column on the right keeps a running total of HVAC hours per schedule and
 * the hours the optimized schedule saves. Runtime is the paper's energy proxy;
 * the paper reports runtime saved, not kWh.
 * Real: schedule times (Sec. 2.2), the 07:00 / 16:00 occupied hours, the 4 pCi/L
 * EPA threshold, and every optimized start time (Table 1; W-down Wed zone 2 '7:00'
 * read as 07:00). Hours and savings are computed from those times.
 * Synthetic: the radon curve shapes. They are built so the optimized curve meets
 * 4 pCi/L at 07:00, as the algorithm intends, with one shared overnight build-up
 * and decay rate for all three schedules (the paper finds end time does not change
 * the overnight maximum, Fig. 3). */
(function () {
  "use strict";
  var U = Fig.util;

  // Table 1: optimized HVAC start per season, weekday (Mon..Fri), zone (1..3).
  var SEASONS = [
    { name: "Winter, Jan to Mar", short: "Winter (Jan–Mar)", days: [
      ["05:33", "06:55", "07:00"], ["06:23", "06:44", "07:00"], ["05:48", "07:00", "07:00"], ["05:38", "07:00", "07:00"], ["06:12", "07:00", "07:00"]] },
    { name: "Spring, Mar to Jun", short: "Spring (Mar–Jun)", days: [
      ["05:15", "04:40", "07:00"], ["07:00", "07:00", "07:00"], ["06:49", "06:49", "07:00"], ["07:00", "07:00", "07:00"], ["05:12", "07:00", "07:00"]] },
    { name: "Fall, Sep to Nov", short: "Fall (Sep–Nov)", days: [
      ["07:00", "07:00", "07:00"], ["07:00", "07:00", "07:00"], ["07:00", "07:00", "07:00"], ["07:00", "07:00", "07:00"], ["07:00", "07:00", "07:00"]] },
    { name: "Winter, Nov to Dec", short: "Winter (Nov–Dec)", days: [
      ["07:00", "05:08", "07:00"], ["07:00", "07:00", "07:00"], ["07:00", "07:00", "07:00"], ["07:00", "07:00", "07:00"], ["07:00", "07:00", "07:00"]] }
  ];
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  Fig.register("radon-hvac-week", {
    config: {
      control: [6, 17],    // h, control HVAC on/off, 06:00 to 17:00 (paper)
      extended: [5, 18],   // h, extended HVAC on/off, 05:00 to 18:00 (paper)
      optimizedEnd: 16,    // h, optimized HVAC off = school closes, 16:00 (paper)
      open: 7,             // h, school opens, 07:00 (paper)
      threshold: 4,        // pCi/L, EPA action level (paper)
      // synthetic radon shape
      decay: 2.0,          // pCi/L per h while the HVAC flushes (illustrative)
      rise: 0.25,          // pCi/L per h of overnight build-up near dawn (illustrative)
      quiet: 3.3,          // pCi/L at 07:00 with no HVAC on days the algorithm says 07:00 (illustrative)
      floor: 1.0,          // pCi/L the HVAC holds during the day (illustrative)
      evening: 0.5,        // pCi/L per h of build-up after the HVAC turns off (illustrative)
      yMax: 10,            // pCi/L, top of the radon panel
      from: 3,             // h, left edge of the time axis (03:00)
      to: 19,              // h, right edge of the time axis (19:00)
      // timeline
      intro: 0.4,          // s before Monday starts
      daySec: 1.5,         // s for the clock to sweep one day
      dayGap: 0.25,        // s pause between days
      hold: 4.0,           // s to hold the finished week before looping
      stillAt: 10.5        // s: frame shown as the thumbnail and when motion is reduced (week complete)
    },

    setup: function (f) {
      var s = f.state;
      if (s.season == null) s.season = 0;
      if (s.zone == null) s.zone = 0;
      if (!s.btns) {
        s.btns = true;
        f.button("Next season", function () { s.season = (s.season + 1) % SEASONS.length; f.restart(true); });
        f.button("Next zone", function () { s.zone = (s.zone + 1) % 3; f.restart(true); });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f), narrow = W < 480, compact = f.compact;
      var season = SEASONS[s.season];
      var scheds = schedules(cfg, season, s.zone);
      var colors = [c.signal, c.third, c.accent];
      var names = ["Control", "Extended", "Optimized"];

      /* ---- Timeline ---- */
      var per = cfg.daySec + cfg.dayGap;
      var total = cfg.intro + per * 5 + cfg.hold;
      var lt = t % total;
      var wk = (lt - cfg.intro) / per;               // days elapsed (fractional)
      var day = U.clamp(Math.floor(wk), 0, 4);
      var inDay = U.clamp((lt - cfg.intro - day * per) / cfg.daySec, 0, 1);
      if (wk >= 5) { day = 4; inDay = 1; }
      if (lt < cfg.intro) inDay = 0;
      var clock = cfg.from + (cfg.to - cfg.from) * inDay;
      var done = wk >= 5;

      /* ---- Layout ---- */
      var L = layout(f, narrow, compact);
      var X = function (h) { return L.x0 + (L.x1 - L.x0) * (h - cfg.from) / (cfg.to - cfg.from); };

      /* ---- Title ---- */
      ctx.textAlign = "left"; ctx.fillStyle = c.ink;
      if (!compact) {
        ctx.font = f.font(13 * u, 620);
        var title = (narrow ? season.short : season.name) + " · Zone " + (s.zone + 1);
        ctx.fillText(title, L.left, L.titleY);
      }

      /* ---- Occupied hours band and time ticks (shared by both panels) ---- */
      var bandTop = compact ? L.gTop : L.rTop, bandBot = L.gBot;
      ctx.fillStyle = f.alpha(c.ink, 0.045);
      ctx.fillRect(X(cfg.open), bandTop, X(cfg.optimizedEnd) - X(cfg.open), bandBot - bandTop);
      ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1; ctx.setLineDash([3 * u, 3 * u]);
      [cfg.open, cfg.optimizedEnd].forEach(function (h) {
        ctx.beginPath(); ctx.moveTo(X(h), bandTop); ctx.lineTo(X(h), bandBot); ctx.stroke();
      });
      ctx.setLineDash([]);
      if (!compact) {
        ctx.font = f.mono(10.5 * u); ctx.textAlign = "center";
        var ticks = [4, 7, 10, 13, 16, 19];
        ticks.forEach(function (h, i) {
          ctx.fillStyle = h === cfg.open || h === cfg.optimizedEnd ? c.ink2 : c.ink3;
          ctx.textAlign = i === ticks.length - 1 && X(h) > W - 20 * u ? "right" : "center";
          ctx.fillText(pad(h) + ":00", Math.min(X(h), W - 2), L.gBot + Math.max(14 * u, 13));
        });
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
        ctx.fillText(narrow ? "school day" : "school day, 07:00 to 16:00", (X(cfg.open) + X(cfg.optimizedEnd)) / 2, L.rTop + Math.max(12 * u, 11));
      }

      /* ---- Radon panel (current day) ---- */
      if (!compact) {
        var Y = function (v) { return L.rBot - (L.rBot - L.rTop) * U.clamp(v, 0, cfg.yMax) / cfg.yMax; };
        ctx.strokeStyle = c.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(L.x0, L.rBot); ctx.lineTo(L.x1, L.rBot); ctx.stroke();
        // EPA threshold
        ctx.strokeStyle = c.ink2; ctx.lineWidth = 1.2 * u; ctx.setLineDash([5 * u, 4 * u]);
        ctx.beginPath(); ctx.moveTo(L.x0, Y(cfg.threshold)); ctx.lineTo(L.x1, Y(cfg.threshold)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink2; ctx.textAlign = "right";
        ctx.fillText(narrow ? "4 pCi/L" : "EPA limit, 4 pCi/L", L.x1, Y(cfg.threshold) - 5 * u);
        // axis label and day
        ctx.textAlign = "left"; ctx.fillStyle = c.ink; ctx.font = f.font(11.5 * u, 600);
        ctx.fillText(narrow ? DAYS[day] : DAY_NAMES[day], L.left, L.rTop + Math.max(12 * u, 11));
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
        ctx.fillText(narrow ? "radon" : "radon, pCi/L", L.left, L.rTop + Math.max(12 * u, 11) + Math.max(13 * u, 12.5));
        ctx.textAlign = "right"; ctx.font = f.mono(10.5 * u);
        (narrow ? [0] : [0, 8]).forEach(function (v) { ctx.fillText(String(v), L.x0 - 4 * u, Y(v) + 4 * u); });

        // curves up to the clock, drawn so Optimized ends on top
        ctx.save();
        ctx.beginPath(); ctx.rect(L.x0, L.rTop - 4, L.x1 - L.x0, L.rBot - L.rTop + 8); ctx.clip();
        var dayS = scheds[day];
        for (var k = 0; k < 3; k++) {
          ctx.strokeStyle = colors[k]; ctx.lineWidth = (k === 2 ? 2.6 : 2) * u; ctx.lineJoin = "round";
          ctx.beginPath();
          for (var h = cfg.from; h <= clock + 1e-6; h += 0.05) {
            var v = radon(cfg, dayS, k, h);
            if (h === cfg.from) ctx.moveTo(X(h), Y(v)); else ctx.lineTo(X(h), Y(v));
          }
          ctx.stroke();
        }
        ctx.restore();
        // clock
        if (inDay > 0 && inDay < 1) {
          ctx.strokeStyle = f.alpha(c.ink, 0.35); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(X(clock), L.rTop); ctx.lineTo(X(clock), L.gTop + L.rowH * (day + 1)); ctx.stroke();
        }
      }

      /* ---- Week grid ---- */
      var hours = [0, 0, 0];
      var bh = L.barH, gap = L.barGap;
      for (var d = 0; d < 5; d++) {
        var yRow = L.gTop + L.rowH * d;
        var yMid = yRow + L.rowH / 2;
        if (!compact) {
          ctx.textAlign = "left"; ctx.font = f.font(11 * u, d === day && !done ? 650 : 520);
          ctx.fillStyle = d === day && !done ? c.ink : c.ink2;
          ctx.fillText(DAYS[d], L.left, yMid + 4 * u);
        }
        var reach = d < day || done ? cfg.to : d === day ? clock : cfg.from;
        if (lt < cfg.intro) reach = cfg.from;
        for (var k2 = 0; k2 < 3; k2++) {
          var on = scheds[d][k2];
          var by = yMid + (k2 - 1) * (bh + gap) - bh / 2;
          // ghost of the full bar
          U.rr(ctx, X(on[0]), by, X(on[1]) - X(on[0]), bh, bh / 2);
          ctx.fillStyle = f.alpha(colors[k2], 0.14); ctx.fill();
          var end = Math.min(on[1], reach);
          if (end > on[0]) {
            U.rr(ctx, X(on[0]), by, Math.max(X(end) - X(on[0]), bh), bh, bh / 2);
            ctx.fillStyle = colors[k2]; ctx.fill();
            hours[k2] += end - on[0];
          }
        }
        // optimized start time in the gutter
        if (!compact && !narrow) {
          var st = scheds[d][2][0];
          ctx.textAlign = "right"; ctx.font = f.mono(10.5 * u, 560); ctx.fillStyle = c.accent;
          ctx.fillText(hm(st), L.x0 - 6 * u, yMid + 4 * u);
        }
      }
      if (!compact && !narrow) {
        ctx.textAlign = "right"; ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
        ctx.fillText("Optimized on", L.x0 - 6 * u, L.gTop - 6 * u);
      }

      /* ---- Totals ---- */
      var saveC = hours[0] - hours[2], saveE = hours[1] - hours[2];
      if (compact) {
        // three bold columns: weekly hours per schedule
        var maxH = 5 * (cfg.extended[1] - cfg.extended[0]);
        var cw = (L.tx1 - L.tx0) / 3;
        for (var q = 0; q < 3; q++) {
          var hh = (L.tBot - L.tTop) * hours[q] / maxH;
          var bx = L.tx0 + cw * q + cw * 0.14;
          U.rr(ctx, bx, L.tBot - hh, cw * 0.72, Math.max(hh, 1), 6);
          ctx.fillStyle = colors[q]; ctx.fill();
          ctx.font = f.mono(22, 650); ctx.textAlign = "center"; ctx.fillStyle = c.ink;
          ctx.fillText(String(Math.round(hours[q])), bx + cw * 0.36, L.tBot - hh - 10);
        }
        ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(L.tx0, L.tBot); ctx.lineTo(L.tx1, L.tBot); ctx.stroke();
        return;
      }

      if (narrow) {
        // three columns under the grid, then the savings line
        var colW = (W - 2 * L.left) / 3;
        var ty = L.tTop;
        ctx.font = f.font(10.5 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink3;
        ctx.fillText("HVAC hours this week", L.left, ty);
        for (var n = 0; n < 3; n++) {
          var cx = L.left + colW * n;
          ctx.fillStyle = colors[n];
          U.rr(ctx, cx, ty + 9, 10, 10, 2); ctx.fill();
          ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.ink2;
          ctx.fillText(names[n], cx + 14, ty + 18);
          ctx.font = f.mono(13 * u, 650); ctx.fillStyle = c.ink;
          ctx.fillText(dur(hours[n]) + " h", cx, ty + 36);
        }
        ctx.font = f.font(10.5 * u, 620); ctx.fillStyle = c.accent;
        ctx.fillText("Optimized saves " + dur(saveC) + " h vs Control, " + dur(saveE) + " h vs Ext.", L.left, ty + 56);
        return;
      }

      var tx = L.tx0, tw = L.tx1 - L.tx0;
      var lh = Math.max(15 * u, 14);
      var y = L.tTop;
      ctx.textAlign = "left"; ctx.font = f.font(11 * u, 620); ctx.fillStyle = c.ink;
      ctx.fillText("HVAC hours this week", tx, y);
      y += lh * 0.9;
      var maxW = 5 * (cfg.extended[1] - cfg.extended[0]);
      for (var r = 0; r < 3; r++) {
        y += lh * 1.15;
        ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
        ctx.fillText(names[r], tx, y);
        ctx.font = f.mono(12 * u, 650); ctx.fillStyle = c.ink; ctx.textAlign = "right";
        ctx.fillText(dur(hours[r]) + " h", tx + tw, y);
        var by2 = y + 5 * u, bh2 = Math.max(6 * u, 5);
        U.rr(ctx, tx, by2, tw, bh2, bh2 / 2); ctx.fillStyle = f.alpha(colors[r], 0.14); ctx.fill();
        if (hours[r] > 0) { U.rr(ctx, tx, by2, Math.max(tw * hours[r] / maxW, bh2), bh2, bh2 / 2); ctx.fillStyle = colors[r]; ctx.fill(); }
        y += bh2 + 4 * u;
      }
      y += lh * 1.3;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, y - lh * 0.85); ctx.lineTo(tx + tw, y - lh * 0.85); ctx.stroke();
      ctx.textAlign = "left"; ctx.font = f.font(11 * u, 620); ctx.fillStyle = c.accent;
      ctx.fillText("Optimized saves", tx, y);
      [[saveC, "vs Control"], [saveE, "vs Extended"]].forEach(function (p) {
        y += lh * 1.05;
        ctx.font = f.mono(12 * u, 650); ctx.fillStyle = c.accent; ctx.textAlign = "left";
        ctx.fillText(dur(p[0]) + " h", tx, y);
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink2; ctx.textAlign = "right";
        ctx.fillText(p[1], tx + tw, y);
      });
    }
  });

  /* Per day: [[on, off] for Control, Extended, Optimized] in hours. */
  function schedules(cfg, season, zone) {
    return season.days.map(function (d) {
      var p = d[zone].split(":"), st = +p[0] + +p[1] / 60;
      return [cfg.control.slice(), cfg.extended.slice(), [st, cfg.optimizedEnd]];
    });
  }

  /* Synthetic radon for schedule k on a day. One shared overnight build-up A(h),
     anchored so the optimized schedule reaches the threshold at opening. */
  function radon(cfg, day, k, h) {
    var sOpt = Math.min(day[2][0], cfg.open);
    var anchor = day[2][0] < cfg.open ? cfg.threshold + cfg.decay * (cfg.open - sOpt) : cfg.quiet;
    var A = function (x) { return anchor + cfg.rise * (x - sOpt); };
    var on = day[k][0], off = day[k][1];
    if (h < on) return A(h);
    var flushed = Math.max(cfg.floor, A(on) - cfg.decay * (h - on));
    if (h < off) return flushed;
    var atOff = Math.max(cfg.floor, A(on) - cfg.decay * (off - on));
    return atOff + cfg.evening * (h - off);
  }

  function layout(f, narrow, compact) {
    var W = f.w, H = f.h, u = U.unit(f);
    var L = { left: W * 0.03 };
    if (compact) {
      L.x0 = W * 0.05; L.x1 = W * 0.6;
      L.gTop = H * 0.08; L.gBot = H * 0.92;
      L.tx0 = W * 0.65; L.tx1 = W * 0.97; L.tTop = H * 0.12; L.tBot = H * 0.92;
    } else if (narrow) {
      L.titleY = Math.max(16 * u, 15);
      L.x0 = W * 0.13; L.x1 = W * 0.97;
      L.rTop = H * 0.09; L.rBot = H * 0.36;
      L.gTop = H * 0.41; L.gBot = H * 0.70;
      L.tTop = H * 0.81;
    } else {
      L.titleY = H * 0.075;
      L.x0 = W * 0.155; L.x1 = W * 0.72;
      L.rTop = H * 0.12; L.rBot = H * 0.42;
      L.gTop = H * 0.5; L.gBot = H * 0.9;
      L.tx0 = W * 0.77; L.tx1 = W * 0.97; L.tTop = H * 0.17;
    }
    L.rowH = (L.gBot - L.gTop) / 5;
    L.barH = L.rowH * (compact ? 0.24 : 0.2);
    L.barGap = L.rowH * (compact ? 0.06 : 0.07);
    return L;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(h) { var mm = Math.round(h * 60); return pad(Math.floor(mm / 60)) + ":" + pad(mm % 60); }
  function dur(h) {
    var mm = Math.round(Math.abs(h) * 60);
    return (h < 0 ? "−" : "") + Math.floor(mm / 60) + ":" + pad(mm % 60);
  }
})();
