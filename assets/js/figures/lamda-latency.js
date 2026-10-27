/* LaMDA: registration latency check.
 * The server pings the phone (registering device) and the sensor ten times each,
 * keeps the minimum round-trip time, and accepts when the two minimums agree
 * within the tolerance. "Relay through a proxy" reroutes the sensor's traffic.
 * Base latencies and jitter are illustrative; tolerance (15 ms) and the
 * bridge penalty (~110 ms) are the values measured in the paper. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("lamda-latency", {
    config: {
      phoneBase: 38,      // ms, phone's best-case round trip (illustrative)
      sensorBase: 46,     // ms, sensor's best-case round trip (illustrative)
      jitter: 22,         // ms, max random extra delay on any single ping
      bridgeExtra: 110,   // ms, added by the proxy bridge (paper, Fig. 5)
      tolerance: 15,      // ms, L_TOL (paper)
      pings: 10,          // pings per device; the minimum is kept
      timeScale: 6,       // 1 ms of latency takes this many ms on screen
      gap: 0.12,          // s between consecutive pings
      hold: 2.8,          // s the verdict stays up before the next round
      stillAt: 30         // s: frame shown when motion is reduced
    },

    setup: function (f) {
      var s = f.state;
      s.bridge = s.bridge || false;
      s.cycle = 0;
      plan(f);
      if (!s.btn) {
        s.btn = f.button("Relay the sensor through a proxy", function (b) {
          s.bridge = !s.bridge;
          b.textContent = s.bridge ? "Put the sensor back on the home network" : "Relay the sensor through a proxy";
          f.restart(true);
        });
      }
    },

    reset: function (f) {
      f.state.cycle = 0;
      plan(f);
    },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      if (t - s.t0 > s.length) { s.t0 += s.length; s.cycle++; plan(f, s.t0); }
      var lt = t - s.t0;
      var u = Math.min(W / 640, H / 360);

      var geo = layout(f);

      // Home network boundary
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      U.rr(ctx, geo.home.x, geo.home.y, geo.home.w, geo.home.h, 10 * u); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText("Home network, one public IP", geo.home.x + 10 * u, geo.home.y + 18 * u);

      if (s.bridge) {
        ctx.strokeStyle = c.line; ctx.setLineDash([4, 4]);
        U.rr(ctx, geo.away.x, geo.away.y, geo.away.w, geo.away.h, 10 * u); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillText("Somewhere else", geo.away.x + 10 * u, geo.away.y + 18 * u);
      }

      // Links
      ["phone", "sensor"].forEach(function (k) {
        var p = s.paths[k];
        ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1.5 * u;
        ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
        for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
        ctx.stroke();
      });

      // Nodes
      node(f, geo.server, geo.narrow ? "Server" : "Registration server", c.ink, u);
      node(f, geo.router, "Home router", c.ink2, u, true);
      node(f, geo.phone, "Phone (has GPS)", c.accent, u);
      node(f, s.bridge ? geo.sensorAway : geo.sensor, "Sensor (no GPS)", c.signal, u);
      if (s.bridge) node(f, geo.proxy, "Cloud proxy", c.ink2, u, true);

      // Packets in flight + tallies
      var done = { phone: [], sensor: [] };
      ["phone", "sensor"].forEach(function (k) {
        var col = k === "phone" ? c.accent : c.signal;
        s.sched[k].forEach(function (p) {
          if (lt >= p.end) { done[k].push(p.rtt); return; }
          if (lt < p.start) return;
          var q = (lt - p.start) / (p.end - p.start);
          var along = q < 0.5 ? q * 2 : (1 - q) * 2;
          var pt = U.along(s.paths[k], along);
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 4.5 * u, 0, Math.PI * 2); ctx.fill();
        });
      });

      // Readout: label | ten tally marks | min value, then the verdict
      var rx = geo.readout.x, ry = geo.readout.y, rw = geo.readout.w;
      var lh = Math.max(26 * u, 21);
      if (geo.narrow) ry = H - 3 * lh - 14; /* anchor to the bottom edge so the verdict always fits */
      var rows = [["phone", "Phone", c.accent], ["sensor", "Sensor", c.signal]];
      var mins = {};
      ctx.font = f.font(12 * u);
      var labelW = ctx.measureText("Sensor").width + 8;
      ctx.font = f.mono(12 * u);
      var valueW = ctx.measureText("min 000 ms").width + 8;
      var pitch = Math.min(9 * u + 3, (rw - labelW - valueW) / cfg.pings);
      rows.forEach(function (r, i) {
        var y = ry + i * lh;
        var list = done[r[0]];
        mins[r[0]] = list.length ? Math.min.apply(null, list) : null;
        ctx.fillStyle = c.ink2; ctx.font = f.font(12 * u); ctx.textAlign = "left";
        ctx.fillText(r[1], rx, y + 4);
        for (var j = 0; j < cfg.pings; j++) {
          ctx.fillStyle = j < list.length ? r[2] : c.line;
          ctx.fillRect(rx + labelW + j * pitch, y - 5, pitch * 0.65, 11);
        }
        ctx.fillStyle = c.ink; ctx.font = f.mono(12 * u); ctx.textAlign = "right";
        ctx.fillText(mins[r[0]] == null ? "–" : "min " + Math.round(mins[r[0]]) + " ms", rx + rw, y + 4);
      });

      var finished = done.phone.length === cfg.pings && done.sensor.length === cfg.pings;
      var vy = ry + 2 * lh + 4;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx, vy - lh * 0.45); ctx.lineTo(rx + rw, vy - lh * 0.45); ctx.stroke();
      ctx.textAlign = "left"; ctx.font = f.font(12 * u); ctx.fillStyle = c.ink2;
      ctx.fillText((geo.narrow ? "Difference (limit " : "Difference (tolerance ") + cfg.tolerance + " ms)", rx, vy + 4);
      if (finished) {
        var d = Math.abs(mins.phone - mins.sensor);
        var ok = d <= cfg.tolerance;
        ctx.textAlign = "right"; ctx.font = f.mono(12 * u, 600);
        ctx.fillStyle = ok ? c.good : c.bad;
        ctx.fillText(Math.round(d) + " ms", rx + rw, vy + 4);
        ctx.font = f.font(15 * u, 620); ctx.textAlign = "left";
        var msg = geo.narrow ? (ok ? "Accepted: same place" : "Rejected: somewhere else")
          : (ok ? "Accepted: same place as the phone" : "Rejected: sensor is somewhere else");
        ctx.fillText(msg, rx, vy + lh + 2);
      }
    },

    resize: function (f) { plan(f, f.state.t0); }
  });

  function layout(f) {
    var W = f.w, H = f.h, u = Math.min(W / 640, H / 360);
    if (W < 480) {
      /* Narrow: network on top, readout across the bottom. */
      var hn = { x: W * 0.44, y: H * 0.05, w: W * 0.53, h: H * 0.4 };
      return {
        u: u, narrow: true,
        server: { x: W * 0.12, y: H * 0.2 },
        router: { x: hn.x + hn.w * 0.2, y: hn.y + hn.h * 0.58 },
        phone: { x: hn.x + hn.w * 0.72, y: hn.y + hn.h * 0.34 },
        sensor: { x: hn.x + hn.w * 0.72, y: hn.y + hn.h * 0.78 },
        home: hn,
        away: { x: W * 0.6, y: H * 0.46, w: W * 0.37, h: H * 0.19 },
        sensorAway: { x: W * 0.79, y: H * 0.55 },
        proxy: { x: W * 0.4, y: H * 0.53 },
        readout: { x: W * 0.05, y: H * 0.69, w: W * 0.9 }
      };
    }
    var home = { x: W * 0.5, y: H * 0.07, w: W * 0.46, h: H * 0.5 };
    return {
      u: u, narrow: false,
      server: { x: W * 0.1, y: H * 0.3 },
      router: { x: home.x + home.w * 0.18, y: home.y + home.h * 0.55 },
      phone: { x: home.x + home.w * 0.72, y: home.y + home.h * 0.32 },
      sensor: { x: home.x + home.w * 0.72, y: home.y + home.h * 0.78 },
      home: home,
      away: { x: W * 0.66, y: H * 0.6, w: W * 0.26, h: H * 0.28 },
      sensorAway: { x: W * 0.79, y: H * 0.76 },
      proxy: { x: W * 0.52, y: H * 0.8 },
      readout: { x: W * 0.05, y: H * 0.64, w: W * 0.36 }
    };
  }

  /* Build this round's ping schedule (seeded so a round is reproducible). */
  function plan(f, t0) {
    var s = f.state, cfg = f.cfg, g = layout(f);
    s.t0 = t0 || 0;
    var rnd = U.seeded(7 + s.cycle * 13 + (s.bridge ? 1000 : 0));
    s.paths = {
      phone: [g.server, g.router, g.phone],
      sensor: s.bridge ? [g.server, g.router, g.proxy, g.sensorAway] : [g.server, g.router, g.sensor]
    };
    s.sched = {};
    var longest = 0;
    ["phone", "sensor"].forEach(function (k) {
      var base = k === "phone" ? cfg.phoneBase : cfg.sensorBase + (s.bridge ? cfg.bridgeExtra : 0);
      var at = 0.3, list = [];
      for (var i = 0; i < cfg.pings; i++) {
        var rtt = base + rnd() * rnd() * cfg.jitter;
        var dur = (rtt * cfg.timeScale) / 1000;
        list.push({ rtt: rtt, start: at, end: at + dur });
        at += dur + cfg.gap;
      }
      s.sched[k] = list;
      longest = Math.max(longest, at);
    });
    s.length = longest + cfg.hold;
  }

  function node(f, p, label, color, u, small) {
    var ctx = f.ctx, r = (small ? 6 : 9) * u;
    ctx.fillStyle = f.c.bg; ctx.strokeStyle = color; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!small) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = small ? f.c.ink3 : f.c.ink; ctx.font = f.font((small ? 11 : 12) * u, small ? 450 : 560);
    /* Keep the label inside the canvas when a node sits near an edge. */
    var half = ctx.measureText(label).width / 2 + 4;
    ctx.textAlign = "center";
    ctx.fillText(label, U.clamp(p.x, half, f.w - half), p.y + r + Math.max(15 * u, 13));
  }
})();
