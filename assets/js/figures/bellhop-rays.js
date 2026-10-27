/* BELLHOP: rays bending through a sound-speed profile.
 * A source launches a fan of rays. Each ray is marched in small steps; at every
 * step its angle changes with the local sound-speed gradient (Snell's law), so
 * rays bend toward slower water. Rays that reach the surface or seafloor reflect.
 * Left panel: the sound-speed profile, as in the simulator's second viewport.
 * Profiles, depths, ranges and the launch fan are illustrative textbook values,
 * not the environment used in the report. */
(function () {
  "use strict";
  var U = Fig.util;

  /* Sound-speed profiles c(z), z in metres (all illustrative). */
  var PROFILES = [
    { name: "Deep sound channel", short: "sound channel",
      // Munk's canonical deep-ocean profile: slowest water at 1300 m
      c: function (z) { var e = 2 * (z - 1300) / 1300; return 1500 * (1 + 0.00737 * (e - 1 + Math.exp(-e))); } },
    { name: "Uniform water", short: "uniform water",
      c: function () { return 1500; } },
    { name: "Speed rising with depth", short: "speed rising with depth",
      c: function (z) { return 1450 + 0.017 * z; } }
  ];

  Fig.register("bellhop-rays", {
    config: {
      depth: 5000,        // m, water depth (illustrative)
      range: 100000,      // m, horizontal extent drawn (illustrative)
      sourceDepth: 1000,  // m, source depth, near the channel axis (illustrative)
      rays: 25,           // rays in the launch fan (illustrative; the report draws 100 to 1000)
      fan: 16,            // degrees, half-width of the launch fan (illustrative)
      ds: 50,             // m, ray-march step length
      cMin: 1440,         // m/s, left edge of the sound-speed axis
      cMax: 1560,         // m/s, right edge of the sound-speed axis
      grow: 5,            // s for the ray fronts to cross the panel
      hold: 3,            // s the finished fan stays up before replaying
      stillAt: 6          // s: frame shown when motion is reduced (fan fully drawn)
    },

    setup: function (f) {
      var s = f.state;
      if (s.profile == null) s.profile = 0;
      trace(f);
      if (!s.btn) {
        s.btn = f.button(nextLabel(s.profile), function (b) {
          s.profile = (s.profile + 1) % PROFILES.length;
          b.textContent = nextLabel(s.profile);
          trace(f);
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f);
      var narrow = W < 480;
      var prof = PROFILES[s.profile];
      var period = cfg.grow + cfg.hold;
      var front = Math.min(1, (t % period) / cfg.grow) * cfg.range;

      // Geometry by fractions of the canvas
      var top = H * 0.15, bot = H * 0.84;
      var sx0 = W * 0.04, sx1 = W * (narrow ? 0.22 : 0.2);
      var px0 = W * (narrow ? 0.27 : 0.25), px1 = W * 0.97;
      function X(r) { return px0 + (r / cfg.range) * (px1 - px0); }
      function Y(z) { return top + (z / cfg.depth) * (bot - top); }
      function SX(cv) { return sx0 + ((cv - cfg.cMin) / (cfg.cMax - cfg.cMin)) * (sx1 - sx0); }

      // Panels
      ctx.fillStyle = f.alpha(c.signal, 0.06);
      ctx.fillRect(px0, top, px1 - px0, bot - top);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.strokeRect(px0, top, px1 - px0, bot - top);
      ctx.strokeRect(sx0, top, sx1 - sx0, bot - top);

      // Sound-speed profile
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2 * u;
      ctx.beginPath();
      for (var z = 0; z <= cfg.depth; z += cfg.depth / 80) {
        var px = SX(prof.c(z)), py = Y(z);
        if (z === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // Source depth marker across both panels
      var zy = Y(cfg.sourceDepth);
      ctx.strokeStyle = c.line; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx0, zy); ctx.lineTo(sx1, zy); ctx.stroke(); ctx.setLineDash([]);

      // Rays, drawn up to the current front
      s.paths.forEach(function (p) {
        var col = p.bounced ? f.alpha(c.signal, 0.75) : c.accent;
        ctx.strokeStyle = col; ctx.lineWidth = (p.bounced ? 1.1 : 1.5) * u;
        ctx.beginPath();
        var last = null;
        for (var i = 0; i < p.pts.length; i++) {
          var q = p.pts[i];
          if (q.r > front) break;
          if (i === 0) ctx.moveTo(X(q.r), Y(q.z)); else ctx.lineTo(X(q.r), Y(q.z));
          last = q;
        }
        ctx.stroke();
        if (last && front < cfg.range) {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(X(last.r), Y(last.z), 2.2 * u + 1, 0, Math.PI * 2); ctx.fill();
        }
      });

      // Source
      ctx.fillStyle = c.bg; ctx.strokeStyle = c.ink; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(px0, zy, 6 * u + 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Labels
      var small = f.font(11 * u), lh = Math.max(14 * u, 13);
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = c.ink; ctx.font = f.font(13 * u, 600); ctx.textAlign = "left";
      ctx.fillText(prof.name, px0, top - lh * 0.6);
      ctx.fillStyle = c.ink2; ctx.font = small;
      ctx.fillText(narrow ? "Speed" : "Sound speed", sx0, top - lh * 0.6);

      ctx.font = small; ctx.textAlign = "right";
      [["surface", top + lh], [narrow ? "floor, 5 km" : "seafloor, 5 km down", bot - 6 * u]].forEach(function (lab) {
        var tw = ctx.measureText(lab[0]).width;
        ctx.fillStyle = f.alpha(c.bg, 0.85);
        ctx.fillRect(px1 - 6 * u - tw - 4, lab[1] - lh * 0.8, tw + 8, lh);
        ctx.fillStyle = c.ink3;
        ctx.fillText(lab[0], px1 - 6 * u, lab[1]);
      });

      var by = bot + lh * 1.25;
      ctx.font = f.mono(10.5 * u); ctx.textAlign = "left";
      ctx.fillText("0", px0, by);
      ctx.textAlign = "right";
      ctx.fillText("100 km", px1, by);
      ctx.fillText(narrow ? "fast→" : "faster →", sx1, by);

      // Legend, centred under the ray panel
      var items = [[c.accent, narrow ? "Refracted" : "Refracted only"], [c.signal, narrow ? "Bounced" : "Hit surface or floor"]];
      ctx.font = small;
      var sw = Math.max(14 * u, 10), gap = Math.max(14 * u, 10);
      var widths = items.map(function (it) { return sw + 5 + ctx.measureText(it[1]).width; });
      var total = widths[0] + widths[1] + gap;
      var lx = (px0 + px1) / 2 - total / 2;
      items.forEach(function (it, i) {
        ctx.strokeStyle = it[0]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, by - 4); ctx.lineTo(lx + sw, by - 4); ctx.stroke();
        ctx.fillStyle = c.ink2; ctx.textAlign = "left";
        ctx.fillText(it[1], lx + sw + 5, by);
        lx += widths[i] + gap;
      });
    }
  });

  function nextLabel(i) {
    return "Switch to " + PROFILES[(i + 1) % PROFILES.length].short;
  }

  /* March every ray through the current profile once; drawing just reveals it. */
  function trace(f) {
    var s = f.state, cfg = f.cfg, prof = PROFILES[s.profile];
    var D = cfg.depth, ds = cfg.ds;
    s.paths = [];
    for (var k = 0; k < cfg.rays; k++) {
      var th = (-cfg.fan + (2 * cfg.fan * k) / (cfg.rays - 1)) * Math.PI / 180; // + is downward
      var r = 0, z = cfg.sourceDepth, bounced = false, n = 0;
      var pts = [{ r: r, z: z }];
      while (r < cfg.range && n < 20000) {
        var cz = prof.c(z);
        var dcdz = (prof.c(z + 1) - prof.c(z - 1)) / 2;
        // Snell's law in differential form: rays turn toward slower water
        th += -(Math.cos(th) / cz) * dcdz * ds;
        r += Math.cos(th) * ds;
        z += Math.sin(th) * ds;
        if (z < 0) { z = -z; th = -th; bounced = true; }
        if (z > D) { z = 2 * D - z; th = -th; bounced = true; }
        n++;
        if (n % 4 === 0) pts.push({ r: Math.min(r, cfg.range), z: z });
      }
      s.paths.push({ pts: pts, bounced: bounced });
    }
  }
})();
