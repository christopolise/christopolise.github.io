/* Radon HVAC: optimized start times from the deployment.
 * Every zone starts at the 06:00 control time; the dots then slide to the start
 * time the algorithm derived for that weekday and season. The column on the right
 * adds up the HVAC start time saved (or added) against the control schedule.
 * All start times are the values in Table 1 of the paper (W-down 'W' 7:00 read as 07:00).
 * Per-day savings are computed from those start times. */
(function () {
  "use strict";
  var U = Fig.util;

  // Table 1: optimized start (minutes after midnight) per season, weekday, zone 1..3.
  var T = function (s) { var p = s.split(":"); return +p[0] * 60 + +p[1]; };
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

  Fig.register("radon-hvac-starts", {
    config: {
      control: 360,        // min, control HVAC start 06:00 (paper)
      extended: 300,       // min, extended (naive) start 05:00 (paper)
      occupied: 420,       // min, school opens 07:00 (paper)
      axisFrom: 270,       // min, left edge of the time axis (04:30)
      axisTo: 435,         // min, right edge of the time axis (07:15)
      slide: 1.6,          // s for the dots to move from 06:00 to their times
      stagger: 0.05,       // s between dots starting to move
      hold: 4.5,           // s before moving to the next season
      stillAt: 3.5         // s: frame shown when motion is reduced
    },

    setup: function (f) {
      var s = f.state;
      if (s.season == null) s.season = 0;
      s.auto = s.auto == null ? true : s.auto;
      if (!s.btn) {
        s.btn = f.button("Next season", function () {
          s.auto = false;
          s.season = (s.season + 1) % SEASONS.length;
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f);
      var narrow = W < 480;
      var cycle = cfg.slide + cfg.stagger * 15 + cfg.hold;
      var idx = s.auto ? (s.season + Math.floor(t / cycle)) % SEASONS.length : s.season;
      var lt = s.auto ? t % cycle : Math.min(t, cycle);
      var season = SEASONS[idx];

      var x0 = W * (narrow ? 0.13 : 0.1), x1 = W * (narrow ? 0.76 : 0.74);
      var X = function (m) { return x0 + (x1 - x0) * (m - cfg.axisFrom) / (cfg.axisTo - cfg.axisFrom); };
      var top = H * 0.25, bottom = H * 0.8;
      var rowH = (bottom - top) / DAYS.length;
      var lh = Math.max(15 * u, 13);

      /* ---- Title and legend ---- */
      ctx.textAlign = "left"; ctx.fillStyle = c.ink; ctx.font = f.font(14 * u, 620);
      ctx.fillText(narrow ? season.short : season.name, W * 0.04, H * 0.03 + lh);
      var zones = [[c.accent, "Zone 1"], [c.signal, "Zone 2"], [c.ink3, narrow ? "Zone 3" : "Zone 3 (lower radon)"]];
      ctx.font = f.font(10.5 * u);
      var lx = W * 0.04, ly = H * 0.03 + lh * 2.1;
      zones.forEach(function (z) {
        ctx.fillStyle = z[0]; ctx.beginPath(); ctx.arc(lx + 4 * u, ly - 4, Math.max(4 * u, 3), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.ink2; ctx.fillText(z[1], lx + 12 * u + 2, ly);
        lx += ctx.measureText(z[1]).width + 24 * u + 4;
      });

      /* ---- Reference times ---- */
      var refs = [[cfg.extended, "05:00", narrow ? "" : "extended"], [cfg.control, "06:00", "control"], [cfg.occupied, "07:00", narrow ? "open" : "school opens"]];
      refs.forEach(function (r) {
        var x = X(r[0]);
        ctx.strokeStyle = r[0] === cfg.control ? c.ink2 : c.line; ctx.lineWidth = 1;
        ctx.setLineDash(r[0] === cfg.occupied ? [4 * u, 4 * u] : []);
        ctx.beginPath(); ctx.moveTo(x, top - rowH * 0.3); ctx.lineTo(x, bottom); ctx.stroke(); ctx.setLineDash([]);
        ctx.textAlign = "center"; ctx.fillStyle = c.ink3;
        ctx.font = f.mono(10.5 * u); ctx.fillText(r[1], x, bottom + lh);
        if (r[2]) { ctx.font = f.font(10.5 * u); ctx.fillText(r[2], x, bottom + lh * 2); }
      });

      /* ---- Dots ---- */
      var totals = [];
      ctx.font = f.font(11 * u, 560);
      DAYS.forEach(function (d, i) {
        var y = top + rowH * (i + 0.5);
        ctx.textAlign = "right"; ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u, 560);
        ctx.fillText(d, x0 - 8 * u, y + 4 * u);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        var shown = 0;
        season.days[i].forEach(function (time, z) {
          var target = T(time);
          var k = U.ease(lt, (i * 3 + z) * cfg.stagger, cfg.slide);
          var m = U.lerp(cfg.control, target, k);
          shown += (m - cfg.control);
          var dy = (z - 1) * Math.max(5 * u, 4);
          ctx.fillStyle = zones[z][0];
          ctx.beginPath(); ctx.arc(X(m), y + dy, Math.max(4.5 * u, 3.5), 0, Math.PI * 2); ctx.fill();
        });
        totals.push(shown);
      });

      /* ---- Saved column ---- */
      var cx = W * 0.95;
      ctx.textAlign = "right"; ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
      ctx.fillText(narrow ? "vs 06:00" : "saved vs control", cx, top - rowH * 0.15);
      ctx.font = f.mono(12 * u, 600);
      var sum = 0;
      totals.forEach(function (v, i) {
        var mins = Math.round(v); sum += mins;
        ctx.fillStyle = mins < 0 ? c.bad : c.ink;
        ctx.fillText(dur(mins), cx, top + rowH * (i + 0.5) + 4 * u);
      });
      ctx.strokeStyle = c.line;
      ctx.beginPath(); ctx.moveTo(cx - 52 * u - 10, bottom); ctx.lineTo(cx, bottom); ctx.stroke();
      ctx.fillStyle = sum < 0 ? c.bad : c.good; ctx.font = f.mono(13 * u, 650);
      ctx.fillText(dur(sum), cx, bottom + lh);
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
      ctx.fillText(narrow ? "per week" : "week, 3 zones", cx, bottom + lh * 2);
    }
  });

  function dur(min) {
    var sign = min < 0 ? "−" : "+";
    var a = Math.abs(min);
    return sign + Math.floor(a / 60) + ":" + (a % 60 < 10 ? "0" : "") + (a % 60);
  }
})();
