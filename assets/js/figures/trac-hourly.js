/* T.R.A.C. Air: from one prompted image to an hourly PM2.5 value.
 * A traffic-camera frame and the weather at that moment go into Gemma 3 (4B),
 * customized with LoRA instruction tuning on 10,000 camera images. The prompt
 * (printed on the poster) asks for a PM2.5 number. Every image's estimate lands
 * on the day's chart; each hour's estimates collapse into their mean, which is
 * compared with the hourly PM2.5 of a state sampling station about 1 km away.
 *
 * Real (For the Benefit of the World poster, 2025): every plotted value, read
 * from the poster's Results chart "PM2.5: Fine-tuned Model vs Sensor (Hourly
 * Comparison) - 2025-05-05" (the 40 raw estimates and the station's hourly
 * values; the hourly means computed here match the chart's hourly-average line);
 * RMSE 0.76 µg/m³ for one camera over four days; 235 million images from 1,395
 * cameras, 2021-2025; the prompt quotes. Three raw points hidden under other
 * markers (11:00, 13:30, 14:00) were recovered from the chart's hourly means.
 * Drawn, not data: the camera frame pictogram and all motion. Hourly means and
 * station values are drawn at mid-hour (the chart draws both on the hour). */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("trac-hourly", {
    config: {
      // Per-image estimates from the poster chart: [hour of day (decimal), PM2.5 µg/m³].
      // Four images per hour, at about :13, :29, :44 and :59 (positions measured on the chart).
      raw: [
        [8.220, 5.5], [8.485, 5.5], [8.745, 2.1], [8.995, 2.1],
        [9.244, 2.3], [9.499, 6.7], [9.749, 7.3], [9.998, 1.6],
        [10.248, 2.1], [10.503, 5.4], [10.758, 8.0], [10.992, 4.4],
        [11.246, 4.4], [11.486, 6.4], [11.741, 6.4], [11.990, 11.0],
        [12.240, 4.3], [12.489, 2.8], [12.739, 3.8], [12.989, 2.7],
        [13.238, 2.5], [13.493, 4.1], [13.732, 2.2], [13.982, 5.0],
        [14.231, 1.1], [14.471, 7.0], [14.725, 4.0], [14.965, 6.6],
        [15.225, 7.0], [15.464, 3.5], [15.713, 4.4], [15.963, 3.4],
        [16.223, 8.3], [16.478, 6.8], [16.722, 5.6], [16.962, 6.9],
        [17.206, 4.1], [17.450, 6.3], [17.700, 3.2], [17.950, 4.4]
      ],
      // State station hourly PM2.5 for 08:00 ... 17:00 (poster chart; its 18:00 value, 8.9, has no model hour)
      station: [4.1, 4.1, 3.7, 4.4, 4.7, 4.6, 5.1, 6.0, 5.4, 5.2],
      startHour: 8,       // chart x range (hours of day)
      endHour: 18,
      yMax: 12,           // µg/m³, chart top
      rmse: "0.76",       // µg/m³, one camera over four days (poster text)
      date: "May 5, 2025",
      startAt: 0.6,       // s: first image goes into the model
      perImage: 0.24,     // s between images
      fly: 0.55,          // s for an estimate to fly from the model to the chart
      collapse: 0.7,      // s for an hour's estimates to merge into their mean
      noteHold: 1.0,      // s an hour's "mean vs station" note stays up
      loop: 17,           // s: whole cycle
      fadeOut: 0.8,       // s: fade at the end of the cycle
      stillAt: 14         // s: thumbnail and reduced-motion frame (full day, hourly line vs station)
    },

    setup: function (f) {
      var s = f.state, cfg = f.cfg;
      if (s.avg == null) s.avg = true;
      // Hourly means of the images in [H, H+1)
      s.hours = [];
      var n = cfg.endHour - cfg.startHour;
      for (var h = 0; h < n; h++) {
        var grp = cfg.raw.slice(h * 4, h * 4 + 4); // the hour's four images, [H, H+1)
        var sum = grp.reduce(function (a, p) { return a + p[1]; }, 0);
        s.hours.push({ mean: sum / grp.length, n: grp.length });
      }
      s.min = Math.min.apply(null, cfg.raw.map(function (p) { return p[1]; }));
      s.max = Math.max.apply(null, cfg.raw.map(function (p) { return p[1]; }));
      if (!s.btn) {
        s.btn = f.button("Show per-image only", function (b) {
          s.avg = !s.avg;
          b.textContent = s.avg ? "Show per-image only" : "Show hourly averages";
        });
      }
    },

    reset: function () {},

    draw: function (f, tAbs) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var t = tAbs % cfg.loop;
      var compact = f.compact, narrow = !compact && W < 480;
      var u = compact ? 1.25 : U.unit(f);
      var g = geo(f, narrow, compact);
      var avg = compact ? true : s.avg;
      var fade = 1 - U.clamp((t - (cfg.loop - cfg.fadeOut)) / cfg.fadeOut, 0, 1);

      var X = function (hr) { return g.x0 + (hr - cfg.startHour) / (cfg.endHour - cfg.startHour) * (g.x1 - g.x0); };
      var Y = function (v) { return g.y1 - v / cfg.yMax * (g.y1 - g.y0); };

      // Event times
      var N = cfg.raw.length;
      var emitT = function (i) { return cfg.startAt + i * cfg.perImage; };
      var landT = function (i) { return emitT(i) + cfg.fly; };
      var hourT = function (h) { return landT(Math.min(N - 1, h * 4 + 3)) + 0.1; };
      var nH = s.hours.length;
      var doneT = hourT(nH - 1) + cfg.collapse;
      var cur = Math.floor((t - cfg.startAt) / cfg.perImage); // index of the image being processed
      cur = U.clamp(cur, -1, N - 1);

      /* ---------- Chart frame ---------- */
      drawAxes(f, g, X, Y, narrow, compact, u);

      ctx.save();
      ctx.globalAlpha = fade;

      // Hour band for the hour being averaged
      if (avg && !compact) {
        for (var hb = 0; hb < nH; hb++) {
          var kb = (t - hourT(hb)) / (cfg.collapse + 0.4);
          if (kb > 0 && kb < 1) {
            ctx.fillStyle = f.alpha(c.accent, 0.10 * Math.sin(kb * Math.PI));
            ctx.fillRect(X(cfg.startHour + hb), g.y0, X(cfg.startHour + hb + 1) - X(cfg.startHour + hb), g.y1 - g.y0);
          }
        }
      }

      // Station line (dashed) and squares, revealed hour by hour
      var stPts = [];
      for (var hs = 0; hs < nH; hs++) {
        var ks = U.ease(t, hourT(hs) + 0.15, 0.4);
        if (ks <= 0) break;
        stPts.push({ x: X(cfg.startHour + hs + 0.5), y: Y(cfg.station[hs]), k: ks });
      }
      polyline(f, stPts, c.signal, (compact ? 4.5 : 2) * u, [6 * u, 4 * u]);
      stPts.forEach(function (p) {
        var r = (compact ? 6 : 3.6) * u * p.k;
        ctx.fillStyle = c.signal; ctx.fillRect(p.x - r, p.y - r, 2 * r, 2 * r);
      });

      // Per-image estimates
      var rawPts = [];
      for (var i = 0; i < N; i++) {
        if (t < landT(i)) break;
        var p = cfg.raw[i], hIdx = U.clamp(Math.floor(i / 4), 0, nH - 1);
        var px = X(p[0]), py = Y(p[1]);
        var a = 1, rr = (compact ? 5.5 : 3.2) * u;
        if (avg) {
          var kc = U.ease(t, hourT(hIdx), cfg.collapse);
          a = 1 - 0.3 * kc;
          // lines pulling each estimate toward its hour's mean
          if (kc > 0 && kc < 1) {
            var mx = X(cfg.startHour + hIdx + 0.5), my = Y(s.hours[hIdx].mean);
            ctx.strokeStyle = f.alpha(c.third, 0.7 * (1 - kc)); ctx.lineWidth = 1.2 * u;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(U.lerp(px, mx, kc), U.lerp(py, my, kc)); ctx.stroke();
          }
        }
        rawPts.push({ x: px, y: py, a: a, r: rr });
      }
      if (!avg) polyline(f, rawPts, f.alpha(c.third, 0.8), 1.3 * u);
      rawPts.forEach(function (q) {
        ctx.fillStyle = f.alpha(c.third, q.a);
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      });

      // Hourly means
      if (avg) {
        var hPts = [];
        for (var h = 0; h < nH; h++) {
          var kh = U.ease(t, hourT(h) + cfg.collapse * 0.35, cfg.collapse);
          if (kh <= 0) break;
          hPts.push({ x: X(cfg.startHour + h + 0.5), y: Y(s.hours[h].mean), k: kh });
        }
        polyline(f, hPts, c.accent, (compact ? 6 : 2.8) * u);
        hPts.forEach(function (q) {
          ctx.fillStyle = c.accent;
          ctx.beginPath(); ctx.arc(q.x, q.y, (compact ? 7.5 : 4.6) * u * q.k, 0, Math.PI * 2); ctx.fill();
          if (!compact) {
            ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5 * u; ctx.stroke();
          }
        });
      }
      ctx.restore();

      /* ---------- Readouts ---------- */
      drawReadout(f, g, t, avg, doneT, fade, narrow, compact, u);
      if (compact) return;

      /* ---------- Pipeline: image + weather -> model -> estimate ---------- */
      drawPipeline(f, g, t, cur, narrow, u, fade);

      // Estimates in flight from the model to the chart
      ctx.save(); ctx.globalAlpha = fade;
      for (var j = Math.max(0, cur - 6); j <= cur; j++) {
        var q2 = (t - emitT(j)) / cfg.fly;
        if (q2 < 0 || q2 >= 1) continue;
        var e = 1 - Math.pow(1 - q2, 3);
        var tx = X(cfg.raw[j][0]), ty = Y(cfg.raw[j][1]);
        var cx = (g.port.x + tx) / 2, cy = Math.min(g.port.y, ty) - (narrow ? 10 : 30) * u;
        var bx = (1 - e) * (1 - e) * g.port.x + 2 * (1 - e) * e * cx + e * e * tx;
        var by = (1 - e) * (1 - e) * g.port.y + 2 * (1 - e) * e * cy + e * e * ty;
        var label = cfg.raw[j][1].toFixed(1);
        ctx.font = f.mono(10.5 * u, 600);
        var lw = ctx.measureText(label).width + 8 * u, lh = 15 * u;
        var sh = U.lerp(1, 0.4, U.clamp((q2 - 0.75) / 0.25, 0, 1));
        U.rr(ctx, bx - lw * sh / 2, by - lh * sh / 2, lw * sh, lh * sh, lh * sh / 2);
        ctx.fillStyle = c.third; ctx.fill();
        if (sh > 0.7) {
          ctx.fillStyle = c.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(label, bx, by + 0.5);
          ctx.textBaseline = "alphabetic";
        }
      }
      ctx.restore();

      // Live note: the current image, or the hour just averaged
      var note = "", tone = c.ink2;
      if (t < doneT + 0.2) {
        var lastH = -1;
        for (var hh = 0; hh < nH; hh++) if (t >= hourT(hh)) lastH = hh;
        if (avg && lastH >= 0 && t - hourT(lastH) < cfg.noteHold) {
          var hr = cfg.startHour + lastH;
          note = (narrow ? "" : pad(hr) + ":00–" + pad(hr + 1) + ":00 ") + "mean of " + s.hours[lastH].n + ": " +
            s.hours[lastH].mean.toFixed(1) + " · station " + cfg.station[lastH].toFixed(1);
          tone = c.accent;
        } else if (cur >= 0) {
          note = "image " + clock(cfg.raw[cur][0]) + " → " + cfg.raw[cur][1].toFixed(1) + " µg/m³";
          tone = c.third;
        }
      } else {
        note = narrow ? cfg.date : "One camera, " + cfg.date;
        tone = c.ink3;
      }
      if (note) {
        ctx.save(); ctx.globalAlpha = fade;
        ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "right"; ctx.fillStyle = tone;
        ctx.fillText(note, g.x1, g.y0 - 8 * u);
        ctx.restore();
      }
    }
  });

  /* ---------- Geometry ---------- */
  function geo(f, narrow, compact) {
    var W = f.w, H = f.h, u = U.unit(f);
    if (compact) {
      return { x0: W * 0.06, x1: W * 0.95, y0: H * 0.07, y1: H * 0.72 };
    }
    if (narrow) {
      var cy = H * 0.07, ch = H * 0.22;
      return {
        cam: { x: W * 0.04, y: cy, w: W * 0.25, h: ch },
        wx: { x: W * 0.32, y: cy, w: W * 0.33, h: ch },
        model: { x: W * 0.69, y: cy, w: W * 0.27, h: ch },
        port: { x: W * 0.825, y: cy + ch },
        quoteY: H * 0.37,
        legendY: H * 0.455,
        x0: W * 0.1, x1: W * 0.96, y0: H * 0.52, y1: H * 0.82,
        readY: H * 0.955
      };
    }
    var L = W * 0.03;
    return {
      cam: { x: L, y: H * 0.12, w: W * 0.18, h: H * 0.25 },
      wx: { x: L + W * 0.2, y: H * 0.12, w: W * 0.195, h: H * 0.25 },
      model: { x: L, y: H * 0.47, w: W * 0.395, h: H * 0.15 },
      port: { x: L + W * 0.395, y: H * 0.545 },
      quoteX: L, quoteY: H * 0.72, quoteW: W * 0.395,
      legendY: H * 0.07,
      x0: W * 0.52, x1: W * 0.97, y0: H * 0.16, y1: H * 0.76,
      readY: H * 0.94
    };
  }

  /* ---------- Chart axes and legend ---------- */
  function drawAxes(f, g, X, Y, narrow, compact, u) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg;
    var ticks = narrow || compact ? [0, 6, 12] : [0, 4, 8, 12];
    ctx.lineWidth = 1;
    ticks.forEach(function (v) {
      ctx.strokeStyle = v === 0 ? c.lineStrong : c.line;
      ctx.beginPath(); ctx.moveTo(g.x0, Y(v)); ctx.lineTo(g.x1, Y(v)); ctx.stroke();
      if (!compact) {
        ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "right";
        ctx.fillText(String(v), g.x0 - 5 * u, Y(v) + 3.5 * u);
      }
    });
    if (compact) return;
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
    ctx.fillText("PM2.5 µg/m³", g.x0 - (narrow ? 0 : 22 * u), g.y0 - 8 * u);
    var step = narrow ? 5 : 2;
    for (var hr = cfg.startHour; hr <= cfg.endHour; hr += step) {
      ctx.textAlign = hr === cfg.endHour ? "right" : hr === cfg.startHour ? "left" : "center";
      ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink3;
      ctx.fillText(pad(hr) + ":00", X(hr), g.y1 + 15 * u);
      ctx.strokeStyle = c.lineStrong;
      ctx.beginPath(); ctx.moveTo(X(hr), g.y1); ctx.lineTo(X(hr), g.y1 + 4 * u); ctx.stroke();
    }
    // Legend
    var items = narrow
      ? [["dot", c.third, "per image"], ["avg", c.accent, "hourly avg"], ["sq", c.signal, "station"]]
      : [["dot", c.third, "per-image estimate"], ["avg", c.accent, "hourly mean"], ["sq", c.signal, "station, ~1 km"]];
    var y = g.legendY, gap = (narrow ? 10 : 14) * u;
    ctx.font = f.font(10.5 * u, 520);
    // right-align the legend to the plot's right edge so it never runs off the canvas
    var total = items.reduce(function (a, it) { return a + 15 * u + ctx.measureText(it[2]).width + gap; }, -gap);
    var x = Math.max(narrow ? f.w * 0.04 : g.x0 - 22 * u, g.x1 - total) + 2 * u;
    items.forEach(function (it) {
      ctx.fillStyle = it[1]; ctx.strokeStyle = it[1];
      if (it[0] === "dot") { ctx.beginPath(); ctx.arc(x + 4 * u, y - 3.5 * u, 3.2 * u, 0, Math.PI * 2); ctx.fill(); }
      if (it[0] === "avg") {
        ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.moveTo(x - 2 * u, y - 3.5 * u); ctx.lineTo(x + 10 * u, y - 3.5 * u); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 4 * u, y - 3.5 * u, 3.8 * u, 0, Math.PI * 2); ctx.fill();
      }
      if (it[0] === "sq") {
        ctx.lineWidth = 2 * u; ctx.setLineDash([3 * u, 2 * u]);
        ctx.beginPath(); ctx.moveTo(x - 2 * u, y - 3.5 * u); ctx.lineTo(x + 10 * u, y - 3.5 * u); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillRect(x + 1 * u, y - 6.5 * u, 6 * u, 6 * u);
      }
      ctx.fillStyle = f.c.ink2; ctx.textAlign = "left";
      ctx.fillText(it[2], x + 15 * u, y);
      x += 15 * u + ctx.measureText(it[2]).width + gap;
    });
  }

  /* ---------- RMSE / range readout ---------- */
  function drawReadout(f, g, t, avg, doneT, fade, narrow, compact, u) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, s = f.state;
    if (compact) {
      var k0 = U.ease(t, doneT, 0.6);
      ctx.save(); ctx.globalAlpha = k0 * fade;
      ctx.textAlign = "left"; ctx.fillStyle = c.ink3; ctx.font = f.font(26, 600);
      ctx.fillText("RMSE", g.x0, f.h * 0.9);
      var lw = ctx.measureText("RMSE ").width;
      ctx.fillStyle = c.ink; ctx.font = f.mono(46, 650);
      ctx.fillText(cfg.rmse, g.x0 + lw, f.h * 0.92);
      ctx.restore();
      return;
    }
    var k = avg ? U.ease(t, doneT, 0.6) : 1;
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k * fade; ctx.textAlign = "right";
    var x = f.w * (narrow ? 0.96 : 0.97), y = g.readY;
    if (avg) {
      ctx.font = f.mono(14 * u, 650); ctx.fillStyle = c.ink;
      var v = cfg.rmse + " µg/m³";
      ctx.fillText(v, x, y);
      var vw = ctx.measureText(v).width;
      ctx.font = f.font(10.5 * u, 520); ctx.fillStyle = c.ink2;
      ctx.fillText(narrow ? "RMSE, 4 days" : "RMSE, 4 days:", x - vw - 6 * u, y);
    } else {
      ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.third;
      ctx.fillText((narrow ? "range " : "per-image range ") + s.min.toFixed(1) + "–" + s.max.toFixed(1) + " µg/m³", x, y);
    }
    ctx.restore();
  }

  /* ---------- Pipeline ---------- */
  function drawPipeline(f, g, t, cur, narrow, u, fade) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg;
    var cam = g.cam, wx = g.wx, m = g.model;
    var phase = cur >= 0 ? ((t - cfg.startAt) / cfg.perImage) % 1 : 0;
    var active = cur >= 0 && cur < cfg.raw.length && t < cfg.startAt + cfg.raw.length * cfg.perImage;

    // Labels above the cards
    ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
    ctx.fillText(narrow ? "Camera" : "Traffic-camera image", cam.x, cam.y - 7 * u);
    ctx.fillText(narrow ? "Weather" : "Weather at that moment", wx.x, wx.y - 7 * u);
    if (narrow) ctx.fillText("Model", m.x, m.y - 7 * u);

    // Camera frame pictogram
    ctx.save();
    U.rr(ctx, cam.x, cam.y, cam.w, cam.h, 6 * u); ctx.clip();
    ctx.fillStyle = c.thirdSoft; ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
    var hz = cam.y + cam.h * 0.52;
    ctx.fillStyle = f.alpha(c.ink3, 0.45);
    ctx.beginPath(); ctx.moveTo(cam.x, hz);
    [[0.12, 0.30], [0.26, 0.42], [0.42, 0.22], [0.58, 0.38], [0.74, 0.28], [0.9, 0.4], [1, 0.34]].forEach(function (p) {
      ctx.lineTo(cam.x + cam.w * p[0], cam.y + cam.h * p[1]);
    });
    ctx.lineTo(cam.x + cam.w, hz); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.sunk; ctx.fillRect(cam.x, hz, cam.w, cam.h);
    ctx.fillStyle = f.alpha(c.ink3, 0.35);
    ctx.beginPath(); ctx.moveTo(cam.x + cam.w * 0.44, hz); ctx.lineTo(cam.x + cam.w * 0.56, hz);
    ctx.lineTo(cam.x + cam.w * 0.95, cam.y + cam.h); ctx.lineTo(cam.x + cam.w * 0.05, cam.y + cam.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = f.alpha(c.bg, 0.9); ctx.lineWidth = 1.5 * u; ctx.setLineDash([4 * u, 4 * u]);
    ctx.beginPath(); ctx.moveTo(cam.x + cam.w * 0.5, hz); ctx.lineTo(cam.x + cam.w * 0.5, cam.y + cam.h); ctx.stroke(); ctx.setLineDash([]);
    // haze veil
    ctx.fillStyle = f.alpha(c.bg, 0.22); ctx.fillRect(cam.x, cam.y, cam.w, hz - cam.y + cam.h * 0.08);
    // shutter flash on each new frame
    if (active && phase < 0.35) { ctx.fillStyle = f.alpha(c.bg, 0.5 * (1 - phase / 0.35)); ctx.fillRect(cam.x, cam.y, cam.w, cam.h); }
    ctx.restore();
    U.rr(ctx, cam.x, cam.y, cam.w, cam.h, 6 * u); ctx.strokeStyle = active ? c.third : c.line; ctx.lineWidth = 1.2 * u; ctx.stroke();
    // timestamp chip
    var stamp = clock(cfg.raw[Math.max(0, cur)][0]);
    ctx.font = f.mono(10.5 * u, 600);
    var sw = ctx.measureText(stamp).width + 8 * u;
    U.rr(ctx, cam.x + 4 * u, cam.y + cam.h - 18 * u, sw, 14 * u, 3 * u); ctx.fillStyle = f.alpha(c.bg, 0.85); ctx.fill();
    ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.fillText(stamp, cam.x + 8 * u, cam.y + cam.h - 7.5 * u);

    // Weather card: the prompt's template fields
    U.rr(ctx, wx.x, wx.y, wx.w, wx.h, 6 * u); ctx.fillStyle = c.sunk; ctx.fill();
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.2 * u; ctx.stroke();
    var lines = narrow ? ["Vis {…} mi", "Cloud {…}%", "Desc {…}"] : ["Visibility: {…} mi", "Cloud cover: {…}%", "Weather: {…}"];
    ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
    var lh = wx.h / (lines.length + 1);
    lines.forEach(function (ln, i) { ctx.fillText(ln, wx.x + 7 * u, wx.y + lh * (i + 1) + 4 * u); });

    // Arrows into the model
    var into = narrow
      ? [[{ x: cam.x + cam.w, y: cam.y + cam.h / 2 }, { x: wx.x, y: wx.y + wx.h / 2 }], [{ x: wx.x + wx.w, y: wx.y + wx.h / 2 }, { x: m.x, y: m.y + m.h / 2 }]]
      : [[{ x: cam.x + cam.w / 2, y: cam.y + cam.h }, { x: cam.x + cam.w / 2, y: m.y }], [{ x: wx.x + wx.w / 2, y: wx.y + wx.h }, { x: wx.x + wx.w / 2, y: m.y }]];
    into.forEach(function (seg) {
      arrow(f, seg[0], seg[1], c.lineStrong, u);
      if (active && phase > 0.1 && phase < 0.6) {
        var k = (phase - 0.1) / 0.5;
        var p = { x: U.lerp(seg[0].x, seg[1].x, k), y: U.lerp(seg[0].y, seg[1].y, k) };
        ctx.fillStyle = c.ink2; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6 * u, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Model block
    U.rr(ctx, m.x, m.y, m.w, m.h, 8 * u); ctx.fillStyle = c.bg; ctx.fill();
    ctx.strokeStyle = active ? c.ink2 : c.lineStrong; ctx.lineWidth = 1.5 * u; ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = c.ink;
    if (narrow) {
      ctx.font = f.font(11.5 * u, 650); ctx.fillText("Gemma 3", m.x + m.w / 2, m.y + m.h * 0.42);
      ctx.font = f.font(10.5 * u, 520); ctx.fillStyle = c.ink2; ctx.fillText("4B + LoRA", m.x + m.w / 2, m.y + m.h * 0.72);
    } else {
      ctx.font = f.font(13 * u, 650); ctx.fillText("Gemma 3 · 4B + LoRA", m.x + m.w / 2, m.y + m.h * 0.44);
      ctx.font = f.font(10.5 * u, 500); ctx.fillStyle = c.ink2;
      ctx.fillText("LoRA-tuned on 10,000 camera images", m.x + m.w / 2, m.y + m.h * 0.78);
    }
    // thinking ticks
    if (active && phase > 0.45) {
      ctx.fillStyle = c.ink3;
      for (var d = 0; d < 3; d++) {
        var on = phase > 0.5 + d * 0.12;
        if (on) { ctx.beginPath(); ctx.arc(m.x + m.w - (narrow ? 8 : 14) * u - d * 6 * u, m.y + 8 * u, 1.8 * u, 0, Math.PI * 2); ctx.fill(); }
      }
    }

    // Output port
    ctx.fillStyle = c.third; ctx.beginPath(); ctx.arc(g.port.x, g.port.y, 3.5 * u, 0, Math.PI * 2); ctx.fill();
    if (!narrow) {
      ctx.font = f.font(10.5 * u, 520); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      ctx.fillText("PM2.5", g.port.x + 7 * u, g.port.y - 7 * u);
    }

    // Prompt quotes
    ctx.textAlign = "left";
    if (narrow) {
      ctx.font = f.font(10.5 * u, 500); ctx.fillStyle = c.ink2;
      var q = "Prompt: if overcast, “lower the pm2.5 prediction”";
      wrap(ctx, q, f.w * 0.92).forEach(function (ln, i) { ctx.fillText(ln, f.w * 0.04, g.quoteY + i * 13 * u); });
      return;
    }
    ctx.font = f.font(10.5 * u, 600); ctx.fillStyle = c.ink3;
    ctx.fillText("From the prompt", g.quoteX, g.quoteY);
    var quotes = [
      "“When this shows overcast condition, lower the pm2.5 prediction.”",
      "“Do not overestimate haze unless the image shows distinct gray smog…”"
    ];
    var y = g.quoteY + 16 * u;
    ctx.font = "italic " + f.font(10.5 * u, 450); ctx.fillStyle = c.ink2;
    quotes.forEach(function (qt) {
      var ls = wrap(ctx, qt, g.quoteW);
      ls.forEach(function (ln) { ctx.fillText(ln, g.quoteX, y); y += 13.5 * u; });
      y += 4 * u;
    });
    ctx.font = f.font(10.5 * u, 500); ctx.fillStyle = c.ink3;
    ctx.fillText("1 of 1,395 cameras · 235M images, 2021–2025", g.quoteX, g.readY);
  }

  /* ---------- Helpers ---------- */
  function polyline(f, pts, color, lw, dash) {
    if (pts.length < 2) return;
    var ctx = f.ctx;
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      var k = pts[i].k == null ? 1 : pts[i].k;
      ctx.lineTo(U.lerp(pts[i - 1].x, pts[i].x, k), U.lerp(pts[i - 1].y, pts[i].y, k));
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function arrow(f, a, b, color, u) {
    var ctx = f.ctx, ang = Math.atan2(b.y - a.y, b.x - a.x), hl = 5 * u;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.3 * u;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x - Math.cos(ang) * hl, b.y - Math.sin(ang) * hl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - Math.cos(ang - 0.45) * hl, b.y - Math.sin(ang - 0.45) * hl);
    ctx.lineTo(b.x - Math.cos(ang + 0.45) * hl, b.y - Math.sin(ang + 0.45) * hl);
    ctx.closePath(); ctx.fill();
  }

  function wrap(ctx, text, maxW) {
    var words = text.split(" "), out = [], line = "";
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    });
    if (line) out.push(line);
    return out;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clock(hr) {
    var h = Math.floor(hr), m = Math.floor((hr - h) * 60 + 0.01);
    return pad(h) + ":" + pad(m);
  }
})();
