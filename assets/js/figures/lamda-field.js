/* LaMDA field test (S4S 2023 poster).
 * Fifteen test nodes in three regions: rural (L-O, ~64 km apart), inter-city
 * (A-E, ~13 km apart) and intra-city (F-K, a few city blocks apart). Each
 * test registers a sensor at one node, forces a data gap, then feeds the
 * traceroutes of another node (a "move") or of the same node (a stay) and
 * scores them against the trusted week. The score must reach 90% for the
 * sensor to stay trusted.
 * Real: every score shown is from the poster's tables (= paper Table I),
 * rows = trusted node, columns = questionable node; the 90% threshold; the
 * node spacings. Illustrative: the map drawings and node placements (traced
 * roughly from the poster's maps) and all motion. */
(function () {
  "use strict";
  var U = Fig.util;

  /* Node positions are fractions of each map panel (illustrative). */
  var REGIONS = [
    {
      name: "Rural", spacing: "~64 km apart", tone: "third",
      nodes: { L: [0.64, 0.1], M: [0.56, 0.32], N: [0.42, 0.67], O: [0.3, 0.9] },
      order: ["L", "M", "N", "O"],
      table: { // poster table (a) Rural Area
        L: [99.1, 0, 0, 0], M: [0, 99.9, 0, 0], N: [0, 0, 99.9, 23.9], O: [0, 0, 1.8, 98.0]
      },
      map: "rural"
    },
    {
      name: "Inter-city", spacing: "~13 km apart", tone: "accent",
      nodes: { A: [0.6, 0.93], B: [0.48, 0.68], C: [0.38, 0.4], D: [0.36, 0.08], E: [0.73, 0.83] },
      order: ["A", "B", "C", "D", "E"],
      table: { // poster table (b) Inter-City
        A: [99.9, 0, 0, 0, 14.6], B: [0, 96.39, 0, 0, 0], C: [0, 0, 99.7, 0, 0],
        D: [0, 0, 0, 98.0, 0], E: [11.3, 0, 0, 0, 99.8]
      },
      map: "inter"
    },
    {
      name: "Intra-city", spacing: "a few blocks apart", tone: "signal",
      nodes: { F: [0.08, 0.1], G: [0.74, 0.42], H: [0.6, 0.8], I: [0.76, 0.72], J: [0.8, 0.94], K: [0.96, 0.78] },
      order: ["F", "G", "H", "I", "J", "K"],
      table: { // poster table (c) Intra-City
        F: [99.9, 0, 66.6, 0, 0, 66.6], G: [0, 96.3, 0, 0, 0, 0], H: [66.6, 0, 99.9, 0, 0, 66.6],
        I: [0, 0, 0, 94.9, 0, 0], J: [0, 0, 0, 0, 99.9, 0], K: [66.6, 0, 66.6, 0, 0, 99.9]
      },
      map: "intra"
    }
  ];

  Fig.register("lamda-field", {
    config: {
      threshold: 90,      // % similarity needed to stay trusted (paper, Sec. V-B)
      moves: [            // [region, trusted node, node whose traces arrive after the gap]
        [0, "N", "N"], [0, "N", "O"], [0, "L", "M"],
        [1, "A", "A"], [1, "A", "E"], [1, "E", "A"],
        [2, "F", "H"], [2, "I", "I"], [2, "K", "J"]
      ],
      moveDur: 6,         // s per test
      phase: {            // s into each test
        gap: 0.7,         // sensor goes quiet
        travel: 1.2,      // sensor starts moving
        travelDur: 1.4,
        score: 2.8,       // score bar starts rising
        scoreDur: 0.9,
        verdict: 3.8      // verdict and the rest of the table row appear
      },
      stillAt: 10.2       // s: rural N -> O caught (thumbnail and reduced-motion frame)
    },

    setup: function (f) {
      var s = f.state;
      if (s.start == null) s.start = 0;
      if (!s.btn) {
        s.btn = f.button("Next region", function () {
          var mv = f.cfg.moves, cur = current(f, f.t).idx;
          var r = (mv[cur][0] + 1) % REGIONS.length;
          for (var i = 0; i < mv.length; i++) if (mv[i][0] === r) { s.start = i; break; }
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var c = f.c, ctx = f.ctx, cfg = f.cfg, P = cfg.phase;
      var g = geo(f), u = g.u;
      var cur = current(f, t), mv = cfg.moves[cur.idx], lt = cur.lt;
      var R = REGIONS[mv[0]], from = mv[1], to = mv[2], stay = from === to;
      var tone = c[R.tone];
      var row = R.table[from], score = row[R.order.indexOf(to)];

      /* ---- Map panels ---- */
      REGIONS.forEach(function (reg, i) {
        var p = g.panels[i], on = i === mv[0];
        ctx.globalAlpha = on ? 1 : 0.42;
        drawPanel(f, g, reg, p, on);
        ctx.globalAlpha = 1;
      });

      /* ---- The test in the active panel ---- */
      var p = g.panels[mv[0]];
      var A = at(p, R.nodes[from]), B = at(p, R.nodes[to]);
      var r = g.nodeR;
      // trusted ring
      var pulse = U.ease(lt, 0, 0.6);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(A.x, A.y, r + 4 * u + 3 * u * (1 - pulse), 0, Math.PI * 2); ctx.stroke();
      if (!g.cmp && !g.narrow) {
        ctx.font = f.font(10.5 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "left";
        var lp = placeLabel(ctx, "trusted", A, r + 7 * u, p, R, B, stay, u);
        ctx.fillText("trusted", lp.x, lp.y);
      }
      // sensor glyph: quiet during the gap, then travels (or stays)
      var k = stay ? 0 : U.ease(lt, P.travel, P.travelDur);
      var lift = Math.max(18 * u, Math.hypot(B.x - A.x, B.y - A.y) * 0.35);
      var ctl = ctrl(A, B, lift);
      if (!stay && lt >= P.travel) {
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5 * u; ctx.setLineDash([4 * u, 3 * u]);
        ctx.beginPath(); ctx.moveTo(A.x, A.y);
        var steps = 24;
        for (var j = 1; j <= steps; j++) { var q = quad(A, ctl, B, k * j / steps); ctx.lineTo(q.x, q.y); }
        ctx.stroke(); ctx.setLineDash([]);
      }
      var sp = stay ? A : quad(A, ctl, B, k);
      var quiet = lt >= P.gap && lt < P.score;
      var sz = g.sensorS;
      ctx.globalAlpha = quiet ? 0.45 : 1;
      U.rr(ctx, sp.x - sz / 2 + r * 0.7, sp.y - sz / 2 - r * 0.9, sz, sz, 3 * u);
      ctx.fillStyle = c.ink; ctx.fill();
      ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5 * u; ctx.stroke();
      ctx.globalAlpha = 1;

      /* ---- Score chart: the trusted node's table row ---- */
      chart(f, g, R, from, to, score, tone, lt);

      /* ---- Text ---- */
      if (!g.cmp) caption(f, g, R, from, to, score, lt);
    }
  });

  /* Put a label beside node A: inside the panel, clear of other nodes and the move's end. */
  function placeLabel(ctx, text, A, off, p, R, B, stay, u) {
    var w = ctx.measureText(text).width, h = 11 * u, best = null;
    var cands = [
      { x: A.x - off - w, y: A.y + 4 * u }, { x: A.x + off, y: A.y + 4 * u },
      { x: A.x - w / 2, y: A.y - off - 1 * u }, { x: A.x - w / 2, y: A.y + off + h }
    ];
    cands.forEach(function (cd) {
      var x0 = cd.x, x1 = cd.x + w, y0 = cd.y - h, y1 = cd.y + 2 * u, bad = 0;
      if (x0 < p.x + 3 * u || x1 > p.x + p.w - 3 * u || y0 < p.y + 2 * u || y1 > p.y + p.h - 2 * u) bad += 10;
      var pts = R.order.map(function (id) { return at(p, R.nodes[id]); });
      if (!stay) pts.push({ x: (A.x + B.x) / 2, y: Math.min(A.y, B.y) - 6 * u });
      pts.forEach(function (q) {
        if (q.x === A.x && q.y === A.y) return;
        var dx = Math.max(x0 - q.x, 0, q.x - x1), dy = Math.max(y0 - q.y, 0, q.y - y1);
        if (Math.hypot(dx, dy) < 12 * u) bad++;
      });
      if (!best || bad < best.bad) best = { x: cd.x, y: cd.y, bad: bad };
    });
    return best;
  }

  function current(f, t) {
    var cfg = f.cfg, n = cfg.moves.length, D = cfg.moveDur;
    var i = Math.floor(t / D);
    return { idx: ((f.state.start || 0) + i) % n, lt: t - i * D };
  }

  function geo(f) {
    var W = f.w, H = f.h, u = U.unit(f), cmp = f.compact, narrow = !cmp && W < 480;
    var g = { u: u, cmp: cmp, narrow: narrow, panels: [] };
    var px0 = W * 0.03, gap = W * (narrow ? 0.025 : 0.02), pw = (W * 0.94 - 2 * gap) / 3;
    var py, ph;
    if (cmp) { py = H * 0.04; ph = H * 0.6; }
    else if (narrow) { py = H * 0.1; ph = H * 0.4; }
    else { py = H * 0.11; ph = H * 0.5; }
    for (var i = 0; i < 3; i++) g.panels.push({ x: px0 + i * (pw + gap), y: py, w: pw, h: ph });
    g.nodeR = (cmp ? 12 : narrow ? 8 : 9.5) * u;
    g.sensorS = (cmp ? 16 : 9) * u;
    if (cmp) g.chart = { x: W * 0.08, y: H * 0.71, w: W * 0.86, h: H * 0.25 };
    else if (narrow) g.chart = { x: W * 0.1, y: H * 0.6, w: W * 0.86, h: H * 0.2 };
    else g.chart = { x: W * 0.53, y: H * 0.7, w: W * 0.44, h: H * 0.21 };
    g.text = narrow ? { x: W * 0.04, y: H * 0.905 } : { x: W * 0.03, y: H * 0.74 };
    return g;
  }

  function at(p, xy) {
    var pad = Math.min(p.w, p.h) * 0.1;
    return { x: p.x + pad + xy[0] * (p.w - 2 * pad), y: p.y + pad + xy[1] * (p.h - 2 * pad) };
  }
  function ctrl(A, B, lift) {
    var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    var nx = dy / d, ny = -dx / d;
    if (ny > 0) { nx = -nx; ny = -ny; } /* always bow upward */
    return { x: mx + nx * lift, y: my + ny * lift };
  }
  function quad(A, C, B, k) {
    var a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, d = k * k;
    return { x: a * A.x + b * C.x + d * B.x, y: a * A.y + b * C.y + d * B.y };
  }

  function drawPanel(f, g, reg, p, on) {
    var ctx = f.ctx, c = f.c, u = g.u, tone = c[reg.tone];
    ctx.save();
    U.rr(ctx, p.x, p.y, p.w, p.h, 10 * u);
    ctx.fillStyle = c.sunk; ctx.fill();
    ctx.clip();
    mapArt(f, g, reg.map, p);
    ctx.restore();
    U.rr(ctx, p.x, p.y, p.w, p.h, 10 * u);
    ctx.strokeStyle = on ? tone : c.line; ctx.lineWidth = (on ? 2 : 1) * u; ctx.stroke();
    if (!g.cmp) {
      ctx.textAlign = "left"; ctx.fillStyle = on ? tone : c.ink3;
      ctx.font = f.font(12 * u, 650);
      var ty = p.y - (g.narrow ? 7 : 9) * u;
      ctx.fillText(reg.name, p.x + 2 * u, ty);
      if (!g.narrow) {
        var nw = ctx.measureText(reg.name).width;
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
        var sp = reg.spacing;
        if (nw + ctx.measureText(sp).width + 10 * u < p.w) ctx.fillText(sp, p.x + nw + 8 * u, ty);
      }
    }
    reg.order.forEach(function (id) {
      var q = at(p, reg.nodes[id]), r = g.nodeR;
      ctx.fillStyle = c.bg; ctx.beginPath(); ctx.arc(q.x, q.y, r + 1.5 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tone; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
      if (!g.cmp) {
        ctx.fillStyle = c.bg; ctx.font = f.font(10.5 * u, 700); ctx.textAlign = "center";
        ctx.fillText(id, q.x, q.y + 3.8 * u);
      }
    });
  }

  /* Stylized backdrops, drawn from memory of the poster maps (illustrative). */
  function mapArt(f, g, kind, p) {
    var ctx = f.ctx, c = f.c, u = g.u;
    function P(x, y) { return at(p, [x, y]); }
    function poly(pts, w, col, dash) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
      ctx.beginPath();
      pts.forEach(function (xy, i) { var q = P(xy[0], xy[1]); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    function blob(x, y, rx, ry) {
      var q = P(x, y);
      ctx.fillStyle = f.alpha(c.third, 0.22);
      ctx.beginPath(); ctx.ellipse(q.x, q.y, rx * p.w, ry * p.h, -0.3, 0, Math.PI * 2); ctx.fill();
    }
    var road = f.alpha(c.ink3, 0.45), minor = f.alpha(c.ink3, 0.18);
    if (kind === "rural") {
      blob(0.2, 0.38, 0.05, 0.09);
      poly([[0.95, 0.25], [0.6, 0.45], [0.5, 0.5]], 1 * u, minor);
      poly([[0.82, -0.1], [0.64, 0.1], [0.56, 0.32], [0.5, 0.5], [0.42, 0.67], [0.3, 0.9], [0.22, 1.1]], 2 * u, road);
    } else if (kind === "inter") {
      blob(0.35, 1.0, 0.24, 0.1);
      ctx.strokeStyle = f.alpha(c.ink3, 0.3); ctx.lineWidth = 1.2 * u;
      [[0.72, 0.22], [0.86, 0.36], [0.7, 0.5], [0.9, 0.62], [0.82, 0.12]].forEach(function (m) {
        var q = P(m[0], m[1]), s = 6 * u;
        ctx.beginPath(); ctx.moveTo(q.x - s, q.y + s * 0.6); ctx.lineTo(q.x, q.y - s * 0.6); ctx.lineTo(q.x + s, q.y + s * 0.6); ctx.stroke();
      });
      poly([[0.1, 0.25], [0.6, 0.3]], 1 * u, minor);
      poly([[0.36, -0.1], [0.36, 0.08], [0.38, 0.4], [0.48, 0.68], [0.6, 0.8], [0.73, 0.83], [0.9, 1.0]], 2 * u, road);
    } else {
      [-0.02, 0.22, 0.46, 0.62, 0.88, 1.04].forEach(function (y) { poly([[-0.2, y], [1.2, y]], 1 * u, minor); });
      [0.18, 0.44, 0.54, 0.7, 0.88].forEach(function (x) { poly([[x, -0.2], [x, 1.2]], 1 * u, minor); });
      poly([[0.3, -0.2], [0.3, 1.2]], 2.5 * u, road);
    }
  }

  function chart(f, g, R, from, to, score, tone, lt) {
    var ctx = f.ctx, c = f.c, u = g.u, cfg = f.cfg, P = cfg.phase, ch = g.chart;
    var n = R.order.length, slot = ch.w / 6, bw = Math.min(slot * (g.cmp ? 0.7 : 0.56), (g.cmp ? 40 : 26) * u);
    var base = ch.y + ch.h, top = ch.y;
    var row = R.table[from];
    var grow = U.ease(lt, P.score, P.scoreDur), rest = U.ease(lt, P.verdict, 0.8);
    var x0 = ch.x + (ch.w - slot * n) / 2;
    // baseline + threshold
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ch.x, base); ctx.lineTo(ch.x + ch.w, base); ctx.stroke();
    var ty = base - (base - top) * cfg.threshold / 100;
    R.order.forEach(function (id, i) {
      var cx = x0 + slot * (i + 0.5), v = row[i], active = id === to;
      var hgt = (base - top) * v / 100;
      // empty slot
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      U.rr(ctx, cx - bw / 2, top, bw, base - top, 3 * u); ctx.stroke();
      var hh = active ? hgt * grow : hgt;
      if (hh > 0 && (active ? grow > 0 : rest > 0)) {
        U.rr(ctx, cx - bw / 2, base - hh, bw, hh, Math.min(3 * u, hh / 2));
        ctx.fillStyle = active ? tone : f.alpha(tone, 0.3 * rest); ctx.fill();
      }
      if (!g.cmp) {
        ctx.textAlign = "center";
        ctx.font = f.font(11 * u, active || id === from ? 700 : 500);
        ctx.fillStyle = active ? c.ink : id === from ? c.ink2 : c.ink3;
        ctx.fillText(id, cx, base + 14 * u);
        var show = active ? grow > 0 : rest > 0.05;
        if (show) {
          ctx.font = f.mono(10.5 * u, active ? 650 : 450);
          ctx.fillStyle = active ? c.ink : f.alpha(c.ink3, rest);
          var vy = base - hh - 5 * u;
          if (!active && Math.abs(vy - ty) < 9 * u) vy = ty - 5 * u;
          ctx.fillText(fmtv(active ? v * grow : v, v), cx, Math.max(vy, top - 1 * u));
        }
      }
    });
    ctx.strokeStyle = c.ink; ctx.lineWidth = (g.cmp ? 2.5 : 1.5) * u; ctx.setLineDash([4 * u, 3 * u]);
    ctx.beginPath(); ctx.moveTo(ch.x, ty); ctx.lineTo(ch.x + ch.w, ty); ctx.stroke(); ctx.setLineDash([]);
    if (!g.cmp) {
      ctx.font = f.font(10.5 * u, 600); ctx.fillStyle = c.ink2; ctx.textAlign = "right";
      ctx.fillText(cfg.threshold + "%", ch.x - 4 * u, ty + 4 * u);
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "Score vs " + from + "'s trusted week" : "Score vs " + from + "'s trusted week, by source node", ch.x, top - 26 * u);
    }
    if (g.cmp && lt >= P.verdict) {
      // verdict chip, shape only
      var pass = score >= cfg.threshold;
      U.rr(ctx, ch.x + ch.w - 22 * u, top - 4 * u, 22 * u, 22 * u, 11 * u);
      ctx.fillStyle = pass ? c.good : c.bad; ctx.fill();
    }
  }

  /* Format like the poster tables: 0, 23.9, 98.0, 96.39 */
  function fmtv(x, v) {
    if (v === 0) return "0";
    var d = Math.round(v * 100) % 10 ? 2 : 1;
    return x.toFixed(d);
  }

  function caption(f, g, R, from, to, score, lt) {
    var ctx = f.ctx, c = f.c, u = g.u, cfg = f.cfg, P = cfg.phase, tx = g.text;
    var stay = from === to;
    ctx.textAlign = "left";
    if (g.narrow) {
      ctx.font = f.font(12 * u, 650); ctx.fillStyle = c.ink;
      ctx.fillText(stay ? "Stays at " + from : "Moves " + from + " → " + to, tx.x, tx.y);
    } else {
      ctx.font = f.font(13 * u, 650); ctx.fillStyle = c.ink;
      ctx.fillText(stay ? "Sensor stays at " + from : "Sensor moves from " + from + " to " + to, tx.x, tx.y);
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink3;
      ctx.fillText(stay ? "Same node, after a gap" : R.name + " nodes, " + R.spacing, tx.x, tx.y + 20 * u);
    }
    if (lt >= P.gap && lt < P.verdict) {
      ctx.font = f.font(12 * u, 560); ctx.fillStyle = c.ink2;
      ctx.globalAlpha = U.ease(lt, P.gap, 0.3);
      ctx.fillText(lt < P.score ? (g.narrow ? "Data gap…" : "Data gap: the sensor goes quiet…") : (g.narrow ? "Scoring…" : "Scoring the new traces…"),
        tx.x, g.narrow ? tx.y + 18 * u : tx.y + 46 * u);
      ctx.globalAlpha = 1;
    }
    if (lt < P.verdict) return;
    var pass = score >= cfg.threshold;
    var sc = fmtv(score, score) + "%";
    var msg;
    if (pass) msg = g.narrow ? sc + ": still trusted" : sc + " ≥ " + cfg.threshold + "%: still trusted";
    else if (score >= 50) msg = g.narrow ? sc + ": caught, closest call" : sc + " < " + cfg.threshold + "%: caught, the closest call";
    else msg = g.narrow ? sc + ": move caught" : sc + " < " + cfg.threshold + "%: move caught";
    ctx.font = f.font(13 * u, 650); ctx.fillStyle = pass ? c.good : c.bad;
    ctx.globalAlpha = U.ease(lt, P.verdict, 0.4);
    ctx.fillText(msg, tx.x, g.narrow ? tx.y + 18 * u : tx.y + 46 * u);
    if (!g.narrow && !pass) {
      ctx.font = f.font(11 * u); ctx.fillStyle = c.ink3;
      ctx.fillText("Data quarantined until re-registered", tx.x, tx.y + 66 * u);
    }
    ctx.globalAlpha = 1;
  }
})();
