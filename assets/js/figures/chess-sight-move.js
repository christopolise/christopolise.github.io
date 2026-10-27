/* Chess Sight: reading a move from two occupancy snapshots.
 * The system never identifies pieces when it reads a move. It only knows which
 * squares hold a blue blob and which hold a red one. The move is the set
 * difference of the mover's squares before and after: the square that emptied is
 * the start, the square that filled is the end. Castling (two empty, two filled)
 * is looked up in a small table. Positions are illustrative; the set-difference
 * rule and the castling table follow chess_homography.get_move in the repo. */
(function () {
  "use strict";
  var U = Fig.util;

  var FILES = "abcdefgh";
  var NEXT_LABEL = ["Show a capture", "Show castling", "Show a plain move"];

  function startPos() {
    var b = {};
    for (var i = 0; i < 8; i++) {
      b[FILES[i] + "1"] = "p"; b[FILES[i] + "2"] = "p";
      b[FILES[i] + "7"] = "b"; b[FILES[i] + "8"] = "b";
    }
    return b;
  }
  function edit(b, moves) {
    moves.forEach(function (m) { var v = b[m[0]]; delete b[m[0]]; if (m[1]) b[m[1]] = v; });
    return b;
  }

  /* p = player (blue set, accent), b = bot (red set, signal). */
  var SCENES = [
    { board: startPos(), slides: { e2: "e4" }, starts: ["e2"], ends: ["e4"], move: "e2e4" },
    {
      board: edit(startPos(), [["e2", "e4"], ["d7", "d5"]]),
      slides: { e4: "d5" }, captured: "d5", starts: ["e4"], ends: ["d5"], move: "e4d5",
      note: "Captured piece is the other color: not compared", noteShort: "Other color: ignored"
    },
    {
      board: edit(startPos(), [["e2", "e4"], ["g1", "f3"], ["f1", "c4"], ["e7", "e5"], ["b8", "c6"]]),
      slides: { e1: "g1", h1: "f1" }, starts: ["e1", "h1"], ends: ["f1", "g1"], move: "e1g1",
      note: "Two and two: castling table", noteShort: "Two and two: castling"
    }
  ];

  Fig.register("chess-sight-move", {
    config: {
      phase: {             // seconds for each act of one round
        before: 1.0,       // show the board before the move
        slide: 1.6,        // the piece(s) slide to the new square
        after: 0.8,        // pause on the new frame
        diff: 2.4,         // the two set differences appear, then the move string
        verdict: 0.8,      // Stockfish accepts the move
        hold: 3.4          // everything stays up before the round repeats
      },
      stillAt: 7.2         // s: frame shown when motion is reduced (all results visible)
    },

    setup: function (f) {
      var s = f.state;
      if (s.scene == null) s.scene = 0;
      if (!s.btn) {
        s.btn = f.button(NEXT_LABEL[0], function (b) {
          s.scene = (s.scene + 1) % SCENES.length;
          b.textContent = NEXT_LABEL[s.scene];
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var cfg = f.cfg, P = cfg.phase, c = f.c, ctx = f.ctx, W = f.w, H = f.h;
      var sc = SCENES[f.state.scene];
      var u = U.unit(f);
      var total = P.before + P.slide + P.after + P.diff + P.verdict + P.hold;
      var lt = t % total;
      var tSlide = P.before, tAfter = tSlide + P.slide, tDiff = tAfter + P.after;
      var tVerdict = tDiff + P.diff;
      var g = layout(f);
      var sq = g.side / 8;

      /* ---- Board ---- */
      for (var r = 0; r < 8; r++) {
        for (var fl = 0; fl < 8; fl++) {
          ctx.fillStyle = (r + fl) % 2 === 0 ? c.sunk : c.bg;
          ctx.fillRect(g.bx + fl * sq, g.by + (7 - r) * sq, sq, sq);
        }
      }
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.strokeRect(g.bx, g.by, g.side, g.side);
      ctx.fillStyle = c.ink3; ctx.font = f.font(10.5 * u); ctx.textAlign = "center";
      for (var k = 0; k < 8; k++) {
        ctx.fillText(FILES[k], g.bx + (k + 0.5) * sq, g.by + g.side + Math.max(13 * u, 12));
        ctx.textAlign = "right";
        ctx.fillText(String(k + 1), g.bx - 4, g.by + (7.5 - k) * sq + 4);
        ctx.textAlign = "center";
      }

      /* ---- Occupancy overlay (after the move) ---- */
      var showDiff = lt >= tDiff;
      if (showDiff) {
        var a1 = U.ease(lt, tDiff, 0.5), a2 = U.ease(lt, tDiff + 0.6, 0.5);
        sc.starts.forEach(function (n) {
          var p = cell(g, n);
          ctx.strokeStyle = f.alpha(c.accent, a1); ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]); ctx.strokeRect(p.x + 2, p.y + 2, sq - 4, sq - 4); ctx.setLineDash([]);
        });
        sc.ends.forEach(function (n) {
          var p = cell(g, n);
          ctx.fillStyle = f.alpha(c.accent, 0.22 * a2); ctx.fillRect(p.x, p.y, sq, sq);
          ctx.strokeStyle = f.alpha(c.accent, a2); ctx.lineWidth = 2;
          ctx.strokeRect(p.x + 1, p.y + 1, sq - 2, sq - 2);
        });
      }

      /* ---- Pieces ---- */
      var slideK = U.ease(lt, tSlide, P.slide * 0.8);
      var rad = sq * 0.3;
      Object.keys(sc.board).forEach(function (n) {
        var side = sc.board[n];
        var mv = moveOf(sc, n);
        var p = center(g, n);
        var alpha = 1;
        if (mv) {
          var q = center(g, mv);
          p = { x: U.lerp(p.x, q.x, slideK), y: U.lerp(p.y, q.y, slideK) };
        }
        if (sc.captured === n) alpha = 1 - U.clamp((slideK - 0.55) / 0.35, 0, 1);
        if (alpha <= 0) return;
        ctx.fillStyle = f.alpha(side === "p" ? c.accent : c.signal, alpha);
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      });

      /* ---- Move arrow, as the app draws it over the video ---- */
      var tMove = tDiff + 1.6;
      if (lt >= tMove) {
        var ak = U.ease(lt, tMove, 0.6);
        arrow(ctx, center(g, sc.move.slice(0, 2)), center(g, sc.move.slice(2, 4)), ak, c.ink, Math.max(2, 2.5 * u), sq);
      }

      /* ---- Frame label ---- */
      ctx.fillStyle = c.ink3; ctx.font = f.font(11 * u); ctx.textAlign = "left";
      var fl2 = lt < tAfter ? "before the move" : "after the move";
      ctx.fillText(g.narrow ? fl2[0].toUpperCase() + fl2.slice(1) : "Camera frame " + fl2, g.bx, g.by - Math.max(8 * u, 7));

      /* ---- Readout ---- */
      var x = g.px, y = g.py, lh = g.lh;
      ctx.textAlign = "left";
      ctx.fillStyle = c.ink2; ctx.font = f.font(11.5 * u, 560);
      ctx.fillText(g.narrow ? "Player's squares" : "Compare the player's squares", x, y);
      y += lh * 1.15;
      if (showDiff) {
        line(f, x, y, "Emptied", set(sc.starts), U.ease(lt, tDiff, 0.5), u, g); y += lh;
        line(f, x, y, "Filled", set(sc.ends), U.ease(lt, tDiff + 0.6, 0.5), u, g); y += lh;
        if (sc.note && lt >= tDiff + 1.1) {
          ctx.fillStyle = f.alpha(c.ink3, U.ease(lt, tDiff + 1.1, 0.5)); ctx.font = f.font(10.5 * u);
          ctx.fillText(g.narrow ? sc.noteShort : sc.note, x, y);
        }
        y += lh;
        if (lt >= tMove) {
          ctx.globalAlpha = U.ease(lt, tMove, 0.5);
          ctx.fillStyle = c.ink2; ctx.font = f.font(12 * u);
          ctx.fillText("Move", x, y);
          ctx.fillStyle = c.ink; ctx.font = f.mono(14 * u, 600);
          ctx.fillText(sc.move, x + g.col, y);
          ctx.globalAlpha = 1;
        }
        y += lh * 1.25;
        if (lt >= tVerdict) {
          ctx.fillStyle = c.good; ctx.font = f.font(13.5 * u, 620);
          ctx.globalAlpha = U.ease(lt, tVerdict, 0.5);
          ctx.fillText(g.narrow ? "Stockfish: legal" : "Stockfish: legal, play on", x, y);
          ctx.globalAlpha = 1;
        }
      }
    }
  });

  function moveOf(sc, n) { return sc.slides[n] || null; }
  function set(list) { return "{" + list.join(", ") + "}"; }

  function layout(f) {
    var W = f.w, H = f.h, u = U.unit(f);
    var lh = Math.max(19 * u, 16);
    if (W < 480) {
      /* Narrow: smaller board on the left, a slimmer readout beside it. */
      var sideN = Math.min(H * 0.76, W * 0.5);
      var bxN = Math.max(16 * u, 14);
      return {
        narrow: true, lh: lh, side: sideN, bx: bxN, by: (H - sideN) / 2 + 6,
        px: bxN + sideN + Math.max(14 * u, 12), py: H * 0.24, col: Math.max(52 * u, 46)
      };
    }
    var side = Math.min(H * 0.8, W * 0.5);
    var bx = W * 0.06, by = (H - side) / 2 + 4 * u;
    return {
      narrow: false, lh: lh, side: side, bx: bx, by: by,
      px: bx + side + W * 0.07, py: H * 0.34, col: Math.max(60 * u, 50)
    };
  }

  function cell(g, n) {
    var sq = g.side / 8;
    var fi = FILES.indexOf(n[0]), r = +n[1] - 1;
    return { x: g.bx + fi * sq, y: g.by + (7 - r) * sq };
  }
  function center(g, n) {
    var p = cell(g, n), sq = g.side / 8;
    return { x: p.x + sq / 2, y: p.y + sq / 2 };
  }

  function line(f, x, y, label, value, a, u, g) {
    var ctx = f.ctx;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.c.ink2; ctx.font = f.font(12 * u); ctx.textAlign = "left";
    ctx.fillText(label, x, y);
    ctx.fillStyle = f.c.accent; ctx.font = f.mono(12.5 * u, 560);
    ctx.fillText(value, x + g.col, y);
    ctx.globalAlpha = 1;
  }

  function arrow(ctx, a, b, k, color, w, sq) {
    var ex = U.lerp(a.x, b.x, k), ey = U.lerp(a.y, b.y, k);
    var ang = Math.atan2(ey - a.y, ex - a.x), hl = Math.max(sq * 0.32, 7);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex - Math.cos(ang) * hl * 0.6, ey - Math.sin(ang) * hl * 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang - 0.45) * hl, ey - Math.sin(ang - 0.45) * hl);
    ctx.lineTo(ex - Math.cos(ang + 0.45) * hl, ey - Math.sin(ang + 0.45) * hl);
    ctx.closePath(); ctx.fill();
    ctx.lineCap = "butt";
  }
})();
