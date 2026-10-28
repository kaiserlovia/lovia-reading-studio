/*
 * Lovia Reading Studio · fold (风琴页) and library card (借阅卡) layouts, shared by both styles
 * Each page passes its own screenshots, colours, fonts and text; this file only draws.
 * Both drawings take a time t (0–1) so the motion export can animate them frame by frame.
 */
(() => {
  'use strict';
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const backOut = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  function rgba(h, a) { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; }
  function lum(h) { const [r, g, b] = rgb(h); return (r * .299 + g * .587 + b * .114) / 255; }
  // fixed words on the poster follow the 繁 / 简 switch
  const tc = () => { try { return localStorage.getItem('lovia.lang') === 'tc'; } catch (e) { return false; } };
  const word = (sc, t) => tc() ? t : sc;

  // one whole image inside a paper card of pw × ph, margin m
  function drawInPaper(ctx, img, a, pw, ph, m, paper) {
    ctx.fillStyle = paper; ctx.fillRect(0, 0, pw, ph);
    let w = pw - 2 * m, h = w / a;
    if (h > ph - 2 * m) { h = ph - 2 * m; w = h * a; }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (pw - w) / 2, (ph - h) / 2, w, h);
  }

  /* ---------- fold ---------- */
  const OPEN = .5, SHUT = 1.42, SKEW = .42, MARGIN = .07;
  // size the panels so the opened fold fills the box; every panel has the same size
  function foldPlan(aspects, box, capH = 0) {
    const n = aspects.length; if (!n) return null;
    const R = (1 - 2 * MARGIN) / Math.min(...aspects) + 2 * MARGIN; // panel height / width
    const c = Math.cos(OPEN), s = Math.sin(OPEN) * SKEW;
    const pw = Math.min(box.w / (n * c), (box.h - capH) / (R + s));
    const ph = pw * R, d = pw * s;
    return { n, pw, ph, m: pw * MARGIN, y: box.y + (box.h - capH - ph - d) / 2, cx: box.x + box.w / 2, d };
  }
  // how far the fold is open at time t of a loop: shut, opens, stays open, closes again
  function foldOpenAt(t) {
    if (t < .12) return 0; if (t < .45) return ease((t - .12) / .33); if (t < .8) return 1; return 1 - ease((t - .8) / .2);
  }
  // shots: [{img, a}]; o: {open, paper, shade, shadow, labels, capFont, capColor, capY}
  function drawFold(ctx, plan, shots, o = {}) {
    if (!plan) return [];
    const open = o.open == null ? 1 : o.open, ang = SHUT + (OPEN - SHUT) * open;
    const c = Math.cos(ang), d = plan.pw * Math.sin(ang) * SKEW, pw = plan.pw, ph = plan.ph;
    const total = plan.n * pw * c, x0 = plan.cx - total / 2, y0 = plan.y + (plan.d - d) / 2;
    // floor shadow
    ctx.save();
    const sy = plan.y + ph + plan.d + pw * .08, rx = Math.max(total * .62, pw * .6), ry = pw * .16;
    ctx.translate(plan.cx, sy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(0,0,0,${o.shadow ?? .28})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const rects = [];
    shots.forEach((s, i) => {
      const up = i % 2 === 0, x = x0 + i * pw * c, top = up ? y0 : y0 + d, b = (up ? 1 : -1) * d / pw;
      ctx.save(); ctx.transform(c, b, 0, 1, x, top);
      drawInPaper(ctx, s.img, s.a, pw, ph, plan.m, (typeof o.paper === 'function' ? o.paper(i) : o.paper) || '#FBF8F3');
      // light from the left: panels turned left are lit, the others in shade
      const gr = ctx.createLinearGradient(0, 0, pw, 0), sh = o.shade ?? .16;
      if (up) { gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(0,0,0,.05)'); }
      else { gr.addColorStop(0, `rgba(0,0,0,${sh})`); gr.addColorStop(1, `rgba(0,0,0,${sh * .5})`); }
      ctx.fillStyle = gr; ctx.fillRect(0, 0, pw, ph);
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, pw * .004); ctx.strokeRect(0, 0, pw, ph);
      ctx.restore();
      rects.push({ x, y: y0, w: pw * c, h: ph + d });
      const label = o.labels && o.labels[i];
      if (label && open > .6) {
        ctx.save(); ctx.globalAlpha = clamp01((open - .6) / .4) * .78; ctx.fillStyle = o.capColor ? o.capColor(x + pw * c / 2) : '#333';
        ctx.font = o.capFont; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(label, x + pw * c / 2, plan.y + ph + plan.d + (o.capY ?? pw * .2)); ctx.restore();
      }
    });
    return rects;
  }

  /* ---------- library card ---------- */
  // rows of photo slots: picks 1–3 rows, whichever shows the photos largest
  function photoSlots(aspects, box, gapK = .3) {
    const n = aspects.length; if (!n) return [];
    const slotA = a => 1.12 * a / (1 + .3 * a); // photo plus white border and the strip for its name
    let best = null;
    for (let rows = 1; rows <= Math.min(3, n); rows++) {
      const per = Math.ceil(n / rows), groups = [];
      for (let i = 0; i < n; i += per) groups.push(aspects.slice(i, i + per).map((a, j) => ({ a, i: i + j })));
      const rowH = box.h / rows;
      let area = 0; const out = [];
      groups.forEach((gr, ri) => {
        const sum = gr.reduce((s, it) => s + slotA(it.a), 0);
        // gap is a share of the average photo width, so the photos stay together in the middle
        let h = rowH * .84; const gw = h * sum / gr.length * gapK;
        h = Math.min(h, (box.w - gw * (gr.length - 1)) / sum);
        const g2 = h * sum / gr.length * gapK, tw = gr.reduce((s, it) => s + slotA(it.a) * h, 0) + g2 * (gr.length - 1);
        let x = box.x + (box.w - tw) / 2; const y = box.y + rowH * ri + (rowH - h) / 2;
        for (const it of gr) { const sw = slotA(it.a) * h, w = sw / 1.12, ih = w / it.a; out[it.i] = { x: x + w * .06, y: y + w * .06, w, h: ih }; area += w * ih; x += sw + g2; }
      });
      if (!best || area > best.area) best = { area, out };
    }
    return best.out;
  }
  function clip(ctx, x, y, s) {
    ctx.save(); ctx.strokeStyle = '#8E949A'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(x, y + 90 * s); ctx.lineTo(x, y + 12 * s); ctx.arc(x + 14 * s, y + 12 * s, 14 * s, Math.PI, 0); ctx.lineTo(x + 28 * s, y + 104 * s);
    ctx.arc(x + 14 * s, y + 104 * s, 14 * s, 0, Math.PI); ctx.lineTo(x, y + 40 * s); ctx.stroke(); ctx.restore();
  }
  function fitFont(ctx, text, weight, size, family, maxW) {
    let s = size; ctx.font = `${weight} ${s}px ${family}`;
    while (ctx.measureText(text).width > maxW && s > size * .4) { s *= .94; ctx.font = `${weight} ${s}px ${family}`; }
    return s;
  }
  function tracked(ctx, text, x, y, track) { let cx = x; for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; } }
  const TILT = [-.035, .02, -.015, .03, -.025, .015, -.03, .025, -.02, .01];
  /*
   * M: {bg, ink, inks:{title,author,date,message}, title, author, date, message, labels[], shots:[{img,a}], swatches[], fonts:{head,title,author,date,message,labels}, sizes:{…}, tilt}
   * t: null for the still poster, 0–1 for a frame of the motion loop
   */
  function drawCard(ctx, W, H, M, t = null) {
    const still = t == null, u = Math.min(W, H) / 1350, dark = lum(M.bg) < .32;
    const at = (from, len) => still ? 1 : clamp01((t - from) / len);
    const fade = still || t < .9 ? 1 : 1 - easeOut((t - .9) / .1); // the loop ends on an empty card
    const ink = M.ink, red = dark ? '#C2564A' : '#C9483B', sz = M.sizes || {}, F = M.fonts;
    const stampIn = at(.58, .08), shake = !still && t > .66 && t < .7 ? Math.sin((t - .66) * 200) * 4 * u : 0;
    ctx.save();
    ctx.fillStyle = dark ? mix(M.bg, '#000000', .1) : mix(M.bg, '#ffffff', .25); ctx.fillRect(0, 0, W, H);
    ctx.translate(0, shake);
    ctx.fillStyle = dark ? 'rgba(159,182,214,.16)' : 'rgba(110,143,184,.32)';
    for (let y = 150 * u; y < H; y += 64 * u) ctx.fillRect(0, y, W, 1.6 * u);
    ctx.fillStyle = rgba(red, .75); ctx.fillRect(150 * u, -10 * u, 2 * u, H + 20 * u); ctx.fillRect(156 * u, -10 * u, 2 * u, H + 20 * u);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = ink;
    ctx.font = `700 ${40 * u}px ${F.head}`; tracked(ctx, word('借阅卡', '借閱卡'), 210 * u, 118 * u, 14 * u);
    // stamp on the right, swatches beside the header
    const sx = W - 280 * u, sy = 250 * u, R = 128 * u;
    (M.swatches || []).forEach((c, i, all) => {
      const a = at(.5 + i * .012, .03) * fade; if (!a) return;
      ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(sx - R - 60 * u - (all.length - 1 - i) * 48 * u, 106 * u, 16 * u, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1.5 * u; ctx.stroke(); ctx.restore();
    });
    // fields, typed one character at a time
    const fields = [[word('书名', '書名'), M.title, 'title', 46], [word('作者', '作者'), M.author, 'author', 40], [word('日期', '日期'), M.date, 'date', 40]];
    fields.forEach(([k, v, key, base], i) => {
      const y = 248 * u + i * 64 * u;
      ctx.save(); ctx.globalAlpha = .6; ctx.font = `400 ${26 * u}px ${F.head}`; ctx.fillStyle = ink; tracked(ctx, k, 210 * u, y, 6 * u); ctx.restore();
      if (!v) return;
      const chars = [...v], n = Math.round(chars.length * at(.02 + i * .05, .06) * fade);
      if (!n) return;
      const s = fitFont(ctx, v, 700, base * u * (sz[key] || 1), F[key], (i ? sx - R : sx - R - 300 * u) - 360 * u);
      ctx.font = `700 ${s}px ${F[key]}`; ctx.fillStyle = (M.inks && M.inks[key]) || ink; ctx.fillText(chars.slice(0, n).join(''), 330 * u, y);
    });
    if (stampIn && fade) {
      const k = easeOut(stampIn), s = 1 + (1 - k) * .7;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(s, s); ctx.rotate(-.16 - (1 - stampIn) * .3); ctx.globalAlpha = .85 * Math.min(1, stampIn * 2) * fade;
      ctx.strokeStyle = red; ctx.fillStyle = red; ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.arc(0, 0, R * .875, 0, Math.PI * 2); ctx.stroke();
      ctx.textAlign = 'center';
      fitFont(ctx, M.date || '', 700, 34 * u, F.date, R * 1.6); ctx.fillText(M.date || '', 0, 14 * u);
      ctx.font = `600 ${26 * u}px ${F.head}`; ctx.fillText(word('已　阅', '已　閱'), 0, -36 * u);
      if (M.author) { fitFont(ctx, M.author, 600, 26 * u, F.author, R * 1.3); ctx.fillText(M.author, 0, 64 * u); }
      ctx.restore();
    }
    // photos, clipped on one by one
    const shots = M.shots || [], n = shots.length, msgOn = !!M.message;
    const slots = photoSlots(shots.map(s => s.a), { x: 210 * u, y: 440 * u, w: W - 330 * u, h: H - 440 * u - (msgOn ? 150 : 80) * u });
    const dur = Math.min(.12, .4 / Math.max(1, n)), span = .34 - dur;
    const rects = [];
    shots.forEach((s, i) => {
      const r = slots[i]; rects.push(r);
      const k = at(.18 + (n > 1 ? i * span / (n - 1) : 0), dur); if (!k || !fade) return;
      const e = still ? 1 : backOut(k), rot = M.tilt === false ? 0 : TILT[i % TILT.length], b = r.w * .06, lab = r.w * .18;
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 3) * fade;
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2 - (1 - e) * 260 * u); ctx.rotate(rot + (1 - e) * rot * 6);
      ctx.save(); ctx.shadowColor = `rgba(0,0,0,${dark ? .55 : .22})`; ctx.shadowBlur = (26 + (1 - e) * 30) * u; ctx.shadowOffsetY = (10 + (1 - e) * 30) * u;
      ctx.fillStyle = dark ? '#ECE6DA' : '#FFFFFF'; ctx.fillRect(-r.w / 2 - b, -r.h / 2 - b, r.w + 2 * b, r.h + b + lab); ctx.restore();
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(s.img, -r.w / 2, -r.h / 2, r.w, r.h);
      const label = M.labels && M.labels[i];
      if (label) {
        ctx.fillStyle = '#3A3530'; ctx.textAlign = 'center';
        fitFont(ctx, label, 400, r.w * .095 * (sz.labels || 1), F.labels, r.w);
        ctx.fillText(label, 0, r.h / 2 + lab * .62);
      }
      if (k > .85) clip(ctx, -r.w / 2 + r.w * .17, -r.h / 2 - b - r.w * .1 - (still ? 0 : (1 - clamp01((k - .85) / .15)) * 40 * u), r.w / 300);
      ctx.restore();
    });
    // the note, written left to right
    const mk = at(.7, .14) * fade;
    if (msgOn && mk) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, H - 140 * u, 210 * u + (W - 300 * u) * mk, 140 * u); ctx.clip();
      ctx.globalAlpha = .9; ctx.fillStyle = (M.inks && M.inks.message) || ink; ctx.textAlign = 'left';
      fitFont(ctx, M.message, 400, 40 * u * (sz.message || 1), F.message, W - 330 * u); ctx.fillText(M.message, 210 * u, H - 66 * u);
      ctx.restore();
    }
    ctx.restore();
    return rects;
  }

  window.LoviaExtra = { foldPlan, foldOpenAt, drawFold, drawCard, mix, rgba };
})();
