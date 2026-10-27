/* Music DPO: one preference pair at a time.
 * Each training example is a pair of songs from the same genre neighborhood:
 * the "chosen" one scores higher on the target metric (here danceability), the
 * "rejected" one lower. The pair runs through MusicGen's decoder, whose first 12
 * of 24 layers are frozen. Training raises how likely the fine-tuned model finds
 * the chosen song relative to the frozen reference, and lowers it for the rejected
 * one; the gap between the two is the margin. Swapping the pair trains the
 * "negative" model. Layer counts are from the report; the pair, metric values and
 * the growth of the margin are illustrative (the real margins barely moved). */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("music-dpo", {
    config: {
      layers: 24,         // decoder layers in MusicGen small (report)
      frozen: 12,         // front layers frozen during fine-tuning (report)
      stepDur: 1.3,       // s per training step on screen
      steps: 8,           // steps shown before the loop restarts
      upMax: 0.85,        // final height of the chosen bar, of half the panel (illustrative)
      downMax: 0.6,       // final depth of the rejected bar (illustrative)
      hold: 2.5,          // s to hold the trained state before replaying
      stillAt: 11         // s: frame shown when motion is reduced (trained, margin wide)
    },

    setup: function (f) {
      var s = f.state;
      if (s.negative == null) s.negative = false;
      if (!s.btn) {
        s.btn = f.button("Swap the pair (train the negative model)", function (b) {
          s.negative = !s.negative;
          b.textContent = s.negative ? "Unswap the pair (train the normal model)" : "Swap the pair (train the negative model)";
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f);
      var narrow = W < 480;
      var lh = Math.max(14 * u, 13);
      var period = cfg.stepDur * cfg.steps + cfg.hold;
      var lt = t % period;
      var stepF = Math.min(cfg.steps, lt / cfg.stepDur);
      var step = Math.floor(stepF), sub = stepF - step;
      var done = lt >= cfg.stepDur * cfg.steps;

      // Songs: which one the trainer treats as chosen
      var songs = [
        { title: narrow ? "Song A" : "Song A, pop", metric: "danceable", val: 0.78 },
        { title: narrow ? "Song B" : "Song B, pop", metric: "danceable", val: 0.52 }
      ];
      var chosen = s.negative ? 1 : 0;

      /* ---- Left: the pair ---- */
      var cx0 = W * 0.04, cw = W * (narrow ? 0.28 : 0.26), ch = Math.max(H * 0.2, 44);
      var cardY = [H * 0.2, H * 0.2 + ch + H * 0.08];
      ctx.textAlign = "left"; ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u);
      ctx.fillText(narrow ? "Training pair" : "One training pair", cx0, H * 0.2 - lh * 0.6);
      songs.forEach(function (sg, i) {
        var isChosen = i === chosen;
        var col = isChosen ? c.accent : c.signal;
        var y = cardY[i];
        var pulse = !done && sub < 0.25 ? 1 - sub / 0.25 : 0;
        ctx.fillStyle = f.alpha(col, 0.08 + 0.12 * pulse);
        U.rr(ctx, cx0, y, cw, ch, 6 * u); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5 * u; ctx.stroke();
        ctx.fillStyle = col; ctx.font = f.font(11.5 * u, 650);
        ctx.fillText(isChosen ? "Chosen" : "Rejected", cx0 + 8 * u, y + lh);
        ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u);
        ctx.fillText(sg.title, cx0 + 8 * u, y + lh * 2.1);
        ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink3;
        if (ch > lh * 2.9) ctx.fillText((narrow ? "dance " : "danceability ") + sg.val.toFixed(2), cx0 + 8 * u, y + lh * 3.1);
      });

      /* ---- Middle: the decoder stack ---- */
      var dx = W * (narrow ? 0.36 : 0.39), dw = W * (narrow ? 0.14 : 0.17);
      var dTop = H * 0.16, dBot = H * 0.84;
      var lhgt = (dBot - dTop) / cfg.layers;
      var flash = !done && sub > 0.55 && sub < 0.95 ? Math.sin((sub - 0.55) / 0.4 * Math.PI) : 0;
      for (var L = 0; L < cfg.layers; L++) {
        var y = dBot - (L + 1) * lhgt;          // layer 0 (front) at the bottom
        var frozen = L < cfg.frozen;
        ctx.fillStyle = frozen ? f.alpha(c.ink3, 0.28) : f.alpha(c.accent, 0.25 + 0.6 * flash);
        ctx.fillRect(dx, y + lhgt * 0.18, dw, lhgt * 0.64);
      }
      ctx.fillStyle = c.ink; ctx.font = f.font(11.5 * u, 600); ctx.textAlign = "center";
      ctx.fillText(narrow ? "Decoder" : "MusicGen decoder", dx + dw / 2, dTop - lh * 0.5);
      ctx.font = f.font(10.5 * u); ctx.textAlign = "left";
      var midT = dBot - (cfg.layers - (cfg.layers - cfg.frozen) / 2) * lhgt;
      var midF = dBot - (cfg.frozen / 2) * lhgt;
      ctx.fillStyle = c.accent; ctx.fillText(narrow ? "12 tuned" : "12 fine-tuned", dx + dw + 6 * u, midT + 4);
      ctx.fillStyle = c.ink3; ctx.fillText("12 frozen", dx + dw + 6 * u, midF + 4);

      // Pair flowing in: dots from the cards to the bottom of the stack, then up
      if (!done) {
        var q = U.clamp(sub / 0.55, 0, 1);
        songs.forEach(function (sg, i) {
          var col = i === chosen ? c.accent : c.signal;
          var path = [{ x: cx0 + cw, y: cardY[i] + ch / 2 }, { x: dx + dw * (i ? 0.7 : 0.3), y: dBot + 6 }, { x: dx + dw * (i ? 0.7 : 0.3), y: dTop }];
          if (q < 1) {
            var p = U.along(path, q);
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 4 * u + 1, 0, Math.PI * 2); ctx.fill();
          }
        });
      }

      /* ---- Right: likelihood vs the frozen reference ---- */
      var rx0 = W * (narrow ? 0.72 : 0.7), rx1 = W * 0.96;
      var zeroY = (dTop + dBot) / 2 + lh * 0.2, half = (dBot - dTop) / 2 - lh * 0.6;
      var k = 1 - Math.exp(-Math.min(stepF, cfg.steps) / 3);
      var kMax = 1 - Math.exp(-cfg.steps / 3);
      var up = cfg.upMax * k / kMax, down = cfg.downMax * k / kMax;
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText(narrow ? "vs. reference" : "Likelihood vs. reference", rx0, dTop - lh * 0.5);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx0, zeroY); ctx.lineTo(rx1, zeroY); ctx.stroke();
      var bw = (rx1 - rx0) * 0.32;
      var bx = [rx0 + (rx1 - rx0) * 0.08, rx0 + (rx1 - rx0) * 0.58];
      ctx.fillStyle = c.accent; ctx.fillRect(bx[0], zeroY - up * half, bw, up * half);
      ctx.fillStyle = c.signal; ctx.fillRect(bx[1], zeroY, bw, down * half);
      ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "center";
      ctx.fillStyle = c.accent; ctx.fillText("chosen", bx[0] + bw / 2, zeroY + lh);
      ctx.fillStyle = c.signal; ctx.fillText(narrow ? "rej." : "rejected", bx[1] + bw / 2, zeroY - lh * 0.5);

      // Margin readout
      ctx.textAlign = "left"; ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u);
      ctx.fillText("margin", rx0, dBot + lh * 1.2);
      ctx.font = f.mono(11.5 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "right";
      ctx.fillText("+" + (up + down).toFixed(2), rx1, dBot + lh * 1.2);

      // Footer: step and what the model is learning
      ctx.textAlign = "left"; ctx.font = f.font(11 * u); ctx.fillStyle = c.ink2;
      var what = s.negative ? (narrow ? "learning: less danceable" : "Negative model: learning less danceable")
                            : (narrow ? "learning: more danceable" : "Normal model: learning more danceable");
      ctx.fillText(what, cx0, dBot + lh * 1.2);
      ctx.fillStyle = c.ink3; ctx.font = f.mono(10.5 * u);
      ctx.fillText("step " + Math.min(cfg.steps, step + (done ? 0 : 1)) + "/" + cfg.steps, cx0, cardY[1] + ch + lh * 1.2 > dBot ? dBot + lh * 2.3 : cardY[1] + ch + lh * 1.2);
    }
  });
})();
