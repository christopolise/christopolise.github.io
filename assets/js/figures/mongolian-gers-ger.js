/* Inside a Mongolian ger, through one day and night.
 * A cross-section of a ger (round felt tent) with its stove and chimney, its one
 * door, and the low-cost PM2.5 sensor on a centre support beam, as in the study.
 * Particles inside follow the sensor's reading; particles outside follow the
 * outdoor air. Burning coal for cooking and heating fills the ger with smoke.
 * At night the outdoor air is dirtier than the air inside, so each time the
 * door opens a puff of outdoor PM2.5 floods in and the reading spikes.
 * Real: the daytime (5 am to 8 pm) and nighttime (8 pm to 5 am) averages for
 * each ger type and for the U.S. Embassy's outdoor monitor (paper, Sec. 3.2,
 * Figs. 6 and 7), the whole-day averages and reductions (Sec. 3.1, Fig. 5),
 * and the WHO guideline of 15 µg/m³. Synthetic: the hour-by-hour shape (three
 * meal peaks, as in Fig. 4, plus night heating), the door times, and all
 * motion. The synthetic curves are scaled so that their daytime and nighttime
 * means equal the paper's averages exactly.
 * Note: the text gives the daytime averages as insulated-coal 126.2 and hybrid
 * 142.0 (Fig. 6 shows the two bars the other way round); the text values are
 * used because they reproduce the whole-day averages of Fig. 5. */
(function () {
  "use strict";
  var U = Fig.util;

  var TYPES = [
    // day/night/all: paper averages (µg/m³). cut: whole-day reduction vs traditional (paper).
    // meal/heat/infil/floor: weights of the synthetic hourly shape. coal/electric: what heats it.
    { name: "Traditional, coal", short: "Traditional", day: 180.3, night: 198.3, all: 187.0, cut: null,
      meal: 1, heat: 1, infil: 0.5, floor: 0.3, coal: 1, electric: 0, insulated: false },
    { name: "Insulated, coal", short: "Insulated", day: 126.2, night: 200.5, all: 154.3, cut: 17.5,
      meal: 0.8, heat: 1.3, infil: 0.3, floor: 0.4, coal: 1, electric: 0, insulated: true },
    { name: "Insulated, coal + electric", short: "Coal + electric", day: 142.0, night: 167.5, all: 151.4, cut: 19.1,
      meal: 0.9, heat: 0.6, infil: 0.5, floor: 0.4, coal: 0.6, electric: 1, insulated: true },
    { name: "Insulated, electric only", short: "Electric", day: 84.4, night: 113.4, all: 95.5, cut: 48.9,
      meal: 0.25, heat: 0, infil: 1, floor: 0.5, coal: 0, electric: 1, insulated: true }
  ];
  var OUT = { day: 108.4, night: 229.0, all: 153.5 };  // U.S. Embassy monitor (paper)
  var N = 480; // model samples per day (3 min); declared here because Fig.register boots figures at once

  Fig.register("mongolian-gers-ger", {
    config: {
      who: 15,            // µg/m³, WHO guideline used in the paper
      dayStart: 5,        // h, daytime starts (paper)
      nightStart: 20,     // h, nighttime starts (paper)
      startHour: 6,       // h, the loop starts at dawn
      cycle: 30,          // s for one 24-hour loop (before slowing down at the door)
      doors: [8.5, 13.5, 19, 21.75, 0.5], // h, when the door opens (illustrative)
      doorOpen: 0.25,     // h the door stays open (illustrative)
      doorMix: 0.55,      // share of indoor air swapped for outdoor air at each opening (illustrative)
      doorDecay: 0.5,     // h, how fast the puff clears again (illustrative)
      slow: 0.3,          // time runs at this fraction of normal speed while the door is open
      meals: [[7.5, 1], [13, 0.8], [19, 1]], // h and size of cooking peaks (shape after Fig. 4; illustrative)
      indoorDots: 170,    // particles inside at the top of the scale
      outdoorDots: 120,   // particles outside at the top of the scale
      dotScale: 330,      // µg/m³ that fills every particle
      stillAt: 24.1       // s: frame shown when motion is reduced and as the thumbnail (21:51, night, door open)
    },

    setup: function (f) {
      var s = f.state;
      if (s.type == null) s.type = 0;
      if (!s.model) build(f);
      if (!s.btn) {
        s.btn = f.button("Ger: " + TYPES[s.type].name, function (b) {
          s.type = (s.type + 1) % TYPES.length;
          b.textContent = "Ger: " + TYPES[s.type].name;
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg, m = s.model;
      var u = U.unit(f), narrow = f.w < 480 && !f.compact;
      var lt = t % m.total;
      var h = hourAt(m, lt);
      var ty = TYPES[s.type], md = m.types[s.type];
      var L = layout(f, narrow);
      var st = {
        h: h, t: t, ty: ty, md: md,
        pm: sample(md.pm, h), out: sample(m.out, h), burn: sample(md.burn, h),
        door: doorOpen(cfg, h), night: nightness(cfg, h), dark: isDark(c)
      };
      drawScene(f, L.scene, st, u);
      if (f.compact) drawBadge(f, L.scene, st, u);
      else drawPanel(f, L.panel, st, u, narrow);
    }
  });

  /* ---------------- model ---------------- */

  function wrapD(d) { return d > 12 ? d - 24 : d < -12 ? d + 24 : d; }
  function gauss(h, c, w) { var d = wrapD(h - c); return Math.exp(-d * d / (2 * w * w)); }
  function sig(x) { return 1 / (1 + Math.exp(-x)); }

  function build(f) {
    var cfg = f.cfg, s = f.state;
    var hours = [], i, k;
    for (i = 0; i < N; i++) hours.push(24 * i / N);
    var isDay = function (h) { return h >= cfg.dayStart && h < cfg.nightStart; };
    var wN = function (h) { return Math.min(1, sig((h - cfg.nightStart) / 0.5) + sig((cfg.dayStart - h) / 0.5)); };
    var meal = function (h) {
      var v = 0;
      cfg.meals.forEach(function (mm) {
        var d = wrapD(h - mm[0]);
        if (d >= -0.3 && d < 4) v += mm[1] * (d < 0 ? 1 + d / 0.3 : Math.exp(-d / 0.8));
      });
      return v;
    };
    var heat = function (h) { return 0.15 + gauss(h, 22.5, 3.2); };
    var outShape = function (h) { return 0.45 + 1.2 * gauss(h, 22.5, 3.2) + 0.35 * gauss(h, 9, 1.5); };
    var door = function (h) {
      var v = 0;
      cfg.doors.forEach(function (e) {
        var d = wrapD(h - e);
        if (d >= 0 && d < 3) v = Math.max(v, cfg.doorMix * Math.min(1, d / 0.08) * Math.exp(-Math.max(0, d - 0.08) / cfg.doorDecay));
      });
      return v;
    };

    /* Scale a shape with separate day and night factors (blended smoothly at dusk and dawn)
       so that its daytime and nighttime means hit the targets exactly: a 2x2 linear solve. */
    function solve(shape, tDay, tNight, keep, add) {
      var A = [[0, 0], [0, 0]], B = [0, 0], n = [0, 0];
      hours.forEach(function (h) {
        var q = isDay(h) ? 0 : 1, w = wN(h), kp = keep(h);
        n[q]++;
        A[q][0] += shape(h) * (1 - w) * kp; A[q][1] += shape(h) * w * kp; B[q] += add(h);
      });
      for (var q = 0; q < 2; q++) { A[q][0] /= n[q]; A[q][1] /= n[q]; B[q] /= n[q]; }
      var r0 = tDay - B[0], r1 = tNight - B[1], det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      var aD = (r0 * A[1][1] - A[0][1] * r1) / det, aN = (A[0][0] * r1 - A[1][0] * r0) / det;
      return function (h) { return shape(h) * (aD * (1 - wN(h)) + aN * wN(h)); };
    }

    var outF = solve(outShape, OUT.day, OUT.night, function () { return 1; }, function () { return 0; });
    var out = new Float32Array(N), dr = new Float32Array(N);
    for (i = 0; i < N; i++) { out[i] = outF(hours[i]); dr[i] = door(hours[i]); }

    var types = TYPES.map(function (ty) {
      var shape = function (h) { return ty.meal * meal(h) + ty.heat * heat(h) + ty.infil * outShape(h) / 1.6 + ty.floor; };
      var base = solve(shape, ty.day, ty.night,
        function (h) { return 1 - door(h); }, function (h) { return door(h) * outF(h); });
      var pm = new Float32Array(N), burn = new Float32Array(N);
      for (i = 0; i < N; i++) {
        var h = hours[i];
        pm[i] = base(h) * (1 - dr[i]) + dr[i] * out[i];
        burn[i] = ty.coal * U.clamp(0.75 * meal(h) + 0.8 * (heat(h) - 0.1), 0, 1.2);
      }
      return { pm: pm, burn: burn, births: births(cfg, pm, dr, out, burn, ty) };
    });

    var yMax = 0;
    types.forEach(function (tp) { for (var j = 0; j < N; j++) yMax = Math.max(yMax, tp.pm[j]); });
    for (i = 0; i < N; i++) yMax = Math.max(yMax, out[i]);

    // time warp: the clock slows while the door is open
    var steps = 2400, acc = [0], hh = [cfg.startHour];
    var rate = function (h) {
      var b = 0;
      cfg.doors.forEach(function (e) { var d = wrapD(h - e - cfg.doorOpen / 2); b = Math.max(b, Math.exp(-d * d / (2 * 0.25 * 0.25))); });
      return 1 - (1 - cfg.slow) * b;
    };
    for (k = 1; k <= steps; k++) {
      var hk = cfg.startHour + 24 * k / steps;
      acc.push(acc[k - 1] + (24 / steps) / rate(hk % 24));
      hh.push(hk);
    }
    // the loop lasts cfg.cycle s at normal speed, plus the slow-downs at the door
    var secPerH = cfg.cycle / 24;
    s.model = {
      out: out, types: types, yMax: Math.ceil(yMax / 50) * 50,
      warpT: acc.map(function (a) { return a * secPerH; }), warpH: hh, total: acc[steps] * secPerH
    };
  }

  /* For each indoor particle, the moments it appears (its threshold is crossed upward) and where from. */
  function births(cfg, pm, dr, out, burn, ty) {
    var M = cfg.indoorDots, list = [];
    for (var p = 0; p < M; p++) {
      var thr = cfg.dotScale * (p + 0.5) / M, b = [];
      for (var i = 0; i < N; i++) {
        var prev = pm[(i + N - 1) % N];
        if (pm[i] >= thr && prev < thr) {
          var from = dr[i] > 0.04 && out[i] > pm[i] ? "door" : burn[i] > 0.12 ? "stove" : "air";
          b.push({ i: i, from: from });
        }
      }
      list.push({ thr: thr, b: b });
    }
    return list;
  }

  function sample(arr, h) {
    var x = (h % 24) / 24 * N, i = Math.floor(x), k = x - i;
    return U.lerp(arr[i % N], arr[(i + 1) % N], k);
  }

  function hourAt(m, lt) {
    var a = m.warpT, lo = 0, hi = a.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (a[mid] <= lt) lo = mid; else hi = mid; }
    var k = (lt - a[lo]) / Math.max(1e-6, a[hi] - a[lo]);
    return U.lerp(m.warpH[lo], m.warpH[hi], U.clamp(k, 0, 1)) % 24;
  }

  function doorOpen(cfg, h) {
    var o = 0;
    cfg.doors.forEach(function (e) {
      var d = wrapD(h - e);
      if (d >= -0.04 && d < cfg.doorOpen + 0.06) o = Math.max(o, Math.min(1, (d + 0.04) / 0.06, (cfg.doorOpen + 0.06 - d) / 0.08));
    });
    return U.clamp(o, 0, 1);
  }

  function nightness(cfg, h) {
    var a = U.clamp((h - (cfg.nightStart - 0.6)) / 1.2, 0, 1);
    var b = U.clamp(((cfg.dayStart + 0.6) - h) / 1.2, 0, 1);
    return Math.max(a, b);
  }

  /* Dark theme? (night sky colour depends on it) */
  function isDark(c) {
    var m = String(c.bg).match(/oklch\(\s*([\d.]+)(%?)/);
    if (m) return parseFloat(m[1]) / (m[2] ? 100 : 1) < 0.5;
    var r = String(c.bg).match(/[\d.]+/g);
    if (!r) return false;
    var mx = String(c.bg).indexOf("color(") === 0 ? 1 : 255;
    return (+r[0] + +r[1] + +r[2]) / 3 < mx / 2;
  }

  /* ---------------- layout ---------------- */

  function layout(f, narrow) {
    var W = f.w, H = f.h;
    if (f.compact) return { scene: { x: 0, y: 0, w: W, h: H } };
    if (narrow) return { scene: { x: 0, y: 0, w: W, h: H * 0.5 }, panel: { x: W * 0.04, y: H * 0.53, w: W * 0.92, h: H * 0.45 } };
    return { scene: { x: 0, y: 0, w: W * 0.58, h: H }, panel: { x: W * 0.62, y: H * 0.05, w: W * 0.36, h: H * 0.9 } };
  }

  function gerGeo(f, S) {
    var comp = f.compact;
    var ground = S.y + S.h * (comp ? 0.9 : 0.9);
    var R = Math.min(S.w * (comp ? 0.41 : 0.42), (ground - S.y) * (S.h < 200 ? 0.78 : 0.95));
    var cx = S.x + S.w * 0.46;
    var wallTop = ground - 0.42 * R, crown = ground - 0.86 * R, cw = 0.13 * R;
    return {
      ground: ground, R: R, cx: cx, wallTop: wallTop, crown: crown, cw: cw,
      roofY: function (x) {
        var dx = Math.abs(x - cx);
        if (dx <= cw) return crown;
        return U.lerp(crown, wallTop, U.clamp((dx - cw) / (R - cw), 0, 1));
      },
      door: { x: cx + R, y0: ground - 0.34 * R, y1: ground },
      stove: { x: cx - 0.02 * R, y: ground, w: 0.2 * R, h: 0.15 * R },
      heater: { x: cx - 0.68 * R, y: ground, w: 0.16 * R, h: 0.13 * R },
      post: cx + 0.17 * R
    };
  }

  /* ---------------- scene ---------------- */

  function drawScene(f, S, st, u) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, G = gerGeo(f, S), comp = f.compact;
    var R = G.R, n = st.night;
    var felt = (st.ty.insulated ? 9 : 4) * Math.max(u, 0.7) * (comp ? 1.4 : 1);

    // sky: pale by day, deep at night; ground
    ctx.save();
    U.rr(ctx, S.x, S.y, S.w, S.h, comp ? 0 : 6 * u); ctx.clip();
    ctx.fillStyle = c.thirdSoft; ctx.fillRect(S.x, S.y, S.w, S.h);
    ctx.fillStyle = f.alpha(st.dark ? c.bg : c.ink, (st.dark ? 0.85 : 0.92) * n); ctx.fillRect(S.x, S.y, S.w, S.h);
    if (n > 0) {
      var rs = U.seeded(3);
      ctx.fillStyle = f.alpha(st.dark ? c.ink2 : c.bg, 0.6 * n);
      for (var i = 0; i < 30; i++) {
        var sx = S.x + rs() * S.w, sy = S.y + rs() * (G.ground - S.y) * 0.6;
        ctx.beginPath(); ctx.arc(sx, sy, (0.6 + rs()) * u * (comp ? 1.6 : 1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(S.x + S.w * 0.86, S.y + S.h * 0.12, 9 * u * (comp ? 1.6 : 1), 0, Math.PI * 2);
      ctx.fillStyle = f.alpha(st.dark ? c.ink : c.bg, 0.85 * n); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(S.x + S.w * 0.86, S.y + S.h * 0.13, 11 * u * (comp ? 1.6 : 1), 0, Math.PI * 2);
      ctx.fillStyle = f.alpha(c.signal, 0.35 * (1 - n)); ctx.fill();
    }
    ctx.fillStyle = c.sunk; ctx.fillRect(S.x, G.ground, S.w, S.y + S.h - G.ground);
    ctx.fillStyle = f.alpha(st.dark ? c.bg : c.ink, 0.75 * n); ctx.fillRect(S.x, G.ground, S.w, S.y + S.h - G.ground);

    // outdoor PM2.5
    var nOut = Math.round(cfg.outdoorDots * U.clamp(st.out / cfg.dotScale, 0, 1));
    var ro = U.seeded(77), dotR = (comp ? 4.6 : 2.1) * u;
    for (i = 0; i < cfg.outdoorDots; i++) {
      var ox = ro(), oy = ro(), sp = 0.6 + ro(), ph = ro() * 6.28;
      if (i >= nOut) continue;
      var x = S.x + mod(ox * S.w + st.t * 14 * u * sp, S.w);
      var y = S.y + 0.05 * S.h + oy * (G.ground - S.y - 0.08 * S.h) + Math.sin(st.t * 0.8 + ph) * 4 * u;
      if (Math.abs(x - G.cx) < R + felt + dotR && y > G.roofY(x) - felt - dotR) continue;
      ctx.fillStyle = f.alpha(c.third, 0.75); ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2); ctx.fill();
    }

    // chimney smoke, which feeds the dirty outdoor air
    var chimTop = Math.max(G.crown - 0.32 * R, S.y + 8 * u);
    if (st.burn > 0.05) {
      for (i = 0; i < 9; i++) {
        var age = mod(st.t * 0.5 + i / 9, 1);
        var px = G.cx + 4 * u + age * 34 * u + Math.sin(age * 5 + i) * 3 * u;
        var py = chimTop - age * 0.55 * R;
        ctx.fillStyle = f.alpha(c.signal, 0.45 * (1 - age) * U.clamp(st.burn, 0, 1));
        ctx.beginPath(); ctx.arc(px, py, (3 + age * 7) * u * (comp ? 1.4 : 1), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // interior
    gerPath(f, G);
    ctx.fillStyle = st.dark ? c.sunk : c.bg; ctx.fill();
    ctx.fillStyle = f.alpha(c.signalSoft, st.dark ? 0.6 : 0.35); ctx.fill();  // lamp-lit felt

    // roof poles, lattice wall, centre posts (drawn faintly behind everything)
    ctx.strokeStyle = f.alpha(c.ink3, 0.35); ctx.lineWidth = 1;
    [-1, 1].forEach(function (sd) {
      for (var j = 1; j <= 4; j++) {
        var px = G.cx + sd * (G.cw + (R - G.cw) * j / 4);
        ctx.beginPath(); ctx.moveTo(G.cx + sd * G.cw, G.crown + 3 * u); ctx.lineTo(px, G.roofY(px) + 3 * u); ctx.stroke();
      }
    });
    ctx.strokeStyle = f.alpha(c.ink3, 0.22);
    [-1, 1].forEach(function (sd) {
      var x0 = G.cx + sd * R, x1 = G.cx + sd * (R - 0.08 * R);
      for (var j = 0; j < 5; j++) {
        var ya = G.wallTop + (G.ground - G.wallTop) * j / 5, yb = G.wallTop + (G.ground - G.wallTop) * (j + 1) / 5;
        if (sd > 0 && yb > G.door.y0) continue;
        ctx.beginPath(); ctx.moveTo(x0, ya); ctx.lineTo(x1, yb); ctx.moveTo(x1, ya); ctx.lineTo(x0, yb); ctx.stroke();
      }
    });
    ctx.strokeStyle = c.ink3; ctx.lineWidth = Math.max(2.2 * u, 1.6);
    [G.cx - 0.17 * R, G.post].forEach(function (x) {
      ctx.beginPath(); ctx.moveTo(x, G.ground); ctx.lineTo(x, G.crown + 2); ctx.stroke();
    });

    // electric heater
    if (st.ty.electric) {
      var hz = G.heater, on = 0.55 + 0.45 * st.night;
      ctx.fillStyle = f.alpha(c.accent, 0.18 + 0.25 * on);
      U.rr(ctx, hz.x - hz.w / 2 - 4 * u, hz.y - hz.h - 4 * u, hz.w + 8 * u, hz.h + 4 * u, 6 * u); ctx.fill();
      ctx.fillStyle = c.accent; U.rr(ctx, hz.x - hz.w / 2, hz.y - hz.h, hz.w, hz.h, 2 * u); ctx.fill();
      ctx.strokeStyle = c.bg; ctx.lineWidth = Math.max(1.2 * u, 1);
      for (i = 1; i < 4; i++) { var fx = hz.x - hz.w / 2 + hz.w * i / 4; ctx.beginPath(); ctx.moveTo(fx, hz.y - hz.h * 0.85); ctx.lineTo(fx, hz.y - hz.h * 0.15); ctx.stroke(); }
    }

    // stove and chimney
    var sv = G.stove;
    if (st.ty.coal) {
      ctx.strokeStyle = c.ink2; ctx.lineWidth = Math.max(4 * u, 2.5) * (comp ? 1.3 : 1);
      ctx.beginPath(); ctx.moveTo(sv.x + sv.w * 0.25, sv.y - sv.h); ctx.lineTo(sv.x + sv.w * 0.25, chimTop); ctx.stroke();
      ctx.fillStyle = c.ink2; U.rr(ctx, sv.x - sv.w / 2, sv.y - sv.h, sv.w, sv.h, 2 * u); ctx.fill();
      var fire = U.clamp(st.burn, 0, 1);
      ctx.fillStyle = f.alpha(c.signal, 0.25 + 0.75 * fire);
      U.rr(ctx, sv.x - sv.w * 0.3, sv.y - sv.h * 0.7, sv.w * 0.6, sv.h * 0.42, 2 * u); ctx.fill();
    } else {
      // electric only: the stove is cold, no chimney smoke
      ctx.strokeStyle = c.ink3; ctx.lineWidth = Math.max(1.5 * u, 1); ctx.setLineDash([3 * u, 3 * u]);
      U.rr(ctx, sv.x - sv.w / 2, sv.y - sv.h, sv.w, sv.h, 2 * u); ctx.stroke(); ctx.setLineDash([]);
    }

    // indoor PM2.5: each particle appears when the reading passes its threshold
    var md = st.md, hIdx = (st.h % 24) / 24 * N;
    var ri = U.seeded(11);
    var pad = 7 * u, dR = (comp ? 5.6 : 2.3) * u;
    md.births.forEach(function (p) {
      var bx = ri(), by = ri(), p1 = ri() * 6.28, p2 = ri() * 6.28;
      var a = U.clamp((st.pm - p.thr) / 12, 0, 1);
      if (a <= 0) return;
      var x = G.cx + (2 * bx - 1) * (R - pad - felt);
      var top = G.roofY(x) + pad + felt, bot = G.ground - pad;
      var y = U.lerp(top, bot, by);
      x += Math.sin(st.t * 0.6 + p1) * 7 * u; y += Math.cos(st.t * 0.5 + p2) * 5 * u;
      // where it came from, and how far it has travelled since
      var last = null;
      for (var j = 0; j < p.b.length; j++) if (p.b[j].i <= hIdx) last = p.b[j];
      if (!last && p.b.length) last = p.b[p.b.length - 1];
      var from = last ? last.from : "air";
      var ageH = last ? mod(hIdx - last.i, N) * 24 / N : 9;
      var k = U.clamp(ageH / (from === "door" ? 0.35 : 0.6), 0, 1);
      k = 1 - Math.pow(1 - k, 3);
      if (from === "door") { x = U.lerp(G.door.x, x, k); y = U.lerp(G.door.y0 * 0.5 + G.door.y1 * 0.5, y, k); }
      else if (from === "stove") { x = U.lerp(sv.x, x, k); y = U.lerp(sv.y - sv.h, y, k); }
      x = U.clamp(x, G.cx - R + felt + dR, G.door.x + (from === "door" ? 0 : -felt - dR));
      y = Math.min(y, G.ground - dR);
      ctx.fillStyle = f.alpha(from === "door" ? c.third : c.signal, 0.85 * a);
      ctx.beginPath(); ctx.arc(x, y, dR, 0, Math.PI * 2); ctx.fill();
    });

    // incoming puff at the open door when the air outside is dirtier
    if (st.door > 0 && st.out > st.pm) {
      var dy = (G.door.y0 + G.door.y1) / 2, len = 0.55 * R * st.door;
      var gr = ctx.createLinearGradient(G.door.x + 0.2 * R, dy, G.door.x - len, dy);
      gr.addColorStop(0, f.alpha(c.third, 0.38 * st.door)); gr.addColorStop(1, f.alpha(c.third, 0));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(G.door.x + 0.2 * R, G.door.y0); ctx.lineTo(G.door.x - len, dy - 0.2 * R);
      ctx.lineTo(G.door.x - len, dy + 0.15 * R); ctx.lineTo(G.door.x + 0.2 * R, G.door.y1); ctx.closePath(); ctx.fill();
    }

    // felt walls and roof
    ctx.strokeStyle = st.ty.insulated ? c.ink2 : c.ink3; ctx.lineWidth = felt; ctx.lineJoin = "round";
    gerOutline(f, G); ctx.stroke();
    if (st.ty.insulated) {
      ctx.strokeStyle = f.alpha(c.bg, 0.6); ctx.lineWidth = Math.max(1, felt * 0.18); ctx.setLineDash([4 * u, 3 * u]);
      gerOutline(f, G); ctx.stroke(); ctx.setLineDash([]);
    }
    // crown ring
    ctx.strokeStyle = c.ink2; ctx.lineWidth = Math.max(3 * u, 2);
    ctx.beginPath(); ctx.moveTo(G.cx - G.cw, G.crown); ctx.lineTo(G.cx + G.cw, G.crown); ctx.stroke();

    // door: frame and a leaf that swings outward
    var dh = G.door.y1 - G.door.y0, open = st.door;
    ctx.fillStyle = st.dark ? c.ink3 : c.ink2;
    // closed: a panel in the wall; open: a thin leaf standing out from the wall
    if (open < 0.05) {
      ctx.fillRect(G.door.x - felt / 2 - 1, G.door.y0, felt + 2, dh);
    } else {
      var lw = 0.2 * R * open;
      ctx.beginPath();
      ctx.moveTo(G.door.x + felt / 2, G.door.y0); ctx.lineTo(G.door.x + felt / 2 + lw, G.door.y0 - 0.05 * R * open);
      ctx.lineTo(G.door.x + felt / 2 + lw, G.door.y1 - 0.02 * R * open); ctx.lineTo(G.door.x + felt / 2, G.door.y1); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = c.ink2; ctx.lineWidth = Math.max(2 * u, 1.5);
    ctx.beginPath(); ctx.moveTo(G.door.x - felt / 2, G.door.y0); ctx.lineTo(G.door.x + felt / 2, G.door.y0); ctx.stroke();

    // the low-cost sensor on the centre beam
    var sy = G.ground - 0.5 * R, sw = (comp ? 0.13 : 0.1) * R, sh = (comp ? 0.1 : 0.075) * R;
    ctx.fillStyle = c.accent; U.rr(ctx, G.post - sw / 2, sy - sh / 2, sw, sh, 2 * u); ctx.fill();
    ctx.fillStyle = c.bg; ctx.beginPath(); ctx.arc(G.post + sw * 0.25, sy, Math.max(1.4 * u, 1.2) * (0.6 + 0.4 * Math.abs(Math.sin(st.t * 3))), 0, Math.PI * 2); ctx.fill();

    // labels inside the ger (full figure only)
    if (!comp) {
      ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "center"; ctx.fillStyle = c.ink2;
      ctx.fillText("sensor", G.post + sw * 0.1, sy - sh / 2 - 5 * u);
      ctx.fillText(st.ty.coal ? "stove" : "no coal", sv.x, sv.y - sv.h - 6 * u);
      if (st.ty.electric) { ctx.fillStyle = c.accent; ctx.fillText("electric", G.heater.x, G.heater.y - G.heater.h - 8 * u); }
      // clock in the sky corner
      ctx.textAlign = "left"; ctx.font = f.mono(12 * u, 600);
      ctx.fillStyle = n > 0.5 ? (st.dark ? c.ink : c.bg) : c.ink;
      ctx.fillText(clock(st.h) + (n > 0.5 ? "  night" : "  day"), S.x + 10 * u, S.y + 20 * u);
    }
  }

  /* Walls, then a slightly domed roof that overhangs the wall a little (felt over the roof poles). */
  function roofTo(ctx, G, sd, toCrown) {
    var R = G.R, e = 0.05 * R;
    var ex = G.cx + sd * (R + e), ey = G.wallTop + e * 0.5;
    var qx = G.cx + sd * (G.cw + (R - G.cw) * 0.45), qy = U.lerp(G.crown, G.wallTop, 0.45) - 0.07 * R;
    if (toCrown) { ctx.lineTo(ex, ey); ctx.quadraticCurveTo(qx, qy, G.cx + sd * G.cw, G.crown); }
    else { ctx.quadraticCurveTo(qx, qy, ex, ey); ctx.lineTo(G.cx + sd * R, G.wallTop); }
  }
  function gerOutline(f, G) {
    var ctx = f.ctx, R = G.R;
    ctx.beginPath();
    ctx.moveTo(G.cx - R, G.ground); ctx.lineTo(G.cx - R, G.wallTop);
    roofTo(ctx, G, -1, true);
    ctx.moveTo(G.cx + G.cw, G.crown);
    roofTo(ctx, G, 1, false);
    ctx.lineTo(G.cx + R, G.door.y0);
  }
  function gerPath(f, G) {
    var ctx = f.ctx, R = G.R;
    ctx.beginPath();
    ctx.moveTo(G.cx - R, G.ground); ctx.lineTo(G.cx - R, G.wallTop);
    roofTo(ctx, G, -1, true);
    ctx.lineTo(G.cx + G.cw, G.crown);
    roofTo(ctx, G, 1, false);
    ctx.lineTo(G.cx + R, G.ground); ctx.closePath();
  }

  function mod(a, b) { return ((a % b) + b) % b; }
  function clock(h) {
    var hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    return ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2);
  }

  /* ---------------- thumbnail badge ---------------- */

  function drawBadge(f, S, st, u) {
    var ctx = f.ctx, c = f.c;
    var txt = String(Math.round(st.pm));
    ctx.font = f.mono(40 * u, 700);
    var w = ctx.measureText(txt).width + 26 * u, h = 52 * u, x = S.x + 18 * u, y = S.y + 18 * u;
    U.rr(ctx, x, y, w, h, 10 * u); ctx.fillStyle = c.accent; ctx.fill();
    ctx.fillStyle = c.bg; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(txt, x + 13 * u, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }

  /* ---------------- sensor panel ---------------- */

  function drawPanel(f, P, st, u, narrow) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, m = f.state.model, ty = st.ty;
    var lh = Math.max(14 * u, 13);

    // type and readout
    ctx.textAlign = "left"; ctx.font = f.font(12 * u, 640); ctx.fillStyle = c.ink;
    ctx.fillText(narrow ? ty.short : ty.name, P.x, P.y + lh * 0.8);
    var ry = P.y + lh * (narrow ? 1.4 : 1.6), rw = narrow ? P.w * 0.34 : P.w, rh = narrow ? lh * 4.1 : lh * 3.4;
    U.rr(ctx, P.x, ry, rw, rh, 6 * u); ctx.fillStyle = f.alpha(c.accent, 0.1); ctx.fill();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = f.font(10.5 * u, 600); ctx.fillStyle = c.accent;
    ctx.fillText("PM2.5 sensor", P.x + 8 * u, ry + lh * 0.95);
    ctx.font = f.mono(28 * u, 650); ctx.fillStyle = c.ink;
    var num = String(Math.round(st.pm));
    ctx.fillText(num, P.x + 8 * u, ry + lh * (narrow ? 2.45 : 2.75));
    var nw = ctx.measureText(num).width;
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
    if (!narrow) {
      ctx.fillText("µg/m³", P.x + 14 * u + nw, ry + lh * 2.75);
      ctx.textAlign = "right"; ctx.fillStyle = c.ink2;
      ctx.fillText((st.pm / cfg.who).toFixed(0) + "× WHO guideline", P.x + rw - 8 * u, ry + lh * 2.75);
      ctx.fillStyle = c.third;
      ctx.fillText("outdoors " + Math.round(st.out), P.x + rw - 8 * u, ry + lh * 0.95);
      ctx.textAlign = "left";
    } else {
      ctx.fillText((st.pm / cfg.who).toFixed(0) + "× WHO", P.x + 8 * u, ry + lh * 3.55);
    }

    // strip chart
    ctx.font = f.font(10.5 * u, 560);
    var gutter = ctx.measureText("WHO 15").width + 8 * u;
    var cx0 = narrow ? P.x + rw + 12 * u : P.x, cw = (narrow ? P.w - rw - 12 * u : P.w) - gutter;
    var cy0 = narrow ? ry + lh * 0.6 : ry + rh + lh * 1.6, chH = narrow ? rh - lh * 0.6 : P.h * 0.36;
    var hx = function (h) { return cx0 + cw * mod(h - cfg.startHour, 24) / 24; };
    var vy = function (v) { return cy0 + chH - chH * Math.min(v, m.yMax) / m.yMax; };
    // legend
    var lgY = narrow ? ry - lh * 0.15 + lh * 0.05 : ry + rh + lh * 1.05;
    if (!narrow) {
      ctx.font = f.font(10.5 * u); ctx.textAlign = "left";
      var lx = cx0;
      [["indoor", c.signal, false], ["outdoor (U.S. Embassy)", c.third, true]].forEach(function (it) {
        ctx.strokeStyle = it[1]; ctx.lineWidth = 2; if (it[2]) ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(lx, lgY - 4 * u); ctx.lineTo(lx + 14 * u, lgY - 4 * u); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.ink2; ctx.fillText(it[0], lx + 18 * u, lgY);
        lx += 18 * u + ctx.measureText(it[0]).width + 14 * u;
      });
    }
    // night band
    ctx.fillStyle = f.alpha(c.ink3, 0.12);
    ctx.fillRect(hx(cfg.nightStart), cy0, hx(cfg.dayStart + 24) - hx(cfg.nightStart), chH);
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx0, cy0 + chH); ctx.lineTo(cx0 + cw, cy0 + chH); ctx.stroke();
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "center";
    if (!narrow) ctx.fillText("night", (hx(cfg.nightStart) + hx(cfg.dayStart + 24)) / 2, cy0 + lh * 0.9);
    ctx.font = f.mono(10.5 * u); ctx.textAlign = "center";
    (narrow ? [12, 0] : [12, 18, 0]).forEach(function (h) { ctx.fillText(h === 0 ? "0:00" : h + ":00", hx(h), cy0 + chH + lh); });
    // WHO line
    ctx.strokeStyle = c.ink2; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx0, vy(cfg.who)); ctx.lineTo(cx0 + cw, vy(cfg.who)); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "left"; ctx.fillStyle = c.ink2;
    ctx.fillText("WHO 15", cx0 + cw + 5 * u, vy(cfg.who) + 4 * u);
    // traces up to now
    var elapsed = mod(st.h - cfg.startHour, 24);
    [[m.out, c.third, true], [st.md.pm, c.signal, false]].forEach(function (tr) {
      ctx.strokeStyle = tr[1]; ctx.lineWidth = tr[2] ? 1.5 : 1.8; if (tr[2]) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      var steps = Math.max(2, Math.floor(cw / 1.5));
      for (var i = 0; i <= steps; i++) {
        var e = elapsed * i / steps, h = (cfg.startHour + e) % 24;
        var x = cx0 + cw * e / 24, y = vy(sample(tr[0], h));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.fillStyle = c.signal; ctx.beginPath(); ctx.arc(hx(st.h), vy(st.pm), 3 * u + 1, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = "left"; ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink3;
    ctx.fillText(String(m.yMax), cx0 + cw + 5 * u, cy0 + 8 * u);
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx0 + cw, cy0); ctx.lineTo(cx0 + cw + 3 * u, cy0); ctx.stroke();

    // the paper's averages for this ger type
    var fy = narrow ? P.y + P.h - lh * 2.4 : cy0 + chH + lh * 2.5;
    ctx.textAlign = "left"; ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
    ctx.fillText(narrow ? "Paper averages, µg/m³" : "Paper averages, µg/m³ (day / night)", P.x, fy);
    ctx.font = f.mono(11 * u, 600); ctx.fillStyle = c.ink;
    var line1 = (narrow ? "in " : "indoor ") + ty.day.toFixed(1) + " / " + ty.night.toFixed(1);
    ctx.fillText(line1, P.x, fy + lh * 1.15);
    ctx.fillStyle = c.third;
    ctx.fillText((narrow ? "out " : "outdoor ") + OUT.day.toFixed(1) + " / " + OUT.night.toFixed(1), narrow ? P.x + P.w * 0.5 : P.x, fy + lh * (narrow ? 1.15 : 2.3));
    if (!narrow) {
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink2;
      var whole = "Whole day " + ty.all.toFixed(1) + ", " + (ty.all / cfg.who).toFixed(1) + "× the WHO guideline";
      ctx.fillText(whole, P.x, fy + lh * 3.6);
      ctx.fillText(ty.cut ? ty.cut + "% lower than the traditional ger" : "Traditional gers were the control group", P.x, fy + lh * 4.75);
    }
  }
})();
