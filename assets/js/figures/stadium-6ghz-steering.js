/* 6 GHz in a stadium: where phones end up, and why.
 * Phones arrive at LaVell Edwards Stadium. Verizon customers are joined to the
 * 5 GHz "VerizonWiFiAccess" network automatically by Passpoint, whether or not
 * the phone could use 6 GHz. Everyone else joins "BYU Cougars WiFi". In 2024
 * the 6 GHz network was a separate SSID that users had to pick by hand; in 2025
 * OWE transition mode let capable phones move to 6 GHz automatically, with the
 * phone's chipset making the final band choice.
 * Shares from the paper: ~50% of clients on Verizon/Passpoint, ~20% of phones
 * 6 GHz-capable, 21% of non-steered clients on 6 GHz in 2025 (about 10.5% of
 * all clients), near zero in 2024. The 2024 share (1%) and all motion are
 * illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  Fig.register("stadium-6ghz-steering", {
    config: {
      passpoint: 0.5,     // share of phones steered by Passpoint to Verizon 5 GHz (paper, ~50%)
      capable: 0.2,       // share of phones that could use 6 GHz (paper estimate, ~20%)
      six2025: 0.21,      // share of non-steered phones on 6 GHz with OWE transition mode (paper)
      six2024: 0.01,      // share with a separate, manual 6 GHz SSID ("near zero" in the paper; value illustrative)
      spawn: 0.11,        // s between arriving phones
      travel: 2.6,        // s for a phone to reach its network
      stillAt: 14         // s: frame shown when motion is reduced (bars well filled)
    },

    setup: function (f) {
      var s = f.state;
      if (!s.year) s.year = 2025;
      if (!s.btn) {
        s.btn = f.button("Show the 2024 setup", function (b) {
          s.year = s.year === 2025 ? 2024 : 2025;
          b.textContent = s.year === 2025 ? "Show the 2024 setup" : "Show the 2025 setup";
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, W = f.w, H = f.h, cfg = f.cfg;
      var u = U.unit(f), narrow = W < 480;
      var g = geo(f, narrow);
      var six = s.year === 2025 ? cfg.six2025 : cfg.six2024;

      // Routes
      var routes = {
        vz: [g.entry, g.split, g.vzIn, g.bins[0].in],
        c5: [g.entry, g.split, g.cougar, g.bins[1].in],
        c6: [g.entry, g.split, g.cougar, g.bins[2].in]
      };
      Object.keys(routes).forEach(function (k) {
        var p = routes[k];
        ctx.strokeStyle = k === "c6" ? f.alpha(c.accent, 0.55) : c.line; ctx.lineWidth = 1.5 * u;
        if (k === "c6" && s.year === 2024) ctx.setLineDash([3 * u, 4 * u]);
        ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
        for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
        ctx.stroke(); ctx.setLineDash([]);
      });

      // Decision labels
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "center";
      ctx.fillText("Passpoint", (g.split.x + g.vzIn.x) / 2, (g.split.y + g.vzIn.y) / 2 - 8 * u);
      ctx.textAlign = "left";
      var how = s.year === 2025 ? (narrow ? "auto (OWE)" : "OWE transition: chipset picks")
        : (narrow ? "manual opt-in" : "separate SSID: manual opt-in");
      ctx.fillText(how, W * 0.04, g.cougar.y + Math.max(26 * u, 20));
      dot(f, g.split, c.ink2, 4 * u);
      dot(f, g.cougar, c.ink2, 4 * u);
      ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u, 560); ctx.textAlign = "center";
      ctx.fillText(narrow ? "Cougars WiFi" : "BYU Cougars WiFi", g.cougar.x, g.cougar.y - 10 * u);
      ctx.textAlign = "left";
      ctx.fillText(narrow ? "Phones" : "Phones arrive", g.entry.x, g.entry.y - 12 * u);

      // Phones
      var counts = [0, 0, 0], steeredCapable = 0, arrived = 0;
      var last = Math.floor(t / cfg.spawn);
      for (var i = 0; i <= last; i++) {
        // low-discrepancy draws so the bars settle on the target shares quickly
        var isVz = frac(i * 0.6180339 + 0.31) < cfg.passpoint;
        var capable = frac(i * 0.4142136 + 0.07) < cfg.capable;
        var onSix = !isVz && frac(i * 0.7548777 + 0.53) < six;
        var key = isVz ? "vz" : onSix ? "c6" : "c5";
        var q = (t - i * cfg.spawn) / cfg.travel;
        if (q >= 1) {
          arrived++;
          counts[key === "vz" ? 0 : key === "c5" ? 1 : 2]++;
          if (isVz && capable) steeredCapable++;
          continue;
        }
        if (q < 0) continue;
        var pt = U.along(routes[key], q);
        if (key === "c6" && q > 0.55) dot(f, pt, c.accent, 3.6 * u);
        else if (isVz && capable && q > 0.3) ring(f, pt, c.accent, 3.6 * u);
        else dot(f, pt, c.ink3, 3 * u);
      }

      // Bins
      var names = narrow ? ["Verizon 5 GHz", "Cougars 5 GHz", "Cougars 6 GHz"]
        : ["Verizon, 5 GHz", "Cougars, 5 GHz", "Cougars, 6 GHz"];
      g.bins.forEach(function (b, k) {
        var share = arrived ? counts[k] / arrived : 0;
        ctx.font = f.font(11 * u, 560); ctx.textAlign = "left"; ctx.fillStyle = k === 2 ? c.accent : c.ink2;
        ctx.fillText(names[k], b.x, b.y - 8 * u);
        U.rr(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = c.line; ctx.fill();
        if (share > 0) { U.rr(ctx, b.x, b.y, Math.max(b.h, b.w * share), b.h, b.h / 2); ctx.fillStyle = k === 2 ? c.accent : c.ink3; ctx.fill(); }
        ctx.font = f.mono(11 * u, 600); ctx.textAlign = "right"; ctx.fillStyle = c.ink;
        ctx.fillText(Math.round(share * 100) + "%", b.x + b.w, b.y - 8 * u);
      });

      // Steered-but-capable note
      var vz = g.bins[0];
      ring(f, { x: vz.x + 4 * u, y: vz.y + vz.h + 14 * u }, c.accent, 3.6 * u);
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      var sc = arrived ? Math.round(100 * steeredCapable / arrived) : 0;
      ctx.fillText((narrow ? "could use 6 GHz: " : "6 GHz-capable, steered away: ") + sc + "%", vz.x + 12 * u, vz.y + vz.h + 18 * u);

      // Year tag
      ctx.font = f.font(12 * u, 620); ctx.fillStyle = c.ink; ctx.textAlign = "left";
      ctx.fillText(String(s.year), W * 0.04, H * 0.93);
      ctx.font = f.font(10.5 * u); ctx.fillStyle = c.ink3;
      ctx.fillText(narrow ? "share of all phones" : "bars: share of all phones in the stadium", W * 0.04 + Math.max(40 * u, 34), H * 0.93);
    }
  });

  function geo(f, narrow) {
    var W = f.w, H = f.h, u = U.unit(f);
    var bx = W * (narrow ? 0.6 : 0.64), bw = W * (narrow ? 0.36 : 0.32), bh = Math.max(9 * u, 7);
    var ys = narrow ? [0.18, 0.47, 0.72] : [0.17, 0.46, 0.72];
    var bins = ys.map(function (y) { return { x: bx, y: H * y, w: bw, h: bh, in: { x: bx - 8 * u, y: H * y + bh / 2 } }; });
    return {
      entry: { x: W * 0.04, y: H * 0.42 },
      split: { x: W * (narrow ? 0.2 : 0.2), y: H * 0.42 },
      vzIn: { x: W * (narrow ? 0.38 : 0.4), y: bins[0].in.y },
      cougar: { x: W * (narrow ? 0.38 : 0.4), y: H * 0.6 },
      bins: bins
    };
  }

  function frac(x) { return x - Math.floor(x); }

  function dot(f, p, color, r) {
    var ctx = f.ctx; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }
  function ring(f, p, color, r) {
    var ctx = f.ctx; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
  }
})();
