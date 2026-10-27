/* SSS: how a seven-segment digit becomes two pixels.
 * The SSS display library treats every digit as two stacked pixels. A pixel has
 * four sides (top, left, right, bottom); the digit's middle segment is the
 * bottom side of the top pixel and the top side of the bottom pixel. The grid
 * here is one real panel (16 x 6 digits, so 16 x 12 pixels, from the poster's
 * hardware diagram). A shape is drawn pixel by pixel and the big digit on the
 * left shows which segments the current pixel lights. Shapes and timing are
 * illustrative. */
(function () {
  "use strict";
  var U = Fig.util;

  /* Segment bits: a=top, b=upper right, c=lower right, d=bottom, e=lower left, f=upper left, g=middle */
  var A = 1, B = 2, C = 4, D = 8, E = 16, F = 32, G = 64;
  /* Pixel sides -> segment, for the top (even y) and bottom (odd y) half of a digit. */
  var SIDES = [
    { top: A, left: F, right: B, bottom: G },
    { top: G, left: E, right: C, bottom: D }
  ];

  Fig.register("sss-pixels", {
    config: {
      cols: 16,         // digits across one panel (poster hardware diagram)
      rows: 6,          // digits down one panel (poster hardware diagram)
      cellRatio: 1.75,  // digit cell height / width (illustrative)
      step: 0.16,       // s between pixels being drawn (illustrative)
      lead: 0.6,        // s before the first pixel
      hold: 2.4,        // s the finished shape stays up
      stillAt: 3.6      // s: frame shown when motion is reduced (mid-drawing)
    },

    setup: function (f) {
      var s = f.state;
      s.shape = s.shape || "ring";
      s.pixels = shape(s.shape, f.cfg.cols, f.cfg.rows * 2);
      if (!s.btn) {
        s.btn = f.button("Draw a wave instead", function (b) {
          s.shape = s.shape === "ring" ? "wave" : "ring";
          b.textContent = s.shape === "ring" ? "Draw a wave instead" : "Draw a ring instead";
          f.restart(true);
        });
      }
    },

    reset: function (f) {
      f.state.pixels = shape(f.state.shape, f.cfg.cols, f.cfg.rows * 2);
    },

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg;
      var u = U.unit(f);
      var g = layout(f);
      var n = s.pixels.length;
      var period = cfg.lead + n * cfg.step + cfg.hold;
      var lt = t % period;
      var k = Math.min(n - 1, Math.floor((lt - cfg.lead) / cfg.step));
      var drawing = lt < cfg.lead + n * cfg.step;

      /* Accumulate the digit buffer from the pixels drawn so far. */
      var buf = [];
      for (var i = 0; i < cfg.rows * cfg.cols; i++) buf.push(0);
      for (i = 0; i <= k; i++) {
        var p = s.pixels[i], sd = SIDES[p.y % 2];
        buf[(p.y >> 1) * cfg.cols + p.x] |= sd.top | sd.left | sd.right | sd.bottom;
      }

      /* The panel. */
      var gr = g.grid;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      U.rr(ctx, gr.x - 6 * u, gr.y - 6 * u, gr.cw * cfg.cols + 12 * u, gr.ch * cfg.rows + 12 * u, 6 * u); ctx.stroke();
      var on = [], off = [];
      for (var r = 0; r < cfg.rows; r++) {
        for (var q = 0; q < cfg.cols; q++) {
          segs(gr.x + q * gr.cw, gr.y + r * gr.ch, gr.cw, gr.ch, buf[r * cfg.cols + q], on, off);
        }
      }
      stroke(ctx, off, f.alpha(c.ink, 0.09), gr.cw * 0.11);
      stroke(ctx, on, c.accent, gr.cw * 0.11);

      /* Current pixel cursor. */
      var cur = k >= 0 && drawing ? s.pixels[k] : null;
      if (cur) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
        ctx.fillStyle = f.alpha(c.accent, 0.12);
        ctx.beginPath(); ctx.rect(gr.x + cur.x * gr.cw, gr.y + cur.y * gr.ch / 2, gr.cw, gr.ch / 2);
        ctx.fill(); ctx.stroke();
      }

      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = g.narrow ? "left" : "center";
      ctx.fillText(g.narrow ? "One panel: 16 × 6 digits" : "One panel: 16 × 6 digits, drawn as 16 × 12 pixels",
        g.narrow ? gr.x - 6 * u : gr.x + gr.cw * cfg.cols / 2, g.caption);

      /* The zoomed digit. */
      var bd = g.big;
      var show = cur || (k >= 0 ? s.pixels[k] : { x: 0, y: 0 });
      var mask = buf[(show.y >> 1) * cfg.cols + show.x];
      var half = show.y % 2;
      var sd2 = SIDES[half];
      var mine = cur ? (sd2.top | sd2.left | sd2.right | sd2.bottom) : 0;
      var bOn = [], bMine = [], bOff = [];
      segs(bd.x, bd.y, bd.w, bd.h, mask, bOn, bOff, mine, bMine);
      stroke(ctx, bOff, f.alpha(c.ink, 0.09), bd.w * 0.11);
      stroke(ctx, bOn, f.alpha(c.accent, 0.4), bd.w * 0.11);
      stroke(ctx, bMine, c.accent, bd.w * 0.11);

      /* Pixel halves on the zoomed digit. */
      for (var hh = 0; hh < 2; hh++) {
        var hy = bd.y + hh * bd.h / 2;
        var active = cur && hh === half;
        ctx.strokeStyle = active ? c.accent : c.line; ctx.lineWidth = active ? 1.5 : 1;
        ctx.setLineDash(active ? [] : [3, 3]);
        ctx.beginPath(); ctx.rect(bd.x + 1, hy + 1, bd.w - 2, bd.h / 2 - 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = active ? c.ink : c.ink3; ctx.font = f.font(11 * u, active ? 600 : 450);
        ctx.textAlign = "left";
        ctx.fillText(hh ? "bottom pixel" : "top pixel", bd.x + bd.w + 8 * u, hy + bd.h / 4 + 4 * u);
      }
      ctx.fillStyle = c.ink2; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      ctx.fillText(g.narrow ? "shared middle" : "shared middle segment", bd.x + bd.w + 8 * u, bd.y + bd.h / 2 + 4 * u);

      ctx.fillStyle = c.ink; ctx.font = f.font(12 * u, 600);
      ctx.fillText("One digit, two pixels", g.title.x, g.title.y);
      ctx.font = f.mono(11 * u); ctx.fillStyle = cur ? c.ink : c.ink3;
      ctx.fillText(cur ? "pixel (" + cur.x + ", " + cur.y + ")" : "shape done", g.read.x, g.read.y);
      ctx.fillStyle = c.ink2;
      if (cur) ctx.fillText("digit (" + cur.x + ", " + (cur.y >> 1) + "), " + (half ? "bottom" : "top"), g.read.x, g.read.y + Math.max(16 * u, 14));
    }
  });

  function layout(f) {
    var W = f.w, H = f.h, u = U.unit(f), cfg = f.cfg;
    var narrow = W < 480;
    var box, big, title, read;
    if (narrow) {
      var bh = H * 0.26;
      big = { x: W * 0.05, y: H * 0.11, w: bh / cfg.cellRatio, h: bh };
      title = { x: W * 0.05, y: H * 0.06 };
      read = { x: W * 0.64, y: H * 0.17 };
      box = { x: W * 0.04, y: H * 0.43, w: W * 0.92, h: H * 0.48 };
    } else {
      var bw = W * 0.11;
      big = { x: W * 0.05, y: H * 0.17, w: bw, h: bw * cfg.cellRatio };
      title = { x: W * 0.05, y: H * 0.1 };
      read = { x: W * 0.05, y: big.y + big.h + 26 * u };
      box = { x: W * 0.41, y: H * 0.08, w: W * 0.56, h: H * 0.76 };
    }
    var cw = Math.min(box.w / cfg.cols, box.h / (cfg.rows * cfg.cellRatio));
    var ch = cw * cfg.cellRatio;
    var grid = { x: box.x + (box.w - cw * cfg.cols) / 2, y: box.y + (box.h - ch * cfg.rows) / 2, cw: cw, ch: ch };
    return {
      narrow: narrow, big: big, title: title, read: read, grid: grid,
      caption: Math.min(H - 6, grid.y + ch * cfg.rows + 6 * u + Math.max(18 * u, 15))
    };
  }

  /* Push the segment strokes of one digit into on/off lists (optionally a third "mine" list). */
  function segs(x, y, w, h, mask, on, off, mine, mineList) {
    var mx = w * 0.2, my = h * 0.1, th = w * 0.11, gp = th * 0.85;
    var x0 = x + mx, x1 = x + w - mx, y0 = y + my, y2 = y + h - my, y1 = (y0 + y2) / 2;
    var L = [
      [A, x0 + gp, y0, x1 - gp, y0], [B, x1, y0 + gp, x1, y1 - gp], [C, x1, y1 + gp, x1, y2 - gp],
      [D, x0 + gp, y2, x1 - gp, y2], [E, x0, y1 + gp, x0, y2 - gp], [F, x0, y0 + gp, x0, y1 - gp],
      [G, x0 + gp, y1, x1 - gp, y1]
    ];
    for (var i = 0; i < L.length; i++) {
      var s = L[i], list = off;
      if (mask & s[0]) list = (mine & s[0]) && mineList ? mineList : on;
      list.push(s[1], s[2], s[3], s[4]);
    }
  }

  function stroke(ctx, list, color, width) {
    if (!list.length) return;
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, width); ctx.lineCap = "round";
    ctx.beginPath();
    for (var i = 0; i < list.length; i += 4) { ctx.moveTo(list[i], list[i + 1]); ctx.lineTo(list[i + 2], list[i + 3]); }
    ctx.stroke();
  }

  /* Ordered pixel list for a shape on a cols x prows pixel field. */
  function shape(name, cols, prows) {
    var out = [], seen = {};
    function add(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= cols || y >= prows) return;
      var key = x + "," + y;
      if (seen[key]) return;
      seen[key] = true; out.push({ x: x, y: y });
    }
    var cx = (cols - 1) / 2, cy = (prows - 1) / 2;
    if (name === "ring") {
      for (var i = 0; i < 240; i++) {
        var a = -Math.PI / 2 + (i / 240) * Math.PI * 2;
        add(cx + Math.cos(a) * 5.2, cy + Math.sin(a) * 5.2);
      }
    } else {
      var prev = null;
      for (var x = 0; x < cols; x++) {
        var y = Math.round(cy + (prows / 2 - 1.2) * Math.sin((x / (cols - 1)) * Math.PI * 2));
        if (prev != null) {
          var dir = y > prev ? 1 : -1;
          for (var yy = prev + dir; yy !== y; yy += dir) add(x, yy);
        }
        add(x, y);
        prev = y;
      }
    }
    return out;
  }
})();
