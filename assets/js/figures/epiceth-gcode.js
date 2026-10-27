/* EpicEth: turning a two-character TCP message into G-code.
 * The TX board sends a short payload, a direction letter and one hex digit of
 * distance (e.g. "R9"), over Ethernet to the RX board's lwIP server on port 7.
 * The RX software keeps track of where the print head is, adds the move, clamps the
 * result to the 0..200 print area, and writes an absolute G-code move ("G1 X9") over
 * UART, because the printer was put in absolute mode (G90) at start-up. That is why
 * the translation is not one-to-one. It also writes a 32-bit word to the custom
 * core's seven-segment display: direction, distance, and the last two bytes of the
 * board's IP address. Message format, limits, start-up codes, display codes, and the
 * IP address (192.168.0.135) are from echo.c and main.c in the repo; the command
 * script and all timing are illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("epiceth-gcode", {
    config: {
      bedMax: 200,          // print-area limit on each axis (X_MAX, Y_MAX in echo.c)
      view: 40,             // units of the print area drawn, from the home corner; widens as the head travels (illustrative zoom)
      ip: [0, 135],         // third and fourth bytes of the board's IP, 192.168.0.135 (main.c)
      script: ["R9", "UF", "LC", "R7", "U8"],  // commands the demo sends on its own (illustrative)
      t: {                  // seconds for each step of one command (illustrative)
        boot: 1.8,          // start-up: home (G28), absolute mode (G90), feed rate
        packet: 0.9,        // TCP payload crosses the Ethernet link
        translate: 0.5,     // RX software computes the new absolute position
        uart: 0.6,          // G-code line travels over UART to the printer
        head: 0.7,          // print head moves
        gap: 0.4,           // pause before the next command
        hold: 4             // pause after the script before it repeats
      },
      stillAt: 10.8         // s: frame shown when motion is reduced (just after the clamped "LC" move)
    },

    setup: function (f) {
      var s = f.state;
      if (s.mag == null) s.mag = 9;
      init(f);
      if (!s.inputs) {
        s.inputs = true;
        f.slider({
          label: "Distance", min: 0, max: 15, step: 1, value: s.mag,
          format: function (v) { return "0x" + v.toString(16).toUpperCase(); },
          onInput: function (v) { s.mag = v; }
        });
        ["L", "R", "U", "D"].forEach(function (d) {
          f.button("Send " + d, function () { send(f, d + s.mag.toString(16).toUpperCase()); });
        });
      }
    },

    reset: function (f) { init(f); },

    draw: function (f, t) {
      var s = f.state, cfg = f.cfg, T = cfg.t, c = f.c, ctx = f.ctx, W = f.w, H = f.h;
      var u = U.unit(f);
      var lt = s.user ? t - s.base : t % s.loopLen;
      s.now = t; s.lt = lt;
      var g = layout(f);

      /* ---- Pipeline: TX -> Ethernet -> RX -> UART -> printer ---- */
      var midY = g.rowY;
      ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(g.tx.x + g.tx.w, midY); ctx.lineTo(g.rx.x, midY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.rx.x + g.rx.w, midY); ctx.lineTo(g.pr.x, midY); ctx.stroke();
      ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u); ctx.textAlign = "center";
      var labY = midY + Math.max(22 * u, 19);
      ctx.fillText(g.narrow ? "TCP" : "Ethernet, TCP", (g.tx.x + g.tx.w + g.rx.x) / 2, labY);
      ctx.fillText("UART", (g.rx.x + g.rx.w + g.pr.x) / 2, labY);
      box(f, g.tx, "TX FPGA", g.narrow ? null : "switches, buttons", c.signal);
      box(f, g.rx, "RX FPGA", g.narrow ? null : "lwIP server, port 7", c.accent);
      box(f, g.pr, "Printer", g.narrow ? null : "reads G-code", c.ink2);

      /* ---- Work out what has happened by lt ---- */
      var log = [], shown = null, pos = { x: s.home0.x, y: s.home0.y }, trail = [];
      var homeK = U.ease(lt, 0.2, 1.0);
      pos = { x: U.lerp(s.home0.x, 0, homeK), y: U.lerp(s.home0.y, 0, homeK) };
      ["G28", "G90", "G1 F1200"].forEach(function (line, i) { if (lt >= 0.3 + i * 0.4) log.push({ text: line, note: i === 0 ? "home" : i === 1 ? "absolute mode" : "feed rate" }); });
      if (lt >= 1.2) trail.push({ x: 0, y: 0 });
      var flying = [];
      s.events.forEach(function (e) {
        var tT = e.start + T.packet, tU = tT + T.translate, tH = tU + T.uart, tE = tH + T.head;
        if (lt >= e.start && lt < tT) flying.push({ kind: "tcp", text: e.cmd, k: (lt - e.start) / T.packet });
        if (lt >= tU && lt < tH) flying.push({ kind: "uart", text: e.gcode, k: (lt - tU) / T.uart });
        if (lt >= tT) shown = { e: e, k: U.ease(lt, tT, T.translate) };
        if (lt >= tH) log.push({ text: e.gcode, note: e.clamped ? "clamped" : null });
        if (lt >= tH) {
          var hk = U.ease(lt, tH, T.head);
          pos = { x: U.lerp(e.x0, e.x1, hk), y: U.lerp(e.y0, e.y1, hk) };
          if (lt >= tE) trail.push({ x: e.x1, y: e.y1 });
        }
      });

      /* Packets in flight */
      flying.forEach(function (p) {
        var x0 = p.kind === "tcp" ? g.tx.x + g.tx.w : g.rx.x + g.rx.w;
        var x1 = p.kind === "tcp" ? g.rx.x : g.pr.x;
        var x = U.lerp(x0, x1, p.k);
        ctx.font = f.mono(12 * u, 600);
        var w = ctx.measureText(p.text).width + 12, h = Math.max(20 * u, 17);
        U.rr(ctx, x - w / 2, midY - h / 2, w, h, 4);
        ctx.fillStyle = c.bg; ctx.fill();
        ctx.strokeStyle = p.kind === "tcp" ? c.signal : c.accent; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = c.ink; ctx.textAlign = "center";
        ctx.fillText(p.text, x, midY + 4);
      });

      /* ---- Translation readout under the RX board ---- */
      if (shown && !g.narrow) {
        var e = shown.e;
        ctx.globalAlpha = shown.k;
        ctx.textAlign = "center"; ctx.font = f.mono(11.5 * u, 500); ctx.fillStyle = c.ink2;
        var axis = e.dir === "L" || e.dir === "R" ? "X" : "Y";
        var before = axis === "X" ? e.x0 : e.y0;
        var raw = before + (e.dir === "L" || e.dir === "D" ? -e.mag : e.mag);
        ctx.fillText(axis + " " + before + (raw >= before ? " + " : " − ") + e.mag + " = " + raw + (e.clamped ? " → " + (axis === "X" ? e.x1 : e.y1) : ""),
          g.rx.x + g.rx.w / 2, g.rx.y + g.rx.h + Math.max(18 * u, 15));
        ctx.globalAlpha = 1;
      }

      /* ---- Seven-segment display ---- */
      var digits = display(cfg, shown ? shown.e : null);
      ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u); ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "Display" : "RX seven-segment display", g.disp.x, g.disp.y - Math.max(7 * u, 6));
      var cw = g.disp.w / 8;
      U.rr(ctx, g.disp.x, g.disp.y, g.disp.w, g.disp.h, 4); ctx.fillStyle = c.sunk; ctx.fill();
      ctx.font = f.mono(Math.min(g.disp.h * 0.62, cw * 1.2), 600); ctx.textAlign = "center";
      for (var i = 0; i < 8; i++) {
        var ch = digits[i];
        if (ch === " ") continue;
        ctx.fillStyle = shown ? (i < 2 ? c.accent : c.ink) : (i >= 4 ? c.ink : c.ink3);
        ctx.fillText(ch, g.disp.x + (i + 0.5) * cw, g.disp.y + g.disp.h * 0.7);
      }
      ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u);
      var ly = g.disp.y + g.disp.h + Math.max(13 * u, 12);
      ctx.fillText("dir", g.disp.x + cw, ly);
      ctx.fillText(g.narrow ? "d" : "dist", g.disp.x + 3.5 * cw, ly);
      ctx.fillText(g.narrow ? "IP" : "IP x.x.0.135", g.disp.x + 6 * cw, ly);

      /* ---- G-code log ---- */
      ctx.textAlign = "left"; ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u);
      ctx.fillText(g.narrow ? "G-code out" : "G-code sent to the printer", g.log.x, g.log.y);
      var lines = log.slice(-g.log.n);
      lines.forEach(function (l, j) {
        var y = g.log.y + (j + 1) * g.lh;
        var last = j === lines.length - 1;
        ctx.fillStyle = last ? c.ink : c.ink2; ctx.font = f.mono(12 * u, last ? 600 : 450);
        ctx.fillText(l.text, g.log.x, y);
        if (l.note && !g.narrow) {
          ctx.fillStyle = l.note === "clamped" ? c.signal : c.ink3; ctx.font = f.font(10.5 * u);
          ctx.fillText(l.note, g.log.x + Math.max(84 * u, 72), y);
        }
      });

      /* ---- Print area ---- */
      var B = g.bed;
      var reach = Math.max(pos.x, pos.y);
      trail.forEach(function (p) { reach = Math.max(reach, p.x, p.y); });
      var mx = Math.min(cfg.bedMax, Math.max(cfg.view, Math.ceil((reach + 8) / 20) * 20));
      ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u); ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "Corner, 0–" + mx : "Print area near home, 0 to " + mx + " (of " + cfg.bedMax + ")", B.x, B.y - Math.max(7 * u, 6));
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.fillStyle = c.sunk; ctx.fillRect(B.x, B.y, B.s, B.s); ctx.strokeRect(B.x, B.y, B.s, B.s);
      ctx.strokeStyle = f.alpha(c.ink3, 0.25);
      var nGrid = mx / 10;
      for (var k = 1; k < nGrid; k++) {
        ctx.beginPath(); ctx.moveTo(B.x + B.s * k / nGrid, B.y); ctx.lineTo(B.x + B.s * k / nGrid, B.y + B.s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(B.x, B.y + B.s * k / nGrid); ctx.lineTo(B.x + B.s, B.y + B.s * k / nGrid); ctx.stroke();
      }
      function bp(p) { return { x: B.x + (p.x / mx) * B.s, y: B.y + B.s - (p.y / mx) * B.s }; }
      if (trail.length) {
        ctx.strokeStyle = f.alpha(c.accent, 0.55); ctx.lineWidth = 2;
        ctx.beginPath();
        trail.concat([pos]).forEach(function (p, j) { var q = bp(p); if (j) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
        ctx.stroke();
      }
      var hp = bp(pos);
      ctx.fillStyle = c.bg; ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hp.x, hp.y, Math.max(6 * u, 4.5), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(hp.x, hp.y, Math.max(2.5 * u, 2), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.ink; ctx.font = f.mono(11.5 * u, 560); ctx.textAlign = "right";
      ctx.fillText("X " + Math.round(pos.x) + "  Y " + Math.round(pos.y), B.x + B.s, B.y + B.s + Math.max(15 * u, 13));
      ctx.textAlign = "left"; ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u);
      ctx.fillText("0,0", B.x, B.y + B.s + Math.max(15 * u, 13));
      if (shown && shown.e.clamped && lt < shown.e.start + T.packet + T.translate + T.uart + T.head + 2.2) {
        ctx.fillStyle = c.signal; ctx.font = f.font(11.5 * u, 600); ctx.textAlign = "center";
        ctx.fillText(g.narrow ? "Clamped" : "Clamped at the edge", B.x + B.s / 2, B.y + B.s / 2);
      }
    }
  });

  function init(f) {
    var s = f.state, cfg = f.cfg, T = cfg.t;
    s.user = false; s.base = 0;
    s.home0 = { x: 60, y: 45 };       // where the head happens to be before homing (illustrative)
    s.events = []; s.cx = 0; s.cy = 0;
    s.nextAt = T.boot;
    cfg.script.forEach(function (cmd) { push(f, cmd, s.nextAt); });
    s.loopLen = s.nextAt + T.hold;
  }

  function per(T) { return T.packet + T.translate + T.uart + T.head + T.gap; }

  /* Mirror echo.c: direction letter, then a hex distance; clamp the absolute position. */
  function push(f, cmd, at) {
    var s = f.state, cfg = f.cfg, mx = cfg.bedMax;
    var dir = cmd[0], mag = parseInt(cmd.slice(1), 16) || 0;
    var x0 = s.cx, y0 = s.cy, x1 = x0, y1 = y0, clamped = false, gcode;
    if (dir === "L" || dir === "R") {
      x1 = x0 + (dir === "R" ? mag : -mag);
      if (x1 < 0 || x1 > mx) { x1 = U.clamp(x1, 0, mx); clamped = true; }
      gcode = "G1 X" + x1;
    } else {
      y1 = y0 + (dir === "U" ? mag : -mag);
      if (y1 < 0 || y1 > mx) { y1 = U.clamp(y1, 0, mx); clamped = true; }
      gcode = "G1 Y" + y1;
    }
    s.cx = x1; s.cy = y1;
    s.events.push({ cmd: cmd, dir: dir, mag: mag, start: at, x0: x0, y0: y0, x1: x1, y1: y1, clamped: clamped, gcode: gcode });
    s.nextAt = at + per(cfg.t);
  }

  function send(f, cmd) {
    var s = f.state;
    if (!s.user) {
      /* Stop looping the demo script; keep the current moment as the timeline origin. */
      s.base = (s.now || 0) - (s.lt || 0);
      s.user = true;
      /* Drop scripted commands that haven't started yet. */
      var lt = s.lt || 0;
      var kept = s.events.filter(function (e) { return e.start <= lt; });
      s.events = [];
      s.cx = 0; s.cy = 0;
      s.nextAt = f.cfg.t.boot;
      kept.forEach(function (e) { push(f, e.cmd, e.start); });
      if (kept.length) s.nextAt = kept[kept.length - 1].start + per(f.cfg.t);
    }
    push(f, cmd, Math.max(s.nextAt, (s.lt || 0) + 0.05));
  }

  /* The 32-bit word echo.c writes: direction letters, blank, distance, IP bytes in hex. */
  function display(cfg, e) {
    var ip = hex2(cfg.ip[0]) + hex2(cfg.ip[1]);
    if (!e) return "0000" + ip;
    var letters = { L: "LF", R: "rt", U: "uP", D: "dn" }[e.dir];
    return letters + " " + e.mag.toString(16).toUpperCase() + ip;
  }
  function hex2(n) { return ("0" + n.toString(16).toUpperCase()).slice(-2); }

  function layout(f) {
    var W = f.w, H = f.h, u = U.unit(f);
    var lh = Math.max(18 * u, 15);
    if (W < 480) {
      /* Narrow: short labels; display and log stacked on the left, print area on the right. */
      var bh = Math.max(H * 0.13, 30), byN = H * 0.06;
      var sN = Math.min(W * 0.4, H * 0.5);
      return {
        narrow: true, lh: lh, rowY: byN + bh / 2,
        tx: { x: W * 0.03, y: byN, w: W * 0.22, h: bh },
        rx: { x: W * 0.39, y: byN, w: W * 0.22, h: bh },
        pr: { x: W * 0.75, y: byN, w: W * 0.22, h: bh },
        disp: { x: W * 0.04, y: H * 0.34, w: W * 0.46, h: Math.max(H * 0.1, 24) },
        log: { x: W * 0.04, y: H * 0.6, n: 3 },
        bed: { x: W * 0.96 - sN, y: H * 0.34, s: sN }
      };
    }
    var bhW = H * 0.17, by = H * 0.05;
    var s = Math.min(W * 0.34, H * 0.52);
    return {
      narrow: false, lh: lh, rowY: by + bhW / 2,
      tx: { x: W * 0.03, y: by, w: W * 0.2, h: bhW },
      rx: { x: W * 0.4, y: by, w: W * 0.22, h: bhW },
      pr: { x: W * 0.8, y: by, w: W * 0.17, h: bhW },
      disp: { x: W * 0.04, y: H * 0.42, w: W * 0.4, h: H * 0.12 },
      log: { x: W * 0.04, y: H * 0.7, n: 4 },
      bed: { x: W * 0.95 - s, y: H * 0.38, s: s }
    };
  }

  function box(f, b, title, sub, color) {
    var ctx = f.ctx, c = f.c, u = U.unit(f);
    U.rr(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fillStyle = c.bg; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = c.ink; ctx.font = f.font(12.5 * u, 600);
    ctx.fillText(title, b.x + b.w / 2, b.y + (sub ? b.h * 0.45 : b.h * 0.5 + 4));
    if (sub) {
      ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u);
      ctx.fillText(sub, b.x + b.w / 2, b.y + b.h * 0.75);
    }
  }
})();
