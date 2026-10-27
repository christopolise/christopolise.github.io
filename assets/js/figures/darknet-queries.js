/* Unintentional darknet: two kinds of hosts asking for an abandoned project.
 * Hosts ask BYU's authoritative DNS server for JHDL names. The old names
 * (jhdl.com, jhdl.org, jhdl.net and made-up subdomains) return SERVFAIL. Some
 * hosts go on to ask for the real site, jhdl.ee.byu.edu, get an answer, and go
 * quiet because the answer is cached. Others never ask for the real site and keep
 * cycling through dead names. The log follows one host from each group.
 * Query names (cbserver, ctdns, single letters) and the AbuseIPDB shares
 * (18.5% vs 42.9% of the top 40 hosts in each group) come from the report.
 * Host counts, timing, and query order are illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  var DEAD = ["jhdl.com", "a.jhdl.com", "cbserver.jhdl.com", "jhdl.org", "ctdns.jhdl.com", "x.jhdl.com", "jhdl.net", "k.jhdl.org"];

  Fig.register("darknet-queries", {
    config: {
      hosts: 3,           // hosts drawn per group (illustrative)
      flight: 0.55,       // s for a query to reach the DNS server (and the reply to return)
      scanEvery: 0.85,    // s between a scanner's queries (illustrative)
      cycle: 15,          // s before the story loops
      abuseShow: 7,       // s when the AbuseIPDB result appears
      flaggedFind: 18.5,  // % of top-40 hosts that reached the real site with an abuse rating (report)
      flaggedNever: 42.9, // % of top-40 hosts that never did (report)
      stillAt: 10         // s: frame shown when motion is reduced
    },

    setup: function (f) {
      var s = f.state;
      if (!s.follow) s.follow = "never";
      if (!s.btn) {
        s.btn = f.button("Follow a host that finds the real site", function (b) {
          s.follow = s.follow === "never" ? "find" : "never";
          b.textContent = s.follow === "never" ? "Follow a host that finds the real site" : "Follow a host that never does";
          if (!f.playing) f.redraw();
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f), narrow = W < 480;
      var lt = t % cfg.cycle;
      var g = geo(f, narrow);

      // Links
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      g.hosts.forEach(function (h) { ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(g.dns.x, g.dns.y); ctx.stroke(); });

      // Group labels
      ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "left";
      ctx.fillStyle = c.accent; ctx.fillText(narrow ? "Find real site" : "Eventually find the real site", g.x0, g.hosts[0].y - Math.max(14 * u, 12));
      ctx.fillStyle = c.signal; ctx.fillText(narrow ? "Never do" : "Never ask for it", g.x0, g.hosts[cfg.hosts].y - Math.max(14 * u, 12));

      // Each host's query script
      var logs = {};
      g.hosts.forEach(function (h, i) {
        var q = script(cfg, h, i, lt);
        var col = h.find ? c.accent : c.signal;
        q.events.forEach(function (e) {
          var k = (lt - e.at) / cfg.flight;
          if (k >= 0 && k < 1) dot(f, U.along([h, g.dns], k), col, 3.5 * u);
          if (k >= 1 && k < 2) dot(f, U.along([g.dns, h], k - 1), e.ok ? c.good : c.ink3, 3 * u);
          if (e.ok && k >= 2 && k < 3.4) {
            var kk = (k - 2) / 1.4;
            ctx.strokeStyle = f.alpha(c.accent, 0.6); ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(g.web.x, g.web.y); ctx.stroke(); ctx.setLineDash([]);
            dot(f, U.along([h, g.web], kk), c.accent, 3.5 * u);
          }
        });
        // host node + query counter
        ctx.fillStyle = c.bg; ctx.strokeStyle = col; ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.arc(h.x, h.y, 6 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
        ctx.fillText(String(q.sent), h.x + 10 * u, h.y + 4 * u);
        if (h.follow) logs[h.find ? "find" : "never"] = q.events;
      });

      // DNS server and the real web server
      node(f, g.dns, "BYU DNS", c.ink, u);
      node(f, g.web, "jhdl.ee.byu.edu", c.accent, u);

      // Query log for the followed host
      var ev = (logs[s.follow] || []).filter(function (e) { return lt >= e.at + cfg.flight; });
      var lx = g.log.x, ly = g.log.y, lh = Math.max(14 * u, 12.5);
      ctx.font = f.font(10.5 * u, 560); ctx.textAlign = "left"; ctx.fillStyle = s.follow === "find" ? c.accent : c.signal;
      ctx.fillText(s.follow === "find" ? (narrow ? "Log: finds real site" : "Log: a host that finds the real site")
        : (narrow ? "Log: never does" : "Log: a host that never does"), lx, ly);
      ev.slice(-3).forEach(function (e, j) {
        var y = ly + (j + 1) * lh;
        ctx.font = f.mono(10.5 * u); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
        ctx.fillText(e.name, lx, y);
        ctx.fillStyle = e.ok ? c.good : c.ink3; ctx.textAlign = "right";
        ctx.fillText(e.ok ? "answer" : "SERVFAIL", lx + g.log.w, y);
      });
      if (s.follow === "find" && ev.length >= 2 && lt > ev[ev.length - 1].at + 3) {
        ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
        ctx.fillText("…then quiet (answer cached)", lx, ly + 4 * lh);
      }

      // AbuseIPDB result
      if (lt >= cfg.abuseShow) {
        var a = U.ease(lt, cfg.abuseShow, 1.2);
        var bx = g.abuse.x, bw = g.abuse.w, by = g.abuse.y, bh = Math.max(8 * u, 6);
        ctx.font = f.font(10.5 * u, 560); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
        ctx.fillText(narrow ? "Flagged on AbuseIPDB" : "Top 40 hosts flagged on AbuseIPDB", bx, by);
        [["find", cfg.flaggedFind, c.accent], ["never", cfg.flaggedNever, c.signal]].forEach(function (r, j) {
          var y = by + (j + 1) * Math.max(22 * u, 19) - 4 * u;
          U.rr(ctx, bx, y, bw * 0.7, bh, bh / 2); ctx.fillStyle = c.line; ctx.fill();
          U.rr(ctx, bx, y, Math.max(bh, bw * 0.7 * r[1] / 50 * a), bh, bh / 2); ctx.fillStyle = r[2]; ctx.fill();
          ctx.font = f.mono(11 * u, 600); ctx.fillStyle = c.ink; ctx.textAlign = "right";
          ctx.fillText((r[1] * a).toFixed(1) + "%", bx + bw, y + bh);
        });
      }
    }
  });

  /* Query timeline for one host. Hosts that find the real site: one dead name, then the
   * real one, then nothing. Hosts that never do: dead names on a steady beat. */
  function script(cfg, h, i, lt) {
    var r = U.seeded(i * 13 + 5), ev = [];
    var start = 0.3 + r() * 1.6;
    if (h.find) {
      ev.push({ at: start, name: DEAD[Math.floor(r() * 3)], ok: false });
      ev.push({ at: start + 2 * cfg.flight + 0.5 + r() * 0.8, name: "jhdl.ee.byu.edu", ok: true });
    } else {
      for (var at = start; at < cfg.cycle - 1; at += cfg.scanEvery * (0.7 + r() * 0.6)) {
        ev.push({ at: at, name: DEAD[Math.floor(r() * DEAD.length)], ok: false });
      }
    }
    var sent = ev.filter(function (e) { return lt >= e.at; }).length;
    return { events: ev, sent: sent };
  }

  function geo(f, narrow) {
    var W = f.w, H = f.h, cfg = f.cfg, n = cfg.hosts;
    var x0 = W * 0.04, hx = W * 0.07;
    var top = H * 0.12, gap = H * (narrow ? 0.085 : 0.09), groupGap = H * 0.1;
    var hosts = [];
    for (var i = 0; i < 2 * n; i++) {
      var find = i < n;
      hosts.push({ x: hx, y: top + i * gap + (find ? 0 : groupGap), find: find, follow: i === 1 || i === n + 1 });
    }
    var bottom = hosts[2 * n - 1].y;
    return {
      x0: x0, hosts: hosts,
      dns: { x: W * 0.46, y: (top + bottom) / 2 },
      web: { x: W * 0.82, y: H * 0.16 },
      log: { x: x0, y: H * (narrow ? 0.73 : 0.75), w: W * (narrow ? 0.5 : 0.42) },
      abuse: { x: W * (narrow ? 0.62 : 0.58), y: H * (narrow ? 0.73 : 0.75), w: W * (narrow ? 0.34 : 0.38) }
    };
  }

  function dot(f, p, color, r) {
    var ctx = f.ctx; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
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
