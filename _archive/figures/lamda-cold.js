/* LaMDA: Change of Location Detection (CoLD).
 * A sensor uploads on a schedule, goes quiet (a gap), then resumes. CoLD compares
 * the traceroute paths after the gap with a week of trusted paths from before it
 * and quarantines the data if the similarity score falls under the threshold.
 * Hop layout and timing are illustrative; the 90% threshold and the example
 * scores (99.7 stayed, 11.3 moved between cities) come from the paper. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("lamda-cold", {
    config: {
      threshold: 90,      // % similarity needed to keep trusting the sensor (paper)
      stayScore: 99.7,    // % score when the sensor did not move (paper, Table Ib)
      moveScore: 11.3,    // % score after an inter-city move on the same ISP (paper, Table Ib)
      hops: 7,            // hops drawn between server and home router
      changedHops: 3,     // trailing hops that differ after a move
      uploads: 16,        // upload ticks drawn before the gap
      phase: {            // seconds for each act of the story
        before: 4.2,
        gap: 2.2,
        after: 2.4,
        score: 1.8,
        hold: 3.2
      },
      stillAt: 12         // s: frame shown when motion is reduced
    },

    setup: function (f) {
      var s = f.state;
      if (s.moved == null) s.moved = true;
      if (!s.btn) {
        s.btn = f.button("Show the sensor staying put", function (b) {
          s.moved = !s.moved;
          b.textContent = s.moved ? "Show the sensor staying put" : "Show the sensor moving";
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, c = f.c, ctx = f.ctx, W = f.w, H = f.h, s = f.state;
      var u = U.unit(f);
      var P = cfg.phase;
      var total = P.before + P.gap + P.after + P.score + P.hold;
      var lt = t % total;
      var tGap = P.before, tAfter = tGap + P.gap, tScore = tAfter + P.after, tHold = tScore + P.score;

      /* ---- Timeline of uploads ---- */
      var x0 = W * 0.06, x1 = W * 0.94, ty = H * 0.17;
      var gapA = U.lerp(x0, x1, 0.56), gapB = U.lerp(x0, x1, 0.72);
      var head = lt < tGap ? U.lerp(x0, gapA, lt / P.before)
        : lt < tAfter ? U.lerp(gapA, gapB, (lt - tGap) / P.gap)
        : U.lerp(gapB, x1, Math.min(1, (lt - tAfter) / P.after));

      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x1, ty); ctx.stroke();

      ctx.font = f.font(11 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink3;
      ctx.fillText("Sensor uploads", x0, ty - 16 * u);

      var step = (gapA - x0) / cfg.uploads;
      for (var i = 0; i <= cfg.uploads; i++) {
        var x = x0 + i * step;
        if (x > head) break;
        ctx.fillStyle = c.accent; ctx.fillRect(x - 1 * u, ty - 7 * u, 2.5 * u, 14 * u);
      }
      for (var j = 0; j < 9; j++) {
        var xa = gapB + j * step;
        if (xa > head || xa > x1) break;
        ctx.fillStyle = c.signal; ctx.fillRect(xa - 1 * u, ty - 7 * u, 2.5 * u, 14 * u);
      }
      if (lt >= tGap) {
        ctx.fillStyle = f.alpha(c.ink3, 0.12);
        ctx.fillRect(gapA + 4 * u, ty - 12 * u, Math.min(head, gapB) - gapA - 4 * u, 24 * u);
        ctx.fillStyle = c.ink2; ctx.textAlign = "center"; ctx.font = f.font(11 * u, 560);
        ctx.fillText(lt < tAfter ? "No data…" : "Gap detected", (gapA + gapB) / 2, ty + 28 * u);
      }
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText("Trusted: one week before", x0, ty + 28 * u);
      if (lt >= tAfter) { ctx.textAlign = "right"; ctx.fillText("New paths", x1, ty + 28 * u); }
      // playhead
      ctx.strokeStyle = c.ink2; ctx.lineWidth = 1.5 * u;
      ctx.beginPath(); ctx.moveTo(head, ty - 12 * u); ctx.lineTo(head, ty + 12 * u); ctx.stroke();

      /* ---- Traceroute paths ---- */
      var px0 = W * 0.1, px1 = W * 0.9;
      var rowA = H * 0.43, rowB = H * 0.6;
      drawPath(f, rowA, px0, px1, c.accent, 0, "Before the gap", 1, u);
      if (lt >= tAfter) {
        var reveal = U.ease(lt, tAfter, P.after * 0.8);
        drawPath(f, rowB, px0, px1, s.moved ? c.signal : c.accent, s.moved ? cfg.changedHops : 0, "After the gap", reveal, u);
      }

      /* ---- Similarity score ---- */
      var bx = W * 0.1, bw = W * 0.8, by = H * 0.8, bh = 12 * u;
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText("Similarity to trusted paths", bx, by - 10 * u);
      U.rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = c.line; ctx.fill();
      var target = s.moved ? cfg.moveScore : cfg.stayScore;
      var k = lt >= tScore ? U.ease(lt, tScore, P.score) : 0;
      var score = target * k;
      var pass = target >= cfg.threshold;
      if (k > 0) {
        U.rr(ctx, bx, by, Math.max(bh, bw * score / 100), bh, bh / 2);
        ctx.fillStyle = lt >= tHold ? (pass ? c.good : c.bad) : c.ink2; ctx.fill();
      }
      var thx = bx + bw * cfg.threshold / 100;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5 * u; ctx.setLineDash([3 * u, 3 * u]);
      ctx.beginPath(); ctx.moveTo(thx, by - 6 * u); ctx.lineTo(thx, by + bh + 6 * u); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.ink2; ctx.textAlign = "center"; ctx.font = f.font(10.5 * u);
      ctx.fillText(cfg.threshold + "% threshold", thx, by + bh + 18 * u);

      ctx.textAlign = "right"; ctx.font = f.mono(12 * u, 600); ctx.fillStyle = c.ink;
      if (k > 0) ctx.fillText(score.toFixed(1) + "%", bx + bw, by - 10 * u);

      if (lt >= tHold) {
        ctx.textAlign = "left"; ctx.font = f.font(14 * u, 620);
        ctx.fillStyle = pass ? c.good : c.bad;
        var narrow = W < 480;
        ctx.fillText(pass ? (narrow ? "Same place: keep its data" : "Same place: keep trusting its data")
          : (narrow ? "Moved: quarantine, re-register" : "Moved: quarantine data and ask to re-register"), bx, H * 0.96);
      }
    }
  });

  /* A row of hops from the server (left) to the home router (right). */
  function drawPath(f, y, x0, x1, color, changed, label, reveal, u) {
    var ctx = f.ctx, c = f.c, n = f.cfg.hops;
    var dx = (x1 - x0) / (n - 1);
    var upto = Math.floor(reveal * (n - 1) + 1e-6);
    ctx.font = f.font(11 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink3;
    ctx.fillText(label, x0 - 4 * u, y - 18 * u);
    for (var i = 0; i < n; i++) {
      var x = x0 + i * dx;
      var off = i >= n - changed;
      var yy = off ? y + 10 * u : y;
      if (i > 0 && i <= upto) {
        var px = x0 + (i - 1) * dx, py = (i - 1 >= n - changed) ? y + 10 * u : y;
        ctx.strokeStyle = off ? color : f.alpha(color, 0.55); ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, yy); ctx.stroke();
      }
      if (i > upto) continue;
      ctx.fillStyle = c.bg; ctx.strokeStyle = off ? color : c.ink2; ctx.lineWidth = 1.5 * u;
      ctx.beginPath(); ctx.arc(x, yy, (i === 0 || i === n - 1 ? 6 : 4.5) * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = c.ink3; ctx.font = f.font(10 * u);
    ctx.textAlign = "center"; ctx.fillText("server", x0, y + 24 * u);
    if (upto >= n - 1) ctx.fillText("home router", x1, y + (changed ? 34 : 24) * u);
  }
})();
