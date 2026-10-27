/* Chess Sight: from a camera frame to 64 occupied-or-empty squares.
 * Each turn the camera frame is matched to a reference photo of the board (SIFT
 * features, FLANN matching, Lowe's ratio test), a homography is fitted with RANSAC,
 * and the frame is warped into the reference view, where the 64 squares sit at
 * known places. HSV thresholds keep only blue and red pixels, and a square counts
 * as occupied when its mask pixels sum past a fixed threshold, so small specks of
 * color don't register. The pipeline order follows chess_homography.py in the
 * repo; camera poses, feature points, and specks are illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  var STEPS = [
    "Match features to the reference",
    "Fit a homography (RANSAC)",
    "Warp to the reference view",
    "Keep only blue and red pixels",
    "Threshold pixels per square"
  ];
  var STEPS_SHORT = ["Match features", "Fit homography", "Warp to top-down", "Color mask", "Count per square"];

  /* Camera poses: board corners (a8, h8, h1, a1) as fractions of the stage. */
  var POSES = [
    [[0.16, 0.14], [0.82, 0.06], [0.97, 0.9], [0.03, 0.8]],
    [[0.24, 0.1], [0.76, 0.1], [0.98, 0.94], [0.02, 0.94]],
    [[0.1, 0.32], [0.66, 0.03], [0.96, 0.6], [0.36, 0.97]]
  ];

  /* Pieces in the starting position plus two stray specks of color.
   * f: file 0..7 (a..h), r: row 0..7 from the top (rank 8 .. rank 1). */
  var BOARD = [], OCC = {};
  (function () {
    for (var fi = 0; fi < 8; fi++) {
      [0, 1].forEach(function (r) { BOARD.push({ f: fi, r: r, side: "b" }); OCC[fi + "," + r] = "b"; });
      [6, 7].forEach(function (r) { BOARD.push({ f: fi, r: r, side: "p" }); OCC[fi + "," + r] = "p"; });
    }
    BOARD.push({ f: 3, r: 4, side: "p", speck: true });   // d4: a glint of blue
    BOARD.push({ f: 5, r: 3, side: "b", speck: true });   // f5: a smudge of red
  })();

  /* Feature points in board coordinates (seeded). Outliers point at the wrong place. */
  var FEATS = (function () {
    var rnd = U.seeded(631), out = [];
    for (var i = 0; i < 24; i++) out.push({ u: 0.06 + rnd() * 0.88, v: 0.06 + rnd() * 0.88 });
    out[12].out = true; out[12].ou = 0.85; out[12].ov = 0.15;
    out[13].out = true; out[13].ou = 0.1; out[13].ov = 0.55;
    /* Move the two outliers to the front of the rejected slots so config counts work. */
    var inl = out.filter(function (p) { return !p.out; }), ol = out.filter(function (p) { return p.out; });
    return inl.slice(0, 12).concat(ol).concat(inl.slice(12));
  })();

  Fig.register("chess-sight-warp", {
    config: {
      phase: {            // seconds for each act
        frame: 1.6,       // the raw, tilted camera frame
        match: 1.8,       // feature matches to the reference; outliers dropped
        warp: 2.0,        // the frame is warped into the reference view
        mask: 1.2,        // only blue and red pixels survive
        count: 2.6,       // each square is summed and thresholded, in raster order
        hold: 3.0         // result stays up before the round repeats
      },
      inliers: 12,        // feature matches drawn that survive RANSAC (illustrative)
      outliers: 2,        // bad matches drawn and then rejected (illustrative)
      stillAt: 10.2       // s: frame shown when motion is reduced (all squares counted)
    },

    setup: function (f) {
      var s = f.state;
      if (s.pose == null) s.pose = 0;
      if (!s.btn) {
        s.btn = f.button("Move the camera", function () {
          s.pose = (s.pose + 1) % POSES.length;
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, P = cfg.phase, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f);
      var total = P.frame + P.match + P.warp + P.mask + P.count + P.hold;
      var lt = t % total;
      var tMatch = P.frame, tWarp = tMatch + P.match, tMask = tWarp + P.warp;
      var tCount = tMask + P.mask, tHold = tCount + P.count;
      var g = layout(f);

      /* Current board quad: camera pose easing into the reference square. */
      var pose = POSES[s.pose], wk = U.ease(lt, tWarp, P.warp * 0.85);
      if (lt < tWarp) wk = 0;
      var quad = [0, 1, 2, 3].map(function (i) {
        var cam = { x: g.st.x + pose[i][0] * g.st.w, y: g.st.y + pose[i][1] * g.st.h };
        var tgt = g.target[i];
        return { x: U.lerp(cam.x, tgt.x, wk), y: U.lerp(cam.y, tgt.y, wk) };
      });
      var M = homography(quad);

      /* ---- Board cells ---- */
      var maskK = lt >= tMask ? U.ease(lt, tMask, P.mask * 0.7) : 0;
      for (var r = 0; r < 8; r++) {
        for (var q = 0; q < 8; q++) {
          var poly = [M(q / 8, r / 8), M((q + 1) / 8, r / 8), M((q + 1) / 8, (r + 1) / 8), M(q / 8, (r + 1) / 8)];
          path(ctx, poly);
          ctx.fillStyle = (r + q) % 2 === 0 ? c.bg : f.alpha(c.ink3, 0.28 * (1 - maskK));
          ctx.fill();
        }
      }
      path(ctx, quad);
      ctx.strokeStyle = maskK > 0 ? c.line : c.ink3; ctx.lineWidth = 1.2; ctx.stroke();

      /* ---- Pieces and stray specks (blobs of color) ---- */
      BOARD.forEach(function (pc) {
        var ctr = M((pc.f + 0.5) / 8, (pc.r + 0.5) / 8);
        var size = cellSize(M, pc.f, pc.r);
        ctx.fillStyle = pc.side === "p" ? c.accent : c.signal;
        ctx.beginPath(); ctx.arc(ctr.x, ctr.y, size * (pc.speck ? 0.09 : 0.3), 0, Math.PI * 2); ctx.fill();
      });

      /* ---- Feature matches to the reference photo ---- */
      drawThumb(f, g, lt >= tMatch);
      if (lt >= tMatch && lt < tMask) {
        var fade = lt < tWarp - 0.3 ? 1 : 1 - U.clamp((lt - (tWarp - 0.3)) / 0.8, 0, 1);
        var dropK = U.clamp((lt - (tMatch + P.match * 0.55)) / 0.4, 0, 1);
        var grow = U.clamp((lt - tMatch) / 0.6, 0, 1);
        FEATS.forEach(function (ft, i) {
          if (i >= cfg.inliers + cfg.outliers) return;
          var a = M(ft.u, ft.v);
          var b = thumbPt(g, ft.ou != null ? ft.ou : ft.u, ft.ov != null ? ft.ov : ft.v);
          var alpha = fade * (ft.out ? 1 - dropK : 1);
          if (alpha <= 0) return;
          ctx.strokeStyle = ft.out ? f.alpha(c.ink3, alpha * 0.9) : f.alpha(c.accent, alpha * (g.narrow ? 0.3 : 0.45));
          ctx.lineWidth = 1;
          if (ft.out) ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(U.lerp(a.x, b.x, grow), U.lerp(a.y, b.y, grow)); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = ft.out ? f.alpha(c.ink3, alpha) : f.alpha(c.accent, alpha);
          ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(2.2 * u, 1.8), 0, Math.PI * 2); ctx.fill();
        });
      }

      /* ---- Per-square counting ---- */
      var counts = { p: 0, b: 0 };
      if (lt >= tCount) {
        var ck = U.clamp((lt - tCount) / (P.count * 0.9), 0, 1);
        var upto = Math.floor(ck * 64);
        for (var idx = 0; idx < 64 && idx <= upto; idx++) {
          var fr = idx % 8, rr = Math.floor(idx / 8);
          var occ = OCC[fr + "," + rr];
          var cell = [M(fr / 8, rr / 8), M((fr + 1) / 8, rr / 8), M((fr + 1) / 8, (rr + 1) / 8), M(fr / 8, (rr + 1) / 8)];
          if (idx === upto && ck < 1) {
            path(ctx, cell); ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.stroke();
            continue;
          }
          if (occ) {
            counts[occ]++;
            path(ctx, cell); ctx.strokeStyle = occ === "p" ? c.accent : c.signal; ctx.lineWidth = 1.6; ctx.stroke();
          }
        }
      }

      /* ---- Step list ---- */
      var active = lt < tMatch ? -1 : lt < tMatch + P.match * 0.55 ? 0 : lt < tWarp ? 1 : lt < tMask ? 2 : lt < tCount ? 3 : lt < tHold ? 4 : 5;
      var labels = g.narrow ? STEPS_SHORT : STEPS;
      ctx.textAlign = "left";
      for (var i = 0; i < labels.length; i++) {
        var y = g.list.y + i * g.lh;
        var state = i < active ? "done" : i === active ? "now" : "todo";
        ctx.fillStyle = state === "now" ? c.accent : state === "done" ? c.ink2 : c.ink3;
        ctx.font = f.mono(11 * u, 560);
        ctx.fillText(String(i + 1), g.list.x, y);
        ctx.fillStyle = state === "now" ? c.ink : state === "done" ? c.ink2 : c.ink3;
        ctx.font = f.font(12 * u, state === "now" ? 620 : 480);
        ctx.fillText(labels[i], g.list.x + Math.max(16 * u, 14), y);
      }
      if (lt >= tCount) {
        var cy = g.list.y + labels.length * g.lh + g.lh * 0.25;
        var cx = g.list.x + Math.max(16 * u, 14);
        ctx.font = f.mono(12.5 * u, 600);
        [["p", c.accent], ["b", c.signal]].forEach(function (k, j) {
          var x = cx + j * Math.max(64 * u, 56);
          ctx.fillStyle = k[1]; ctx.beginPath(); ctx.arc(x + 5, cy - 4, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = c.ink; ctx.fillText(String(counts[k[0]]), x + 14, cy);
        });
        if (lt >= tHold && !g.narrow) {
          ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u);
          ctx.fillText("Specks stay under the threshold", cx, cy + g.lh);
        }
      }

      /* ---- Stage caption ---- */
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText(lt < tWarp ? "Camera frame" : lt < tMask ? "Warping…" : "Reference view", g.st.x, g.st.y - Math.max(6 * u, 6));
    }
  });

  function layout(f) {
    var W = f.w, H = f.h, u = U.unit(f);
    var lh = Math.max(20 * u, 16);
    if (W < 480) {
      /* Narrow: board stage on top, steps below with the reference thumbnail beside them. */
      var stN = { x: W * 0.08, y: H * 0.07, w: W * 0.84, h: H * 0.52 };
      var sideN = Math.min(stN.h * 0.96, stN.w * 0.8);
      var tsN = Math.min(W * 0.24, H * 0.24);
      return {
        narrow: true, lh: lh, st: stN, target: square(stN, sideN),
        thumb: { x: W - tsN - W * 0.05, y: H * 0.66, s: tsN },
        list: { x: W * 0.05, y: H * 0.64 + 4 }
      };
    }
    var st = { x: W * 0.05, y: H * 0.08, w: W * 0.52, h: H * 0.86 };
    var side = Math.min(st.h * 0.94, st.w * 0.9);
    var ts = Math.min(H * 0.26, W * 0.16);
    return {
      narrow: false, lh: lh, st: st, target: square(st, side),
      thumb: { x: W * 0.64, y: H * 0.1, s: ts },
      list: { x: W * 0.64, y: H * 0.1 + ts + Math.max(34 * u, 28) }
    };
  }

  function square(st, side) {
    var x0 = st.x + (st.w - side) / 2, y0 = st.y + (st.h - side) / 2;
    return [{ x: x0, y: y0 }, { x: x0 + side, y: y0 }, { x: x0 + side, y: y0 + side }, { x: x0, y: y0 + side }];
  }

  function thumbPt(g, uu, vv) { return { x: g.thumb.x + uu * g.thumb.s, y: g.thumb.y + vv * g.thumb.s }; }

  function drawThumb(f, g, withDots) {
    var ctx = f.ctx, c = f.c, T = g.thumb, cs = T.s / 8, u = U.unit(f);
    for (var r = 0; r < 8; r++) for (var q = 0; q < 8; q++) {
      ctx.fillStyle = (r + q) % 2 === 0 ? c.bg : f.alpha(c.ink3, 0.28);
      ctx.fillRect(T.x + q * cs, T.y + r * cs, cs, cs);
    }
    ctx.strokeStyle = c.ink3; ctx.lineWidth = 1; ctx.strokeRect(T.x, T.y, T.s, T.s);
    ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u); ctx.textAlign = "left";
    if (!g.narrow) ctx.fillText("Reference photo", T.x, T.y - Math.max(6 * u, 6));
    else { ctx.textAlign = "center"; ctx.fillText("Reference", T.x + T.s / 2, T.y + T.s + Math.max(13 * u, 12)); }
    if (!withDots) return;
    ctx.fillStyle = f.alpha(c.accent, 0.8);
    FEATS.slice(0, f.cfg.inliers).forEach(function (p) {
      var pt = thumbPt(g, p.u, p.v);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* Projective map from the unit square to a quad (corners in order (0,0),(1,0),(1,1),(0,1)). */
  function homography(Q) {
    var x0 = Q[0].x, y0 = Q[0].y, x1 = Q[1].x, y1 = Q[1].y, x2 = Q[2].x, y2 = Q[2].y, x3 = Q[3].x, y3 = Q[3].y;
    var sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    var a, b, cc, d, e, ff, gg, hh;
    if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
      a = x1 - x0; b = x3 - x0; cc = x0; d = y1 - y0; e = y3 - y0; ff = y0; gg = 0; hh = 0;
    } else {
      var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
      var den = dx1 * dy2 - dx2 * dy1;
      gg = (sx * dy2 - dx2 * sy) / den;
      hh = (dx1 * sy - sx * dy1) / den;
      a = x1 - x0 + gg * x1; b = x3 - x0 + hh * x3; cc = x0;
      d = y1 - y0 + gg * y1; e = y3 - y0 + hh * y3; ff = y0;
    }
    return function (uu, vv) {
      var w = gg * uu + hh * vv + 1;
      return { x: (a * uu + b * vv + cc) / w, y: (d * uu + e * vv + ff) / w };
    };
  }

  function cellSize(M, fi, r) {
    var p0 = M(fi / 8, r / 8), p1 = M((fi + 1) / 8, r / 8), p3 = M(fi / 8, (r + 1) / 8);
    return (Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p3.x - p0.x, p3.y - p0.y)) / 2;
  }

  function path(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }
})();
