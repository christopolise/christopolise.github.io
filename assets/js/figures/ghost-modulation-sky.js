/* Spectra over a radio telescope: who ruined the observation, and can it be faked?
 * Three LEO satellites cross the sky above a radio-astronomy dish. One of them
 * (Sat A) sweeps a sidelobe over the dish and drowns the faint source in a burst
 * of interference. Spectra satellites delay a few of their transmissions at
 * pseudorandom symbol windows (from a key shared with the observatory), so the
 * observatory reads a watermark from transmission timestamps alone, without
 * demodulating anything: a header carrying a 16-bit time-based one-time code
 * (TOTP, one-minute time slice, from a seed shared by satellite and
 * observatory) and a payload naming the transmitter (its NORAD ID).
 * In the replay attack, Eve records Sat B's watermark at 12:01 and replays the
 * energy at the dish at 12:04 to frame Sat B. The timing still decodes, but the
 * one-time code is from an expired minute, so the observatory rejects it.
 * From the paper: the timing-only decode, pseudorandom symbol windows, 16-bit
 * TOTP, one-minute slice, NORAD ID payload, and the replay threat model
 * (Sec. III-C, III-E, III-G). Satellite paths, beam shapes, burst timing,
 * pulse spacing and code values are illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  var SATS = [
    // x0: position across the sky at t = 0 (0..1); row: height (fraction of sky above the horizon);
    // user: where its main beam aims on the ground (0..1). All illustrative.
    { name: "Sat A", tone: "accent", x0: 0.33, row: 0.36, user: 0.74 },
    { name: "Sat B", tone: "signal", x0: 0.6, row: 0.17, user: 0.9 },
    { name: "Sat C", tone: "third", x0: -0.05, row: 0.5, user: 0.12 }
  ];

  Fig.register("ghost-modulation-sky", {
    config: {
      codeBits: 16,       // TOTP length in the Spectra header (paper, Sec. III-G)
      slice: 60,          // s, TOTP time slice (paper: one minute)
      seed: 9,            // stand-in for the shared seed; picks the code values (illustrative)
      satSpeed: 0.034,    // fraction of the sky width a satellite crosses per second (illustrative)
      beamSteer: 0.14,    // farthest a main beam lands from straight below its satellite (fraction of sky width)
      dishX: 0.36,        // dish position across the sky (0..1)
      eveX: 0.88,         // Eve's antenna position across the sky (0..1)
      pulseGap: 0.15,     // s between transmissions in a burst (illustrative)
      markEvery: 3,       // every Nth transmission is delayed into a symbol window (illustrative)
      markShift: 0.055,   // s, how far a watermark transmission is delayed (exaggerated to be visible)
      travel: 0.35,       // s for a transmission to reach the dish on screen
      fade: 0.45,         // s fade at the start and end of each loop
      // Normal pass (seconds on screen)
      normal: { hit: [2.4, 6.4], code: 7.0, id: 7.8, verdict: 8.6, end: 14 },
      // Replay attack (seconds on screen)
      replay: { rec: [0.6, 3.6], skip: [4.2, 5.2], skipJump: 32, hit: [5.6, 9.2], code: 9.7, id: 10.5, verdict: 11.3, end: 16 },
      startClock: 4 * 60 + 8,   // s after 12:00 when the normal pass starts (12:04:08)
      recClock: 60 + 8,         // s after 12:00 when Eve records (12:01:08)
      stillAt: 10.2       // s: frame shown when motion is reduced and as the thumbnail (culprit named)
    },

    setup: function (f) {
      var s = f.state;
      if (!s.mode) s.mode = "normal";
      plan(f);
      if (!s.btn) {
        s.btn = f.button("Show a replay attack", function (b) {
          s.mode = s.mode === "normal" ? "replay" : "normal";
          b.textContent = s.mode === "normal" ? "Show a replay attack" : "Show a normal pass";
          plan(f);
          f.restart(true);
        });
      }
    },

    reset: function (f) { plan(f); },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg;
      var u = U.unit(f), narrow = f.w < 480 && !f.compact;
      var R = s.mode === "replay" ? cfg.replay : cfg.normal;
      var lt = t % R.end;
      var L = layout(f, narrow);
      var fade = Math.min(1, lt / cfg.fade, (R.end - lt) / cfg.fade);
      ctx.globalAlpha = U.clamp(fade, 0, 1);

      var st = sceneState(f, lt, R);
      drawSky(f, L, st, u);
      if (f.compact) drawStrip(f, L, st, u);
      else drawPanel(f, L, st, u, narrow);
      ctx.globalAlpha = 1;
    }
  });

  /* ---------- timeline ---------- */

  function plan(f) {
    var s = f.state, cfg = f.cfg;
    var R = s.mode === "replay" ? cfg.replay : cfg.normal;
    var rnd = U.seeded(cfg.seed * 7 + (s.mode === "replay" ? 3 : 1));
    var pulses = [], k = 0, tt = R.hit[0] + 0.05;
    while (tt < R.hit[1] - 0.05) {
      var mark = k % cfg.markEvery === 1;
      pulses.push({ t: tt + (mark ? cfg.markShift : 0), mark: mark });
      // pseudorandom spacing stands in for the keyed symbol-window schedule
      tt += cfg.pulseGap * (0.75 + 0.5 * rnd());
      k++;
    }
    s.pulses = pulses;
  }

  function code(cfg, minute) {
    var r = U.seeded(cfg.seed * 1000 + minute);
    var v = Math.floor(r() * Math.pow(2, cfg.codeBits));
    return ("0000" + v.toString(16).toUpperCase()).slice(-4);
  }

  function sceneState(f, lt, R) {
    var s = f.state, cfg = f.cfg, replay = s.mode === "replay";
    var st = { lt: lt, R: R, replay: replay, satAlpha: 1 };
    // sky time: in the replay, the clock skips three minutes and the satellites move on
    if (replay) {
      var k = U.clamp((lt - R.skip[0]) / (R.skip[1] - R.skip[0]), 0, 1);
      st.skyT = lt + (lt > (R.skip[0] + R.skip[1]) / 2 ? R.skipJump : 0);
      st.satAlpha = k > 0 && k < 1 ? Math.abs(1 - 2 * k) : 1;
      var clock0 = cfg.recClock + lt;
      var clock1 = cfg.startClock + (lt - R.skip[1]);
      st.clock = lt < R.skip[0] ? clock0 : lt < R.skip[1] ? U.lerp(cfg.recClock + R.skip[0], cfg.startClock, k) : clock1;
      st.recording = lt >= R.rec[0] && lt < R.rec[1];
      st.recorded = lt >= R.rec[1];
      st.skipping = k > 0 && k < 1;
    } else {
      st.skyT = lt;
      st.clock = cfg.startClock + lt;
    }
    st.minute = Math.floor(st.clock / 60);
    // burst envelope at the dish
    var h0 = R.hit[0], h1 = R.hit[1];
    var q = U.clamp((lt - h0) / (h1 - h0), 0, 1);
    st.env = lt < h0 || lt > h1 ? 0 : (replay ? Math.min(1, q * 8, (1 - q) * 8) : Math.pow(Math.sin(Math.PI * q), 0.7));
    st.inBurst = st.env > 0.02;
    st.burstSeen = lt > h0 + 0.3;
    st.codeK = U.ease(lt, R.code, 0.5);
    st.idK = U.ease(lt, R.id, 0.5);
    st.verdictK = U.ease(lt, R.verdict, 0.6);
    st.sent = replay ? code(cfg, 1) : code(cfg, 4);
    st.expect = code(cfg, 4);
    st.ok = !replay;
    st.who = replay ? SATS[1] : SATS[0];
    return st;
  }

  function envAt(f, st, tt) {
    var R = st.R, q = U.clamp((tt - R.hit[0]) / (R.hit[1] - R.hit[0]), 0, 1);
    if (tt < R.hit[0] || tt > R.hit[1]) return 0;
    return st.replay ? Math.min(1, q * 8, (1 - q) * 8) : Math.pow(Math.sin(Math.PI * q), 0.7);
  }

  /* ---------- layout ---------- */

  function layout(f, narrow) {
    var W = f.w, H = f.h, sky, panel;
    if (f.compact) {
      sky = { x: 0, y: 0, w: W, h: H * 0.76 };
      panel = { x: W * 0.05, y: H * 0.8, w: W * 0.9, h: H * 0.15 };
    } else if (narrow) {
      sky = { x: 0, y: 0, w: W, h: H * 0.5 };
      panel = { x: W * 0.04, y: H * 0.52, w: W * 0.92, h: H * 0.46 };
    } else {
      sky = { x: 0, y: 0, w: W * 0.58, h: H };
      panel = { x: W * 0.62, y: H * 0.05, w: W * 0.36, h: H * 0.9 };
    }
    sky.ground = sky.y + sky.h * (f.compact ? 0.86 : 0.82);
    return { sky: sky, panel: panel };
  }

  function wrapX(x) { var span = 1.24; return ((x + 0.12) % span + span) % span - 0.12; }

  function satPos(f, L, sat, skyT) {
    var g = L.sky;
    var fx = wrapX(sat.x0 + f.cfg.satSpeed * skyT);
    var arc = 1 - 0.18 * Math.pow(2 * fx - 1, 2);  // a little higher overhead than near the horizon
    var top = g.y + (f.compact ? 0.05 : 0.08) * g.h;
    return { x: g.x + fx * g.w, y: g.ground - (g.ground - top) * (1 - sat.row) * arc, fx: fx };
  }

  /* ---------- sky ---------- */

  function drawSky(f, L, st, u) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, g = L.sky, comp = f.compact;
    var big = comp ? 2.4 : 1;
    var dish = { x: g.x + cfg.dishX * g.w, y: g.ground };
    var eve = { x: g.x + cfg.eveX * g.w, y: g.ground };

    // stars (fixed) and the faint source the dish is observing
    var rs = U.seeded(41);
    ctx.fillStyle = f.alpha(c.ink3, 0.35);
    for (var i = 0; i < 26; i++) {
      var sx = g.x + rs() * g.w, sy = g.y + rs() * (g.ground - g.y) * 0.8;
      ctx.beginPath(); ctx.arc(sx, sy, (0.6 + rs() * 0.8) * u * big, 0, Math.PI * 2); ctx.fill();
    }
    var src = { x: g.x + g.w * 0.13, y: g.y + (g.ground - g.y) * 0.12 };
    sparkle(f, src, 5 * u * big, c.ink2);
    ctx.strokeStyle = f.alpha(c.ink3, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2 * u, 4 * u]);
    ctx.beginPath(); ctx.moveTo(dish.x, dish.y - 22 * u * big); ctx.lineTo(src.x, src.y); ctx.stroke(); ctx.setLineDash([]);
    if (!comp && f.w >= 480) {
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      ctx.fillText("faint source", src.x + 9 * u, src.y + 4 * u);
    }

    // ground
    ctx.fillStyle = c.sunk; ctx.fillRect(g.x, g.ground, g.w, g.y + g.h - g.ground);
    ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x, g.ground); ctx.lineTo(g.x + g.w, g.ground); ctx.stroke();

    // satellites, their main beams to users, and Sat A's stray sidelobe
    var pos = SATS.map(function (sat) { return satPos(f, L, sat, st.skyT); });
    var sa = st.satAlpha;
    SATS.forEach(function (sat, k) {
      var p = pos[k], col = c[sat.tone];
      // beams steer toward their users but only so far from straight down
      var ux = g.x + (p.fx + U.clamp(sat.user - p.fx, -cfg.beamSteer, cfg.beamSteer)) * g.w, spread = 9 * u * big;
      ctx.fillStyle = f.alpha(col, 0.13 * sa);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ux - spread, g.ground); ctx.lineTo(ux + spread, g.ground); ctx.closePath(); ctx.fill();
      ctx.fillStyle = f.alpha(col, 0.7 * sa);
      ctx.fillRect(ux - 3 * u * big, g.ground - 2 * u, 6 * u * big, 3 * u);
    });

    // interference reaching the dish: Sat A's sidelobe, or Eve's replay
    if (st.env > 0) {
      var from = st.replay ? { x: eve.x, y: eve.y - 14 * u * big } : pos[0];
      var col = st.replay ? c.ink2 : c.accent;
      var hw = 15 * u * big;
      ctx.fillStyle = f.alpha(col, 0.2 * st.env);
      ctx.beginPath(); ctx.moveTo(from.x, from.y);
      ctx.lineTo(dish.x - hw, dish.y - 26 * u * big); ctx.lineTo(dish.x + hw, dish.y - 10 * u * big); ctx.closePath(); ctx.fill();
      // individual transmissions travelling to the dish
      f.state.pulses.forEach(function (p) {
        var k = (st.lt - (p.t - f.cfg.travel)) / f.cfg.travel;
        if (k < 0 || k > 1) return;
        var to = { x: dish.x, y: dish.y - 18 * u * big };
        var x = U.lerp(from.x, to.x, k), y = U.lerp(from.y, to.y, k);
        var ang = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.strokeStyle = f.alpha(col, 0.85 * st.env); ctx.lineWidth = (p.mark ? 2.4 : 1.4) * u * big;
        ctx.beginPath(); ctx.arc(x, y, 7 * u * big, ang - 0.7, ang + 0.7); ctx.stroke();
      });
    }

    // Eve (replay only)
    if (st.replay) {
      if (st.recording && sa > 0) {
        var b = pos[1];
        ctx.strokeStyle = f.alpha(c.signal, 0.7); ctx.lineWidth = 1.3 * u; ctx.setLineDash([3 * u, 4 * u]);
        ctx.lineDashOffset = -st.lt * 20 * u;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(eve.x, eve.y - 14 * u * big); ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      antenna(f, eve, u * big, c.ink2, true);
      if (!f.compact) {
        ctx.font = f.font(11 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "center";
        var ex = U.clamp(eve.x, 20 * u, g.x + g.w - 20 * u);
        ctx.fillText("Eve", ex, g.ground + Math.max(17 * u, 14));
        var note = st.recording ? "recording" : st.recorded && st.lt < st.R.hit[0] ? "holds Sat B, " + code(f.cfg, 1)
          : st.inBurst ? "replaying" : "";
        if (note) {
          ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
          var nw = ctx.measureText(note).width;
          ctx.textAlign = "left";
          ctx.fillText(note, U.clamp(eve.x - nw / 2, g.x + 4, g.x + g.w - nw - 4), g.ground + Math.max(31 * u, 27));
        }
      }
    }

    // dish
    dishIcon(f, dish, u * big, st.inBurst ? c.ink : c.ink2, st.env);
    if (!f.compact) {
      ctx.font = f.font(11 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "center";
      ctx.fillText("Observatory", dish.x, g.ground + Math.max(17 * u, 14));
    }

    // satellites on top
    SATS.forEach(function (sat, k) {
      var p = pos[k], col = c[sat.tone];
      var a0 = ctx.globalAlpha;
      ctx.globalAlpha = a0 * sa;
      satIcon(f, p, (comp ? 2.7 : 1) * u, col);
      if (!comp && !(k === 0 && !st.replay && st.idK > 0)) {
        ctx.font = f.font(11 * u, 600); ctx.fillStyle = col; ctx.textAlign = "center";
        var half = ctx.measureText(sat.name).width / 2 + 3;
        ctx.fillText(sat.name, U.clamp(p.x, g.x + half, g.x + g.w - half), p.y - 13 * u);
      }
      ctx.globalAlpha = a0;
    });

    // the culprit, named in its own color once the watermark is read
    if (!st.replay && st.idK > 0) {
      var a = pos[0];
      ctx.strokeStyle = f.alpha(c.accent, 0.9 * st.idK); ctx.lineWidth = (comp ? 3.2 : 1.6) * u;
      ctx.setLineDash([5 * u * big, 4 * u * big]);
      ctx.beginPath(); ctx.moveTo(dish.x, dish.y - 30 * u * big); ctx.lineTo(a.x, a.y + (comp ? 46 : 20) * u); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = f.alpha(c.accent, st.idK); ctx.lineWidth = 2 * u * (comp ? 1.6 : 1);
      ctx.beginPath(); ctx.arc(a.x, a.y, (comp ? 46 : 20) * u, 0, Math.PI * 2); ctx.stroke();
      var label = comp ? "Sat A" : "Sat A: identified";
      chip(f, label, a.x, comp ? a.y - 74 * u : a.y + 36 * u, c.accent, comp ? 34 * u : 11 * u, st.idK, g);
    }
    if (st.replay && st.verdictK > 0) {
      chip(f, f.compact ? "replay" : "replay rejected", eve.x, eve.y - 40 * u * big, c.bad, (comp ? 30 : 11) * u, st.verdictK, g);
    }

    // clock
    if (!comp) {
      var m = Math.floor(st.clock / 60), sec = Math.floor(st.clock % 60);
      var clk = "12:" + ("0" + m).slice(-2) + ":" + ("0" + sec).slice(-2);
      ctx.font = f.mono(12 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "left";
      ctx.fillText(clk, g.x + 10 * u, g.y + 18 * u);
      if (st.skipping) {
        var cwid = ctx.measureText(clk).width;
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
        ctx.fillText("three minutes later", g.x + 20 * u + cwid, g.y + 18 * u);
      }
    }
  }

  /* ---------- observatory panel ---------- */

  function drawPanel(f, L, st, u, narrow) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, p = L.panel, R = st.R;
    var lh = Math.max(14 * u, 13);
    var tone = c[st.who.tone];

    // title
    ctx.textAlign = "left"; ctx.font = f.font(12 * u, 620); ctx.fillStyle = c.ink;
    ctx.fillText(narrow ? "Telescope data" : "What the telescope records", p.x, p.y + lh * 0.8);

    // power trace: a chart recorder over the whole loop
    var ly = p.y + lh * (narrow ? 0.8 : 2.1);
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = narrow ? "right" : "left";
    if (!narrow) ctx.fillText("received power over time", p.x, ly);
    if (st.burstSeen) {
      ctx.textAlign = "right"; ctx.fillStyle = c.bad; ctx.font = f.font(10.5 * u, 600);
      ctx.fillText(narrow ? "observation ruined" : "ruined", p.x + p.w, ly);
    }
    ctx.textAlign = "left";
    var ty = ly + lh * 0.5, th = p.h * (narrow ? 0.28 : 0.27);
    var X = function (tt) { return p.x + p.w * tt / R.end; };
    U.rr(ctx, p.x, ty, p.w, th, 4 * u); ctx.fillStyle = c.sunk; ctx.fill();
    var base = ty + th * 0.82, now = st.lt;
    if (st.verdictK > 0 && st.ok) {
      ctx.fillStyle = f.alpha(tone, 0.14 * st.verdictK);
      ctx.fillRect(X(R.hit[0]), ty, X(R.hit[1]) - X(R.hit[0]), th);
    }
    ctx.strokeStyle = c.ink3; ctx.lineWidth = 1; ctx.beginPath();
    var n = Math.max(2, Math.floor(p.w / 2)), nr = U.seeded(5);
    for (var i = 0; i <= n; i++) {
      var tt = R.end * i / n, jitter = (nr() - 0.5) * th * 0.07;
      if (tt > now) break;
      var x = X(tt), y = base + jitter - envAt(f, st, tt) * th * 0.12;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    var spikeCol = st.verdictK > 0.5 ? (st.ok ? tone : c.ink2) : c.ink;
    ctx.strokeStyle = spikeCol; ctx.lineWidth = Math.max(1.5 * u, 1.2);
    f.state.pulses.forEach(function (pu) {
      if (pu.t > now) return;
      var x = X(pu.t), hgt = th * 0.68 * envAt(f, st, pu.t);
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - hgt); ctx.stroke();
    });

    // timestamps: the only thing the observatory needs
    var ky = ty + th + lh * (narrow ? 1.1 : 1.5), kh = Math.max(9 * u, 8);
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
    ctx.fillText(narrow ? "timestamps only" : "timestamps only, no demodulation", p.x, ky);
    var tickY = ky + lh * 0.55;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, tickY + kh); ctx.lineTo(p.x + p.w, tickY + kh); ctx.stroke();
    f.state.pulses.forEach(function (pu) {
      if (pu.t > now) return;
      var x = X(pu.t), marked = pu.mark && st.codeK > 0;
      ctx.strokeStyle = marked ? (st.ok ? tone : c[st.who.tone]) : c.ink3;
      ctx.lineWidth = marked ? Math.max(2 * u, 1.6) : 1;
      var hh = marked ? kh * 1.6 : kh;
      ctx.beginPath(); ctx.moveTo(x, tickY + kh); ctx.lineTo(x, tickY + kh - hh); ctx.stroke();
    });

    // decoded fields
    var fy = tickY + kh + lh * (narrow ? 1.4 : 2.2);
    var colW = narrow ? p.w / 2 : p.w;
    ctx.textAlign = "left";
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
    ctx.fillText(narrow ? "one-time code" : "One-time code (16-bit, per minute)", p.x, fy);
    if (st.codeK > 0) {
      ctx.globalAlpha *= st.codeK;
      ctx.font = f.mono(14 * u, 650); ctx.fillStyle = c.ink;
      ctx.fillText(st.sent, p.x, fy + lh * 1.2);
      var cw = ctx.measureText(st.sent).width;
      ctx.font = f.font(10.5 * u, 600); ctx.fillStyle = st.ok ? c.good : c.bad;
      var vtxt = st.ok ? (narrow ? "current" : "matches 12:04") : (narrow ? "expired" : "expired: 12:04 expects " + st.expect);
      ctx.fillText(vtxt, p.x + cw + 8 * u, fy + lh * 1.2);
      ctx.globalAlpha /= st.codeK;
    }
    var ix = narrow ? p.x + colW : p.x, iy = narrow ? fy : fy + lh * 2.9;
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
    ctx.fillText(narrow ? "transmitter ID" : "Transmitter ID (NORAD ID)", ix, iy);
    if (st.idK > 0) {
      var cy = iy + lh * 1.2 - 4 * u;
      var cwid = chipLeft(f, st.who.name, ix, cy, tone, 11 * u, st.idK, !st.ok);
      if (!st.ok && !narrow) {
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
        ctx.globalAlpha *= st.idK;
        ctx.fillText("decodes fine; the code does not", ix + cwid + 8 * u, cy + 4 * u);
        ctx.globalAlpha /= st.idK;
      }
    }

    // verdict
    var vy = narrow ? Math.min(p.y + p.h - lh * 0.3, fy + lh * 2.8) : Math.min(p.y + p.h - lh * 0.4, iy + lh * 3.6);
    if (st.verdictK > 0) {
      ctx.globalAlpha *= st.verdictK;
      ctx.font = f.font(13 * u, 650); ctx.textAlign = "left";
      if (st.ok) {
        ctx.fillStyle = c.good; ctx.fillText("Accepted:", p.x, vy);
        var aw = ctx.measureText("Accepted: ").width;
        ctx.fillStyle = tone; ctx.fillText(narrow ? "Sat A did it" : "Sat A caused it", p.x + aw, vy);
      } else {
        ctx.fillStyle = c.bad; ctx.fillText(narrow ? "Rejected: replay" : "Rejected: replayed code", p.x, vy);
      }
      ctx.globalAlpha /= st.verdictK;
    } else {
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      var wait = st.inBurst ? (narrow ? "reading the watermark…" : "reading the watermark from timing…")
        : st.replay && st.lt < R.hit[0] ? (narrow ? "observing" : "observing; Eve listens in") : "observing";
      ctx.fillText(wait, p.x, vy);
    }
  }

  /* Thumbnail: a bold strip of the telescope's power trace under the sky. */
  function drawStrip(f, L, st, u) {
    var ctx = f.ctx, c = f.c, p = L.panel, R = st.R;
    var X = function (tt) { return p.x + p.w * tt / R.end; };
    U.rr(ctx, p.x, p.y, p.w, p.h, 6 * u); ctx.fillStyle = c.sunk; ctx.fill();
    var base = p.y + p.h * 0.8;
    ctx.strokeStyle = c.ink3; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.moveTo(p.x + 6 * u, base); ctx.lineTo(X(Math.min(st.lt, R.end)), base); ctx.stroke();
    var col = st.idK > 0.5 && st.ok ? c[st.who.tone] : c.ink;
    ctx.strokeStyle = col; ctx.lineWidth = 3.2 * u;
    f.state.pulses.forEach(function (pu) {
      if (pu.t > st.lt) return;
      var x = X(pu.t);
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - p.h * 0.65 * envAt(f, st, pu.t)); ctx.stroke();
    });
  }

  /* ---------- drawing helpers ---------- */

  function satIcon(f, p, s, col) {
    var ctx = f.ctx;
    ctx.fillStyle = col;
    ctx.fillRect(p.x - 3.5 * s, p.y - 3.5 * s, 7 * s, 7 * s);
    ctx.fillStyle = f.alpha(col, 0.75);
    ctx.fillRect(p.x - 15 * s, p.y - 2.5 * s, 9 * s, 5 * s);
    ctx.fillRect(p.x + 6 * s, p.y - 2.5 * s, 9 * s, 5 * s);
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, s);
    ctx.beginPath(); ctx.moveTo(p.x - 6 * s, p.y); ctx.lineTo(p.x - 3.5 * s, p.y); ctx.moveTo(p.x + 3.5 * s, p.y); ctx.lineTo(p.x + 6 * s, p.y); ctx.stroke();
  }

  function dishIcon(f, p, s, col, glow) {
    var ctx = f.ctx, c = f.c;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // base and post
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(p.x - 9 * s, p.y); ctx.lineTo(p.x - 4 * s, p.y - 6 * s); ctx.lineTo(p.x + 4 * s, p.y - 6 * s); ctx.lineTo(p.x + 9 * s, p.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 6 * s); ctx.lineTo(p.x, p.y - 15 * s); ctx.stroke();
    // bowl, tipped toward the source in the upper left
    ctx.save(); ctx.translate(p.x, p.y - 17 * s); ctx.rotate(-0.6);
    ctx.beginPath(); ctx.moveTo(-20 * s, -9 * s); ctx.quadraticCurveTo(0, 13 * s, 20 * s, -9 * s); ctx.quadraticCurveTo(0, 3 * s, -20 * s, -9 * s);
    ctx.fillStyle = col; ctx.fill();
    // feed legs and receiver at the focus
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath(); ctx.moveTo(-15 * s, -5 * s); ctx.lineTo(0, -19 * s); ctx.lineTo(15 * s, -5 * s); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -19 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    if (glow > 0) {
      ctx.strokeStyle = f.alpha(c.bad, 0.85 * glow); ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(0, -19 * s, (6 + 4 * glow) * s, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore(); ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  }

  function antenna(f, p, s, col) {
    var ctx = f.ctx;
    ctx.strokeStyle = col; ctx.lineWidth = 1.8 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x - 5 * s, p.y); ctx.lineTo(p.x, p.y - 10 * s); ctx.lineTo(p.x + 5 * s, p.y); ctx.stroke();
    ctx.save(); ctx.translate(p.x, p.y - 12 * s); ctx.rotate(-0.35);
    ctx.beginPath(); ctx.moveTo(-8 * s, -3 * s); ctx.quadraticCurveTo(0, 6 * s, 8 * s, -3 * s); ctx.stroke();
    ctx.restore(); ctx.lineCap = "butt";
  }

  function sparkle(f, p, r, col) {
    var ctx = f.ctx;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(p.x, p.y - r); ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
    ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r); ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y);
    ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r); ctx.fill();
  }

  /* Filled label chip centred on (x, y), kept inside box g. */
  function chip(f, text, x, y, col, size, k, g) {
    var ctx = f.ctx;
    ctx.font = f.font(size, 650);
    var w = ctx.measureText(text).width + size * 1.1, h = size * 1.7;
    var cx = U.clamp(x, g.x + w / 2 + 3, g.x + g.w - w / 2 - 3);
    var cy = U.clamp(y, g.y + h / 2 + 3, g.y + g.h - h / 2 - 3);
    ctx.globalAlpha *= k;
    U.rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = f.c.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy + 0.5);
    ctx.textBaseline = "alphabetic";
    ctx.globalAlpha /= k;
  }

  /* Chip with its left edge at x; returns its width. `struck` draws it outlined only. */
  function chipLeft(f, text, x, y, col, size, k, struck) {
    var ctx = f.ctx;
    ctx.font = f.font(size, 650);
    var w = ctx.measureText(text).width + size * 1.1, h = size * 1.7;
    ctx.globalAlpha *= k;
    U.rr(ctx, x, y - h / 2, w, h, h / 2);
    if (struck) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = col; }
    else { ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = f.c.bg; }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, y + 0.5);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.globalAlpha /= k;
    return w;
  }
})();
