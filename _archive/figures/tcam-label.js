/* TCAM: pairing traffic-camera frames with hourly PM2.5 labels.
 * Camera frames arrive several times an hour; DAQ stations report PM2.5 once an
 * hour. Each frame takes the AQI category of its hour as its training label,
 * and the classifier (YOLO-cls on the poster) learns to predict that category
 * from the image alone. The scene, the PM2.5 series and the model's
 * probabilities are synthetic. Category thresholds use the EPA PM2.5 AQI
 * breakpoints; the poster does not list the exact values it used. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("tcam-label", {
    config: {
      cats: [                       // AQI categories by PM2.5 (ug/m3); EPA breakpoints, illustrative here
        { name: "Good", short: "Good", max: 9 },
        { name: "Moderate", short: "Mod.", max: 35.4 },
        { name: "Sensitive groups", short: "Sens.", max: 55.4 },
        { name: "Unhealthy", short: "Unh.", max: 1e9 }
      ],
      days: {                       // hourly PM2.5 for one synthetic day of each kind
        clean: [4, 4, 3, 3, 3, 4, 5, 7, 9, 8, 7, 6, 5, 5, 6, 6, 7, 9, 11, 10, 8, 7, 6, 5],
        inversion: [24, 26, 28, 30, 31, 33, 36, 41, 46, 50, 52, 54, 55, 57, 58, 56, 53, 49, 47, 45, 44, 41, 38, 36]
      },
      hourDur: 0.6,                 // s of animation per hour of the day
      framesPerHour: 4,             // camera frames shown per hour (illustrative)
      hazeAt: 70,                   // PM2.5 at which the scene is fully washed out (illustrative)
      hold: 2,                      // s after the day ends before it repeats
      stillAt: 9.3                  // s: frame shown when motion is reduced
    },

    setup: function (f) {
      var s = f.state;
      s.day = s.day || "inversion";
      if (!s.btn) {
        s.btn = f.button("Show a clean day", function (b) {
          s.day = s.day === "clean" ? "inversion" : "clean";
          b.textContent = s.day === "clean" ? "Show a winter inversion day" : "Show a clean day";
          f.restart(true);
        });
      }
    },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg;
      var u = U.unit(f), g = layout(f);
      var series = cfg.days[s.day];
      var period = 24 * cfg.hourDur + cfg.hold;
      var lt = t % period;
      var hourF = Math.min(23.999, lt / cfg.hourDur);
      var hour = Math.floor(hourF);
      var pm = series[hour];
      var cat = catOf(cfg, pm);
      var catCol = function (i) { return [c.good, f.alpha(c.bad, 0.45), f.alpha(c.bad, 0.72), c.bad][i]; };

      /* ---- Camera frame (synthetic scene) ---- */
      var cf = g.cam;
      var smooth = U.lerp(series[hour], series[Math.min(23, hour + 1)], hourF - hour);
      var haze = U.clamp(smooth / cfg.hazeAt, 0, 1);
      ctx.save();
      U.rr(ctx, cf.x, cf.y, cf.w, cf.h, 6 * u); ctx.clip();
      ctx.fillStyle = c.sunk; ctx.fillRect(cf.x, cf.y, cf.w, cf.h);
      ctx.fillStyle = f.alpha(c.accent, 0.06); ctx.fillRect(cf.x, cf.y, cf.w, cf.h * 0.55);
      /* far mountains: contrast falls as haze rises */
      ctx.fillStyle = f.alpha(c.ink2, 0.7 * (1 - haze * 0.9));
      ctx.beginPath(); ctx.moveTo(cf.x, cf.y + cf.h * 0.55);
      var pk = [0.42, 0.3, 0.38, 0.22, 0.33, 0.27, 0.4, 0.35, 0.46];
      for (var i = 0; i < pk.length; i++) ctx.lineTo(cf.x + cf.w * i / (pk.length - 1), cf.y + cf.h * pk[i]);
      ctx.lineTo(cf.x + cf.w, cf.y + cf.h * 0.55); ctx.closePath(); ctx.fill();
      /* snow caps */
      ctx.fillStyle = f.alpha(c.bg, 0.8 * (1 - haze));
      [3, 5].forEach(function (j) {
        var px = cf.x + cf.w * j / (pk.length - 1), py = cf.y + cf.h * pk[j];
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - cf.w * 0.04, py + cf.h * 0.06); ctx.lineTo(px + cf.w * 0.04, py + cf.h * 0.06); ctx.closePath(); ctx.fill();
      });
      /* valley houses, mid-distance */
      ctx.fillStyle = f.alpha(c.ink3, 0.75 * (1 - haze * 0.6));
      for (i = 0; i < 14; i++) {
        var hx = cf.x + cf.w * (0.03 + i * 0.07), hw = cf.w * 0.045, hh = cf.h * (0.05 + ((i * 37) % 5) * 0.012);
        ctx.fillRect(hx, cf.y + cf.h * 0.6 - hh, hw, hh);
      }
      /* haze veil, thickest toward the horizon */
      var veil = ctx.createLinearGradient(0, cf.y, 0, cf.y + cf.h);
      veil.addColorStop(0, f.alpha(c.ink3, 0.55 * haze));
      veil.addColorStop(0.6, f.alpha(c.ink3, 0.5 * haze));
      veil.addColorStop(1, f.alpha(c.ink3, 0.12 * haze));
      ctx.fillStyle = veil; ctx.fillRect(cf.x, cf.y, cf.w, cf.h);
      /* road in the foreground stays sharp */
      ctx.fillStyle = f.alpha(c.ink, 0.55);
      ctx.beginPath(); ctx.moveTo(cf.x, cf.y + cf.h); ctx.lineTo(cf.x + cf.w * 0.3, cf.y + cf.h * 0.66);
      ctx.lineTo(cf.x + cf.w * 0.4, cf.y + cf.h * 0.66); ctx.lineTo(cf.x + cf.w * 0.62, cf.y + cf.h); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; U.rr(ctx, cf.x, cf.y, cf.w, cf.h, 6 * u); ctx.stroke();
      ctx.fillStyle = c.ink; ctx.font = f.mono(10.5 * u); ctx.textAlign = "right";
      var hh2 = Math.floor(hourF), mm = Math.floor((hourF - hh2) * 4) * 15;
      ctx.fillText(pad(hh2) + ":" + pad(mm), cf.x + cf.w - 8 * u, cf.y + 16 * u);
      ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "UDOT camera" : "UDOT traffic camera", cf.x + 8 * u, cf.y + 16 * u);

      /* ---- Label and prediction ---- */
      var rd = g.read, lh = Math.max(16 * u, 14);
      ctx.textAlign = "left"; ctx.font = f.font(11 * u); ctx.fillStyle = c.ink2;
      ctx.fillText(g.narrow ? "Label (DAQ, this hour)" : "Label from the DAQ station, this hour", rd.x, rd.y);
      ctx.font = f.mono(13 * u, 600); ctx.fillStyle = c.ink;
      ctx.fillText(pm.toFixed(0) + " µg/m³", rd.x, rd.y + lh * 1.25);
      var tw = ctx.measureText(pm.toFixed(0) + " µg/m³").width;
      chip(f, rd.x + tw + 10 * u, rd.y + lh * 1.25, g.narrow ? cfg.cats[cat].short : cfg.cats[cat].name, catCol(cat), u);

      var py0 = rd.y + lh * 2.9;
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink2;
      ctx.fillText(g.narrow ? "Model, from the image" : "Model prediction, from the image alone", rd.x, py0);
      var probs = predict(cfg, pm);
      var bw = rd.w - (g.narrow ? Math.max(40 * u, 36) : Math.max(100 * u, 94));
      var best = probs.indexOf(Math.max.apply(null, probs));
      for (i = 0; i < 4; i++) {
        var y = py0 + lh * 0.7 + i * lh * 1.05;
        ctx.fillStyle = i === best ? c.ink : c.ink3; ctx.font = f.font(11 * u, i === best ? 600 : 450);
        ctx.textAlign = "left";
        ctx.fillText(g.narrow ? cfg.cats[i].short : cfg.cats[i].name, rd.x, y + 9 * u);
        var bx = rd.x + rd.w - bw;
        ctx.fillStyle = c.line; ctx.fillRect(bx, y + 2 * u, bw, 8 * u);
        ctx.fillStyle = i === best ? c.accent : f.alpha(c.accent, 0.35);
        ctx.fillRect(bx, y + 2 * u, bw * probs[i], 8 * u);
      }

      /* ---- Day strip: hourly DAQ bars and camera frames ---- */
      var st = g.strip;
      var colW = st.w / 24;
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "Hourly PM2.5 (DAQ)" : "Hourly PM2.5 from the DAQ station", st.x, st.y + st.h + Math.max(16 * u, 14));
      ctx.textAlign = "right"; ctx.fillStyle = c.ink3;
      ctx.fillText(s.day === "clean" ? "clean day" : "winter inversion", st.x + st.w, st.y + st.h + Math.max(16 * u, 14));
      var maxPm = 70;
      for (var h = 0; h < 24; h++) {
        var v = series[h], bh = st.h * Math.min(1, v / maxPm);
        var reached = h <= hour;
        ctx.fillStyle = reached ? catCol(catOf(cfg, v)) : c.line;
        ctx.fillRect(st.x + h * colW + 1, st.y + st.h - bh, colW - 2, bh);
      }
      /* camera frames above the bars, each tinted with its hour's label once paired */
      var fy = st.y - st.fh - 4 * u, fw = colW / cfg.framesPerHour;
      for (h = 0; h <= hour; h++) {
        for (var k = 0; k < cfg.framesPerHour; k++) {
          var ft = (h + k / cfg.framesPerHour) * cfg.hourDur;
          if (ft > lt) break;
          var age = lt - ft;
          var paired = h < hour || age > 0.25;
          ctx.fillStyle = paired ? catCol(catOf(cfg, series[h])) : c.accent;
          var drop = U.ease(lt, ft, 0.25);
          ctx.fillRect(st.x + h * colW + k * fw + 0.5, fy - (1 - drop) * 8 * u, Math.max(1, fw - 1.5), st.fh);
        }
      }
      ctx.fillStyle = c.ink3; ctx.textAlign = "left"; ctx.font = f.font(10.5 * u);
      ctx.fillText(g.narrow ? "Camera frames" : "Camera frames, each labeled by its hour", st.x, fy - 6 * u);
      /* playhead */
      var hx2 = st.x + hourF * colW;
      ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx2, fy - 2 * u); ctx.lineTo(hx2, st.y + st.h + 2 * u); ctx.stroke();
    }
  });

  function layout(f) {
    var W = f.w, H = f.h, u = U.unit(f);
    if (W < 480) {
      return {
        narrow: true,
        cam: { x: W * 0.04, y: H * 0.04, w: W * 0.5, h: H * 0.36 },
        read: { x: W * 0.59, y: H * 0.07, w: W * 0.38 },
        strip: { x: W * 0.04, y: H * 0.62, w: W * 0.92, h: H * 0.2, fh: Math.max(8 * u, 6) }
      };
    }
    return {
      narrow: false,
      cam: { x: W * 0.03, y: H * 0.05, w: W * 0.5, h: H * 0.5 },
      read: { x: W * 0.58, y: H * 0.09, w: W * 0.39 },
      strip: { x: W * 0.03, y: H * 0.74, w: W * 0.94, h: H * 0.14, fh: 9 * u }
    };
  }

  function catOf(cfg, pm) {
    for (var i = 0; i < cfg.cats.length; i++) if (pm <= cfg.cats[i].max) return i;
    return cfg.cats.length - 1;
  }

  /* Synthetic softmax: peaks on the true category, with a little mass on neighbours near a boundary. */
  function predict(cfg, pm) {
    var lo = 0, out = [];
    var sum = 0;
    for (var i = 0; i < cfg.cats.length; i++) {
      var hi = Math.min(cfg.cats[i].max, 90);
      var mid = (lo + hi) / 2, half = Math.max(2, (hi - lo) / 2);
      var d = Math.max(0, Math.abs(pm - mid) - half) / 4;
      var w = Math.exp(-d * d * 1.5) * (Math.abs(pm - mid) <= half ? 6 : 1);
      out.push(w); sum += w; lo = hi;
    }
    return out.map(function (w) { return w / sum; });
  }

  /* Category marker: a colored dot and the category name in ink (legible in both themes). */
  function chip(f, x, y, text, col, u) {
    var ctx = f.ctx, r = Math.max(5 * u, 4);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + r, y - r * 0.8, r, 0, Math.PI * 2); ctx.fill();
    ctx.font = f.font(12 * u, 600); ctx.fillStyle = f.c.ink; ctx.textAlign = "left";
    ctx.fillText(text, x + r * 2 + 6 * u, y);
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
})();
