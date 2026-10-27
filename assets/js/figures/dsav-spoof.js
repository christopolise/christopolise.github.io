/* DSAV: measuring it with spoofed DNS queries.
 * Our prober sends a DNS query to a recursive resolver inside a target network,
 * with a forged source address that looks internal. A gateway doing DSAV drops
 * it. If the query gets through, the resolver looks the name up at our
 * authoritative server, which logs it: proof that DSAV failed for that target.
 * The five spoofed-source categories and the 2020/2024 rates are from the report
 * (Table 3, share of reachable addresses reached by each category). The example
 * addresses and the timing are illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  var CATS = [
    { name: "Other prefix", short: "Other prefix", from: "4.5.6.7", leaks: true, old: "78%", now: "90.9%" },
    { name: "Same prefix", short: "Same prefix", from: "5.6.7.23", leaks: true, old: "63%", now: "74.1%" },
    { name: "Private", short: "Private", from: "192.168.0.10", leaks: false, old: "3.4%", now: "0.74%" },
    { name: "Destination as source", short: "Dst as src", from: "5.6.7.8", leaks: false, old: "17%", now: "0%" },
    { name: "Loopback", short: "Loopback", from: "127.0.0.1", leaks: false, old: "0%", now: "0%" }
  ];

  Fig.register("dsav-spoof", {
    config: {
      slot: 3.0,          // s per spoofed query
      inbound: 0.9,       // s from prober to gateway
      toResolver: 0.5,    // s from gateway to resolver
      outbound: 1.0,      // s for the resolver's lookup to reach our server
      hold: 1.5,          // s after the fifth query before replaying
      stillAt: 5.0        // s: frame shown when motion is reduced (2nd query leaking)
    },

    setup: function (f) {
      var s = f.state;
      if (s.dsav == null) s.dsav = false;
      if (!s.btn) {
        s.btn = f.button("Turn on DSAV at the gateway", function (b) {
          s.dsav = !s.dsav;
          b.textContent = s.dsav ? "Turn off DSAV at the gateway" : "Turn on DSAV at the gateway";
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
      var cycle = cfg.slot * CATS.length + cfg.hold;
      var lt = t % cycle;
      var cur = Math.min(CATS.length - 1, Math.floor(lt / cfg.slot));
      var st = lt - cur * cfg.slot;
      if (lt >= cfg.slot * CATS.length) { cur = CATS.length; st = 0; }

      var g = layout(f, narrow);

      // Target network
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      U.rr(ctx, g.box.x, g.box.y, g.box.w, g.box.h, 10 * u); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "right";
      ctx.fillText(narrow ? "Target AS 5.6.x.x" : "Target network, AS owns 5.6.x.x", g.box.x + g.box.w - 8 * u, g.box.y + lh);

      // Links
      ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1.5 * u;
      line(ctx, g.prober, g.gateway); line(ctx, g.gateway, g.resolver); line(ctx, g.gateway, g.auth);

      // Gateway state
      var gwCol = s.dsav ? c.good : c.ink2;

      node(f, g.auth, narrow ? "Our server" : "Our DNS server (logs)", c.signal, u);
      node(f, g.prober, narrow ? "Prober" : "Our prober", c.accent, u);
      node(f, g.gateway, s.dsav ? "Gateway: DSAV on" : (narrow ? "Gateway" : "Gateway: DSAV off"), gwCol, u, true);
      node(f, g.resolver, narrow ? "Resolver" : "Recursive resolver", c.ink, u);

      // Packet for the current category
      var outcome = [];
      for (var i = 0; i < CATS.length; i++) outcome.push(i < cur ? result(CATS[i], s.dsav) : null);
      if (cur < CATS.length) {
        var cat = CATS[cur];
        var res = result(cat, s.dsav);
        var tIn = cfg.inbound, tR = tIn + cfg.toResolver, tOut = tR + cfg.outbound;
        if (st < tIn) {
          var p = lerpPt(g.prober, g.gateway, st / tIn);
          dot(ctx, p, c.accent, u);
          ctx.fillStyle = c.ink2; ctx.font = f.mono(11 * u); ctx.textAlign = "center";
          ctx.fillText("src " + cat.from, U.clamp(p.x, 50, W - 50), p.y - 12 * u - 4);
        } else if (res === "dropped") {
          var k = U.clamp((st - tIn) / 0.6, 0, 1);
          if (k < 1) {
            ctx.strokeStyle = f.alpha(c.good, 1 - k); ctx.lineWidth = 2 * u;
            ctx.beginPath(); ctx.arc(g.gateway.x, g.gateway.y, (10 + 18 * k) * u, 0, Math.PI * 2); ctx.stroke();
          }
          outcome[cur] = res;
        } else if (st < tR) {
          dot(ctx, lerpPt(g.gateway, g.resolver, (st - tIn) / cfg.toResolver), c.accent, u);
        } else if (res === "none") {
          var kk = U.clamp((st - tR) / 0.6, 0, 1);
          if (kk < 1) dot(ctx, g.resolver, f.alpha(c.accent, 1 - kk), u);
          outcome[cur] = res;
        } else if (st < tOut) {
          var q = (st - tR) / cfg.outbound;
          dot(ctx, U.along([g.resolver, g.gateway, g.auth], q), c.signal, u);
        } else {
          var kl = U.clamp((st - tOut) / 0.8, 0, 1);
          if (kl < 1) {
            ctx.strokeStyle = f.alpha(c.bad, 1 - kl); ctx.lineWidth = 2 * u;
            ctx.beginPath(); ctx.arc(g.auth.x, g.auth.y, (10 + 18 * kl) * u, 0, Math.PI * 2); ctx.stroke();
          }
          outcome[cur] = res;
        }
      }

      // Table of spoofed-source categories
      var tb = g.table, rh = tb.rh;
      var cols = narrow
        ? { name: tb.x, from: tb.x + tb.w * 0.3, res: tb.x + tb.w * 0.6, old: tb.x + tb.w * 0.84, now: tb.x + tb.w }
        : { name: tb.x, from: tb.x + tb.w * 0.3, res: tb.x + tb.w * 0.52, old: tb.x + tb.w * 0.84, now: tb.x + tb.w };
      ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.ink3;
      ctx.textAlign = "left";
      ctx.fillText(narrow ? "Spoofed" : "Spoofed source", cols.name, tb.y);
      ctx.fillText("From", cols.from, tb.y);
      ctx.fillText(narrow ? "Result" : "This run", cols.res, tb.y);
      ctx.textAlign = "right";
      ctx.fillText("2020", cols.old, tb.y);
      ctx.fillText("2024", cols.now, tb.y);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tb.x, tb.y + rh * 0.35); ctx.lineTo(tb.x + tb.w, tb.y + rh * 0.35); ctx.stroke();

      CATS.forEach(function (cat, i) {
        var y = tb.y + rh * (i + 1.15);
        if (i === cur) {
          ctx.fillStyle = f.alpha(c.accent, 0.1);
          ctx.fillRect(tb.x - 4, y - rh * 0.72, tb.w + 8, rh);
        }
        ctx.textAlign = "left";
        ctx.fillStyle = i === cur ? c.ink : c.ink2; ctx.font = f.font(11 * u, i === cur ? 600 : 450);
        ctx.fillText(narrow ? cat.short : cat.name, cols.name, y);
        ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink2;
        ctx.fillText(cat.from, cols.from, y);
        var o = outcome[i];
        if (o) {
          ctx.font = f.font(11 * u, 600);
          ctx.fillStyle = o === "logged" ? c.bad : o === "dropped" ? c.good : c.ink3;
          ctx.fillText(o === "logged" ? (narrow ? "logged" : "logged: no DSAV")
            : o === "dropped" ? (narrow ? "drop" : "dropped") : (narrow ? "none" : "no query seen"), cols.res, y);
        }
        ctx.textAlign = "right"; ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink3;
        ctx.fillText(cat.old, cols.old, y);
        ctx.fillStyle = c.ink; ctx.font = f.mono(10.5 * u, 600);
        ctx.fillText(cat.now, cols.now, y);
      });
    }
  });

  function result(cat, dsav) {
    if (dsav) return "dropped";
    return cat.leaks ? "logged" : "none";
  }

  function layout(f, narrow) {
    var W = f.w, H = f.h;
    var nodeY = narrow ? H * 0.32 : H * 0.38;
    var tableTop = narrow ? H * 0.56 : H * 0.62;
    var lh = Math.max(14 * U.unit(f), 13);
    return {
      auth: { x: W * 0.3, y: narrow ? H * 0.09 : H * 0.11 },
      prober: { x: W * 0.09, y: nodeY },
      gateway: { x: W * 0.55, y: nodeY },
      resolver: { x: W * 0.86, y: nodeY },
      box: { x: W * 0.5, y: nodeY - (narrow ? H * 0.18 : H * 0.2), w: W * 0.47, h: narrow ? H * 0.32 : H * 0.34 },
      table: { x: W * 0.05, y: tableTop + lh * 0.6, w: W * 0.9, rh: Math.max((H - tableTop - lh * 0.4) / 6.1, 13) }
    };
  }

  function line(ctx, a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  function lerpPt(a, b, k) { return { x: U.lerp(a.x, b.x, k), y: U.lerp(a.y, b.y, k) }; }
  function dot(ctx, p, col, u) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5 * u + 1, 0, Math.PI * 2); ctx.fill(); }

  function node(f, p, label, color, u, small) {
    var ctx = f.ctx, r = (small ? 7 : 9) * u + 1;
    ctx.fillStyle = f.c.bg; ctx.strokeStyle = color; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!small) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = f.font(11.5 * u, 560);
    var half = ctx.measureText(label).width / 2 + 2;
    ctx.fillStyle = small ? color : f.c.ink; ctx.textAlign = "center";
    ctx.fillText(label, U.clamp(p.x, half, f.w - half), p.y + r + Math.max(14 * u, 13));
  }
})();
