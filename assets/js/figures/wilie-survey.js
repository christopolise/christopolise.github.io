/* WiLiE: driving a site survey.
 * The robot drives through a two-room space. Its 360-degree LiDAR builds the map
 * as it goes (only what the scans have hit is drawn), and at regular steps it
 * logs the received signal strength (RSSI) from the access point it is
 * connected to. When the drive ends, the samples are interpolated into a heat
 * map. The floor plan, path and signal field are synthetic; the two RSSI ranges
 * are the measured ranges from the course presentation (external antenna
 * -59 to -17 dB, onboard antenna -74 to -30 dB). */
(function () {
  "use strict";
  var U = Fig.util;

  var ROOM = { w: 12, h: 7 }; // floor plan size in metres (illustrative)
  var WALLS = [
    [0, 0, 12, 0], [12, 0, 12, 7], [12, 7, 0, 7], [0, 7, 0, 0], // outer walls
    [5, 0, 5, 4.6]                                               // interior wall, doorway above it
  ];
  var BOXES = [[8, 2, 10, 3.2], [1, 5.5, 3.5, 6.2]];             // a table and a bench
  var PATH = [
    [0.8, 0.8], [4.2, 0.8], [4.2, 2.3], [0.8, 2.3], [0.8, 4.0], [4.2, 4.0], [4.2, 5.4], [6.0, 5.4],
    [6.0, 0.9], [11.2, 0.9], [11.2, 4.0], [6.8, 4.0], [6.8, 6.2], [10.2, 6.2]
  ];

  Fig.register("wilie-survey", {
    config: {
      ap: [11.3, 6.3],        // access point position, m (illustrative)
      speed: 2.4,             // m of path driven per second of animation (illustrative)
      scanEvery: 0.25,        // s between LiDAR scans
      rays: 40,               // rays per scan
      lidarRange: 6,          // m, max range drawn (illustrative)
      sampleEvery: 0.6,       // m of travel between RSSI samples (illustrative)
      wallLoss: 9,            // dB lost through the interior wall (illustrative)
      ranges: {               // measured RSSI ranges, dB (course presentation, Results slide)
        external: [-59, -17],
        onboard: [-74, -30]
      },
      heatIn: 1.6,            // s for the heat map to fade in after the drive
      hold: 4,                // s the finished map stays up
      stillAt: 20             // s: frame shown when motion is reduced (finished heat map)
    },

    setup: function (f) {
      var s = f.state;
      s.antenna = s.antenna || "external";
      build(f);
      if (!s.btn) {
        s.btn = f.button("Use the onboard antenna", function (b) {
          s.antenna = s.antenna === "external" ? "onboard" : "external";
          b.textContent = s.antenna === "external" ? "Use the onboard antenna" : "Use the external antenna";
          f.restart(true);
        });
      }
    },

    reset: function (f) { build(f); },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg;
      var u = U.unit(f), g = layout(f);
      var driveT = s.length / cfg.speed;
      var period = driveT + cfg.heatIn + cfg.hold;
      var lt = t % period;
      var dist = Math.min(s.length, lt * cfg.speed);
      var X = function (x) { return g.room.x + x * g.room.k; };
      var Y = function (y) { return g.room.y + (ROOM.h - y) * g.room.k; };
      var rng = cfg.ranges[s.antenna];
      var toDb = function (v) { return rng[0] + v * (rng[1] - rng[0]); };

      /* floor */
      ctx.fillStyle = c.sunk; ctx.fillRect(X(0), Y(ROOM.h), ROOM.w * g.room.k, ROOM.h * g.room.k);

      /* heat map */
      var heat = U.ease(lt, driveT, cfg.heatIn);
      if (heat > 0) {
        for (var i = 0; i < s.heat.length; i++) {
          var hc = s.heat[i];
          /* snap cell edges to whole pixels so neighbouring translucent cells neither overlap nor gap */
          var x0 = Math.round(X(hc.x)), x1 = Math.round(X(hc.x + s.cell));
          var y0 = Math.round(Y(hc.y + s.cell)), y1 = Math.round(Y(hc.y));
          ctx.fillStyle = f.alpha(c.signal, (0.06 + 0.66 * hc.v) * heat);
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }

      /* LiDAR points from every scan taken so far */
      var shown = Math.min(s.scans.length, Math.floor(lt / cfg.scanEvery) + 1);
      ctx.fillStyle = f.alpha(c.ink, 0.55);
      var ps = Math.max(1.2, 1.6 * u);
      for (i = 0; i < shown; i++) {
        var sc = s.scans[i].hits;
        for (var j = 0; j < sc.length; j += 2) ctx.fillRect(X(sc[j]) - ps / 2, Y(sc[j + 1]) - ps / 2, ps, ps);
      }

      /* driven path */
      var pos = at(s, dist);
      ctx.strokeStyle = f.alpha(c.accent, 0.5); ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(X(PATH[0][0]), Y(PATH[0][1]));
      for (i = 1; i < PATH.length && s.cum[i - 1] < dist; i++) {
        if (s.cum[i] <= dist) ctx.lineTo(X(PATH[i][0]), Y(PATH[i][1]));
        else ctx.lineTo(X(pos.x), Y(pos.y));
      }
      ctx.stroke(); ctx.setLineDash([]);

      /* RSSI samples dropped so far */
      var count = 0, last = null;
      s.samples.forEach(function (p) {
        if (p.d > dist) return;
        count++; last = p;
        ctx.fillStyle = f.alpha(c.signal, 0.25 + 0.75 * p.v); ctx.strokeStyle = c.bg; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(3, 3.6 * u), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });

      /* live LiDAR sweep while driving */
      if (lt < driveT) {
        var cur = s.scans[Math.min(s.scans.length - 1, shown - 1)];
        ctx.strokeStyle = f.alpha(c.accent, 0.18); ctx.lineWidth = 1;
        ctx.beginPath();
        for (j = 0; j < cur.hits.length; j += 2) { ctx.moveTo(X(pos.x), Y(pos.y)); ctx.lineTo(X(cur.hits[j]), Y(cur.hits[j + 1])); }
        ctx.stroke();
      }

      /* access point */
      var ax = X(cfg.ap[0]), ay = Y(cfg.ap[1]);
      ctx.strokeStyle = c.signal; ctx.lineWidth = 1.5;
      for (var r = 1; r <= 2; r++) { ctx.beginPath(); ctx.arc(ax, ay, r * 5 * u + 2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.fillStyle = c.signal; ctx.beginPath(); ctx.arc(ax, ay, Math.max(3, 4 * u), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u); ctx.textAlign = "right";
      ctx.fillText("AP", ax - 10 * u, ay + 4 * u);

      /* robot */
      var rx = X(pos.x), ry = Y(pos.y), rr = Math.max(6, 8 * u);
      ctx.fillStyle = c.bg; ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = c.accent; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(pos.a) * rr, ry - Math.sin(pos.a) * rr); ctx.stroke();

      /* readout */
      var rd = g.read, lh = Math.max(16 * u, 14);
      ctx.textAlign = "left";
      ctx.fillStyle = c.ink; ctx.font = f.font(12 * u, 600);
      ctx.fillText(s.antenna === "external" ? "External antenna" : "Onboard antenna", rd.x, rd.y);
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink2;
      ctx.fillText("RSSI now", rd.x, rd.y + lh * 1.4);
      ctx.font = f.mono(12 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "right";
      ctx.fillText(last ? Math.round(toDb(last.v)) + " dB" : "–", rd.x + rd.w, rd.y + lh * 1.4);
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
      ctx.fillText("Samples", rd.x, rd.y + lh * 2.5);
      ctx.font = f.mono(12 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "right";
      ctx.fillText(String(count), rd.x + rd.w, rd.y + lh * 2.5);

      /* legend */
      var ly = rd.y + lh * (g.narrow ? 3.4 : 3.9), lw = rd.w;
      var grd = ctx.createLinearGradient(rd.x, 0, rd.x + lw, 0);
      grd.addColorStop(0, f.alpha(c.signal, 0.08)); grd.addColorStop(1, f.alpha(c.signal, 0.78));
      ctx.fillStyle = grd; ctx.fillRect(rd.x, ly, lw, Math.max(6, 8 * u));
      ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink2;
      ctx.textAlign = "left"; ctx.fillText(rng[0] + " dB", rd.x, ly + Math.max(6, 8 * u) + lh);
      ctx.textAlign = "right"; ctx.fillText(rng[1] + " dB", rd.x + lw, ly + Math.max(6, 8 * u) + lh);
      if (!g.narrow) {
        ctx.font = f.font(11 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
        ctx.fillText(lt < driveT ? "Driving and scanning" : "Samples interpolated", rd.x, ly + Math.max(6, 8 * u) + lh * 2.4);
        ctx.fillText(lt < driveT ? "" : "into a heat map", rd.x, ly + Math.max(6, 8 * u) + lh * 3.4);
      }
    }
  });

  function layout(f) {
    var W = f.w, H = f.h, narrow = W < 480;
    var box = narrow ? { x: W * 0.04, y: H * 0.04, w: W * 0.92, h: H * 0.6 } : { x: W * 0.03, y: H * 0.05, w: W * 0.68, h: H * 0.9 };
    var k = Math.min(box.w / ROOM.w, box.h / ROOM.h);
    var room = { x: box.x + (box.w - ROOM.w * k) / 2, y: box.y + (box.h - ROOM.h * k) / 2, k: k };
    var read = narrow
      ? { x: W * 0.06, y: room.y + ROOM.h * k + Math.max(22 * U.unit(f), 18), w: W * 0.88 }
      : { x: W * 0.75, y: H * 0.14, w: W * 0.22 };
    return { narrow: narrow, room: room, read: read };
  }

  /* Precompute path lengths, LiDAR scans, RSSI samples and the interpolated heat map (all in metres). */
  function build(f) {
    var s = f.state, cfg = f.cfg;
    var rnd = U.seeded(11);
    s.cum = [0];
    for (var i = 1; i < PATH.length; i++) s.cum.push(s.cum[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
    s.length = s.cum[s.cum.length - 1];

    var segsAll = WALLS.slice();
    BOXES.forEach(function (b) {
      segsAll.push([b[0], b[1], b[2], b[1]], [b[2], b[1], b[2], b[3]], [b[2], b[3], b[0], b[3]], [b[0], b[3], b[0], b[1]]);
    });

    s.scans = [];
    var driveT = s.length / cfg.speed;
    for (var tt = 0; tt <= driveT + 1e-6; tt += cfg.scanEvery) {
      var p = at(s, Math.min(s.length, tt * cfg.speed)), hits = [];
      var rot = rnd() * Math.PI * 2;
      for (var r = 0; r < cfg.rays; r++) {
        var a = rot + (r / cfg.rays) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
        var best = cfg.lidarRange;
        segsAll.forEach(function (w) {
          var d = ray(p.x, p.y, dx, dy, w);
          if (d != null && d < best) best = d;
        });
        if (best < cfg.lidarRange) {
          var n = (rnd() - 0.5) * 0.06;
          hits.push(p.x + dx * (best + n), p.y + dy * (best + n));
        }
      }
      s.scans.push({ hits: hits });
    }

    /* signal field: log-distance falloff plus a loss through the interior wall, normalised to 0..1 */
    var field = function (x, y) {
      var d = Math.max(0.5, Math.hypot(x - cfg.ap[0], y - cfg.ap[1]));
      var v = -20 - 28 * Math.log10(d);
      if (cross(x, y, cfg.ap[0], cfg.ap[1], WALLS[4])) v -= cfg.wallLoss;
      return v;
    };
    s.samples = [];
    var raw = [];
    for (var d2 = 0; d2 <= s.length; d2 += cfg.sampleEvery) {
      var q = at(s, d2), v = field(q.x, q.y) + (rnd() - 0.5) * 3;
      raw.push(v); s.samples.push({ x: q.x, y: q.y, d: d2, raw: v });
    }
    var lo = Math.min.apply(null, raw), hi = Math.max.apply(null, raw);
    s.samples.forEach(function (p2) { p2.v = (p2.raw - lo) / (hi - lo); });

    /* inverse-distance-weighted heat map on a 0.25 m grid */
    s.cell = 0.25; s.heat = [];
    for (var gx = 0; gx < ROOM.w; gx += s.cell) {
      for (var gy = 0; gy < ROOM.h; gy += s.cell) {
        var cx = gx + s.cell / 2, cy = gy + s.cell / 2, num = 0, den = 0;
        for (var k = 0; k < s.samples.length; k++) {
          var sp = s.samples[k], dd = (sp.x - cx) * (sp.x - cx) + (sp.y - cy) * (sp.y - cy) + 0.05;
          var w2 = 1 / (dd * dd);
          num += w2 * sp.v; den += w2;
        }
        s.heat.push({ x: gx, y: gy, v: num / den });
      }
    }
  }

  /* Position and heading at distance d along the path. */
  function at(s, d) {
    for (var i = 1; i < PATH.length; i++) {
      if (d <= s.cum[i] || i === PATH.length - 1) {
        var seg = s.cum[i] - s.cum[i - 1], k = seg ? U.clamp((d - s.cum[i - 1]) / seg, 0, 1) : 0;
        var a = PATH[i - 1], b = PATH[i];
        return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      }
    }
    return { x: PATH[0][0], y: PATH[0][1], a: 0 };
  }

  /* Distance along ray (ox,oy)+t(dx,dy) to segment w, or null. */
  function ray(ox, oy, dx, dy, w) {
    var ex = w[2] - w[0], ey = w[3] - w[1];
    var den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) return null;
    var t = ((w[0] - ox) * ey - (w[1] - oy) * ex) / den;
    var v = ((w[0] - ox) * dy - (w[1] - oy) * dx) / den;
    return t > 0 && v >= 0 && v <= 1 ? t : null;
  }

  /* Does segment (x1,y1)-(x2,y2) cross wall w? */
  function cross(x1, y1, x2, y2, w) {
    var d = ray(x1, y1, x2 - x1, y2 - y1, w);
    return d != null && d < 1;
  }
})();
