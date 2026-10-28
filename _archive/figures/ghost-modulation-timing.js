/* Spectra: hiding bits in packet timing.
 * A stream of packets flows from sender to receiver. At symbol windows placed at
 * pseudorandom times (from a key both sides share), the sender delays one packet
 * into the left ("0") or right ("1") partition. The receiver only timestamps
 * arrivals: it counts packets in each partition and reads the bit, or returns an
 * erasure ("?") when the counts tie. Network jitter (exponential, as in the
 * paper's channel model) can push a packet into the wrong partition.
 * Partition (40 ms) and guard (5 ms) sizes are MCS 0 from the paper; stream
 * spacing, message bits, and window placement are illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("ghost-modulation-timing", {
    config: {
      span: 1000,         // ms of channel time shown across the figure (illustrative)
      lead: 110,          // ms before the first window, keeps row labels clear (illustrative)
      partition: 40,      // ms, each partition window (paper, Table II, MCS 0)
      guard: 5,           // ms, outer guard after each symbol (paper, Table II)
      bits: [1, 0, 1, 1, 0, 0], // the secret message (illustrative)
      pktGap: 36,         // ms, mean spacing of the primary packet stream (illustrative)
      place: 0.3,         // where in its partition a delayed packet is placed (0..1, illustrative)
      jitter: 4,          // ms, mean network delay added to every packet (slider; illustrative default)
      jitterMax: 30,      // ms, slider maximum (illustrative)
      key: 17,            // seed standing in for the pre-shared key (illustrative)
      sweep: 6.5,         // s for the playhead to cross the timeline
      hold: 3.2,          // s the decoded message stays up before looping
      stillAt: 8          // s: frame shown when motion is reduced (everything decoded)
    },

    setup: function (f) {
      var s = f.state;
      if (s.jitter == null) s.jitter = f.cfg.jitter;
      plan(f);
      if (!s.slider) {
        s.slider = f.slider({
          label: "Network jitter (mean)", min: 0, max: f.cfg.jitterMax, step: 1, value: s.jitter,
          format: function (v) { return v + " ms"; },
          onInput: function (v) { s.jitter = v; }
        });
      }
    },

    reset: function (f) { plan(f); },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f), narrow = W < 480;
      var cycle = cfg.sweep + cfg.hold;
      var lt = t % cycle;
      var now = Math.min(1, lt / cfg.sweep) * cfg.span;   // channel time at the playhead (ms)

      var x0 = W * 0.04, x1 = W * 0.96;
      var X = function (ms) { return x0 + (x1 - x0) * ms / cfg.span; };
      var txY = H * (narrow ? 0.27 : 0.26), rxY = H * (narrow ? 0.58 : 0.6);
      var tick = Math.max(16 * u, 12);
      var P = cfg.partition;

      // Arrival times for the current jitter (fixed per-packet randomness, scaled by the mean).
      var pk = s.packets.map(function (p) {
        return { tx: p.tx, orig: p.orig, mark: p.mark, rx: p.tx + (-s.jitter * Math.log(1 - p.r)) };
      });

      // Symbol windows: shared by both rows because both sides know the key.
      s.windows.forEach(function (w) {
        var a = X(w.start), m = X(w.start + P), b = X(w.start + 2 * P);
        ctx.fillStyle = f.alpha(c.ink3, 0.1); ctx.fillRect(a, txY - tick, m - a, rxY - txY + 2 * tick);
        ctx.fillStyle = f.alpha(c.ink3, 0.18); ctx.fillRect(m, txY - tick, b - m, rxY - txY + 2 * tick);
        ctx.fillStyle = c.ink3; ctx.font = f.mono(10.5 * u); ctx.textAlign = "center";
        ctx.fillText("0", (a + m) / 2, txY - tick - 5 * u);
        ctx.fillText("1", (m + b) / 2, txY - tick - 5 * u);
      });

      // Row baselines and labels
      [[txY, "Sender"], [rxY, narrow ? "Receiver: timestamps" : "Receiver: sees timestamps only"]].forEach(function (r) {
        ctx.strokeStyle = c.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, r[0]); ctx.lineTo(x1, r[0]); ctx.stroke();
        ctx.font = f.font(11 * u, 560); ctx.textAlign = "left";
        var ly = r[0] - tick - (r[0] === txY ? Math.max(18 * u, 16) : 6 * u);
        ctx.strokeStyle = c.bg; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.strokeText(r[1], x0, ly);
        ctx.fillStyle = c.ink2; ctx.fillText(r[1], x0, ly);
      });

      // Legend (top right)
      ctx.font = f.font(10.5 * u); ctx.textAlign = "right"; ctx.fillStyle = c.ink3;
      var lg = narrow ? "delayed = a bit" : "delayed to carry a bit";
      var lgw = ctx.measureText(lg).width;
      ctx.fillText(lg, x1, H * 0.07);
      ctx.fillStyle = c.accent; ctx.fillRect(x1 - lgw - 9 * u, H * 0.07 - 10 * u, Math.max(3 * u, 2), 12 * u);

      // Packets
      var bw = Math.max(3 * u, 2);
      pk.forEach(function (p) {
        var col = p.mark ? c.accent : c.signal;
        if (p.mark && now >= p.orig) {
          // ghost of where the packet would have gone, and the nudge
          ctx.strokeStyle = f.alpha(c.accent, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
          ctx.strokeRect(X(p.orig) - bw / 2, txY - tick / 2, bw, tick); ctx.setLineDash([]);
          ctx.strokeStyle = f.alpha(c.accent, 0.7); ctx.lineWidth = 1.2 * u;
          ctx.beginPath(); ctx.moveTo(X(p.orig), txY + tick / 2 + 4 * u); ctx.lineTo(X(p.tx), txY + tick / 2 + 4 * u); ctx.stroke();
        }
        if (now >= p.tx) {
          ctx.fillStyle = col; ctx.fillRect(X(p.tx) - bw / 2, txY - tick / 2, bw, tick);
          if (p.rx <= cfg.span) {
            // flight line: its slant is the network delay
            var k = U.clamp((now - p.tx) / Math.max(p.rx - p.tx, 1), 0, 1);
            var fx = U.lerp(X(p.tx), X(p.rx), k), fy = U.lerp(txY + tick / 2, rxY - tick / 2, k);
            ctx.strokeStyle = f.alpha(col, p.mark ? 0.55 : 0.22); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(X(p.tx), txY + tick / 2); ctx.lineTo(fx, fy); ctx.stroke();
          }
        }
        if (now >= p.rx && p.rx <= cfg.span) {
          ctx.fillStyle = col; ctx.fillRect(X(p.rx) - bw / 2, rxY - tick / 2, bw, tick);
        }
      });

      // Decode each window once the playhead has passed it
      var read = [];
      var dy = rxY + tick + Math.max(22 * u, 16);
      s.windows.forEach(function (w, i) {
        var end = w.start + 2 * P + cfg.guard;
        if (now < end) { read.push(undefined); return; }
        var L = 0, R = 0;
        pk.forEach(function (p) {
          if (p.rx >= w.start && p.rx < w.start + P) L++;
          else if (p.rx >= w.start + P && p.rx < w.start + 2 * P) R++;
        });
        var bit = L > R ? 0 : R > L ? 1 : null;
        read.push(bit);
        ctx.font = f.mono(15 * u, 600); ctx.textAlign = "center";
        ctx.fillStyle = bit == null ? c.ink3 : bit === cfg.bits[i] ? c.good : c.bad;
        ctx.fillText(bit == null ? "?" : String(bit), X(w.start + P), dy);
      });

      // Playhead
      if (lt < cfg.sweep) {
        ctx.strokeStyle = c.ink2; ctx.lineWidth = 1.2 * u;
        ctx.beginPath(); ctx.moveTo(X(now), txY - tick - 2 * u); ctx.lineTo(X(now), rxY + tick + 2 * u); ctx.stroke();
      }

      // Message summary
      var sy = H * 0.93;
      ctx.font = f.font(11 * u); ctx.textAlign = "left"; ctx.fillStyle = c.ink3;
      ctx.fillText("Sent", x0, sy);
      var lw = Math.max(ctx.measureText("Sent").width, ctx.measureText("Read").width) + 10 * u;
      ctx.fillText("Read", W * 0.5, sy);
      var cw = Math.max(14 * u, 11);
      ctx.font = f.mono(13 * u, 600);
      cfg.bits.forEach(function (b, i) {
        ctx.fillStyle = c.ink; ctx.fillText(String(b), x0 + lw + i * cw, sy);
        var r = read[i];
        if (r === undefined) {
          ctx.fillStyle = c.line; ctx.fillText("·", W * 0.5 + lw + i * cw, sy); return;
        }
        ctx.fillStyle = r == null ? c.ink3 : r === b ? c.good : c.bad;
        ctx.fillText(r == null ? "?" : String(r), W * 0.5 + lw + i * cw, sy);
      });
    },

    resize: function () {}
  });

  /* Place windows at pseudorandom times and build the packet stream (seeded, so it replays identically). */
  function plan(f) {
    var s = f.state, cfg = f.cfg, P = cfg.partition;
    var rk = U.seeded(cfg.key);
    var n = cfg.bits.length, sym = 2 * P + cfg.guard;
    var room = cfg.span - cfg.lead - n * sym - 40;
    var gaps = [], tot = 0, i;
    for (i = 0; i < n; i++) { var g = 0.4 + rk(); gaps.push(g); tot += g; }
    var at = cfg.lead, windows = [];
    for (i = 0; i < n; i++) {
      windows.push({ start: at });
      at += sym + room * gaps[i] / tot;
    }
    s.windows = windows;

    var rp = U.seeded(cfg.key * 31 + 5);
    var pk = [], tt = 8 + rp() * cfg.pktGap;
    while (tt < cfg.span) {
      pk.push({ tx: tt, orig: tt, mark: false, r: Math.min(rp(), 0.995) });
      tt += cfg.pktGap * (0.45 + rp() * 1.1);
    }
    windows.forEach(function (w, i) {
      var a = w.start, b = w.start + sym;
      // the stream's own packets stay out of the window...
      pk.forEach(function (p) { if (p.tx >= a && p.tx < b) { p.tx = b + 1 + rp() * 6; p.orig = p.tx; } });
      // ...except the one the sender delays into the partition for this bit
      var cand = null;
      pk.forEach(function (p) { if (!p.mark && p.tx < a && (!cand || p.tx > cand.tx)) cand = p; });
      if (!cand) { cand = { tx: a - 10, orig: a - 10, mark: false, r: rp() }; pk.push(cand); }
      cand.mark = true;
      cand.tx = a + cfg.bits[i] * P + cfg.place * P;
    });
    s.packets = pk;
  }
})();
