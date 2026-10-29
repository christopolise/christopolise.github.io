/* TCAM with multimodal LLMs: haze or fog, and new cities.
 * Beat 1 ("Haze or fog?"): a traffic-camera frame that looks hazy gets a wide,
 * ambiguous PM2.5 reading from the image alone. PGML-TCAM's physics-guided
 * indicators (visibility level, wind dispersion, weather obstruction risk,
 * nighttime stagnation risk, haze source hypothesis) light up one by one from
 * the weather inputs (wind, humidity, cloud cover); each leans toward pollution
 * (terracotta) or toward weather or light (sky blue), and the model's estimate
 * (teal) narrows. The scene cycles fog -> pollution haze -> low light, one per
 * loop, or by the button.
 * Beat 2 ("New cities"): the eight Utah test cities (three seen in training,
 * five unseen) and each city's MAE for every model, CNN baselines vs. other
 * MLLMs vs. PGML-TCAM.
 *
 * Real (poster, TCAM: Traffic-Camera-Based Air Quality Monitoring Using MLLMs,
 * 2026): the indicator names; the weather inputs; the eight cities and which
 * were seen in training; the per-city, per-model MAE (read from the bar heights
 * of the poster's Results chart, about +/-0.05 ug/m3); the PurpleAir sensor
 * error band 3.4-3.8 ug/m3 (chart legend); and the summary numbers in the
 * Results text. Synthetic: the scenes, the weather and indicator values, the
 * indicator leans and every PM2.5 estimate in beat 1; city dot positions are
 * approximate. */
(function () {
  "use strict";
  var U = Fig.util;

  /* Model order of the poster's chart legend; fam: 0 = CNN, 1 = other MLLM, 2 = PGML-TCAM. */
  var MODELS = [
    ["EffNet-B0 (image)", 0], ["EffNet-B0 (image + weather)", 0],
    ["ResNet50 (image)", 0], ["ResNet50 (image + weather)", 0],
    ["Gemma-3 (image)", 1], ["Gemma-3 (weather)", 1], ["Gemma-3 (image + weather)", 1],
    ["Qwen3-VL-4B-Instruct (image)", 1], ["Qwen3-VL-4B-Instruct (weather)", 1], ["Qwen3-VL-4B-Instruct (image + weather)", 1],
    ["Qwen-3.5 4B (image)", 1], ["Qwen-3.5 4B (weather)", 1], ["Qwen-3.5 4B (image + weather)", 1],
    ["Qwen-3.5 9B (image + weather)", 1], ["Qwen-3.5 PGML-TCAM", 2]
  ];

  /* MAE in ug/m3, in MODELS order, measured from the poster's per-city bar chart.
     lat/lon are approximate town centres (map dots only). */
  var CITIES = [
    { name: "Lindon", short: "Lindon", seen: true, lat: 40.343, lon: -111.721,
      mae: [2.22, 2.09, 2.52, 2.49, 4.71, 14.24, 2.89, 3.69, 5.38, 2.95, 3.39, 2.95, 2.66, 2.82, 2.66] },
    { name: "Rose Park", short: "Rose Park", seen: true, lat: 40.795, lon: -111.935,
      mae: [2.72, 2.95, 2.62, 2.52, 4.52, 17.16, 3.05, 3.42, 6.34, 2.89, 3.62, 3.25, 2.92, 3.05, 2.82] },
    { name: "West Valley City", short: "W. Valley", seen: true, lat: 40.692, lon: -112.001,
      mae: [2.42, 2.72, 2.56, 2.66, 4.42, 16.70, 2.79, 4.02, 6.04, 2.62, 3.62, 3.15, 2.89, 2.92, 2.62] },
    { name: "Enoch", short: "Enoch", seen: false, lat: 37.773, lon: -113.025,
      mae: [3.32, 2.89, 3.02, 2.42, 5.38, 19.62, 3.12, 3.59, 6.21, 3.25, 3.39, 3.09, 2.39, 2.46, 2.36] },
    { name: "Hurricane", short: "Hurricane", seen: false, lat: 37.175, lon: -113.290,
      mae: [2.99, 2.32, 2.76, 2.46, 5.68, 22.61, 3.49, 3.78, 5.54, 3.19, 3.35, 3.22, 2.39, 1.99, 2.09] },
    { name: "Moab", short: "Moab", seen: false, lat: 38.573, lon: -109.550,
      mae: [3.78, 3.75, 3.75, 3.78, 5.91, 25.86, 4.58, 4.78, 6.67, 4.22, 4.58, 4.32, 3.85, 3.88, 3.85] },
    { name: "Sandy", short: "Sandy", seen: false, lat: 40.565, lon: -111.839,
      mae: [2.36, 2.39, 2.19, 2.19, 4.85, 17.66, 2.56, 3.19, 5.88, 2.39, 2.92, 2.72, 2.46, 2.49, 2.19] },
    { name: "Smithfield", short: "Smithfield", seen: false, lat: 41.838, lon: -111.833,
      mae: [2.86, 2.22, 2.69, 2.26, 5.18, 17.46, 2.99, 3.62, 5.68, 2.42, 2.66, 2.82, 1.99, 1.86, 1.79] }
  ];

  /* Utah's outline in lon/lat (the Wyoming notch at the north-east corner). */
  var UTAH = [[-114.05, 42], [-111.05, 42], [-111.05, 41], [-109.05, 41], [-109.05, 37], [-114.05, 37]];

  var IND = ["Visibility level", "Wind dispersion", "Weather obstruction risk", "Nighttime stagnation risk", "Haze source hypothesis"];
  var IND_SHORT = ["Visibility", "Wind", "Obstruction", "Night stagnation", "Haze source"];

  Fig.register("tcam-mllm-physics", {
    config: {
      /* Beat 1 scenes (all values illustrative). ind rows: [verdict, weather value, lean];
         lean -1 = points to pollution, +1 = points to weather or light. final = PM2.5 estimate. */
      scenes: [
        { key: "fog", label: "fog", time: "07:10", wind: "0.5 m/s", rh: "97%", cloud: "100%", final: 7,
          ind: [["very low", "0.8 km", 0.2], ["weak", "0.5 m/s", -0.4], ["high: fog", "RH 97%", 0.9],
                ["low", "07:10", 0.05], ["fog, not pollution", "", 0.85]] },
        { key: "haze", label: "pollution haze", time: "14:00", wind: "0.8 m/s", rh: "35%", cloud: "5%", final: 29,
          ind: [["reduced", "6 km", -0.35], ["stagnant", "0.8 m/s", -0.7], ["low", "cloud 5%", -0.5],
                ["high", "calm night", -0.45], ["pollution", "", -0.85]] },
        { key: "dark", label: "low light", time: "21:30", wind: "4.2 m/s", rh: "40%", cloud: "15%", final: 6,
          ind: [["good", "16 km", 0.55], ["strong", "4.2 m/s", 0.5], ["low", "RH 40%", -0.15],
                ["low", "21:30", 0.4], ["low light, not pollution", "", 0.8]] }
      ],
      pmMax: 40,          // ug/m3, right end of the estimate scale
      imgBand: [8, 34],   // ug/m3, the ambiguous image-only reading (illustrative)
      finalHalf: 2.5,     // ug/m3, half-width of the settled estimate band (illustrative)
      // Beat 1 timeline (s from the start of each loop)
      sceneIn: 0.6,       // scene fades in
      imageAt: 1.0,       // image-only band appears
      indStart: 2.0,      // first indicator lights
      indStep: 0.9,       // s between indicators
      indDur: 0.7,        // s for one indicator's bar to grow
      resolveAt: 6.8,     // estimate settles, haze source tag appears
      resolveDur: 1.0,
      beat1: 11,          // s, length of beat 1
      // Beat 2 timeline (s from the start of beat 2)
      beat2: 10,          // s, length of beat 2
      rowStart: 0.9,      // first city row appears
      rowStep: 0.45,      // s between city rows
      rowDur: 0.5,
      statsAt: 5.0,       // summary numbers appear
      fade: 0.5,          // s of cross-fade between beats
      maeAxis: [1.5, 7],  // ug/m3 shown on the city strips (values above are drawn as off-scale arrows)
      sensor: [3.4, 3.8], // ug/m3, PurpleAir sensor MAE range (poster chart legend)
      carSpeed: 0.08,     // fraction of the road per second
      stillAt: 9          // s: key frame (fog scene, indicators lit, estimate settled)
    },

    setup: function (f) {
      var s = f.state;
      if (s.scene == null) s.scene = 0;
      if (!s.btn) {
        s.btn = f.button("Show " + f.cfg.scenes[1].label, function () {
          s.scene = (s.shown + 1) % f.cfg.scenes.length;
          f.restart(true);
        });
      }
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, cfg = f.cfg, ctx = f.ctx;
      var loop = cfg.beat1 + cfg.beat2;
      var cycle = Math.floor(t / loop), lt = t - cycle * loop;
      var si = (s.scene + cycle) % cfg.scenes.length;
      if (s.shown !== si) {
        s.shown = si;
        if (s.btn) s.btn.textContent = "Show " + cfg.scenes[(si + 1) % cfg.scenes.length].label;
      }
      var a1, a2;
      if (lt < cfg.beat1) {
        a1 = lt < cfg.sceneIn && cycle > 0 ? U.clamp(lt / cfg.fade, 0, 1) : 1;
        a1 *= 1 - U.clamp((lt - (cfg.beat1 - cfg.fade)) / cfg.fade, 0, 1);
        ctx.globalAlpha = a1;
        beat1(f, lt, cfg.scenes[si]);
      } else {
        var bt = lt - cfg.beat1;
        a2 = U.clamp(bt / cfg.fade, 0, 1) * (1 - U.clamp((bt - (cfg.beat2 - cfg.fade)) / cfg.fade, 0, 1));
        ctx.globalAlpha = a2;
        beat2(f, bt);
      }
      ctx.globalAlpha = 1;
    }
  });

  /* ---------- shared helpers ---------- */

  function mode(f) {
    var W = f.w;
    return { compact: f.compact, narrow: !f.compact && W < 480, S: W < 480 ? 1 : U.clamp(W / 640, 0.85, 1.2) };
  }
  function fz(m, n) { return Math.max(10.5, n * m.S); }

  /* Theme check from the background colour (the kit may hand back rgb() or oklch()). */
  function isDark(c) {
    var p = c.bg.match(/[\d.]+/g);
    if (!p) return false;
    if (/ok|lab|lch/.test(c.bg)) return +p[0] < (c.bg.indexOf("%") > 0 ? 50 : 0.5);
    return (+p[0] + +p[1] + +p[2]) / 3 < 128;
  }

  function pill(f, x, y, text, font, fg, bg, align) {
    var ctx = f.ctx;
    ctx.font = font;
    var tw = ctx.measureText(text).width, h = parseFloat(font.match(/([\d.]+)px/)[1]) + 8, pad = 6;
    var x0 = align === "right" ? x - tw - 2 * pad : x;
    U.rr(ctx, x0, y, tw + 2 * pad, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, x0 + pad, y + h / 2 + 0.5);
    ctx.textBaseline = "alphabetic";
    return tw + 2 * pad;
  }

  function header(f, m, title, sub) {
    var ctx = f.ctx, c = f.c, W = f.w, H = f.h, pad = W * 0.04;
    var y = m.narrow ? 17 : H * 0.075;
    ctx.textAlign = "left"; ctx.fillStyle = c.ink; ctx.font = f.font(fz(m, 13), 640);
    ctx.fillText(title, pad, y);
    if (sub) {
      var tw = ctx.measureText(title).width;
      ctx.font = f.font(fz(m, 11)); ctx.fillStyle = c.ink3;
      if (pad + tw + 10 + ctx.measureText(sub).width < W - pad) ctx.fillText(sub, pad + tw + 10, y);
    }
  }

  /* ---------- beat 1: haze or fog? ---------- */

  function geo1(f, m) {
    var W = f.w, H = f.h, pad = W * 0.04;
    if (m.compact) {
      return { sx: pad, sy: H * 0.09, sw: W * 0.5, sh: H * 0.52,
        ey: H * 0.76, px: W * 0.6, px1: W - pad, py: H * 0.12, py1: H * 0.9 };
    }
    if (m.narrow) {
      return { sx: 12, sy: 28, sw: W * 0.47, sh: H * 0.42,
        wy: 28 + H * 0.42 + 16, ey: H * 0.74, px: W * 0.55, px1: W - 12, py: 30, py1: H - 8 };
    }
    return { sx: pad, sy: H * 0.13, sw: W * 0.44, sh: H * 0.5,
      wy: H * 0.63 + 18, ey: H * 0.8, px: W * 0.53, px1: W - pad, py: H * 0.13, py1: H * 0.96 };
  }

  function beat1(f, t, sc) {
    var c = f.c, ctx = f.ctx, cfg = f.cfg, W = f.w, H = f.h;
    var m = mode(f), g = geo1(f, m);
    var resolve = U.ease(t, cfg.resolveAt, cfg.resolveDur);

    if (!m.compact) header(f, m, "Haze or fog?", m.narrow ? null : "camera frame + weather → physics indicators → PM2.5");

    // Scene
    var sa = U.ease(t, 0, cfg.sceneIn);
    ctx.save(); ctx.globalAlpha *= sa;
    drawScene(f, g.sx, g.sy, g.sw, g.sh, sc, t);
    ctx.restore();

    // Haze source tag inside the scene
    var lean5 = sc.ind[4][2];
    if (!m.compact) {
      var tagFont = f.font(fz(m, 11), 600);
      var tx = g.sx + 8, ty = g.sy + 8;
      if (resolve > 0.05) {
        var txt = m.narrow ? sc.ind[4][0].split(/[,:]/)[0] : sc.ind[4][0];
        ctx.save(); ctx.globalAlpha *= resolve;
        pill(f, tx, ty, txt, tagFont, c.bg, lean5 < 0 ? c.signal : c.third);
        ctx.restore();
      } else if (t > cfg.imageAt) {
        pill(f, tx, ty, "haze?", tagFont, c.ink, f.alpha(c.bg, 0.85));
      }
      // Timestamp
      ctx.font = f.mono(fz(m, 10.5)); ctx.textAlign = "right"; ctx.fillStyle = c.ink;
      pill(f, g.sx + g.sw - 8, g.sy + g.sh - 8 - (fz(m, 10.5) + 8), "cam " + sc.time, f.mono(fz(m, 10.5)), c.ink, f.alpha(c.bg, 0.8), "right");
    } else {
      // Thumbnail: a bold colour chip for the verdict
      if (resolve > 0.05) {
        ctx.save(); ctx.globalAlpha *= resolve;
        U.rr(ctx, g.sx + 12, g.sy + 12, 56, 20, 10); ctx.fillStyle = lean5 < 0 ? c.signal : c.third; ctx.fill();
        ctx.restore();
      }
    }

    // Weather inputs under the scene
    if (!m.compact && t > cfg.sceneIn * 0.5) {
      ctx.textAlign = "left"; ctx.font = f.mono(fz(m, 11)); ctx.fillStyle = c.ink2;
      if (m.narrow) {
        ctx.fillText("wind " + sc.wind + " · RH " + sc.rh, g.sx, g.wy);
        ctx.fillText("cloud " + sc.cloud, g.sx, g.wy + 15);
      } else {
        ctx.fillText("wind " + sc.wind + " · humidity " + sc.rh + " · cloud " + sc.cloud, g.sx, g.wy);
      }
    }

    // Indicators
    var lit = [];
    for (var i = 0; i < 5; i++) lit.push(U.ease(t, cfg.indStart + i * cfg.indStep, cfg.indDur));
    drawIndicators(f, m, g, sc, lit, t);

    // Estimate
    var prog = 0;
    for (i = 0; i < 5; i++) prog += lit[i];
    prog = U.clamp(prog / 5 * 0.7 + resolve * 0.3, 0, 1);
    drawEstimate(f, m, g, sc, t, prog, resolve);
  }

  function drawIndicators(f, m, g, sc, lit, t) {
    var c = f.c, ctx = f.ctx, cfg = f.cfg;
    var x0 = g.px, x1 = g.px1, w = x1 - x0;
    var top = g.py, rows = 5;
    var hdr = m.compact ? 0 : (m.narrow ? 16 : 34 * m.S);
    if (!m.compact) {
      ctx.font = f.font(fz(m, 11), 600); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
      if (!m.narrow) ctx.fillText("Physics-guided indicators", x0, top + 10);
    }
    var rowH = (g.py1 - top - hdr) / rows;
    var trackX0 = x0, trackX1 = x1, mid = (trackX0 + trackX1) / 2, half = (trackX1 - trackX0) / 2;

    // Lean axis labels
    if (!m.compact) {
      ctx.font = f.font(fz(m, 10.5), 560);
      var ly = m.narrow ? top + 8 : top + 10 + 17 * m.S;
      ctx.fillStyle = c.signal; ctx.textAlign = "left";
      ctx.fillText(m.narrow ? "◂ pollution" : "◂ points to pollution", x0, ly);
      ctx.fillStyle = c.third; ctx.textAlign = "right";
      ctx.fillText(m.narrow ? "weather/light ▸" : "to weather or light ▸", x1, ly);
    }

    for (var i = 0; i < rows; i++) {
      var ry = top + hdr + i * rowH, k = lit[i], last = i === 4;
      var row = sc.ind[i], lean = row[2];
      var col = lean < 0 ? c.signal : c.third;
      var barH = m.compact ? (last ? 32 : 22) : Math.max(6, (last ? 10 : 7) * m.S);
      var by;
      if (m.compact) {
        by = ry + rowH / 2 - barH / 2;
      } else {
        // line 1: name + verdict
        var ty = ry + rowH * 0.42;
        ctx.textAlign = "left";
        ctx.font = f.font(fz(m, last ? 12 : 11.5), last ? 650 : 540);
        ctx.fillStyle = k > 0.02 ? c.ink : c.ink3;
        ctx.fillText(m.narrow || w < 300 ? IND_SHORT[i] : IND[i], x0, ty);
        if (k > 0.02) {
          var verdict = m.narrow ? row[0].split(/[,:]/)[0] : row[0] + (row[1] ? " · " + row[1] : "");
          ctx.save(); ctx.globalAlpha *= k;
          ctx.textAlign = "right";
          ctx.font = last ? f.font(fz(m, 12), 650) : f.mono(fz(m, 11));
          ctx.fillStyle = last ? col : c.ink2;
          ctx.fillText(verdict, x1, ty);
          ctx.restore();
        }
        by = ry + rowH * 0.62;
      }
      // track
      U.rr(ctx, trackX0, by + barH / 2 - 1, trackX1 - trackX0, 2, 1); ctx.fillStyle = c.line; ctx.fill();
      ctx.fillStyle = c.lineStrong; ctx.fillRect(mid - 1, by - 2, 2, barH + 4);
      if (k > 0) {
        var len = Math.max(barH, Math.abs(lean) * half * k);
        var bx = lean < 0 ? mid - len : mid;
        U.rr(ctx, bx, by, len, barH, barH / 2);
        ctx.fillStyle = Math.abs(lean) < 0.1 ? c.ink3 : col; ctx.fill();
        // a brief glow as the row lights
        var glow = U.clamp(1 - (t - (cfg.indStart + i * cfg.indStep)) / 0.8, 0, 1) * (k > 0 ? 1 : 0);
        if (glow > 0 && !m.compact) {
          U.rr(ctx, x0 - 6, ry + 2, w + 12, rowH - 4, 6); ctx.fillStyle = f.alpha(c.accent, 0.1 * glow); ctx.fill();
        }
      }
    }
  }

  function drawEstimate(f, m, g, sc, t, prog, resolve) {
    var c = f.c, ctx = f.ctx, cfg = f.cfg;
    var x0 = g.sx, x1 = g.sx + g.sw, w = x1 - x0;
    var trackH = m.compact ? 26 : Math.max(8, 9 * m.S);
    var ty = m.compact ? g.ey : g.ey + (m.narrow ? 14 : 16);
    function X(v) { return x0 + w * U.clamp(v / cfg.pmMax, 0, 1); }

    if (!m.compact) {
      ctx.textAlign = "left"; ctx.font = f.font(fz(m, 11.5), 600); ctx.fillStyle = c.ink2;
      ctx.fillText(m.narrow ? "PM2.5 estimate" : "PM2.5 estimate (µg/m³)", x0, g.ey);
    }
    // track
    U.rr(ctx, x0, ty, w, trackH, trackH / 2); ctx.fillStyle = c.line; ctx.fill();
    if (!m.compact) {
      ctx.font = f.mono(fz(m, 10.5)); ctx.fillStyle = c.ink3;
      var step = m.narrow ? 20 : 10;
      for (var v = 0; v <= cfg.pmMax; v += step) {
        ctx.textAlign = v === 0 ? "left" : v === cfg.pmMax ? "right" : "center";
        ctx.fillText(String(v), X(v), ty + trackH + fz(m, 10.5) + 4);
      }
    }
    var show = U.ease(t, cfg.imageAt, 0.6);
    if (show <= 0) return;
    var lo = U.lerp(cfg.imgBand[0], sc.final - cfg.finalHalf, prog);
    var hi = U.lerp(cfg.imgBand[1], sc.final + cfg.finalHalf, prog);
    ctx.save(); ctx.globalAlpha *= show;
    // image-only ghost band stays faintly as a reference once the estimate moves
    if (prog > 0.05) {
      U.rr(ctx, X(cfg.imgBand[0]), ty, X(cfg.imgBand[1]) - X(cfg.imgBand[0]), trackH, trackH / 2);
      ctx.strokeStyle = f.alpha(c.ink3, 0.5); ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
    U.rr(ctx, X(lo), ty, Math.max(trackH, X(hi) - X(lo)), trackH, trackH / 2);
    ctx.fillStyle = prog < 0.05 ? f.alpha(c.ink3, 0.55) : f.alpha(c.accent, 0.35 + 0.5 * prog); ctx.fill();
    // centre marker
    var mid = (lo + hi) / 2;
    ctx.fillStyle = prog < 0.05 ? c.ink2 : c.accent;
    ctx.fillRect(X(mid) - 1.5, ty - (m.compact ? 8 : 4), 3, trackH + (m.compact ? 16 : 8));
    // value text
    if (!m.compact) {
      ctx.textAlign = "right"; ctx.font = f.mono(fz(m, 11.5), 600);
      if (resolve > 0.5) {
        ctx.fillStyle = c.accent;
        ctx.fillText((m.narrow ? "≈ " : "PGML-TCAM ≈ ") + sc.final, x1, g.ey);
      } else {
        ctx.fillStyle = c.ink3;
        ctx.fillText(prog < 0.05 ? (m.narrow ? "image: ?" : "image alone: " + cfg.imgBand[0] + "–" + cfg.imgBand[1] + "?") : Math.round(lo) + "–" + Math.round(hi), x1, g.ey);
      }
    }
    ctx.restore();
  }

  /* A stylised traffic-camera frame: mountains, a road with cars, light poles,
     and the scene's veil (pollution haze, fog, or night). */
  function drawScene(f, x, y, w, h, sc, t) {
    var c = f.c, ctx = f.ctx, cfg = f.cfg, dark = isDark(c);
    var shade = dark ? c.bg : c.ink, bright = dark ? c.ink : c.bg;
    var hz = y + h * 0.44, vp = x + w * 0.58;
    ctx.save();
    U.rr(ctx, x, y, w, h, 8); ctx.clip();
    // sky and ground
    ctx.fillStyle = c.thirdSoft; ctx.fillRect(x, y, w, hz - y);
    ctx.fillStyle = c.sunk; ctx.fillRect(x, hz, w, y + h - hz);
    // mountains
    var peaks = [0, 0.55, 0.12, 0.2, 0.25, 0.7, 0.38, 0.35, 0.5, 0.85, 0.62, 0.45, 0.74, 0.6, 0.86, 0.3, 1, 0.5];
    ctx.beginPath(); ctx.moveTo(x, hz);
    for (var i = 0; i < peaks.length; i += 2) ctx.lineTo(x + w * peaks[i], hz - h * 0.22 * peaks[i + 1]);
    ctx.lineTo(x + w, hz); ctx.closePath();
    ctx.fillStyle = sc.key === "dark" ? f.alpha(shade, 0.5) : c.lineStrong; ctx.fill();
    // road
    var bl = x + w * 0.02, br = x + w * 1.05;
    ctx.beginPath(); ctx.moveTo(vp - w * 0.015, hz); ctx.lineTo(vp + w * 0.015, hz); ctx.lineTo(br, y + h); ctx.lineTo(bl, y + h); ctx.closePath();
    ctx.fillStyle = f.alpha(c.ink3, 0.4); ctx.fill();
    // lane dashes (moving toward the camera)
    var lanes = [0.33, 0.5, 0.67];
    ctx.strokeStyle = f.alpha(bright, 0.8); ctx.lineWidth = 1.5;
    lanes.forEach(function (ln) {
      for (var d = 0; d < 8; d++) {
        var q0 = ((d / 8 + t * cfg.carSpeed * 0.6) % 1), q1 = q0 + 0.035;
        var p0 = roadPt(q0, ln), p1 = roadPt(Math.min(q1, 1), ln);
        ctx.lineWidth = 0.6 + 2 * q0; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
    });
    function roadPt(q, lane) {
      // q: 0 at the horizon, 1 at the bottom (perspective-spaced)
      var qq = q * q;
      var yy = hz + (y + h - hz) * qq;
      var l = U.lerp(vp - w * 0.015, bl, qq), r = U.lerp(vp + w * 0.015, br, qq);
      return { x: U.lerp(l, r, lane), y: yy, s: qq };
    }
    // light poles on the right verge
    var poles = [];
    for (i = 0; i < 4; i++) {
      var pq = 0.35 + i * 0.2, pb = roadPt(pq, 1.02), ph = h * 0.32 * pb.s + 4;
      ctx.strokeStyle = sc.key === "dark" ? f.alpha(shade, 0.6) : c.ink3; ctx.lineWidth = 1 + pb.s * 1.5;
      ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pb.x, pb.y - ph); ctx.lineTo(pb.x - 6 * pb.s - 2, pb.y - ph); ctx.stroke();
      poles.push({ x: pb.x - 6 * pb.s - 2, y: pb.y - ph, s: pb.s });
    }
    // cars: inbound (toward camera) in the left lanes, outbound in the right lanes
    var cars = [];
    for (i = 0; i < 9; i++) {
      var inbound = i % 2 === 0;
      var lane = inbound ? (i % 4 === 0 ? 0.2 : 0.4) : (i % 3 === 0 ? 0.6 : 0.8);
      var ph0 = (i * 0.37) % 1, q = ((ph0 + (inbound ? 1 : -1) * t * cfg.carSpeed) % 1 + 1) % 1;
      cars.push({ q: q, p: roadPt(q, lane), inbound: inbound });
    }
    cars.sort(function (a, b) { return a.q - b.q; });
    cars.forEach(function (cr) {
      var p = cr.p, cw = w * 0.11 * p.s + 2, ch = cw * 0.55;
      U.rr(ctx, p.x - cw / 2, p.y - ch, cw, ch, Math.min(3, ch / 3));
      ctx.fillStyle = sc.key === "dark" ? f.alpha(shade, 0.75) : (cr.inbound ? c.ink2 : c.ink3); ctx.fill();
    });

    // veil
    var gr;
    if (sc.key === "haze") {
      gr = ctx.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, f.alpha(c.signal, 0.22)); gr.addColorStop(0.44, f.alpha(c.signal, 0.42));
      gr.addColorStop(1, f.alpha(c.signal, 0.1));
      ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
    } else if (sc.key === "fog") {
      gr = ctx.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, f.alpha(c.thirdSoft, 0.88)); gr.addColorStop(0.45, f.alpha(c.thirdSoft, 0.93));
      gr.addColorStop(1, f.alpha(c.thirdSoft, 0.45));
      ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
      // slow drifting fog banks
      for (i = 0; i < 3; i++) {
        var fx = x + ((i * 0.41 + t * 0.02) % 1.4 - 0.2) * w, fy = hz + (i - 1) * h * 0.12;
        var rg = ctx.createRadialGradient(fx, fy, 0, fx, fy, w * 0.35);
        rg.addColorStop(0, f.alpha(c.third, 0.16)); rg.addColorStop(1, f.alpha(c.third, 0));
        ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
      }
    } else {
      ctx.fillStyle = f.alpha(shade, dark ? 0.55 : 0.58); ctx.fillRect(x, y, w, h);
      // lamps and headlights
      poles.forEach(function (pl) {
        var r = 10 + 18 * pl.s, rg2 = ctx.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, r);
        rg2.addColorStop(0, f.alpha(bright, 0.42)); rg2.addColorStop(1, f.alpha(bright, 0));
        ctx.fillStyle = rg2; ctx.beginPath(); ctx.arc(pl.x, pl.y, r, 0, Math.PI * 2); ctx.fill();
      });
      cars.forEach(function (cr) {
        var p = cr.p, cw = w * 0.11 * p.s + 2, ch = cw * 0.55, r = Math.max(1.2, cw * 0.09);
        ctx.fillStyle = cr.inbound ? bright : c.signal;
        ctx.beginPath(); ctx.arc(p.x - cw * 0.3, p.y - ch * 0.35, r, 0, Math.PI * 2); ctx.arc(p.x + cw * 0.3, p.y - ch * 0.35, r, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
    U.rr(ctx, x, y, w, h, 8); ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke();
  }

  /* ---------- beat 2: new cities ---------- */

  function beat2(f, bt) {
    var c = f.c, ctx = f.ctx, cfg = f.cfg, W = f.w, H = f.h;
    var m = mode(f), pad = m.narrow ? 12 : W * 0.04;
    var showMap = !m.narrow;

    if (!m.compact) header(f, m, "New cities", m.narrow ? null : "trained on 3 cities, tested on 5 it never saw (April 2025, 22,387 images)");

    // Which row is being revealed
    var rev = [];
    for (var i = 0; i < CITIES.length; i++) rev.push(U.ease(bt, cfg.rowStart + i * cfg.rowStep, cfg.rowDur));
    var active = Math.floor((bt - cfg.rowStart) / cfg.rowStep);

    // Map
    var mapR;
    if (showMap) {
      var bx0 = pad, bw = m.compact ? W * 0.34 : W * 0.24, by0 = m.compact ? H * 0.1 : H * 0.15, bh = m.compact ? H * 0.8 : H * 0.56;
      var asp = Math.cos(39.5 * Math.PI / 180); // lon/lat scale
      var sy = Math.min(bh / 5, bw / (5 * asp)), sx = sy * asp;
      var mw = 5 * sx, mh = 5 * sy, mx = bx0 + (bw - mw) / 2, my = by0 + (bh - mh) / 2;
      mapR = { x: mx, y: my, w: mw, h: mh };
      var P = function (lon, lat) { return { x: mx + (lon + 114.05) * sx, y: my + (42 - lat) * sy }; };
      ctx.beginPath();
      UTAH.forEach(function (q, k) { var p = P(q[0], q[1]); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      ctx.closePath(); ctx.fillStyle = c.sunk; ctx.fill(); ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1.2; ctx.stroke();
      var dr = m.compact ? 9 : Math.max(3.5, 3.8 * m.S);
      CITIES.forEach(function (ct, k) {
        var p = P(ct.lon, ct.lat);
        if (k === active && rev[k] < 1 && rev[k] > 0) {
          var pr = (bt - cfg.rowStart - k * cfg.rowStep) / cfg.rowStep;
          ctx.strokeStyle = f.alpha(c.accent, 1 - U.clamp(pr, 0, 1)); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, dr + 10 * U.clamp(pr, 0, 1), 0, Math.PI * 2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, dr, 0, Math.PI * 2);
        if (ct.seen) { ctx.fillStyle = c.ink2; ctx.fill(); }
        else { ctx.fillStyle = c.bg; ctx.fill(); ctx.strokeStyle = c.ink; ctx.lineWidth = m.compact ? 3 : 1.6; ctx.stroke(); }
      });
      // label the city being revealed
      if (!m.compact && active >= 0 && active < CITIES.length && bt < cfg.statsAt) {
        var ac = CITIES[active], ap = P(ac.lon, ac.lat);
        ctx.font = f.font(fz(m, 11), 600); ctx.fillStyle = c.ink;
        var lw = ctx.measureText(ac.name).width;
        var lx = ap.x + dr + 6;
        if (lx + lw > mx + mw + 30) lx = ap.x - dr - 6 - lw;
        ctx.textAlign = "left"; ctx.fillText(ac.name, lx, ap.y + 4);
      }
      if (!m.compact) {
        var ly = my + mh + 22;
        ctx.font = f.font(fz(m, 10.5)); ctx.textAlign = "left";
        ctx.beginPath(); ctx.arc(bx0 + 5, ly - 4, 4, 0, Math.PI * 2); ctx.fillStyle = c.ink2; ctx.fill();
        ctx.fillStyle = c.ink2; ctx.fillText("seen in training", bx0 + 14, ly);
        ctx.beginPath(); ctx.arc(bx0 + 5, ly + 12, 4, 0, Math.PI * 2); ctx.fillStyle = c.bg; ctx.fill();
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = c.ink2; ctx.fillText("unseen", bx0 + 14, ly + 16);
      }
    }

    // Strip chart
    var cx0 = showMap ? (m.compact ? W * 0.42 : W * 0.33) : pad;
    var cx1 = W - pad;
    var labW = m.compact ? 0 : (m.narrow ? 66 : 100 * m.S);
    var offW = m.compact ? 22 : 16;
    var ax0 = cx0 + labW, ax1 = cx1 - offW;
    // Vertical layout from the bottom up: two summary lines, axis caption, tick labels.
    var lh = fz(m, 11) + 6;
    var y2 = H - 7, y1 = y2 - lh - 2, capY = y1 - lh - 4, tickY = capY - lh + 2;
    var top = m.compact ? H * 0.1 : (m.narrow ? 46 : H * 0.215);
    var bottom = m.compact ? H * 0.9 : tickY - fz(m, 10.5) - 2;
    var A = cfg.maeAxis;
    function X(v) { return ax0 + (ax1 - ax0) * (v - A[0]) / (A[1] - A[0]); }

    // legend
    if (!m.compact) {
      var lgY = m.narrow ? 34 : H * 0.155, lx2 = cx0;
      ctx.font = f.font(fz(m, 10.5), 540); ctx.textAlign = "left";
      var longL = ["CNN baselines", "other MLLMs", "PGML-TCAM", "PurpleAir sensor error"];
      var shortL = ["CNN", "other MLLMs", "PGML-TCAM", "sensor error"];
      var gap = m.narrow ? 10 : 16;
      var need = longL.reduce(function (a, s2) { return a + 12 + ctx.measureText(s2).width + gap; }, 0);
      var L = m.narrow || need > cx1 - cx0 ? shortL : longL;
      var items = [[c.signal, L[0]], [c.third, L[1]], [c.accent, L[2]]];
      items.forEach(function (it, k) {
        ctx.beginPath(); ctx.arc(lx2 + 4, lgY - 4, k === 2 ? 5 : 3.5, 0, Math.PI * 2); ctx.fillStyle = it[0]; ctx.fill();
        ctx.fillStyle = c.ink2; ctx.fillText(it[1], lx2 + 12, lgY);
        lx2 += 12 + ctx.measureText(it[1]).width + gap;
      });
      ctx.fillStyle = f.alpha(c.ink3, 0.25); ctx.fillRect(lx2, lgY - 9, 8, 10);
      ctx.fillStyle = c.ink2; ctx.fillText(L[3], lx2 + 12, lgY);
    }

    var gh = m.compact ? 0.5 : 0.85; // group header height in rows
    var rowH = (bottom - top) / (CITIES.length + 2 * gh);
    // sensor band
    ctx.fillStyle = f.alpha(c.ink3, 0.16);
    ctx.fillRect(X(cfg.sensor[0]), top, X(cfg.sensor[1]) - X(cfg.sensor[0]), bottom - top);
    // gridlines + ticks
    ctx.font = f.mono(fz(m, 10.5)); ctx.textAlign = "center";
    for (var v = Math.ceil(A[0]); v <= A[1]; v++) {
      ctx.fillStyle = c.line; ctx.fillRect(X(v) - 0.5, top, 1, bottom - top);
      if (!m.compact && (!m.narrow || v % 2 === 1)) { ctx.fillStyle = c.ink3; ctx.fillText(String(v), X(v), tickY); }
    }
    if (!m.compact) {
      ctx.textAlign = "left"; ctx.font = f.font(fz(m, 10.5)); ctx.fillStyle = c.ink3;
      var cap = "MAE, µg/m³ (lower is better), from the poster's per-city chart";
      if (ctx.measureText(cap + " off scale ▸").width + 16 > cx1 - cx0) cap = "MAE µg/m³, from the poster chart";
      ctx.fillText(cap, cx0, capY);
      ctx.textAlign = "right";
      ctx.fillText("off scale ▸", cx1, capY);
    }

    var y = top;
    CITIES.forEach(function (ct, k) {
      if (k === 0 || k === 3) {
        if (!m.compact) {
          ctx.font = f.font(fz(m, 10.5), 650); ctx.textAlign = "left"; ctx.fillStyle = c.ink3;
          ctx.fillText(k === 0 ? "SEEN IN TRAINING" : "UNSEEN", cx0, y + rowH * gh * 0.72);
        } else if (k === 3) {
          ctx.fillStyle = c.lineStrong; ctx.fillRect(cx0, y + rowH * gh / 2 - 1, cx1 - cx0, 2);
        }
        y += rowH * gh;
      }
      var cy = y + rowH / 2, r = rev[k];
      if (!m.compact) {
        ctx.font = f.font(fz(m, 11), k === active && bt < cfg.statsAt ? 650 : 520); ctx.textAlign = "left";
        ctx.fillStyle = r > 0 ? c.ink : c.ink3;
        ctx.fillText(m.narrow ? ct.short : ct.name, cx0, cy + 4);
      }
      ctx.fillStyle = c.line; ctx.fillRect(ax0, cy - 0.5, ax1 - ax0, 1);
      if (r > 0) {
        ctx.save(); ctx.globalAlpha *= r;
        var dr = m.compact ? 6 : Math.max(3, 3.4 * m.S);
        ct.mae.forEach(function (val, j) {
          var fam = MODELS[j][1];
          if (fam === 2) return;
          var col = fam === 0 ? c.signal : c.third;
          if (val > A[1]) {
            // off the scale: a small arrow at the right edge
            var ex = ax1 + 4, s = m.compact ? 9 : 5;
            ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex, cy - s); ctx.lineTo(ex + s * 1.4, cy); ctx.lineTo(ex, cy + s); ctx.closePath(); ctx.fill();
            return;
          }
          var oy = fam === 0 ? -dr * 0.9 : dr * 0.9;
          ctx.beginPath(); ctx.arc(X(val), cy + oy, dr, 0, Math.PI * 2);
          ctx.fillStyle = f.alpha(col, 0.8); ctx.fill();
        });
        // PGML-TCAM
        var pv = ct.mae[14], pr = m.compact ? 11 : Math.max(5.5, 6 * m.S);
        var sc2 = U.ease(bt, cfg.rowStart + k * cfg.rowStep + 0.15, cfg.rowDur);
        ctx.beginPath(); ctx.arc(X(pv), cy, pr * sc2, 0, Math.PI * 2);
        ctx.fillStyle = c.accent; ctx.fill(); ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      }
      y += rowH;
    });

    // Summary numbers (poster Results text)
    if (!m.compact) {
      var sa = U.ease(bt, cfg.statsAt, 0.8);
      if (sa > 0) {
        ctx.save(); ctx.globalAlpha *= sa;
        statLine(f, m, pad, y1, m.narrow ? "All 8:" : "PGML-TCAM, all 8 cities:",
          "r 0.401 · MAE 2.47 · MAPE 50.0% · RMSE 3.69", m.narrow ? null : "best (RMSE tied)");
        statLine(f, m, pad, y2, m.narrow ? "5 unseen:" : "5 unseen cities:",
          m.narrow ? "RMSE 3.62 · MAE 2.39 · transfer 0.926"
                   : "RMSE 3.62 · MAE 2.39 · transferability 0.926", m.narrow ? null : "best");
        ctx.restore();
      }
    }
  }

  function statLine(f, m, x, y, label, vals, note) {
    var ctx = f.ctx, c = f.c;
    ctx.textAlign = "left"; ctx.font = f.font(fz(m, 11.5), 620); ctx.fillStyle = c.ink;
    ctx.fillText(label, x, y);
    var lw = ctx.measureText(label).width;
    ctx.font = f.mono(fz(m, 11), 560); ctx.fillStyle = c.accent;
    ctx.fillText(vals, x + lw + 8, y);
    if (note) {
      var vw = ctx.measureText(vals).width, nx = x + lw + 8 + vw + 10;
      ctx.font = f.font(fz(m, 10.5)); ctx.fillStyle = c.ink3;
      if (nx + ctx.measureText(note).width < f.w - x) ctx.fillText(note, nx, y);
    }
  }
})();
