/* LaMDA: the whole pipeline in three stages, looping.
 * (1) Registration: the server pings the phone and the sensor ten times each,
 *     keeps each minimum, and accepts when they agree within L_TOL = 15 ms.
 * (2) Traceroute signature: the server traceroutes the sensor's home router
 *     every 10 minutes for a week. Each trace walks hop by hop; links it reuses
 *     get thicker, and load-balanced alternates branch off. The weighted path
 *     graph that results is the sensor's signature.
 * (3) Detection: the sensor goes quiet (a data gap). New traces after the gap
 *     are laid over the signature and scored; at or above 90% it stays trusted,
 *     below it is quarantined and must re-register.
 * Real (paper): 15 ms tolerance, ten pings with the minimum kept (Sec. VI-A);
 * traceroute every 10 min, one week of trusted data, 90% threshold (Sec. V-B);
 * scores 99.7% (node C against itself) and 11.3% (trusted at E, data from A),
 * Table I(b). Illustrative: the hop topology, route frequencies, latencies and
 * all motion. */
(function () {
  "use strict";
  var U = Fig.util;

  /* Topology. Six hops between the server (col 0) and the home router (col 7).
     Hops 1-2 sit in the server's hosting network, 3-4 in transit, 5-6 in the
     home ISP. Each route picks a lane (-1, 0, +1) per hop. Illustrative. */
  var HOPS = 6;
  var ROUTES = [
    { lanes: [0, 0, 0, 0, 0, 0], w: 0.48 },    // the usual path
    { lanes: [0, 0, -1, -1, 0, 0], w: 0.24 },  // transit load-balances over a parallel pair
    { lanes: [0, 0, 0, 1, 0, 0], w: 0.12 },    // one transit hop swaps
    { lanes: [0, -1, 0, 0, 0, 0], w: 0.09 },   // the host's second edge router
    { lanes: [0, 0, 0, 0, 1, 0], w: 0.07 }     // a second ISP aggregation router
  ];
  var FIRST = [0, 0, 1, 0, 2, 0, 3, 0, 1, 4]; // forced opening so every branch shows early
  var MOVED = [0, 0, "m", "m", "m", "m"];       // after a move: shared host hops, then new ones


  Fig.register("lamda-pipeline", {
    config: {
      tolerance: 15,      // ms, L_TOL (paper, Sec. VI-A)
      phoneMs: 38,        // ms, phone's minimum round trip (illustrative)
      sensorMs: 46,       // ms, sensor's minimum round trip (illustrative)
      jitter: 24,         // ms, max extra delay on a single ping (illustrative)
      pings: 10,          // pings per device; the minimum is kept (paper)
      traceEvery: 10,     // minutes between traceroutes (paper, Sec. V-B)
      traceDays: 7,       // days of trusted traces in the signature (paper, Sec. V-B)
      drawnTraces: 46,    // traces animated while the signature builds
      checkTraces: 8,     // traces animated after the gap
      threshold: 90,      // % similarity needed to keep trusting (paper, Sec. V-B)
      stayScore: 99.7,    // % when the sensor stayed (paper, Table I(b), C vs C)
      moveScore: 11.3,    // % after a move between cities (paper, Table I(b), E to A)
      buildCurve: 1.6,    // >1: the first traces walk slowly, later ones stream in
      seed: 11,           // route draws (seeded, so every loop is the same)
      phase: {            // seconds for each act
        register: 5.6,
        build: 10,
        gap: 2.4,
        check: 3.4,
        score: 1.4,
        hold: 3.6
      },
      stillAt: 12.4       // s: signature mid-build (thumbnail and reduced-motion frame)
    },

    setup: function (f) {
      var s = f.state;
      if (s.moved == null) s.moved = true;
      plan(f);
      if (!s.btn) {
        s.btn = f.button("Keep the sensor in place", function (b) {
          s.moved = !s.moved;
          b.textContent = s.moved ? "Keep the sensor in place" : "Move the sensor during the gap";
          f.restart(true);
        });
      }
    },

    reset: function (f) { plan(f); },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg, P = cfg.phase;
      var g = geo(f), u = g.u, cmp = f.compact;
      var T1 = P.register, T2 = T1 + P.build, Tg = T2 + P.gap, Tc = Tg + P.check,
        Ts = Tc + P.score, total = Ts + P.hold;
      var lt = t % total;
      var stage = lt < T1 ? 0 : lt < T2 ? 1 : 2;

      pills(f, g, stage, lt, [T1, P.build, total - T2]);

      /* ---- Network segment bands (fade in with stage 2) ---- */
      var bandA = stage === 0 ? 0 : U.ease(lt, T1, 0.6);
      if (bandA > 0) bands(f, g, bandA);

      /* ---- Stage 1: plain link server -> router ---- */
      var lineA = stage === 0 ? 1 : 1 - U.ease(lt, T1, 0.5);
      if (lineA > 0.02) {
        ctx.strokeStyle = f.alpha(c.lineStrong, lineA); ctx.lineWidth = 1.5 * u;
        ctx.setLineDash([4 * u, 4 * u]);
        ctx.beginPath(); ctx.moveTo(g.server.x, g.server.y); ctx.lineTo(g.router.x, g.router.y); ctx.stroke();
        ctx.setLineDash([]);
        if (!cmp) {
          ctx.fillStyle = f.alpha(c.ink3, lineA); ctx.font = f.font(11 * u); ctx.textAlign = "center";
          ctx.fillText("Internet", (g.server.x + g.router.x) / 2, g.server.y - 9 * u);
        }
      }

      /* ---- Stage 2/3: the signature graph ---- */
      var bt = stage === 0 ? -1 : Math.min(lt - T1, P.build);
      var sig = tally(f, s.traces, bt);
      var sigA = stage === 2 ? 1 - 0.6 * U.ease(lt, Tg, 0.8) : 1;
      if (stage > 0) drawSignature(f, g, sig, sigA, stage === 1 ? bt : null);

      /* Packets of traces in flight */
      if (stage === 1) {
        s.traces.forEach(function (tr, i) {
          var q = (bt - tr.s) / tr.d;
          if (q <= 0 || q >= 1) return;
          var pts = routePts(g, tr.lanes, false);
          if (i < 8 && !cmp) { /* early traces: trace the walk so the hop-by-hop idea reads */
            ctx.strokeStyle = f.alpha(c.ink, 0.55); ctx.lineWidth = 1.2 * u;
            ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
            var upto = q * (pts.length - 1);
            for (var k = 1; k <= Math.floor(upto); k++) ctx.lineTo(pts[k].x, pts[k].y);
            var hd = U.along(pts, q); ctx.lineTo(hd.x, hd.y); ctx.stroke();
          }
          packet(f, U.along(pts, q), c.ink, (cmp ? 6 : 4) * u);
        });
      }

      /* ---- Stage 3: gap, then new traces over the signature ---- */
      var moveK = 0, chk = null;
      if (stage === 2) {
        moveK = s.moved ? U.ease(lt, T2 + 0.3, P.gap * 0.8) : 0;
        chk = tally(f, s.check, lt - Tg);
        drawCheck(f, g, chk, lt - Tg);
      }

      /* ---- Endpoints ---- */
      homeBoxes(f, g, stage, lt, T1, T2, Tg, moveK);
      node(f, g.server, c.ink, cmp ? 13 * u : 9 * u, cmp ? null : "Server", "below");

      /* ---- Readout panel ---- */
      if (stage === 0) panelRegister(f, g, lt);
      else if (stage === 1) panelBuild(f, g, bt);
      else panelDetect(f, g, lt, T2, Tg, Tc, Ts);
    },

    resize: function () {}
  });

  /* ------------------------------------------------------------------ */
  function pick(rnd) {
    var r = rnd(), acc = 0;
    for (var i = 0; i < ROUTES.length; i++) { acc += ROUTES[i].w; if (r < acc) return i; }
    return 0;
  }

  function plan(f) {
    var s = f.state, cfg = f.cfg, P = cfg.phase;
    var rnd = U.seeded(cfg.seed), n = cfg.drawnTraces;
    var span = P.build * 0.84;
    s.traces = [];
    for (var i = 0; i < n; i++) {
      var r = i < FIRST.length ? FIRST[i] : pick(rnd);
      var st = span * Math.pow(i / n, 1 / cfg.buildCurve);
      s.traces.push({ lanes: ROUTES[r].lanes, s: st, d: Math.max(0.34, 1.15 - i * 0.07), i: i });
    }
    var rq = U.seeded(cfg.seed + 7), m = cfg.checkTraces;
    s.check = [];
    for (var j = 0; j < m; j++) {
      var lanes = s.moved ? MOVED : ROUTES[j < 3 ? 0 : pick(rq)].lanes;
      s.check.push({ lanes: lanes, s: 0.15 + (P.check - 0.7) * j / m, d: 0.55, i: j });
    }
    /* Stage 1 pings (seeded). One ping per device hits its base latency. */
    var rp = U.seeded(cfg.seed + 3), step = (P.register - 1.6) / cfg.pings;
    s.pings = [];
    ["phone", "sensor"].forEach(function (who, w) {
      var base = who === "phone" ? cfg.phoneMs : cfg.sensorMs;
      for (var i = 0; i < cfg.pings; i++) {
        var rtt = i === 4 + w ? base : base + Math.round(rp() * rp() * cfg.jitter) + 1;
        s.pings.push({ who: who, rtt: rtt, s: 0.25 + i * step + w * step * 0.5, d: 0.3 + rtt / 160 });
      }
    });
  }

  /* Counts of each link and hop reached by time `at` (seconds into the run). */
  function tally(f, list, at) {
    var out = { edge: {}, node: {}, first: {}, done: 0, top: 0 };
    if (at < 0) return out;
    list.forEach(function (tr) {
      var q = (at - tr.s) / tr.d;
      if (q <= 0) return;
      if (q >= 1) out.done++;
      var passed = Math.min(HOPS + 1, Math.floor(q * (HOPS + 1) + 1e-6));
      var prev = "0:0";
      for (var k = 1; k <= passed; k++) {
        var key = k === HOPS + 1 ? (tr.lanes === MOVED ? "R:m" : "R:0") : k + ":" + tr.lanes[k - 1];
        var ek = prev + ">" + key;
        out.edge[ek] = (out.edge[ek] || 0) + 1;
        out.node[key] = (out.node[key] || 0) + 1;
        var when = tr.s + tr.d * k / (HOPS + 1);
        if (out.first[key] == null || when < out.first[key]) out.first[key] = when;
        prev = key;
      }
    });
    out.top = out.edge["0:0>1:0"] || 1;
    return out;
  }

  /* ------------------------------------------------------------------ */
  function geo(f) {
    var W = f.w, H = f.h, u = U.unit(f), cmp = f.compact, narrow = !cmp && W < 480;
    var g = { u: u, narrow: narrow, cmp: cmp };
    if (cmp) {
      g.mainY = H * 0.42; g.lane = H * 0.165;
      g.server = { x: W * 0.06, y: g.mainY };
      g.c1 = W * 0.17; g.c6 = W * 0.7;
      g.router = { x: W * 0.82, y: g.mainY };
      g.box = { x: W * 0.785, y: g.mainY - H * 0.15, w: W * 0.2, h: H * 0.3 };
      g.devX = W * 0.92;
      g.pillY = H * 0.06;
      g.rows = [H * 0.88, H * 0.88, H * 0.95];
    } else if (narrow) {
      g.mainY = H * 0.37; g.lane = H * 0.085;
      g.server = { x: W * 0.07, y: g.mainY };
      g.c1 = W * 0.17; g.c6 = W * 0.6;
      g.router = { x: W * 0.71, y: g.mainY };
      g.box = { x: W * 0.665, y: g.mainY - H * 0.12, w: W * 0.32, h: H * 0.24 };
      g.devX = W * 0.8;
      g.pillY = H * 0.065;
      g.rows = [H * 0.765, H * 0.855, H * 0.945];
    } else {
      g.mainY = H * 0.41; g.lane = H * 0.1;
      g.server = { x: W * 0.065, y: g.mainY };
      g.c1 = W * 0.17; g.c6 = W * 0.64;
      g.router = { x: W * 0.775, y: g.mainY };
      g.box = { x: W * 0.735, y: g.mainY - H * 0.14, w: W * 0.245, h: H * 0.28 };
      g.devX = W * 0.85;
      g.pillY = H * 0.075;
      g.rows = [H * 0.8, H * 0.875, H * 0.95];
    }
    g.movedY = g.mainY + g.lane * (cmp ? 2.3 : 2.45);
    g.newRouter = { x: g.router.x, y: g.movedY };
    var nh = (g.box.h) * 0.62;
    g.newBox = { x: g.box.x, y: g.movedY - nh / 2, w: g.box.w, h: nh };
    g.phone = { x: g.devX, y: g.mainY - g.box.h * 0.24 };
    g.sensor = { x: g.devX, y: g.mainY + g.box.h * 0.24 };
    g.sensorNew = { x: g.devX, y: g.movedY };
    g.x0 = W * 0.05; g.x1 = W * (cmp ? 0.74 : 0.95);
    return g;
  }

  function colX(g, k) {
    if (k === 0) return g.server.x;
    if (k === HOPS + 1) return g.router.x;
    return U.lerp(g.c1, g.c6, (k - 1) / (HOPS - 1));
  }
  function keyPos(g, key) {
    var p = key.split(":");
    if (p[0] === "0") return g.server;
    if (p[0] === "R") return p[1] === "m" ? g.newRouter : g.router;
    var k = +p[0];
    return { x: colX(g, k), y: p[1] === "m" ? g.movedY : g.mainY + (+p[1]) * g.lane };
  }
  function routePts(g, lanes, moved) {
    var pts = [g.server];
    for (var k = 1; k <= HOPS; k++) pts.push(keyPos(g, k + ":" + lanes[k - 1]));
    pts.push(lanes === MOVED || moved ? g.newRouter : g.router);
    return pts;
  }
  function segColor(c, k) {
    return k <= 2 ? c.third : k <= 4 ? c.accent : c.signal;
  }

  /* ------------------------------------------------------------------ */
  function bands(f, g, a) {
    var ctx = f.ctx, c = f.c, u = g.u;
    var dx = (g.c6 - g.c1) / (HOPS - 1), half = dx * 0.46;
    var top = g.mainY - g.lane * 1.55, h = g.lane * 3.1;
    var names = g.cmp ? null : g.narrow ? ["Host", "Transit", "Home ISP"] : ["Server's host", "Transit", "Home ISP"];
    var softs = [c.thirdSoft, c.accentSoft, c.signalSoft], tones = [c.third, c.accent, c.signal];
    for (var b = 0; b < 3; b++) {
      var xa = colX(g, 1 + b * 2) - half, xb = colX(g, 2 + b * 2) + half;
      ctx.globalAlpha = a * 0.6;
      U.rr(ctx, xa, top, xb - xa, h, 8 * u); ctx.fillStyle = softs[b]; ctx.fill();
      ctx.globalAlpha = a;
      if (names) {
        ctx.fillStyle = tones[b]; ctx.font = f.font(11 * u, 600); ctx.textAlign = "center";
        ctx.fillText(names[b], (xa + xb) / 2, top - 7 * u);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawSignature(f, g, sig, a, bt) {
    var ctx = f.ctx, c = f.c, u = g.u, cmp = g.cmp;
    var wMin = (cmp ? 3 : 1.3) * u, wMax = (cmp ? 17 : 7.5) * u;
    ctx.lineCap = "round";
    Object.keys(sig.edge).forEach(function (ek) {
      var p = ek.split(">"), A = keyPos(g, p[0]), B = keyPos(g, p[1]);
      var k = p[1][0] === "R" ? HOPS + 1 : +p[1].split(":")[0];
      var share = sig.edge[ek] / sig.top;
      ctx.strokeStyle = f.alpha(segColor(f.c, k), 0.9 * a);
      ctx.lineWidth = wMin + (wMax - wMin) * Math.sqrt(share);
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    });
    ctx.lineCap = "butt";
    Object.keys(sig.node).forEach(function (key) {
      if (key[0] === "R") return;
      var p = keyPos(g, key), k = +key.split(":")[0];
      var share = sig.node[key] / sig.top;
      var r = ((cmp ? 6 : 3.2) + (cmp ? 8 : 3.6) * Math.sqrt(share)) * u;
      ctx.fillStyle = f.c.bg; ctx.beginPath(); ctx.arc(p.x, p.y, r + 1.5 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f.alpha(segColor(f.c, k), a);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      /* A hop seen for the first time flashes; side branches get a note. */
      if (bt != null) {
        var age = bt - sig.first[key];
        if (age >= 0 && age < 1.1) {
          var k2 = 1 - age / 1.1;
          ctx.strokeStyle = f.alpha(c.ink, 0.7 * k2); ctx.lineWidth = 1.5 * u;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + (3 + 9 * (1 - k2)) * u, 0, Math.PI * 2); ctx.stroke();
          var lane = +key.split(":")[1];
          if (lane !== 0 && !cmp && !g.narrow) {
            ctx.fillStyle = f.alpha(c.ink, Math.min(1, k2 * 2)); ctx.font = f.font(10.5 * u, 560);
            ctx.textAlign = "center";
            ctx.fillText("new route", p.x, p.y + (lane < 0 ? -r - 7 * u : r + 15 * u));
          }
        }
      }
    });
  }

  function drawCheck(f, g, chk, at) {
    var ctx = f.ctx, c = f.c, u = g.u, cmp = g.cmp;
    ctx.strokeStyle = c.ink; ctx.lineWidth = (cmp ? 3 : 1.8) * u; ctx.lineCap = "round";
    Object.keys(chk.edge).forEach(function (ek) {
      var p = ek.split(">"), A = keyPos(g, p[0]), B = keyPos(g, p[1]);
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    });
    ctx.lineCap = "butt";
    Object.keys(chk.node).forEach(function (key) {
      if (key[0] === "R") return;
      var p = keyPos(g, key), fresh = key.indexOf("m") > 0;
      var r = (cmp ? 7 : 5) * u;
      ctx.fillStyle = fresh ? c.bg : c.ink; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.8 * u;
      ctx.beginPath(); ctx.arc(p.x, p.y, fresh ? r : r * 0.55, 0, Math.PI * 2);
      if (fresh) { ctx.fill(); ctx.stroke(); } else ctx.fill();
      if (!fresh) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 2.5 * u, 0, Math.PI * 2); ctx.stroke(); }
    });
    f.state.check.forEach(function (tr) {
      var q = (at - tr.s) / tr.d;
      if (q <= 0 || q >= 1) return;
      packet(f, U.along(routePts(g, tr.lanes), q), c.ink, (cmp ? 6 : 4) * u);
    });
  }

  function homeBoxes(f, g, stage, lt, T1, T2, Tg, moveK) {
    var ctx = f.ctx, c = f.c, u = g.u, cmp = g.cmp, s = f.state;
    var moved = s.moved && stage === 2;
    var b = g.box;
    ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1.2 * u; ctx.setLineDash([4 * u, 4 * u]);
    U.rr(ctx, b.x, b.y, b.w, b.h, 10 * u); ctx.stroke(); ctx.setLineDash([]);
    if (!cmp) {
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText(moved && moveK > 0.5 ? (g.narrow ? "Registered" : "Registered address") : (g.narrow ? "Home" : "Home network"),
        b.x + 2 * u, b.y - 7 * u);
    }
    if (moved && moveK > 0) {
      var nb = g.newBox;
      ctx.globalAlpha = moveK;
      ctx.strokeStyle = c.ink2; ctx.setLineDash([4 * u, 4 * u]);
      U.rr(ctx, nb.x, nb.y, nb.w, nb.h, 10 * u); ctx.stroke(); ctx.setLineDash([]);
      if (!cmp) {
        ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u, 560); ctx.textAlign = "left";
        ctx.fillText(g.narrow ? "New place" : "New address", nb.x + 8 * u, nb.y + 15 * u);
      }
      node(f, g.newRouter, c.ink2, (cmp ? 8 : 6) * u, cmp ? null : "router", "below", true);
      ctx.globalAlpha = 1;
    }
    node(f, g.router, c.ink2, (cmp ? 8 : 6) * u, cmp ? null : "router", "below", true);

    /* Phone: present for registration, then leaves. */
    var phoneA = stage === 0 ? U.ease(lt, 0, 0.4) : 1 - U.ease(lt, T1, 0.5);
    if (phoneA > 0.02) {
      ctx.globalAlpha = phoneA;
      ctx.strokeStyle = f.alpha(c.lineStrong, 0.8); ctx.lineWidth = 1.2 * u;
      ctx.beginPath(); ctx.moveTo(g.router.x, g.router.y); ctx.lineTo(g.phone.x, g.phone.y); ctx.stroke();
      node(f, g.phone, c.accent, (cmp ? 10 : 7.5) * u, cmp ? null : g.narrow ? "Phone" : "Phone (GPS)", "right");
      ctx.globalAlpha = 1;
    }

    /* Sensor: dims during the gap, may travel to the new address. */
    var sp = { x: U.lerp(g.sensor.x, g.sensorNew.x, moveK), y: U.lerp(g.sensor.y, g.sensorNew.y, moveK) };
    var off = stage === 2 && lt < Tg;
    var sA = off ? 0.35 : 1;
    var anchor = moveK > 0.5 ? g.newRouter : g.router;
    ctx.strokeStyle = f.alpha(c.lineStrong, 0.8 * sA); ctx.lineWidth = 1.2 * u;
    ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(sp.x, sp.y); ctx.stroke();
    ctx.globalAlpha = sA;
    node(f, sp, c.signal, (cmp ? 10 : 7.5) * u, cmp ? null : off ? "offline" : "Sensor", "right");
    ctx.globalAlpha = 1;

    /* Stage 1 pings */
    if (stage === 0) {
      s.pings.forEach(function (p) {
        var q = (lt - p.s) / p.d;
        if (q <= 0 || q >= 1) return;
        var dest = p.who === "phone" ? g.phone : g.sensor;
        var path = [g.server, g.router, dest];
        var pt = U.along(path, q < 0.5 ? q * 2 : (1 - q) * 2);
        packet(f, pt, p.who === "phone" ? c.accent : c.signal, (cmp ? 6 : 4) * u);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  function pills(f, g, stage, lt, lens) {
    var ctx = f.ctx, c = f.c, u = g.u, W = f.w;
    var labels = g.narrow ? ["1 Register", "2 Signature", "3 Detect"]
      : ["1  Register", "2  Build a signature", "3  Detect a move"];
    var gap = 10 * u, padX = 12 * u, h = Math.max(22 * u, 19);
    var widths, tot = 0;
    if (g.cmp) {
      widths = [W * 0.2, W * 0.36, W * 0.24]; gap = W * 0.03;
    } else {
      ctx.font = f.font(11.5 * u, 600);
      widths = labels.map(function (l) { return ctx.measureText(l).width + padX * 2; });
    }
    widths.forEach(function (w) { tot += w; });
    tot += gap * 2;
    var x = (W - tot) / 2, y = g.pillY - h / 2;
    var starts = [0, lens[0], lens[0] + lens[1]];
    for (var i = 0; i < 3; i++) {
      var w = widths[i], on = i === stage;
      if (g.cmp) {
        U.rr(ctx, x, g.pillY - 4 * u, w, 8 * u, 4 * u);
        ctx.fillStyle = i < stage ? c.ink3 : on ? c.line : c.line; ctx.fill();
        if (on) {
          var k = U.clamp((lt - starts[i]) / lens[i], 0, 1);
          U.rr(ctx, x, g.pillY - 4 * u, Math.max(8 * u, w * k), 8 * u, 4 * u); ctx.fillStyle = c.ink; ctx.fill();
        }
      } else {
        U.rr(ctx, x, y, w, h, h / 2);
        if (on) { ctx.fillStyle = c.ink; ctx.fill(); }
        else { ctx.strokeStyle = i < stage ? c.lineStrong : c.line; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.fillStyle = on ? c.bg : i < stage ? c.ink2 : c.ink3;
        ctx.font = f.font(11.5 * u, 600); ctx.textAlign = "center";
        ctx.fillText(labels[i], x + w / 2, g.pillY + 4 * u);
      }
      x += w + gap;
    }
  }

  function panelRegister(f, g, lt) {
    var ctx = f.ctx, c = f.c, u = g.u, cfg = f.cfg, s = f.state;
    var x0 = g.x0, x1 = g.x1;
    var got = { phone: [], sensor: [] };
    s.pings.forEach(function (p) { if (lt >= p.s + p.d) got[p.who].push(p.rtt); });
    var done = got.phone.length === cfg.pings && got.sensor.length === cfg.pings;
    if (g.cmp) {
      /* Two tally rows as bare shapes */
      ["phone", "sensor"].forEach(function (k, r) {
        var y = g.rows[0] - 10 * u + r * 16 * u, pitch = (x1 - x0) * 0.55 / cfg.pings;
        for (var j = 0; j < cfg.pings; j++) {
          ctx.fillStyle = j < got[k].length ? (k === "phone" ? c.accent : c.signal) : c.line;
          ctx.fillRect(x0 + j * pitch, y, pitch * 0.7, 10 * u);
        }
      });
      if (done) { U.rr(ctx, x1 - (x1 - x0) * 0.3, g.rows[0] - 10 * u, (x1 - x0) * 0.3, 26 * u, 6 * u); ctx.fillStyle = c.good; ctx.fill(); }
      return;
    }
    ctx.font = f.font(12 * u);
    var labelW = ctx.measureText("Sensor").width + 12 * u;
    ctx.font = f.mono(12 * u);
    var valW = ctx.measureText("min 000 ms").width + 8 * u;
    var pitch = Math.min(12 * u, (x1 - x0 - labelW - valW) / cfg.pings);
    [["phone", "Phone", c.accent], ["sensor", "Sensor", c.signal]].forEach(function (r, i) {
      var y = g.rows[i], list = got[r[0]];
      ctx.fillStyle = c.ink2; ctx.font = f.font(12 * u); ctx.textAlign = "left";
      ctx.fillText(r[1], x0, y + 4 * u);
      for (var j = 0; j < cfg.pings; j++) {
        ctx.fillStyle = j < list.length ? r[2] : c.line;
        ctx.fillRect(x0 + labelW + j * pitch, y - 5 * u, pitch * 0.62, 11 * u);
      }
      ctx.fillStyle = c.ink; ctx.font = f.mono(12 * u); ctx.textAlign = "left";
      var m = list.length ? Math.min.apply(null, list) : null;
      ctx.fillText(m == null ? "–" : "min " + Math.round(m) + " ms", x0 + labelW + cfg.pings * pitch + 8 * u, y + 4 * u);
    });
    if (!g.narrow) {
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "right";
      ctx.fillText("ten pings each; the minimum counts", x1, g.rows[0] + 4 * u);
    }
    var y3 = g.rows[2];
    ctx.textAlign = "left"; ctx.font = f.font(12 * u); ctx.fillStyle = c.ink2;
    if (done) {
      var d = Math.abs(Math.min.apply(null, got.phone) - Math.min.apply(null, got.sensor));
      var ok = d <= cfg.tolerance;
      ctx.fillText((g.narrow ? "Gap " : "Difference ") + Math.round(d) + " ms " + (ok ? "≤ " : "> ") + cfg.tolerance + " ms", x0, y3 + 4 * u);
      ctx.textAlign = "right"; ctx.font = f.font(13 * u, 650); ctx.fillStyle = ok ? c.good : c.bad;
      ctx.fillText(ok ? (g.narrow ? "Accepted" : "Accepted: same network") : "Rejected", x1, y3 + 4 * u);
    } else {
      ctx.fillText((g.narrow ? "Limit " : "Must agree within ") + cfg.tolerance + " ms", x0, y3 + 4 * u);
    }
  }

  function panelBuild(f, g, bt) {
    var ctx = f.ctx, c = f.c, u = g.u, cfg = f.cfg, s = f.state;
    var x0 = g.x0, x1 = g.x1, n = cfg.drawnTraces;
    var done = 0;
    s.traces.forEach(function (tr) { if (bt >= tr.s + tr.d) done++; });
    var perWeek = Math.round(cfg.traceDays * 24 * 60 / cfg.traceEvery);
    var frac = done / n;
    /* Timeline of the week: one tick per trace */
    var ty = g.cmp ? g.rows[0] : g.rows[1];
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x1, ty); ctx.stroke();
    for (var d = 0; d <= cfg.traceDays; d++) {
      var dx = U.lerp(x0, x1, d / cfg.traceDays);
      ctx.beginPath(); ctx.moveTo(dx, ty - 4 * u); ctx.lineTo(dx, ty + 4 * u); ctx.stroke();
    }
    var th = (g.cmp ? 11 : 7) * u;
    for (var i = 0; i < done; i++) {
      var x = U.lerp(x0, x1, (i + 0.5) / n);
      var lanes = s.traces[i].lanes, alt = lanes !== ROUTES[0].lanes;
      ctx.fillStyle = alt ? c.ink3 : c.ink2;
      ctx.fillRect(x - 1 * u, ty - th, (g.cmp ? 3 : 2) * u, th * 2);
    }
    if (g.cmp) return;
    ctx.font = f.font(12 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink2;
    ctx.fillText(g.narrow ? "Traceroute every " + cfg.traceEvery + " min" : "Traceroute to the home router every " + cfg.traceEvery + " minutes", x0, g.rows[0] + 4 * u);
    ctx.textAlign = "right"; ctx.font = f.mono(12 * u, 560); ctx.fillStyle = c.ink;
    var day = Math.max(1, Math.ceil(frac * cfg.traceDays));
    ctx.fillText((g.narrow ? "day " : "day ") + day + "/" + cfg.traceDays + "  " + fmt(Math.round(frac * perWeek)) + (g.narrow ? "" : " traces"), x1, g.rows[0] + 4 * u);
    ctx.textAlign = "left"; ctx.font = f.font(11 * u); ctx.fillStyle = c.ink3;
    ctx.fillText(g.narrow ? "Thicker link = seen more often" : "Signature: a weighted path graph. Thicker links were seen more often.", x0, g.rows[2] + 4 * u);
  }

  function panelDetect(f, g, lt, T2, Tg, Tc, Ts) {
    var ctx = f.ctx, c = f.c, u = g.u, cfg = f.cfg, s = f.state;
    var x0 = g.x0, x1 = g.x1;
    /* Row 1: trusted week | gap | new traces */
    var ty = g.rows[0], wa = U.lerp(x0, x1, 0.56), ga = U.lerp(x0, x1, 0.7);
    var gk = U.ease(lt, T2, 0.6), th = (g.cmp ? 9 : 6) * u;
    if (g.cmp) ty = g.rows[0] - 12 * u;
    ctx.fillStyle = c.ink3; ctx.fillRect(x0, ty - th / 2, (wa - x0), th);
    var gx = U.lerp(wa, ga, Math.min(1, (lt - T2) / (Tg - T2)));
    ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1; ctx.setLineDash([3 * u, 3 * u]);
    ctx.strokeRect(wa + 3 * u, ty - th, Math.max(0, gx - wa - 3 * u), th * 2); ctx.setLineDash([]);
    var m = cfg.checkTraces;
    s.check.forEach(function (tr, j) {
      if (lt - Tg < tr.s + tr.d) return;
      var x = U.lerp(ga + 6 * u, x1, (j + 0.5) / m);
      ctx.fillStyle = c.ink; ctx.fillRect(x - 1 * u, ty - th, (g.cmp ? 3 : 2) * u, th * 2);
    });
    if (!g.cmp) {
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "Signature" : "Signature week", x0, ty - 10 * u);
      ctx.textAlign = "center"; ctx.fillStyle = gk > 0 ? c.ink2 : c.ink3; ctx.font = f.font(11 * u, 560);
      ctx.fillText("Gap", (wa + ga) / 2, ty - 10 * u);
      if (lt >= Tg) { ctx.textAlign = "right"; ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u); ctx.fillText(g.narrow ? "New" : "New traces", x1, ty - 10 * u); }
    }

    /* Row 2: score bar with the threshold */
    var target = s.moved ? cfg.moveScore : cfg.stayScore, pass = target >= cfg.threshold;
    var k = lt >= Tc ? U.ease(lt, Tc, cfg.phase.score) : 0;
    var by = g.cmp ? g.rows[2] - 6 * u : g.rows[1], bh = (g.cmp ? 14 : 9) * u;
    var lab = 0, valW = 0;
    if (!g.cmp) {
      ctx.font = f.font(12 * u); lab = ctx.measureText(g.narrow ? "Score" : "Similarity").width + 10 * u;
      ctx.font = f.mono(12 * u, 600); valW = ctx.measureText("100.0%").width + 8 * u;
      ctx.fillStyle = c.ink2; ctx.font = f.font(12 * u); ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "Score" : "Similarity", x0, by + 4 * u);
    }
    var bx = x0 + lab, bw = x1 - x0 - lab - valW;
    U.rr(ctx, bx, by - bh / 2, bw, bh, bh / 2); ctx.fillStyle = c.line; ctx.fill();
    var settled = lt >= Ts;
    if (k > 0) {
      U.rr(ctx, bx, by - bh / 2, Math.max(bh, bw * target * k / 100), bh, bh / 2);
      ctx.fillStyle = settled ? (pass ? c.good : c.bad) : c.ink2; ctx.fill();
    }
    var tx = bx + bw * cfg.threshold / 100;
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5 * u; ctx.setLineDash([3 * u, 2 * u]);
    ctx.beginPath(); ctx.moveTo(tx, by - bh / 2 - 5 * u); ctx.lineTo(tx, by + bh / 2 + 5 * u); ctx.stroke(); ctx.setLineDash([]);
    if (!g.cmp) {
      ctx.textAlign = "right"; ctx.font = f.mono(12 * u, 600); ctx.fillStyle = c.ink;
      if (k > 0) ctx.fillText((target * k).toFixed(1) + "%", x1, by + 4 * u);
    }

    /* Row 3: verdict */
    if (g.cmp) return;
    var y3 = g.rows[2];
    ctx.textAlign = "left";
    if (settled) {
      ctx.font = f.font(13 * u, 650); ctx.fillStyle = pass ? c.good : c.bad;
      var msg = pass
        ? (g.narrow ? "Stayed: still trusted" : "Same place: " + cfg.stayScore + "% ≥ " + cfg.threshold + "%, keep trusting its data")
        : (g.narrow ? "Moved: quarantine" : "Moved: " + cfg.moveScore + "% < " + cfg.threshold + "%, quarantine and re-register");
      ctx.fillText(msg, x0, y3 + 4 * u);
    } else {
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink3;
      ctx.fillText(lt < Tg ? (g.narrow ? "No uploads: gap" : "No uploads for longer than 3× the upload interval: a gap")
        : (g.narrow ? "New traces vs signature" : "New traces are laid over the signature (pass at " + cfg.threshold + "%)"), x0, y3 + 4 * u);
    }
  }

  /* ------------------------------------------------------------------ */
  function node(f, p, color, r, label, where, small) {
    var ctx = f.ctx, c = f.c, u = U.unit(f);
    ctx.fillStyle = c.bg; ctx.strokeStyle = color; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!small) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.48, 0, Math.PI * 2); ctx.fill(); }
    if (!label) return;
    ctx.fillStyle = small ? c.ink3 : c.ink; ctx.font = f.font((small ? 10.5 : 12) * u, small ? 450 : 560);
    if (where === "right") {
      ctx.textAlign = "left";
      ctx.fillText(label, Math.min(p.x + r + 6 * u, f.w - ctx.measureText(label).width - 3), p.y + 4 * u);
    } else {
      var half = ctx.measureText(label).width / 2 + 3;
      ctx.textAlign = "center";
      ctx.fillText(label, U.clamp(p.x, half, f.w - half), p.y + r + Math.max(14 * u, 12));
    }
  }

  function packet(f, p, color, r) {
    var ctx = f.ctx;
    ctx.fillStyle = f.c.bg; ctx.beginPath(); ctx.arc(p.x, p.y, r + 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

})();
