/* SSS: the scheduler's kiosk loop and a takeover from the phone.
 * In kiosk mode the scheduler loops through demos. Each demo is a Python
 * generator with a frame rate and a run time; every frame the scheduler calls
 * it once, it draws one frame, and it yields control back. Requests from the
 * web app arrive on an input queue, and the scheduler switches to the game the
 * user picked, then returns to the loop. The sign shown is a 24 x 12 digit
 * slice of the real 48 x 24 sign; demos, frame rates and run times are
 * illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  var A = 1, B = 2, C = 4, D = 8, E = 16, F = 32, G = 64;
  var SIDES = [
    { top: A, left: F, right: B, bottom: G },
    { top: G, left: E, right: C, bottom: D }
  ];
  /* Seven-segment glyphs for the scrolling text demo. */
  var GLYPH = { " ": 0, "0": 63, "2": 91, "3": 79, H: 118, E: 121, L: 56, O: 63, P: 115, Y: 110, C: 57, N: 84, S: 109 };

  Fig.register("sss-kiosk", {
    config: {
      cols: 24,          // digits across the slice shown (real sign: 48)
      rows: 12,          // digits down the slice shown (real sign: 24)
      narrowRows: 6,     // rows shown on narrow screens
      cellRatio: 1.75,   // digit cell height / width (illustrative)
      demos: [           // the kiosk loop: name, frames per second, run time in s (illustrative)
        { id: "text", name: "Text demo", fps: 6, run: 6 },
        { id: "ball", name: "Ball demo", fps: 12, run: 6 },
        { id: "wave", name: "Wave demo", fps: 10, run: 6 }
      ],
      game: { name: "Game (phone)", fps: 15, run: 7 }, // the demo a user picks from the web app (illustrative)
      travel: 1.1,       // s for a request to cross from the phone to the scheduler
      autoAt: 13,        // s: one request is sent automatically so the takeover always plays
      message: "HELLO PYCON 2023    ", // text demo message
      stillAt: 16.5      // s: frame shown when motion is reduced (game in control)
    },

    setup: function (f) {
      var s = f.state;
      s.takes = [];
      addTake(f, f.cfg.autoAt);
      if (!s.btn) {
        s.btn = f.button("Pick a game from the phone", function () {
          if (!active(f, f.t) && !pending(f, f.t)) addTake(f, f.t);
          if (!f.playing) f.toggle();
        });
      }
    },

    reset: function (f) {
      f.state.takes = [];
      addTake(f, f.cfg.autoAt);
    },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg;
      var u = U.unit(f);
      var g = layout(f);
      var rows = g.rows, cols = cfg.cols;

      /* Where is the scheduler? Loop time pauses while a game has control. */
      var take = active(f, t);
      var paused = 0;
      s.takes.forEach(function (k) { paused += Math.max(0, Math.min(t, k.end) - k.start) * (t > k.start ? 1 : 0); });
      var loopT = t - paused;
      var cycle = 0;
      cfg.demos.forEach(function (d) { cycle += d.run; });
      var pos = loopT % cycle, idx = 0;
      while (pos >= cfg.demos[idx].run) { pos -= cfg.demos[idx].run; idx++; }
      var cur = take ? cfg.game : cfg.demos[idx];
      var lt = take ? t - take.start : pos;
      var ft = Math.floor(lt * cur.fps) / cur.fps;  // the demo only advances once per frame
      var tick = 1 - ((lt * cur.fps) % 1);

      /* Render the current demo into a digit buffer. */
      var buf = new Array(rows * cols).fill(0);
      var P = {
        w: cols, h: rows * 2,
        px: function (x, y, v) {
          x = Math.round(x); y = Math.round(y);
          if (x < 0 || y < 0 || x >= cols || y >= rows * 2) return;
          var sd = SIDES[y % 2], m = 0;
          if (v & 1) m |= sd.top; if (v & 2) m |= sd.left; if (v & 4) m |= sd.right; if (v & 8) m |= sd.bottom;
          buf[(y >> 1) * cols + x] |= m;
        },
        raw: function (x, y, m) { if (x >= 0 && x < cols && y >= 0 && y < rows) buf[y * cols + x] = m; }
      };
      if (take) demoGame(P, ft); else if (cur.id === "text") demoText(P, ft, cfg.message, rows); else if (cur.id === "ball") demoBall(P, ft); else demoWave(P, ft);

      /* The sign. */
      var sg = g.sign;
      ctx.fillStyle = f.alpha(c.ink, 0.04); ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      U.rr(ctx, sg.x - 6 * u, sg.y - 6 * u, sg.cw * cols + 12 * u, sg.ch * rows + 12 * u, 6 * u); ctx.fill(); ctx.stroke();
      var on = [], off = [];
      for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) segs(sg.x + q * sg.cw, sg.y + r * sg.ch, sg.cw, sg.ch, buf[r * cols + q], on, off);
      stroke(ctx, off, f.alpha(c.ink, 0.08), sg.cw * 0.11);
      stroke(ctx, on, c.accent, sg.cw * 0.11);

      /* Scheduler panel. */
      var pn = g.panel, lh = Math.max(14 * u, 13);
      ctx.textAlign = "left";
      ctx.fillStyle = c.ink; ctx.font = f.font(12 * u, 600);
      ctx.fillText("Scheduler", pn.x, pn.y);
      /* tick light: one flash per frame, i.e. per call into the demo's generator */
      ctx.fillStyle = f.alpha(c.accent, 0.25 + 0.75 * tick * tick);
      var tw = ctx.measureText("Scheduler").width;
      ctx.beginPath(); ctx.arc(pn.x + tw + 10 * u, pn.y - 4 * u, 3.5 * u, 0, Math.PI * 2); ctx.fill();
      ctx.font = f.mono(11 * u); ctx.fillStyle = c.ink2;
      ctx.fillText("next(" + (take ? "game" : cur.id) + ") at " + cur.fps + " fps", pn.x + tw + 20 * u, pn.y);

      var list = [{ d: cfg.game, game: true }].concat(cfg.demos.map(function (d) { return { d: d }; }));
      list.forEach(function (it, i) {
        var y = pn.y + pn.gap + i * pn.row;
        var isCur = it.game ? !!take : (!take && it.d === cur);
        var prog = isCur ? U.clamp(lt / it.d.run, 0, 1) : 0;
        ctx.fillStyle = isCur ? c.ink : (take && !it.game ? c.ink3 : c.ink2);
        ctx.font = f.font(11.5 * u, isCur ? 600 : 450); ctx.textAlign = "left";
        ctx.fillText(it.d.name, pn.x, y);
        var bx = g.narrow ? pn.x + pn.w * 0.45 : pn.x, by = g.narrow ? y - 5 * u : y + 7 * u;
        var bw = g.narrow ? pn.w * 0.55 : pn.w;
        ctx.fillStyle = c.line; ctx.fillRect(bx, by, bw, Math.max(3, 4 * u));
        ctx.fillStyle = it.game ? c.signal : c.accent; ctx.fillRect(bx, by, bw * prog, Math.max(3, 4 * u));
        if (!g.narrow) {
          ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "right";
          var note = it.game ? (take ? "from input queue" : "waiting") : (take ? "paused" : it.d.run + " s");
          ctx.fillText(note, pn.x + pn.w, y);
        }
      });

      /* Phone and input queue. */
      var ph = g.phone;
      ctx.strokeStyle = c.signal; ctx.lineWidth = 1.5;
      U.rr(ctx, ph.x - 6 * u, ph.y - 11 * u, 12 * u, 22 * u, 3 * u); ctx.stroke();
      ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "Phone" : "Phone, web app", ph.x + 12 * u, ph.y + 4 * u);
      var gy = pn.y + pn.gap;
      var path = g.narrow
        ? [{ x: ph.x, y: ph.y + 11 * u }, { x: ph.x, y: gy - 5 * u }]
        : [{ x: ph.x - 6 * u, y: ph.y }, { x: pn.x - 12 * u, y: ph.y }, { x: pn.x - 12 * u, y: gy - 4 * u }, { x: pn.x - 3 * u, y: gy - 4 * u }];
      var pend = pending(f, t);
      if (pend) {
        var q2 = U.clamp((t - pend.req) / cfg.travel, 0, 1);
        var pt = U.along(path, q2);
        ctx.strokeStyle = f.alpha(c.signal, 0.45); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
        for (var pi = 1; pi < path.length; pi++) ctx.lineTo(path[pi].x, path[pi].y);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.signal; ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 * u, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText(take ? "A user took over from the web app" : "Kiosk mode: looping demos", g.status.x, g.status.y);
    }
  });

  function addTake(f, at) {
    var start = at + f.cfg.travel;
    f.state.takes.push({ req: at, start: start, end: start + f.cfg.game.run });
  }
  function active(f, t) {
    var a = null;
    f.state.takes.forEach(function (k) { if (t >= k.start && t < k.end) a = k; });
    return a;
  }
  function pending(f, t) {
    var a = null;
    f.state.takes.forEach(function (k) { if (t >= k.req && t < k.start) a = k; });
    return a;
  }

  function layout(f) {
    var W = f.w, H = f.h, u = U.unit(f), cfg = f.cfg;
    var narrow = W < 480;
    var rows = narrow ? cfg.narrowRows : cfg.rows, box, panel, phone, status;
    if (narrow) {
      box = { x: W * 0.04, y: H * 0.05, w: W * 0.92, h: H * 0.48 };
      panel = { x: W * 0.05, y: H * 0.71, w: W * 0.9, gap: Math.max(17 * u, 16), row: Math.max(15 * u, 14) };
      status = { x: W * 0.05, y: H * 0.62 };
      phone = { x: W * 0.8, y: H * 0.62 - 4 * u };  /* on the status line, right of its text */
    } else {
      box = { x: W * 0.03, y: H * 0.05, w: W * 0.54, h: H * 0.84 };
      panel = { x: W * 0.62, y: H * 0.12, w: W * 0.35, gap: 30 * u, row: 40 * u };
      phone = { x: W * 0.62 + 8 * u, y: H * 0.7 };
      status = { x: W * 0.03, y: H * 0.965 };
    }
    var cw = Math.min(box.w / cfg.cols, box.h / (rows * cfg.cellRatio)), ch = cw * cfg.cellRatio;
    return {
      narrow: narrow, rows: rows,
      sign: { x: box.x + (box.w - cw * cfg.cols) / 2, y: box.y + (box.h - ch * rows) / 2, cw: cw, ch: ch },
      panel: panel, phone: phone, status: status
    };
  }

  /* ---- Demos: each draws one frame at frame time ft onto pixel field P ---- */

  function demoText(P, ft, msg, rows) {
    var row = Math.floor((rows - 1) / 2), n = msg.length;
    var shift = Math.floor(ft * 6);
    for (var x = 0; x < P.w; x++) {
      var ch = msg.charAt(((x + shift) % n + n) % n);
      P.raw(x, row, GLYPH[ch] || 0);
    }
    for (x = 0; x < P.w; x++) { P.px(x, 1, 1); P.px(x, P.h - 2, 8); } // frame lines: one side per pixel
  }

  function demoBall(P, ft) {
    for (var x = 0; x < P.w; x++) { P.px(x, 0, 1); P.px(x, P.h - 1, 8); }
    for (var y = 0; y < P.h; y++) { P.px(0, y, 2); P.px(P.w - 1, y, 4); }
    var bx = tri(ft * 7, P.w - 4) + 1.5, by = tri(ft * 5 + 3, P.h - 4) + 1.5;
    P.px(bx, by, 15); P.px(bx + 1, by, 15); P.px(bx, by + 1, 15); P.px(bx + 1, by + 1, 15);
  }

  function demoWave(P, ft) {
    var prev = null, mid = (P.h - 1) / 2, amp = P.h / 2 - 1.5;
    for (var x = 0; x < P.w; x++) {
      var y = Math.round(mid + amp * Math.sin(x * 0.42 - ft * 3));
      if (prev != null) for (var yy = Math.min(prev, y) + 1; yy < Math.max(prev, y); yy++) P.px(x, yy, 6);
      P.px(x, y, 15); prev = y;
    }
  }

  function demoGame(P, ft) {
    var bx = tri(ft * 9, P.w - 2) + 0.5, by = tri(ft * 7, P.h - 3) + 0.5;
    P.px(bx, by, 15);
    var pw = 5, target = U.clamp(Math.round(bx - pw / 2 + Math.sin(ft * 2) * 1.5), 0, P.w - pw);
    for (var x = 0; x < pw; x++) P.px(target + x, P.h - 1, 1 | 8);
    for (x = 0; x < P.w; x++) if ((x >> 2) % 2 === 0) { P.px(x, 0, 15); }
  }

  /* Triangle wave bouncing between 0 and n. */
  function tri(v, n) { var p = v % (2 * n); return p < n ? p : 2 * n - p; }

  function segs(x, y, w, h, mask, on, off) {
    var mx = w * 0.2, my = h * 0.1, th = w * 0.11, gp = th * 0.85;
    var x0 = x + mx, x1 = x + w - mx, y0 = y + my, y2 = y + h - my, y1 = (y0 + y2) / 2;
    var L = [
      [A, x0 + gp, y0, x1 - gp, y0], [B, x1, y0 + gp, x1, y1 - gp], [C, x1, y1 + gp, x1, y2 - gp],
      [D, x0 + gp, y2, x1 - gp, y2], [E, x0, y1 + gp, x0, y2 - gp], [F, x0, y0 + gp, x0, y1 - gp],
      [G, x0 + gp, y1, x1 - gp, y1]
    ];
    for (var i = 0; i < L.length; i++) {
      var s = L[i];
      (mask & s[0] ? on : off).push(s[1], s[2], s[3], s[4]);
    }
  }

  function stroke(ctx, list, color, width) {
    if (!list.length) return;
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, width); ctx.lineCap = "round";
    ctx.beginPath();
    for (var i = 0; i < list.length; i += 4) { ctx.moveTo(list[i], list[i + 1]); ctx.lineTo(list[i + 2], list[i + 3]); }
    ctx.stroke();
  }
})();
