/* Mongolian gers: how a sensor keeps its data through a cellular outage.
 * The monitor takes a reading every minute, keeps a copy on its SD card, and
 * uploads over the cellular network every five minutes. While the network is
 * down, readings wait on the device; when it returns, the backlog is sent and the
 * gap in the database fills in. The 1-minute sampling and 5-minute upload interval
 * are from the paper; the outage timing and transit time are illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("mongolian-gers-uplink", {
    config: {
      minutes: 30,         // simulated minutes per loop (illustrative)
      sampleEvery: 1,      // min between readings (paper)
      uploadEvery: 5,      // min between uploads (paper)
      outageStart: 8,      // min at which the cellular link drops (illustrative)
      outageLength: 9,     // min the link stays down; the slider changes this (illustrative)
      travel: 1.2,         // min a burst takes to reach the database (exaggerated)
      secPerMinute: 0.5,   // s of animation per simulated minute
      hold: 3,             // s to hold the final frame
      stillAt: 7           // s: frame shown when motion is reduced (mid-outage backlog)
    },

    setup: function (f) {
      var s = f.state;
      if (s.outage == null) s.outage = f.cfg.outageLength;
      if (!s.slider) {
        s.slider = f.slider({
          label: "Outage length", min: 0, max: 18, step: 1, value: s.outage,
          format: function (v) { return v + " min"; },
          onInput: function (v) { s.outage = v; f.restart(true); }
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f);
      var narrow = W < 480;
      var lh = Math.max(15 * u, 13);
      var N = cfg.minutes;
      var total = N * cfg.secPerMinute + cfg.hold;
      var now = Math.min((t % total) / cfg.secPerMinute, N + cfg.travel + 0.5);   // simulated minutes
      var o0 = cfg.outageStart, o1 = cfg.outageStart + s.outage;
      var down = s.outage > 0 && now >= o0 && now < o1;

      var sends = schedule(cfg, N, o0, o1, s.outage > 0);

      /* ---- Nodes and links ---- */
      var ny = H * 0.3;
      var A = { x: W * 0.12, y: ny }, B = { x: W * 0.5, y: ny }, C = { x: W * 0.88, y: ny };
      ctx.lineWidth = 2 * u;
      ctx.strokeStyle = down ? c.bad : c.lineStrong; ctx.setLineDash(down ? [5 * u, 5 * u] : []);
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = c.lineStrong;
      ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.stroke();
      if (down) {
        ctx.fillStyle = c.bad; ctx.font = f.font(11 * u, 560); ctx.textAlign = "center";
        ctx.fillText("no signal", (A.x + B.x) / 2, ny - 10 * u);
      }
      node(f, A, narrow ? "Sensor" : "Sensor in the ger", c.accent, u, lh);
      node(f, B, narrow ? "Cell tower" : "Cellular network", c.ink2, u, lh, true);
      node(f, C, narrow ? "Database" : "Database at BYU", c.ink, u, lh);

      /* ---- Readings waiting on the device ---- */
      var taken = Math.min(N, Math.floor(now / cfg.sampleEvery) + 1);
      var sentCount = 0;
      sends.forEach(function (e) { if (e.at <= now) sentCount = e.upto; });
      var waiting = Math.max(0, taken - sentCount);
      var sq = Math.max(7 * u, 5), gap = Math.max(2 * u, 1.5), perRow = 6;
      var qx = A.x - (perRow * (sq + gap)) / 2, qy = ny + lh * 2.2;
      for (var i = 0; i < waiting; i++) {
        var col = i % perRow, row = Math.floor(i / perRow);
        ctx.fillStyle = down ? c.signal : c.accent;
        ctx.fillRect(qx + col * (sq + gap), qy + row * (sq + gap), sq, sq);
      }
      ctx.font = f.font(10.5 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink2;
      var rows = Math.max(1, Math.ceil(waiting / perRow));
      ctx.fillText("waiting: " + waiting, qx, qy + rows * (sq + gap) + lh * 0.9);
      ctx.fillStyle = c.ink3;
      ctx.fillText((narrow ? "SD copy: " : "on SD card: ") + taken, qx, qy + rows * (sq + gap) + lh * 1.9);

      /* ---- Bursts in flight ---- */
      sends.forEach(function (e) {
        var k = (now - e.at) / cfg.travel;
        if (k < 0 || k >= 1) return;
        var p = k < 0.5 ? { x: U.lerp(A.x, B.x, k * 2), y: ny } : { x: U.lerp(B.x, C.x, (k - 0.5) * 2), y: ny };
        var n = e.upto - e.from;
        ctx.fillStyle = n > cfg.uploadEvery ? c.signal : c.accent;
        U.rr(ctx, p.x - 9 * u, p.y - 6 * u, 18 * u, 12 * u, 3 * u); ctx.fill();
        ctx.fillStyle = c.bg; ctx.font = f.mono(10.5 * u, 600); ctx.textAlign = "center";
        ctx.fillText(String(n), p.x, p.y + 4 * u);
      });

      /* ---- Database timeline: one cell per minute of readings ---- */
      var tx0 = W * 0.06, tx1 = W * 0.94, ty = H * 0.7;
      var cw = (tx1 - tx0) / N;
      ctx.font = f.font(10.5 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink3;
      ctx.fillText(narrow ? "Database, by minute" : "Readings in the database, by the minute they were taken", tx0, ty - lh * 0.7);
      var late = 0;
      for (var m = 0; m < N; m++) {
        var arr = arrival(sends, m, cfg);
        var x = tx0 + m * cw;
        ctx.fillStyle = c.line;
        ctx.fillRect(x + 1, ty, cw - 2, 14 * u + 2);
        if (arr != null && arr <= now) {
          var onTime = Math.ceil((m + 1) / cfg.uploadEvery) * cfg.uploadEvery + cfg.travel;
          var isLate = arr > onTime + 0.01;
          if (isLate) late++;
          ctx.fillStyle = isLate ? c.signal : c.accent;
          ctx.fillRect(x + 1, ty, cw - 2, 14 * u + 2);
        }
      }
      if (now < N) {
        var px = tx0 + Math.min(now, N) * cw;
        ctx.strokeStyle = c.ink2; ctx.lineWidth = 1.5 * u;
        ctx.beginPath(); ctx.moveTo(px, ty - 4 * u); ctx.lineTo(px, ty + 18 * u + 2); ctx.stroke();
      }
      if (s.outage > 0) {
        ctx.fillStyle = f.alpha(c.bad, 0.7);
        var ox0 = tx0 + o0 * cw, ox1 = tx0 + Math.min(o1, N) * cw;
        ctx.fillRect(ox0, ty + 18 * u + 4, ox1 - ox0, 2 * u + 1);
      }

      /* ---- Key and verdict ---- */
      var ky = ty + 18 * u + lh * 1.3;
      ctx.font = f.font(10.5 * u); ctx.textAlign = "left";
      var kx = tx0;
      [[c.accent, "on schedule"], [c.signal, narrow ? "backfilled" : "sent after the outage"], [c.bad, "outage"]].forEach(function (k) {
        ctx.fillStyle = k[0]; ctx.fillRect(kx, ky - 8 * u, 9 * u, 9 * u);
        ctx.fillStyle = c.ink2; ctx.fillText(k[1], kx + 13 * u, ky);
        kx += ctx.measureText(k[1]).width + 26 * u;
      });
      if (now >= N + cfg.travel) {
        ctx.font = f.font(13 * u, 620); ctx.fillStyle = c.good;
        ctx.fillText(narrow ? "All " + N + " readings arrived" : "All " + N + " readings arrived; " + late + " came in late, none were lost", tx0, ky + lh * 1.4);
      }
    }
  });

  /* Upload events: every uploadEvery minutes unless the link is down; flush on reconnect. */
  function schedule(cfg, N, o0, o1, hasOutage) {
    var events = [], sent = 0;
    var times = [];
    for (var k = cfg.uploadEvery; k <= N; k += cfg.uploadEvery) times.push(k);
    if (hasOutage && o1 < N) times.push(o1);
    times.sort(function (a, b) { return a - b; });
    times.forEach(function (at) {
      if (hasOutage && at >= o0 && at < o1) return;
      var upto = Math.min(N, Math.floor(at / cfg.sampleEvery));
      if (upto > sent) { events.push({ at: at, from: sent, upto: upto }); sent = upto; }
    });
    return events;
  }

  function arrival(sends, m, cfg) {
    for (var i = 0; i < sends.length; i++) if (m >= sends[i].from && m < sends[i].upto) return sends[i].at + cfg.travel;
    return null;
  }

  function node(f, p, label, color, u, lh, small) {
    var ctx = f.ctx, r = (small ? 6 : 9) * u;
    ctx.fillStyle = f.c.bg; ctx.strokeStyle = color; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!small) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = small ? f.c.ink3 : f.c.ink; ctx.font = f.font(11.5 * u, small ? 450 : 560);
    ctx.textAlign = "center";
    var w = ctx.measureText(label).width;
    var x = U.clamp(p.x, w / 2 + 2, f.w - w / 2 - 2);
    ctx.fillText(label, x, p.y + r + lh);
  }
})();
