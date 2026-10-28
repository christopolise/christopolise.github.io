/* TCAM: the air-quality data dashboard.
 * Recreates the poster's dashboard screenshot (S4S 2025, right column): a dark
 * map of Utah Valley around Utah Lake with four source layers (traffic cameras,
 * PurpleAir sensors, DAQ/AirNow stations, NOAA ISD weather), a radius selection,
 * and the query panel along the bottom (coordinates, environment sources, date
 * range). The poster's query is centred on Provo at 40.24023, -111.68667 with a
 * 5000 m radius; the figure uses that query, then opens one camera inside the
 * circle as a frame graded into an AQI category by the model.
 *
 * Real (poster): 1,395 cameras and 778 PurpleAir sensors statewide; 218 million
 * images, 2021-2025; YOLO-cls correct 98.6% of the time on one camera; the
 * Provo query values; the map's extent; the DAQ and weather station positions
 * (traced from the screenshot). Synthetic: camera and PurpleAir dot positions
 * (a seeded sample, so the in-radius counts are counts of that sample), the
 * Orem and Lehi queries, the camera frame and the model's category. */
(function () {
  "use strict";
  var U = Fig.util;

  /* Map frame of the dashboard screenshot, in km (x east, y south) from its top-left
     corner, and the lat/lon of that corner (fitted to the Provo query). */
  var KM_W = 45.8, KM_H = 35.7, LAT0 = 40.4573, LON0 = -112.1373, KM_LAT = 111.0, KM_LON = 85.07;

  var DEF = {
    config: {
      areas: [                      // radius positions the button cycles through
        { name: "Provo", lat: 40.24022614566749, lon: -111.68666839599611, cat: 1 }, // the poster's query; cat is synthetic
        { name: "Orem", lat: 40.2969, lon: -111.6946, cat: 0 },                     // synthetic query
        { name: "Lehi", lat: 40.3916, lon: -111.8508, cat: 2 }                      // synthetic query
      ],
      radius: 5000,                 // m, the dashboard's radius field on the poster
      years: ["2021", "2025"],      // date range: the image collection's span (poster)
      totals: { cams: "1,395", pa: "778", images: "218M" }, // statewide, from the poster
      accuracy: "98.6%",            // YOLO-cls, one-camera test (poster)
      cats: ["Good", "Moderate", "USG", "Unhealthy"],       // the poster's AQI classes
      haze: [0.04, 0.34, 0.6, 0.84],                         // frame haze per class (illustrative)
      viewKm: [1.5, 35],              // km (north to south) of the map shown in the full figure
      thumbKm: [9, 33],             // km shown in the thumbnail
      layersAt: 0.3,                // s: first source layer switches on
      layerGap: 0.35,               // s between layers
      moveAt: 2.0,                  // s: the radius sweeps to its area
      moveDur: 1.6,
      sweepKm: [10, 9],             // km west and north of the target where each sweep starts
      datesAt: 3.6,                 // s: date range fills in
      queryAt: 4.6,                 // s: "Download data"; sources inside light up from the centre out
      countDur: 1.4,
      frameAt: 6.4,                 // s: one camera inside opens as a frame
      modelAt: 7.3,                 // s: the model's category appears
      period: 13,                   // s per loop
      fade: 0.8,                    // s of fade before the loop restarts
      seed: 1395,
      stillAt: 9                    // s: key frame (thumbnail and reduced motion)
    },

    setup: function (f) {
      var s = f.state, cfg = f.cfg;
      s.area = s.area || 0;
      s.layers = s.layers || [true, true, true, true];
      s.target = s.target || toKm(cfg.areas[s.area]);
      s.cat = s.cat == null ? cfg.areas[s.area].cat : s.cat;
      s.name = s.name || cfg.areas[s.area].name;
      if (!s.data) s.data = makeData(cfg.seed);
      if (f.compact || s.bound) return;
      s.bound = true;

      var names = ["Cameras", "PurpleAir", "DAQ", "Weather"];
      names.forEach(function (n, k) {
        var b = f.button(n + " on", function () {
          s.layers[k] = !s.layers[k];
          b.textContent = n + (s.layers[k] ? " on" : " off");
          b.setAttribute("aria-pressed", String(s.layers[k]));
        });
        b.setAttribute("aria-pressed", "true");
      });
      var next = function () { return cfg.areas[(s.area + 1) % cfg.areas.length].name; };
      s.areaBtn = f.button("Move radius to " + next(), function (b) {
        s.prev = s.target;
        s.area = (s.area + 1) % cfg.areas.length;
        s.target = toKm(cfg.areas[s.area]);
        s.cat = cfg.areas[s.area].cat;
        s.name = cfg.areas[s.area].name;
        s.skipIntro = true;
        b.textContent = "Move radius to " + next();
        f.restart(true);
      });
      /* Clicking the map moves the radius there, as on the dashboard. */
      f.canvas.style.cursor = "crosshair";
      f.canvas.addEventListener("click", function (e) {
        var v = s.view; if (!v) return;
        var r = f.canvas.getBoundingClientRect();
        var px = (e.clientX - r.left) * f.w / r.width, py = (e.clientY - r.top) * f.h / r.height;
        if (py > v.mh) return;
        var km = { x: U.clamp((px - v.ox) / v.s, 3, KM_W - 3), y: U.clamp((py - v.oy) / v.s, 3, KM_H - 3) };
        if (inLake(km)) return;
        s.prev = s.target; s.target = km; s.name = "Selected point";
        s.cat = Math.floor(frac(km.x * 0.37 + km.y * 0.61) * 3);
        s.skipIntro = true;
        f.restart(true);
      });
    },

    reset: function () {},

    draw: function (f, t) {
      var s = f.state, c = f.c, ctx = f.ctx, cfg = f.cfg, W = f.w, H = f.h;
      var u = U.unit(f), narrow = W < 480, compact = f.compact;
      var pal = palette(f);

      var it = Math.floor(t / cfg.period), lt = t - it * cfg.period;
      var intro = it === 0 && !s.skipIntro;
      var fadeK = 1 - U.clamp((lt - (cfg.period - cfg.fade)) / cfg.fade, 0, 1);

      /* ---- Layout ---- */
      var mh = compact ? H : Math.round(H * (narrow ? 0.56 : 0.66));
      var km = compact ? cfg.thumbKm : cfg.viewKm;
      var sc = mh / (km[1] - km[0]);
      var ox;
      if (compact) ox = W * 0.6 - s.target.x * sc;
      else ox = W - KM_W * sc - (narrow ? 6 : W * 0.06);
      var v = s.view = { ox: ox, oy: -km[0] * sc, s: sc, mh: mh };
      var P = function (p) { return { x: v.ox + p.x * sc, y: v.oy + p.y * sc }; };

      /* ---- Map ground ---- */
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, mh); ctx.clip();
      ctx.fillStyle = pal.ground; ctx.fillRect(0, 0, W, mh);
      drawMap(f, pal, P, sc, compact, narrow);

      /* ---- Selection ---- */
      var from = (it === 0 && s.prev) ? s.prev : { x: s.target.x - cfg.sweepKm[0], y: Math.max(3, s.target.y - cfg.sweepKm[1]) };
      var mk = U.ease(lt, cfg.moveAt, cfg.moveDur);
      var cen = { x: U.lerp(from.x, s.target.x, mk), y: U.lerp(from.y, s.target.y, mk) };
      var Rkm = cfg.radius / 1000;
      var rNow = Rkm * U.ease(lt, cfg.moveAt, cfg.moveDur * 0.8);
      var qk = U.clamp((lt - cfg.queryAt) / cfg.countDur, 0, 1);
      var queried = lt >= cfg.queryAt;

      if (lt >= cfg.moveAt && rNow > 0.05) {
        var pc = P(cen), pr = rNow * sc;
        ctx.globalAlpha = fadeK;
        ctx.fillStyle = f.alpha(pal.paper, compact ? 0.12 : 0.08); ctx.strokeStyle = f.alpha(pal.paper, 0.9);
        ctx.lineWidth = compact ? 4.5 : Math.max(1.6 * u, 1.4);
        ctx.beginPath(); ctx.arc(pc.x, pc.y, pr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        /* ripple while the query runs */
        if (qk > 0 && qk < 1) {
          ctx.strokeStyle = f.alpha(pal.paper, 0.35 * (1 - qk)); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(pc.x, pc.y, pr * qk, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      /* ---- Source dots ---- */
      var tones = [c.third, c.signal, c.accent, pal.paper];
      var R = (compact ? 5.5 : Math.max(2.8 * u, 2.4));
      var counts = [0, 0, 0, 0], inside = [[], [], [], []];
      var reach = U.ease(lt, cfg.queryAt, cfg.countDur) * Rkm;
      for (var k = 0; k < 4; k++) {
        var on = s.layers[k];
        var vis = !on ? 0 : intro ? U.ease(lt, cfg.layersAt + k * cfg.layerGap, 0.5) : 1;
        var list = s.data[k];
        for (var i = 0; i < list.length; i++) {
          var p = list[i], d = Math.hypot(p.x - s.target.x, p.y - s.target.y);
          var isIn = queried && d <= Rkm && d <= reach;
          if (on && d <= Rkm) inside[k].push(p);
          if (isIn && on) counts[k]++;
          if (!vis) continue;
          var q = P(p);
          if (q.x < -10 || q.x > W + 10 || q.y < -10 || q.y > mh + 10) continue;
          var dim = queried && !isIn ? U.lerp(1, 0.45, fadeK * Math.min(1, qk * 2)) : 1;
          var big = k >= 2 ? 1.35 : 1;
          ctx.globalAlpha = vis * dim;
          ctx.fillStyle = tones[k];
          ctx.beginPath(); ctx.arc(q.x, q.y, R * big, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = isIn ? f.alpha(pal.paper, 0.9 * fadeK) : f.alpha(pal.ground, 0.8);
          ctx.lineWidth = isIn ? (compact ? 2 : 1.3) : 1;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      if (!compact) drawLabels(f, pal, P, sc, narrow, s.target, Rkm);

      /* centre mark */
      if (lt >= cfg.moveAt && !compact) {
        var pcm = P(cen), cs = 4;
        ctx.globalAlpha = fadeK; ctx.strokeStyle = pal.paper; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(pcm.x - cs, pcm.y); ctx.lineTo(pcm.x + cs, pcm.y);
        ctx.moveTo(pcm.x, pcm.y - cs); ctx.lineTo(pcm.x, pcm.y + cs); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* ---- Camera hand-off ---- */
      if (!compact) {
        var cam = pickCamera(inside[0], s.target);
        var ck = U.ease(lt, cfg.frameAt, 0.8) * fadeK;
        if (ck > 0.01) drawCard(f, pal, cam ? P(cam) : null, ck, U.ease(lt, cfg.modelAt, 0.6) * fadeK, narrow, s, u);
        if (!narrow) {
          ctx.font = f.font(10.5); ctx.fillStyle = f.alpha(pal.paper, 0.55); ctx.textAlign = "left";
          ctx.fillText("Camera and PurpleAir positions: synthetic sample", 14, mh - 9);
        }
      }
      ctx.restore();

      if (compact) return;

      /* ---- Query panel ---- */
      drawPanel(f, pal, {
        y: mh, lt: lt, fadeK: fadeK, cen: cen, mk: mk, rNow: rNow, counts: counts,
        queried: queried, intro: intro, narrow: narrow, u: u, tones: tones, R: R
      });
    }
  };


  /* ---------- data ---------- */

  function toKm(a) { return { x: (a.lon - LON0) * KM_LON, y: (LAT0 - a.lat) * KM_LAT }; }
  function n2k(p) { return { x: p[0] * KM_W, y: p[1] * KM_H }; }
  function frac(x) { return x - Math.floor(x); }

  /* Utah Lake, traced from the screenshot (fractions of its map frame). */
  var LAKE = [[.44, .31], [.48, .30], [.57, .31], [.664, .346], [.696, .395], [.70, .44], [.716, .49], [.729, .56],
    [.738, .61], [.745, .66], [.76, .71], [.805, .774], [.85, .79], [.863, .84], [.825, .872], [.76, .905],
    [.696, .955], [.68, 1.1], [.37, 1.1], [.38, 1.0], [.40, .93], [.44, .855], [.478, .77], [.504, .69],
    [.523, .61], [.536, .592], [.523, .56], [.504, .51], [.478, .444], [.452, .395], [.433, .345]].map(n2k);

  var I15 = [[.38, -.15], [.41, 0], [.44, .07], [.49, .13], [.57, .22], [.63, .27], [.68, .33], [.73, .40], [.755, .48],
    [.775, .56], [.80, .62], [.84, .68], [.89, .77], [.915, .85], [.92, .95], [.95, 1.15]].map(n2k);
  var ROADS = [
    [[-.6, .72], [0, .67], [.07, .63], [.087, .38], [.195, .29], [.31, .25], [.383, .23], [.47, .23], [.57, .22]],   // UT-73
    [[.087, .45], [.095, .7], [.095, 1.15]],                                                                         // Cedar Valley
    [[.40, -.15], [.415, .08], [.417, .23], [.417, .35], [.44, .41], [.46, .44], [.507, .56], [.509, .62],
      [.49, .72], [.452, .81], [.40, .87], [.36, 1.0], [.33, 1.15]],                                                  // Redwood Rd
    [[.394, .078], [.5, .082], [.6, .084], [.68, .086], [.8, .07]],                                                  // UT-92
    [[.40, .15], [.52, .14]],
    [[.47, .265], [.6, .27], [.68, .27], [.745, .3]],                                                                // AF / PG
    [[.68, .06], [.69, .26], [.74, .33], [.79, .45], [.85, .56], [.90, .66], [.95, .8], [1.0, .92], [1.15, 1.05]],   // State St
    [[.88, .56], [.93, .48], [1.0, .38], [1.3, .28]],                                                                // US-189
    [[.75, .55], [.83, .565], [.92, .56]],
    [[.76, .63], [.86, .62], [.93, .64]],
    [[.92, .95], [1.1, 1.05], [1.4, 1.1]]                                                                            // US-6
  ].map(function (r) { return r.map(n2k); });

  var TOWNS = [ // real lat/lon; w = sample weight for cameras, p = for PurpleAir, rad in km
    { n: "Provo", lat: 40.2338, lon: -111.6585, w: 26, p: 14, rad: 3.4, label: true },
    { n: "Orem", lat: 40.2969, lon: -111.6946, w: 22, p: 13, rad: 3.2, label: true },
    { n: "Lehi", lat: 40.3916, lon: -111.8508, w: 12, p: 10, rad: 3, label: true },
    { n: "American Fork", lat: 40.3769, lon: -111.7958, w: 10, p: 7, rad: 2.4, label: true },
    { n: "Pleasant Grove", lat: 40.3641, lon: -111.7385, w: 8, p: 6, rad: 2.4 },
    { n: "Lindon", lat: 40.3433, lon: -111.7208, w: 4, p: 4, rad: 1.5 },
    { n: "Highland", lat: 40.4252, lon: -111.7949, w: 3, p: 6, rad: 2 },
    { n: "Alpine", lat: 40.4533, lon: -111.7777, w: 1, p: 4, rad: 1.5 },
    { n: "Saratoga Springs", lat: 40.3491, lon: -111.9047, w: 6, p: 7, rad: 2.6, label: true },
    { n: "Eagle Mountain", lat: 40.3141, lon: -112.0069, w: 3, p: 5, rad: 2.6, label: true },
    { n: "Springville", lat: 40.1652, lon: -111.6107, w: 5, p: 5, rad: 2, label: true },
    { n: "Vineyard", lat: 40.2972, lon: -111.7466, w: 3, p: 3, rad: 1.4 }
  ].map(function (t) { var k = toKm(t); t.x = k.x; t.y = k.y; return t; });

  function inPoly(p, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function inLake(p) { return inPoly(p, LAKE); }

  function makeData(seed) {
    var rnd = U.seeded(seed);
    var cams = [], pa = [];
    function ok(list, p, gap) {
      if (inLake(p)) return false;
      for (var i = 0; i < list.length; i++) if (Math.hypot(list[i].x - p.x, list[i].y - p.y) < gap) return false;
      return true;
    }
    /* cameras along highways */
    [I15].concat(ROADS).forEach(function (road, ri) {
      var len = 0, i;
      for (i = 1; i < road.length; i++) len += Math.hypot(road[i].x - road[i - 1].x, road[i].y - road[i - 1].y);
      var step = ri === 0 ? 1.3 : 2.4;
      for (var d = step * rnd(); d < len; d += step * (0.7 + 0.6 * rnd())) {
        if (ri && rnd() < 0.25) continue;
        var p = U.along(road, d / len);
        if (p.x < -12 || p.x > KM_W + 12 || p.y < -2 || p.y > KM_H + 2) continue;
        if (ok(cams, p, 0.6)) cams.push(p);
      }
    });
    /* cameras at city intersections, snapped to a street grid */
    TOWNS.forEach(function (t) {
      for (var n = 0, tries = 0; n < t.w && tries < 200; tries++) {
        var g = 0.8;
        var p = { x: Math.round((t.x + (rnd() * 2 - 1) * t.rad) / g) * g, y: Math.round((t.y + (rnd() * 2 - 1) * t.rad) / g) * g };
        if (ok(cams, p, 0.55)) { cams.push(p); n++; }
      }
    });
    /* PurpleAir sensors in neighbourhoods */
    TOWNS.forEach(function (t) {
      for (var n = 0, tries = 0; n < t.p && tries < 200; tries++) {
        var a = rnd() * Math.PI * 2, r = t.rad * 0.75 * Math.sqrt(-2 * Math.log(1 - rnd() * 0.98));
        var p = { x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r };
        if (ok(pa, p, 0.45) && ok(cams, p, 0.3)) { pa.push(p); n++; }
      }
    });
    /* DAQ (AirNow) and weather (NOAA ISD) stations, traced from the screenshot */
    var daq = [[.789, .056], [.786, .36], [.879, .634], [.886, .995]].map(n2k);
    var wx = [[.769, .74]].map(n2k);
    return [cams, pa, daq, wx];
  }

  function pickCamera(list, c) {
    var best = null, bd = 1e9;
    list.forEach(function (p) {
      var d = Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - 1.4);  // a camera a little off the centre
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  /* ---------- drawing ---------- */

  function lightness(col) {
    var o = col.match(/oklch\(\s*([\d.]+)(%?)/);
    if (o) return o[2] ? +o[1] / 100 : +o[1];
    var m = col.match(/rgba?\(([^)]+)\)/);
    if (m) { var p = m[1].split(/[\s,\/]+/).map(Number); return (p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11) / 255; }
    return 1;
  }
  /* The map is dark in both themes, like the real dashboard. */
  function palette(f) {
    var c = f.c, dark = lightness(c.bg) < 0.5;
    return { dark: dark, ground: dark ? c.sunk : c.ink, paper: dark ? c.ink : c.bg };
  }

  function path(ctx, pts, P, close) {
    ctx.beginPath();
    pts.forEach(function (p, i) { var q = P(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
    if (close) ctx.closePath();
  }

  function drawMap(f, pal, P, sc, compact, narrow) {
    var ctx = f.ctx, c = f.c, i;
    /* town glow */
    TOWNS.forEach(function (t) {
      var q = P(t);
      ctx.fillStyle = f.alpha(pal.paper, 0.035);
      ctx.beginPath(); ctx.arc(q.x, q.y, t.rad * 1.2 * sc, 0, Math.PI * 2); ctx.fill();
    });
    /* Wasatch peaks to the east */
    var rnd = U.seeded(7);
    ctx.strokeStyle = f.alpha(pal.paper, 0.16); ctx.lineWidth = 1;
    for (i = 0; i < 70; i++) {
      var p = { x: KM_W * (0.78 + rnd() * 0.7), y: KM_H * (-0.05 + rnd() * 1.1) };
      var edge = KM_W * (p.y < KM_H * 0.4 ? 0.84 : 0.84 + (p.y / KM_H - 0.4) * 0.25);
      if (p.x < edge) continue;
      var q = P(p), m = Math.max(2.5, sc * 0.35);
      ctx.beginPath(); ctx.moveTo(q.x - m, q.y + m * 0.7); ctx.lineTo(q.x, q.y - m * 0.7); ctx.lineTo(q.x + m, q.y + m * 0.7); ctx.stroke();
    }
    /* lake */
    path(ctx, LAKE, P, true);
    ctx.fillStyle = f.alpha(c.third, pal.dark ? 0.2 : 0.32); ctx.fill();
    ctx.strokeStyle = f.alpha(c.third, 0.35); ctx.lineWidth = 1; ctx.stroke();
    /* roads */
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ROADS.forEach(function (r) {
      path(ctx, r, P); ctx.strokeStyle = f.alpha(pal.paper, 0.13); ctx.lineWidth = compact ? 2 : 1.1; ctx.stroke();
    });
    path(ctx, I15, P); ctx.strokeStyle = f.alpha(pal.paper, 0.3); ctx.lineWidth = compact ? 4 : 2.2; ctx.stroke();
  }

  /* Place names, drawn over the dots with a halo in the map's ground colour. */
  function drawLabels(f, pal, P, sc, narrow, sel, rkm) {
    var ctx = f.ctx, c = f.c;
    ctx.lineJoin = "round"; ctx.strokeStyle = f.alpha(pal.ground, 0.85); ctx.lineWidth = 3;
    ctx.font = f.font(10.5, 500); ctx.textAlign = "center";
    ctx.fillStyle = f.alpha(c.third, 0.85);
    var lk = P(n2k(narrow ? [.56, .9] : [.6, .8]));
    ctx.font = f.font(11, 500); ctx.fillText("Utah Lake", lk.x, lk.y);
    if (narrow) return;
    ctx.font = f.font(10.5, 500); ctx.fillStyle = f.alpha(pal.paper, 0.62);
    TOWNS.forEach(function (t) {
      if (!t.label) return;
      var ly = t.y - t.rad * 0.5;
      if (Math.hypot(t.x - sel.x, ly - sel.y) < rkm + 0.8) return;  // keep the selection clear
      var q = P(t);
      ctx.strokeText(t.n, q.x, q.y - t.rad * 0.5 * sc);
      ctx.fillText(t.n, q.x, q.y - t.rad * 0.5 * sc);
    });
  }

  function drawCard(f, pal, cam, k, mk, narrow, s, u) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, v = s.view;
    var pad = narrow ? 6 : 8;
    /* desktop: in the empty west of the map; phones: a fixed card over the west desert */
    var w = narrow ? 138 : Math.min(236 * Math.min(u, 1.1), v.ox - 24);
    var x = narrow ? 8 : 14, y = (narrow ? 8 : 14) + (1 - k) * 6;
    var fh = Math.round(w * (narrow ? 0.44 : 0.48));
    var cellH = narrow ? 18 : 20;
    var head = narrow ? 0 : 18;
    var h = pad + head + fh + 6 + cellH + 16 + pad;
    if (!cam) { h = pad * 2 + 30; }

    ctx.globalAlpha = k;
    /* leader line to the camera */
    if (cam) {
      ctx.strokeStyle = f.alpha(pal.paper, 0.7); ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x + w, y + pad + head + fh / 2); ctx.lineTo(cam.x, cam.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = pal.paper; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cam.x, cam.y, 6, 0, Math.PI * 2); ctx.stroke();
    }
    U.rr(ctx, x, y, w, h, 6); ctx.fillStyle = c.bg; ctx.fill();
    ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1; ctx.stroke();

    ctx.textAlign = "left";
    if (!cam) {
      ctx.font = f.font(10.5); ctx.fillStyle = c.ink2;
      ctx.fillText(narrow ? "No camera shown" : "Turn cameras on to open a frame", x + pad, y + pad + 18);
      ctx.globalAlpha = 1; return;
    }
    if (head) {
      ctx.font = f.font(11, 600); ctx.fillStyle = c.ink;
      ctx.fillText("Camera inside radius", x + pad, y + pad + 10);
      ctx.font = f.font(10.5); ctx.fillStyle = c.ink3; ctx.textAlign = "right";
      ctx.fillText("to the model", x + w - pad, y + pad + 10); ctx.textAlign = "left";
    }
    var fx = x + pad, fy = y + pad + head, fw = w - pad * 2;
    drawFrame(f, pal, fx, fy, fw, fh, cfg.haze[s.cat], s.name);

    /* AQI class strip: the model's prediction */
    var cy = fy + fh + 6, cw = fw / 4;
    var labels = narrow ? ["Good", "Mod.", "USG", "Unh."] : cfg.cats;
    ctx.font = f.font(10.5, 500);
    var wide = labels.some(function (l) { return ctx.measureText(l).width > cw - 4; });
    if (wide) labels = ["Good", "Mod.", "USG", "Unh."];
    for (var i = 0; i < 4; i++) {
      var sel = i === s.cat;
      U.rr(ctx, fx + i * cw + 1, cy, cw - 2, cellH, 3);
      ctx.fillStyle = f.alpha(c.ink3, 0.1 + i * 0.1); ctx.fill();
      if (sel && mk > 0) {
        ctx.save(); ctx.globalAlpha = k * mk;
        ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = sel && mk > 0.5 ? c.ink : c.ink3;
      ctx.font = f.font(10.5, sel && mk > 0.5 ? 650 : 500); ctx.textAlign = "center";
      ctx.fillText(labels[i], fx + i * cw + cw / 2, cy + cellH / 2 + 3.5);
    }
    ctx.textAlign = "left"; ctx.font = f.font(10.5); ctx.fillStyle = c.ink2;
    ctx.save(); ctx.globalAlpha = k * Math.max(0.35, mk);
    ctx.fillText(narrow ? "YOLO-cls: " + cfg.accuracy + ", 1 cam" : "YOLO-cls: " + cfg.accuracy + " correct on one camera",
      fx, cy + cellH + 13);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* A stylized UDOT frame: Wasatch peaks, rooftops, the freeway, and haze by class. */
  function drawFrame(f, pal, x, y, w, h, haze, name) {
    var ctx = f.ctx, c = f.c, i;
    ctx.save();
    U.rr(ctx, x, y, w, h, 3); ctx.clip();
    ctx.fillStyle = pal.paper; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = f.alpha(c.third, 0.55 * (1 - haze) + 0.05); ctx.fillRect(x, y, w, h * 0.5);
    var pk = [0.4, 0.28, 0.36, 0.2, 0.3, 0.24, 0.37, 0.32, 0.44];
    ctx.fillStyle = f.alpha(pal.ground, 0.55 * (1 - haze * 0.85));
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.5);
    for (i = 0; i < pk.length; i++) ctx.lineTo(x + w * i / (pk.length - 1), y + h * pk[i]);
    ctx.lineTo(x + w, y + h * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f.alpha(pal.paper, 0.9 * (1 - haze * 0.6));
    [3, 5].forEach(function (j) {
      var px = x + w * j / (pk.length - 1), py = y + h * pk[j];
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - w * 0.04, py + h * 0.07); ctx.lineTo(px + w * 0.04, py + h * 0.07); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = f.alpha(pal.ground, 0.2); ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
    ctx.fillStyle = f.alpha(pal.ground, 0.5 * (1 - haze * 0.4));
    for (i = 0; i < 12; i++) {
      var hw = w * 0.06, hh = h * (0.06 + ((i * 37) % 5) * 0.014);
      ctx.fillRect(x + w * (0.02 + i * 0.083), y + h * 0.6 - hh, hw, hh);
    }
    ctx.fillStyle = f.alpha(pal.ground, 0.6);
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.86); ctx.lineTo(x + w, y + h * 0.7); ctx.lineTo(x + w, y + h * 0.8); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    /* haze */
    ctx.fillStyle = f.alpha(pal.paper, haze * 0.7); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = f.alpha(c.signal, haze * 0.12); ctx.fillRect(x, y, w, h);
    /* overlay strip, as on UDOT frames */
    var sh = 14;
    ctx.fillStyle = f.alpha(pal.ground, 0.8); ctx.fillRect(x, y + h - sh, w, sh);
    ctx.font = f.mono(10.5); ctx.fillStyle = pal.paper; ctx.textAlign = "left";
    ctx.fillText("udot.utah.gov", x + 4, y + h - 3.5);
    ctx.textAlign = "right";
    if (ctx.measureText(name).width < w - 100) ctx.fillText(name, x + w - 4, y + h - 3.5);
    ctx.restore();
  }

  function field(f, x, y, w, h, label, value, placeholder, k) {
    var ctx = f.ctx, c = f.c;
    U.rr(ctx, x, y, w, h, 4); ctx.fillStyle = c.bg; ctx.fill();
    ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = f.font(10.5, 500); ctx.textAlign = "left"; ctx.fillStyle = c.ink2;
    var lw = ctx.measureText(label).width + 12;
    ctx.fillText(label, x + 6, y + h / 2 + 3.6);
    ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(x + lw, y + 3); ctx.lineTo(x + lw, y + h - 3); ctx.stroke();
    if (value != null) {
      ctx.save(); ctx.globalAlpha = k; ctx.font = f.mono(10.5); ctx.fillStyle = c.ink;
      ctx.fillText(value, x + lw + 6, y + h / 2 + 3.6); ctx.restore();
    }
    if (value == null || k < 1) {
      ctx.save(); ctx.globalAlpha = value == null ? 1 : 1 - k;
      ctx.font = f.font(10.5); ctx.fillStyle = c.ink3;
      ctx.fillText(placeholder, x + lw + 6, y + h / 2 + 3.6); ctx.restore();
    }
  }

  function toggle(f, x, y, on, color, label, count, w, showCount) {
    var ctx = f.ctx, c = f.c, tw = 20, th = 11;
    U.rr(ctx, x, y - th / 2, tw, th, th / 2);
    ctx.fillStyle = on ? c.accent : c.line; ctx.fill();
    ctx.fillStyle = c.bg; ctx.beginPath(); ctx.arc(on ? x + tw - th / 2 : x + th / 2, y, th / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + tw + 9, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.ink3; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.font = f.font(10.5, 500); ctx.textAlign = "left"; ctx.fillStyle = on ? c.ink : c.ink3;
    ctx.fillText(label, x + tw + 18, y + 3.6);
    if (showCount) {
      ctx.font = f.mono(10.5, 600); ctx.textAlign = "right"; ctx.fillStyle = c.ink;
      ctx.fillText(String(count), x + w, y + 3.6);
    }
  }

  function drawPanel(f, pal, o) {
    var ctx = f.ctx, c = f.c, cfg = f.cfg, s = f.state, W = f.w, H = f.h, u = o.u;
    var y0 = o.y, narrow = o.narrow;
    ctx.fillStyle = c.sunk; ctx.fillRect(0, y0, W, H - y0);
    ctx.strokeStyle = c.lineStrong; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y0 + 0.5); ctx.lineTo(W, y0 + 0.5); ctx.stroke();

    var pad = narrow ? 8 : Math.max(12 * u, 10), gap = narrow ? 10 : 14 * u;
    var lt = o.lt, fk = o.fadeK;
    var moved = lt >= cfg.moveAt;
    var lat = LAT0 - o.cen.y / KM_LAT, lon = LON0 + o.cen.x / KM_LON;
    var coordK = moved ? fk : 0;
    var datesK = U.ease(lt, cfg.datesAt, 0.4) * fk;
    var srcNames = narrow ? ["Cameras", "PurpleAir", "DAQ", "Weather"]
      : ["Traffic cameras", "PurpleAir", "DAQ (AirNow)", "Weather (NOAA ISD)"];
    var showCount = o.queried && fk > 0.3;
    var layerOn = function (k) { return s.layers[k] && (!o.intro || lt >= cfg.layersAt + k * cfg.layerGap); };
    var fh = narrow ? 18 : Math.max(18 * u, 17), rowH = narrow ? 22 : Math.max(22 * u, 21);
    var total = o.counts.reduce(function (a, b) { return a + b; }, 0);

    if (narrow) {
      var cw = (W - pad * 2 - gap) / 2, hy = y0 + 16, ry = y0 + 24;
      ctx.font = f.font(10.5, 600); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
      ctx.fillText("Coordinates", pad, hy);
      ctx.fillText("Env sources", pad + cw + gap, hy);
      if (showCount) { ctx.textAlign = "right"; ctx.fillStyle = c.ink3; ctx.font = f.font(10.5); ctx.fillText("in 5 km", W - pad, hy); }
      field(f, pad, ry, cw, fh, "Lat", moved ? lat.toFixed(5) : null, "—", coordK);
      field(f, pad, ry + rowH, cw, fh, "Lon", moved ? lon.toFixed(5) : null, "—", coordK);
      field(f, pad, ry + rowH * 2, cw, fh, "Radius", moved ? String(Math.round(o.rNow * 1000)) + " m" : null, "m", coordK);
      field(f, pad, ry + rowH * 3, cw, fh, "Years", lt >= cfg.datesAt ? cfg.years.join("–") : null, "yyyy", datesK);
      for (var k = 0; k < 4; k++) {
        toggle(f, pad + cw + gap, ry + fh / 2 + rowH * k, layerOn(k), o.tones[k], srcNames[k], o.counts[k], cw, showCount);
      }
      ctx.font = f.font(10.5); ctx.fillStyle = c.ink3; ctx.textAlign = "left";
      ctx.fillText("Sample. Statewide: " + cfg.totals.cams + " cams, " + cfg.totals.pa + " PurpleAir", pad, ry + rowH * 4 + 10);
      return;
    }

    /* desktop: the dashboard's three columns, plus the result */
    ctx.font = f.font(12, 600); ctx.fillStyle = c.ink; ctx.textAlign = "center";
    ctx.fillText("Traffic Camera Air quality Monitoring", W / 2, y0 + 18 * u);
    var inner = W - pad * 2 - gap * 3;
    var ws = [0.25, 0.29, 0.19, 0.27].map(function (r) { return inner * r; });
    var xs = [pad]; for (var i = 1; i < 4; i++) xs.push(xs[i - 1] + ws[i - 1] + gap);
    var hy2 = y0 + 37 * u, ry2 = y0 + 44 * u;
    ctx.font = f.font(10.5, 600); ctx.fillStyle = c.ink2; ctx.textAlign = "left";
    ["Coordinates", "Select env sources", "Enter date range", "Inside radius"].forEach(function (h, j) { ctx.fillText(h, xs[j], hy2); });

    field(f, xs[0], ry2, ws[0], fh, "Latitude", moved ? lat.toFixed(5) : null, "—", coordK);
    field(f, xs[0], ry2 + rowH, ws[0], fh, "Longitude", moved ? lon.toFixed(5) : null, "—", coordK);
    field(f, xs[0], ry2 + rowH * 2, ws[0], fh, "Radius (m)", moved ? String(Math.round(o.rNow * 1000)) : null, "—", coordK);

    var sr = (rowH * 3 - 4) / 4;
    for (var k2 = 0; k2 < 4; k2++) {
      toggle(f, xs[1], ry2 + sr * (k2 + 0.5), layerOn(k2), o.tones[k2], srcNames[k2], o.counts[k2], ws[1], showCount);
    }

    field(f, xs[2], ry2, ws[2], fh, "Start", lt >= cfg.datesAt ? cfg.years[0] : null, "mm/dd/yyyy", datesK);
    field(f, xs[2], ry2 + rowH, ws[2], fh, "End", lt >= cfg.datesAt ? cfg.years[1] : null, "mm/dd/yyyy", datesK);
    var press = lt >= cfg.queryAt - 0.15 && lt < cfg.queryAt + 0.35;
    U.rr(ctx, xs[2], ry2 + rowH * 2, ws[2], fh, 4);
    ctx.fillStyle = press ? c.accent : c.bg; ctx.fill();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = f.font(10.5, 600); ctx.textAlign = "center"; ctx.fillStyle = press ? c.bg : c.accent;
    ctx.fillText("Download data", xs[2] + ws[2] / 2, ry2 + rowH * 2 + fh / 2 + 3.6);

    var rx = xs[3];
    ctx.textAlign = "left";
    ctx.save(); ctx.globalAlpha = o.queried ? fk : 1;
    ctx.font = f.mono(20 * Math.min(u, 1.1), 600); ctx.fillStyle = o.queried ? c.ink : c.ink3;
    var big = o.queried ? String(total) : "—";
    ctx.fillText(big, rx, ry2 + 17 * u);
    var bw = ctx.measureText(big).width;
    ctx.font = f.font(10.5); ctx.fillStyle = c.ink2;
    ctx.fillText("sources in 5 km (sample)", rx + bw + 8, ry2 + 15 * u);
    ctx.restore();
    ctx.font = f.font(10.5); ctx.fillStyle = c.ink3;
    ctx.fillText("Statewide: " + cfg.totals.cams + " cameras,", rx, ry2 + rowH * 2 - 2);
    ctx.fillText(cfg.totals.pa + " PurpleAir, " + cfg.totals.images + " images", rx, ry2 + rowH * 2 + 12);
  }
  /* Registered last: the map data above must exist before the first setup. */
  Fig.register("tcam-dashboard", DEF);
})();
