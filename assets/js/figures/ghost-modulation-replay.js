/* Spectra security: why a recorded or forged watermark fails.
 * Every Spectra header carries a 16-bit time-based one-time password (TOTP)
 * derived from a seed shared by the satellite (Alice) and the observatory
 * (Ollie); it changes every minute. Eve can record a real transmission and
 * replay it later, but by then the code has expired. Or she can forge a new
 * message, but without the seed she can only guess the code: one guess per
 * transmission, about 4 s each at the fastest MCS.
 * The 16-bit length, 1-minute slice, ~4 s per transmission, 32,768 average
 * guesses, and ~1.5 days come from the paper. Code values and pacing are
 * illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("ghost-modulation-replay", {
    config: {
      codeBits: 16,       // TOTP length in the header (paper)
      slice: 60,          // s, TOTP time slice (paper)
      txSeconds: 4,       // s, shortest Spectra transmission, highest MCS (paper)
      avgGuesses: 32768,  // average guesses to hit a 16-bit code (paper)
      seed: 9,            // stand-in for the shared seed (illustrative)
      // replay story, seconds on screen
      send: 2.2,          // Alice's real transmission travels
      verdict1: 1.4,      // Ollie checks it
      wait: 2.4,          // the clock runs forward
      replay: 2.2,        // Eve replays the recording
      hold: 3.2,          // final verdict stays up
      // forge story
      forgeLen: 11,       // s of on-screen guessing before it loops
      stillAt: 9.6        // s: frame shown when motion is reduced (replay rejected)
    },

    setup: function (f) {
      var s = f.state;
      if (!s.mode) s.mode = "replay";
      if (!s.btn) {
        s.btn = f.button("Eve forges a new message instead", function (b) {
          s.mode = s.mode === "replay" ? "forge" : "replay";
          b.textContent = s.mode === "replay" ? "Eve forges a new message instead" : "Eve replays a recorded message instead";
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f), narrow = W < 480;
      var g = {
        alice: { x: W * 0.13, y: H * 0.36 },
        ollie: { x: W * 0.86, y: H * 0.36 },
        eve: { x: W * 0.5, y: H * (narrow ? 0.66 : 0.68) },
        clock: { x: W * 0.5, y: H * 0.11 }
      };

      if (s.mode === "replay") drawReplay(f, t, g, u, narrow);
      else drawForge(f, t, g, u, narrow);

      node(f, g.alice, narrow ? "Satellite" : "Satellite (Alice)", c.accent, u);
      node(f, g.ollie, narrow ? "Observatory" : "Observatory (Ollie)", c.ink, u);
      node(f, g.eve, narrow ? "Eve" : "Attacker (Eve)", c.signal, u);
    }
  });

  function code(cfg, minute) {
    var r = U.seeded(cfg.seed * 1000 + minute);
    var v = Math.floor(r() * Math.pow(2, cfg.codeBits));
    return ("0000" + v.toString(16).toUpperCase()).slice(-4);
  }

  function drawReplay(f, t, g, u, narrow) {
    var c = f.c, ctx = f.ctx, cfg = f.cfg, W = f.w, H = f.h;
    var t1 = cfg.send, t2 = t1 + cfg.verdict1, t3 = t2 + cfg.wait, t4 = t3 + cfg.replay;
    var total = t4 + cfg.hold;
    var lt = t % total;

    // clock: minute 0 until the wait, then runs forward three minutes
    var minute = lt < t2 ? 0 : lt < t3 ? Math.floor(3 * (lt - t2) / cfg.wait) : 3;
    var secs = lt < t2 ? 12 + Math.floor(lt * 3) : lt < t3 ? Math.floor((180 * (lt - t2) / cfg.wait) % 60) : 20;
    clock(f, g, u, minute, secs);

    var sent = code(cfg, 0), now = code(cfg, minute);

    // links
    line(f, g.alice, g.ollie, c.lineStrong, u, false);
    line(f, g.alice, g.eve, c.line, u, true);

    // Alice's real transmission, recorded by Eve on the way
    if (lt < t2) {
      var k = U.clamp(lt / cfg.send, 0, 1);
      packet(f, U.along([g.alice, g.ollie], k), sent, c.accent, u);
      if (k > 0.05) packet(f, U.along([g.alice, g.eve], Math.min(1, k * 1.2)), sent, c.signal, u, true);
    }
    if (lt >= t1 * 0.85) recorded(f, g, u, sent);

    // Ollie checks against the code for the current minute
    expect(f, g, u, now, narrow);
    if (lt >= t1 && lt < t3) verdict(f, g, u, true, narrow ? "Accepted" : "Accepted: code is current");

    // replay
    if (lt >= t3) {
      line(f, g.eve, g.ollie, c.line, u, true);
      var k2 = U.clamp((lt - t3) / cfg.replay, 0, 1);
      if (k2 < 1) packet(f, U.along([g.eve, g.ollie], k2), sent, c.signal, u);
      else {
        verdict(f, g, u, false, narrow ? "Rejected" : "Rejected: code expired");
        foot(f, u, narrow ? "Replayed " + sent + " ≠ current " + now
          : "The replayed header carries " + sent + "; this minute's code is " + now + ".");
      }
    } else if (lt >= t2) {
      foot(f, u, narrow ? "The code changes every minute" : "The shared code changes every " + cfg.slice + " s.");
    } else {
      foot(f, u, narrow ? "Eve records the transmission" : "Eve records the real transmission as it goes by.");
    }
  }

  function drawForge(f, t, g, u, narrow) {
    var c = f.c, ctx = f.ctx, cfg = f.cfg, W = f.w, H = f.h;
    var lt = t % (cfg.forgeLen + 2);
    clock(f, g, u, Math.floor(lt / 5), Math.floor((lt * 12) % 60));
    var now = code(cfg, 0);
    line(f, g.eve, g.ollie, c.line, u, true);
    expect(f, g, u, now, narrow);

    // guesses arrive faster and faster on screen; the counter is the real-time cost
    var k = U.clamp(lt / cfg.forgeLen, 0, 1);
    var guesses = Math.max(1, Math.floor(Math.pow(k, 3) * cfg.avgGuesses));
    var period = 0.9 / (1 + 12 * k * k);
    var ph = (lt % period) / period;
    var r = U.seeded(Math.floor(lt / period) + 3);
    var guess = ("0000" + Math.floor(r() * 65536).toString(16).toUpperCase()).slice(-4);
    if (guess === now) guess = "0000";
    if (k < 1) packet(f, U.along([g.eve, g.ollie], ph), guess, c.signal, u);
    verdict(f, g, u, false, narrow ? "Rejected" : "Rejected: wrong code");

    // cost readout
    var secsTotal = guesses * cfg.txSeconds;
    var bx = W * 0.06, bw = W * 0.88, by = H * 0.86, bh = Math.max(8 * u, 6);
    ctx.font = f.font(11 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink2;
    ctx.fillText((narrow ? "Guesses: " : "Guesses sent: ") + guesses.toLocaleString("en-US"), bx, by - 8 * u);
    ctx.textAlign = "right"; ctx.font = f.mono(11 * u, 600); ctx.fillStyle = c.ink;
    ctx.fillText(duration(secsTotal), bx + bw, by - 8 * u);
    U.rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = c.line; ctx.fill();
    U.rr(ctx, bx, by, Math.max(bh, bw * guesses / cfg.avgGuesses), bh, bh / 2); ctx.fillStyle = c.signal; ctx.fill();
    ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
    ctx.fillText(narrow ? "Average to hit: ~1.5 days" : "Average to hit one 16-bit code: 32,768 guesses, about 1.5 days", bx, by + bh + 14 * u);
  }

  function duration(sec) {
    if (sec < 120) return sec + " s";
    if (sec < 7200) return Math.round(sec / 60) + " min";
    if (sec < 172800) return (sec / 3600).toFixed(1) + " h";
    return (sec / 86400).toFixed(1) + " days";
  }

  function clock(f, g, u, minute, secs) {
    var ctx = f.ctx, c = f.c;
    ctx.font = f.mono(13 * u, 600); ctx.textAlign = "center"; ctx.fillStyle = c.ink;
    ctx.fillText("12:0" + minute + ":" + ("0" + secs).slice(-2), g.clock.x, g.clock.y);
  }

  function expect(f, g, u, now, narrow) {
    var ctx = f.ctx, c = f.c;
    var y = g.ollie.y - Math.max(20 * u, 18);
    ctx.font = f.font(10.5 * u); ctx.textAlign = "center"; ctx.fillStyle = c.ink3;
    var label = (narrow ? "expects " : "expects code ") + now;
    var half = ctx.measureText(label).width / 2 + 4;
    ctx.fillText(label, U.clamp(g.ollie.x, half, f.w - half), y);
  }

  function recorded(f, g, u, sent) {
    var ctx = f.ctx, c = f.c;
    ctx.font = f.mono(10.5 * u); ctx.textAlign = "center"; ctx.fillStyle = c.signal;
    ctx.fillText("recorded: " + sent, g.eve.x, g.eve.y - Math.max(18 * u, 16));
  }

  function verdict(f, g, u, ok, text) {
    var ctx = f.ctx, c = f.c;
    ctx.font = f.font(12 * u, 620); ctx.textAlign = "center"; ctx.fillStyle = ok ? c.good : c.bad;
    var y = g.ollie.y + Math.max(44 * u, 34);
    var half = ctx.measureText(text).width / 2 + 4;
    ctx.fillText(text, U.clamp(g.ollie.x, half, f.w - half), y);
  }

  function foot(f, u, text) {
    var ctx = f.ctx, c = f.c;
    ctx.font = f.font(11 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink2;
    ctx.fillText(text, f.w * 0.06, f.h * 0.93);
  }

  function line(f, a, b, color, u, dashed) {
    var ctx = f.ctx;
    ctx.strokeStyle = color; ctx.lineWidth = 1.2 * u;
    if (dashed) ctx.setLineDash([4 * u, 4 * u]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  /* A transmission in flight, tagged with the code in its header. */
  function packet(f, p, label, color, u, quiet) {
    var ctx = f.ctx, c = f.c;
    ctx.font = f.mono(10.5 * u, 600);
    var w = ctx.measureText(label).width + 10 * u, h = Math.max(16 * u, 14);
    U.rr(ctx, p.x - w / 2, p.y - h / 2, w, h, 4 * u);
    ctx.fillStyle = quiet ? f.alpha(color, 0.2) : color; ctx.fill();
    ctx.fillStyle = quiet ? color : c.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, p.x, p.y + 0.5);
    ctx.textBaseline = "alphabetic";
  }

  function node(f, p, label, color, u) {
    var ctx = f.ctx, r = 9 * u;
    ctx.fillStyle = f.c.bg; ctx.strokeStyle = color; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = f.c.ink; ctx.font = f.font(12 * u, 560);
    var half = ctx.measureText(label).width / 2 + 4;
    ctx.textAlign = "center";
    ctx.fillText(label, U.clamp(p.x, half, f.w - half), p.y + r + Math.max(15 * u, 13));
  }
})();
