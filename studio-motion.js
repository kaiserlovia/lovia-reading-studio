/*
 * Lovia Reading Studio · motion export (shared by both styles)
 * The page builds a few still layers for the current layout; this file animates them
 * (push / wipe / fade / cycle / swap), previews the loop and saves it as a GIF or a video.
 * Everything runs in the browser; nothing is uploaded.
 */
(() => {
  'use strict';
  const SC = document.documentElement.dataset.srcLang === 'sc';
  const L = SC ? {
    title: '动态 GIF／视频', variant: '动态方式', close: '关闭', length: '一轮长度', smooth: '流畅度', size: '尺寸', sec: ' 秒', fps: ' 格／秒',
    gif: '存成 GIF', video: '存成视频', saveAlbum: '存到相册', download: '下载', building: '正在准备动画…',
    gifWork: '正在制作 GIF… %', videoWork: '正在录制视频… %', done: '完成 · %', noVideo: '这个浏览器不支持录制视频，请改存 GIF 或换用 Safari／Chrome。',
    shareHint: '在分享菜单选「存储视频」或「存储图像」就会存进相册。', fail: '制作失败，请把尺寸改小再试一次。',
    note: 'GIF 只有 256 色，渐变可能出现颗粒；视频色彩完整、体积较小。',
  } : {
    title: '動態 GIF／影片', variant: '動態方式', close: '關閉', length: '一輪長度', smooth: '流暢度', size: '尺寸', sec: ' 秒', fps: ' 格／秒',
    gif: '存成 GIF', video: '存成影片', saveAlbum: '存到相簿', download: '下載', building: '正在準備動畫…',
    gifWork: '正在製作 GIF… %', videoWork: '正在錄製影片… %', done: '完成 · %', noVideo: '這個瀏覽器不支援錄製影片，請改存 GIF 或換用 Safari／Chrome。',
    shareHint: '在分享選單選「儲存影片」或「儲存影像」就會存進相簿。', fail: '製作失敗，請把尺寸改小再試一次。',
    note: 'GIF 只有 256 色，漸層可能出現顆粒；影片色彩完整、檔案較小。',
  };

  /* ---------- timelines ---------- */
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function keyed(t, keys) {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const k = b > a ? (t - a) / (b - a) : 1; return va + (vb - va) * ease(k); }
    }
    return keys[keys.length - 1][1];
  }
  const PUSH = [[0, 0], [.08, 0], [.3, 1], [.42, 1], [.7, -1], [.82, -1], [1, 0]];   // first half covers, then the second covers
  const WIPE = [[0, .5], [.06, .5], [.3, .93], [.4, .93], [.7, .07], [.8, .07], [1, .5]];
  const FADE = [[0, 0], [.15, 0], [.4, 1], [.65, 1], [.9, 0], [1, 0]];
  const SWAP = [[0, 0], [.12, 0], [.38, 1], [.62, 1], [.88, 0], [1, 0]];
  const XFADE = [[0, 0], [.2, 0], [.8, 1], [1, 1]];
  // a sprite rendered at rect sr (poster units, k px per unit, pad around it) drawn into rect r
  function drawSprite(ctx, sp, r, k, alpha = 1) {
    if (alpha <= 0) return;
    const sc = r.w / sp.sr.w;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp.img, (r.x - sp.pad * sc) * k, (r.y - sp.pad * sc) * k, sp.img.width * sc, sp.img.height * sc);
    ctx.globalAlpha = 1;
  }
  const lerpRect = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, w: a.w + (b.w - a.w) * p, h: a.h + (b.h - a.h) * p });

  // a long timeline (relay) stretches the chosen length: the length then means four moves, like the plain push
  const secs = (spec, opts) => opts.duration * (spec.moves ? spec.moves / 4 : 1);
  let tmp = null;
  function scratch(w, h) { if (!tmp) tmp = document.createElement('canvas'); if (tmp.width !== w || tmp.height !== h) { tmp.width = w; tmp.height = h; } return tmp; }

  function drawPush(ctx, spec, A, B, s) {
    const W = spec.W, H = spec.H;
    ctx.drawImage(B, 0, 0);
    if (spec.soft) {
      const c = scratch(W, H), x = c.getContext('2d');
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H); x.drawImage(A, 0, 0);
      const p = spec.soft.pos(s), b = spec.soft.band;
      const g = spec.soft.dir === 'h' ? x.createLinearGradient(0, p - b / 2, 0, p + b / 2) : x.createLinearGradient(p - b / 2, 0, p + b / 2, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
      ctx.drawImage(c, 0, 0);
    } else {
      ctx.save(); spec.clipA(ctx, s); ctx.clip(); ctx.drawImage(A, 0, 0); ctx.restore();
    }
  }

  function frame(ctx, spec, t) {
    const W = spec.W, H = spec.H;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (spec.type === 'push') {
      drawPush(ctx, spec, spec.A, spec.B, keyed(t, PUSH));
    } else if (spec.type === 'relay') {
      // day and night take turns covering the poster; the hidden side moves on to its next screenshot
      const st = spec.states, n = st.length, p = t * n, i = Math.floor(p) % n, local = p - Math.floor(p);
      const m = local < spec.hold ? 0 : ease((local - spec.hold) / (1 - spec.hold));
      const a = st[i], b = st[(i + 1) % n], at = m > 0 ? b : a;
      drawPush(ctx, spec, spec.As[at.a], spec.Bs[at.b], a.s + (b.s - a.s) * m);
    } else if (spec.type === 'wipe') {
      const c = keyed(t, WIPE), x = spec.phone.x + spec.phone.w * c;
      ctx.drawImage(spec.second, 0, 0);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); ctx.drawImage(spec.first, 0, 0); ctx.restore();
      if (spec.divider) spec.divider(ctx, x);
    } else if (spec.type === 'fade') {
      const a = keyed(t, FADE);
      ctx.drawImage(spec.layers[0], 0, 0);
      if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(spec.layers[1], 0, 0); }
    } else if (spec.type === 'cycle') {
      const n = spec.layers.length, p = t * n, i = Math.floor(p) % n, local = p - Math.floor(p);
      const a = local < .6 ? 0 : ease((local - .6) / .4);
      ctx.drawImage(spec.layers[i], 0, 0);
      if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(spec.layers[(i + 1) % n], 0, 0); }
    } else if (spec.type === 'seq') {
      // parts play one after another; weights set how long each one lasts
      const total = spec.parts.reduce((a, p) => a + p.weight, 0);
      let at = t * total;
      for (const p of spec.parts) { if (at <= p.weight || p === spec.parts[spec.parts.length - 1]) { ctx.restore(); frame(ctx, p.spec, Math.min(1, at / p.weight)); return; } at -= p.weight; }
    } else if (spec.type === 'xfade') {
      const a = keyed(t, XFADE);
      ctx.drawImage(spec.from, 0, 0);
      if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(spec.to, 0, 0); }
    } else if (spec.type === 'tween') {
      // each screenshot moves from its slot in one step to its slot in the next
      const n = spec.steps.length, pos = t * n, i = Math.floor(pos) % n, local = pos - Math.floor(pos);
      const p = local < .5 ? 0 : ease((local - .5) / .5);
      const from = spec.steps[i], to = spec.steps[(i + 1) % n], k = spec.k;
      ctx.drawImage(spec.bases ? spec.bases[i] : spec.base, 0, 0);
      const list = [];
      for (const a of from) {
        const b = to.find(x => x.id === a.id); if (!b) continue;
        const wrap = p > 0 && (spec.wrap === 'fade' ? a.slot === 0 && b.slot === from.length - 1 : a.slot === from.length - 1 && b.slot === 0);
        if (wrap && spec.wrap === 'fade') { list.push({ z: a.z, draw: () => drawSprite(ctx, spec.sprites[a.id], a.rect, k, 1 - p) }); list.push({ z: b.z, draw: () => drawSprite(ctx, spec.sprites[a.id], b.rect, k, p) }); continue; }
        const r = lerpRect(a.rect, b.rect, p);
        if (wrap) r.y += Math.sin(Math.PI * p) * r.h * .07; // the top card dips as it goes under the stack
        list.push({ z: wrap ? -1 : (p < .5 ? a.z : b.z), draw: () => drawSprite(ctx, spec.sprites[a.id], r, k) });
      }
      list.sort((x, y) => x.z - y.z).forEach(x => x.draw());
    } else if (spec.type === 'draw') {
      // layouts that redraw themselves every frame (fold, library card)
      spec.draw(ctx, t);
    } else if (spec.type === 'swap') {
      const s = keyed(t, SWAP), bump = Math.sin(Math.PI * s);
      ctx.drawImage(spec.base, 0, 0);
      for (const st of spec.statics) ctx.drawImage(st.img, st.x, st.y);
      for (const pr of spec.pairs) {
        const { a, b } = pr, w = Math.max(a.w, b.w) * .38;
        const pa = { x: a.x + (b.x - a.x) * s - w * bump, y: a.y + (b.y - a.y) * s + w * .12 * bump };
        const pb = { x: b.x + (a.x - b.x) * s + w * bump, y: b.y + (a.y - b.y) * s - w * .12 * bump };
        // the card that starts in front goes behind halfway through
        const order = s < .5 ? [[b, pb], [a, pa]] : [[a, pa], [b, pb]];
        for (const [it, pos] of order) ctx.drawImage(it.img, pos.x, pos.y);
      }
    }
    ctx.restore();
  }

  /* ---------- GIF encoder: median-cut palette, Floyd–Steinberg dithering, frame differences, LZW ---------- */
  function buildPalette(canvases, extra = []) {
    const px = [];
    for (const c of canvases) {
      const k = Math.min(1, 260 / Math.max(c.width, c.height)), w = Math.max(1, Math.round(c.width * k)), h = Math.max(1, Math.round(c.height * k));
      const s = document.createElement('canvas'); s.width = w; s.height = h; const x = s.getContext('2d');
      x.drawImage(c, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data;
      for (let i = 0; i < d.length; i += 4) px.push((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    }
    for (const hex of extra) { const n = parseInt(hex.replace('#', ''), 16); for (let i = 0; i < 400; i++) px.push(n); }
    let boxes = [Int32Array.from(px)];
    const range = b => { let r0 = 255, r1 = 0, g0 = 255, g1 = 0, b0 = 255, b1 = 0; for (const v of b) { const r = v >> 16 & 255, g = v >> 8 & 255, bl = v & 255; if (r < r0) r0 = r; if (r > r1) r1 = r; if (g < g0) g0 = g; if (g > g1) g1 = g; if (bl < b0) b0 = bl; if (bl > b1) b1 = bl; } return [r1 - r0, g1 - g0, b1 - b0]; };
    while (boxes.length < 255) {
      let bi = -1, best = 0, ch = 0;
      boxes.forEach((b, i) => { if (b.length < 2) return; const r = range(b), m = Math.max(...r), score = m * Math.sqrt(b.length); if (score > best) { best = score; bi = i; ch = r.indexOf(m); } });
      if (bi < 0 || best === 0) break;
      const shift = [16, 8, 0][ch], b = boxes[bi];
      const sorted = Array.from(b).sort((p, q) => ((p >> shift) & 255) - ((q >> shift) & 255));
      const mid = sorted.length >> 1;
      boxes.splice(bi, 1, Int32Array.from(sorted.slice(0, mid)), Int32Array.from(sorted.slice(mid)));
    }
    const pal = new Uint8Array(256 * 3);
    boxes.forEach((b, i) => { let r = 0, g = 0, bl = 0; for (const v of b) { r += v >> 16 & 255; g += v >> 8 & 255; bl += v & 255; } const n = b.length || 1; pal[i * 3] = Math.round(r / n); pal[i * 3 + 1] = Math.round(g / n); pal[i * 3 + 2] = Math.round(bl / n); });
    return { pal, count: boxes.length };
  }
  function makeMapper(P) {
    const lut = new Int16Array(1 << 15).fill(-1);
    return (r, g, b) => {
      const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
      let v = lut[key]; if (v >= 0) return v;
      let best = 1e9; v = 0;
      const rr = (r & 248) + 4, gg = (g & 248) + 4, bb = (b & 248) + 4;
      for (let i = 0; i < P.count; i++) { const dr = P.pal[i * 3] - rr, dg = P.pal[i * 3 + 1] - gg, db = P.pal[i * 3 + 2] - bb; const d = dr * dr * 3 + dg * dg * 4 + db * db * 2; if (d < best) { best = d; v = i; } }
      lut[key] = v; return v;
    };
  }
  function quantize(data, w, h, P, map) {
    const out = new Uint8Array(w * h);
    let cur = new Float32Array((w + 2) * 3), nxt = new Float32Array((w + 2) * 3);
    const S = .75; // dithering strength
    for (let y = 0; y < h; y++) {
      nxt.fill(0);
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, e = (x + 1) * 3;
        const r = Math.max(0, Math.min(255, data[i] + cur[e])), g = Math.max(0, Math.min(255, data[i + 1] + cur[e + 1])), b = Math.max(0, Math.min(255, data[i + 2] + cur[e + 2]));
        const k = map(r | 0, g | 0, b | 0); out[y * w + x] = k;
        const er = (r - P.pal[k * 3]) * S, eg = (g - P.pal[k * 3 + 1]) * S, eb = (b - P.pal[k * 3 + 2]) * S;
        cur[e + 3] += er * 7 / 16; cur[e + 4] += eg * 7 / 16; cur[e + 5] += eb * 7 / 16;
        nxt[e - 3] += er * 3 / 16; nxt[e - 2] += eg * 3 / 16; nxt[e - 1] += eb * 3 / 16;
        nxt[e] += er * 5 / 16; nxt[e + 1] += eg * 5 / 16; nxt[e + 2] += eb * 5 / 16;
        nxt[e + 3] += er / 16; nxt[e + 4] += eg / 16; nxt[e + 5] += eb / 16;
      }
      const t = cur; cur = nxt; nxt = t;
    }
    return out;
  }
  class Bytes {
    constructor() { this.buf = new Uint8Array(1 << 20); this.n = 0; }
    grow(k) { if (this.n + k > this.buf.length) { let m = this.buf.length * 2; while (m < this.n + k) m *= 2; const b = new Uint8Array(m); b.set(this.buf.subarray(0, this.n)); this.buf = b; } }
    byte(v) { this.grow(1); this.buf[this.n++] = v; }
    word(v) { this.byte(v & 255); this.byte(v >> 8 & 255); }
    bytes(a) { this.grow(a.length); this.buf.set(a, this.n); this.n += a.length; }
    str(s) { for (const c of s) this.byte(c.charCodeAt(0)); }
    out() { return this.buf.slice(0, this.n); }
  }
  function lzw(out, idx) {
    const MIN = 8, CLEAR = 256, EOI = 257;
    let size = MIN + 1, next = 258, cur = 0, bits = 0;
    const block = new Uint8Array(255); let bl = 0;
    const emitByte = v => { block[bl++] = v; if (bl === 255) { out.byte(255); out.bytes(block); bl = 0; } };
    const emit = code => { cur |= code << bits; bits += size; while (bits >= 8) { emitByte(cur & 255); cur >>= 8; bits -= 8; } };
    let dict = new Map();
    out.byte(MIN);
    emit(CLEAR);
    let prefix = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = prefix * 256 + k, hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(CLEAR); dict = new Map(); size = MIN + 1; next = 258; }
      prefix = k;
    }
    emit(prefix); emit(EOI);
    if (bits > 0) emitByte(cur & 255);
    if (bl) { out.byte(bl); out.bytes(block.subarray(0, bl)); }
    out.byte(0);
  }
  async function encodeGif(spec, opts, progress) {
    const { W, H } = spec, n = Math.max(2, Math.round(secs(spec, opts) * opts.fps)), delay = Math.round(100 / opts.fps);
    const P = buildPalette(spec.paletteSources || [], spec.paletteExtra || []);
    const map = makeMapper(P);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
    const o = new Bytes();
    o.str('GIF89a'); o.word(W); o.word(H); o.byte(0xF7); o.byte(0); o.byte(0); o.bytes(P.pal);
    o.byte(0x21); o.byte(0xFF); o.byte(11); o.str('NETSCAPE2.0'); o.byte(3); o.byte(1); o.word(0); o.byte(0);
    let prev = null;
    for (let f = 0; f < n; f++) {
      x.clearRect(0, 0, W, H); frame(x, spec, f / n);
      const idx = quantize(x.getImageData(0, 0, W, H).data, W, H, P, map);
      // only the part that changed since the previous frame is stored; the rest stays transparent
      let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1, sub = idx;
      if (prev) {
        x0 = W; y0 = H; x1 = -1; y1 = -1;
        for (let y = 0; y < H; y++) for (let xx = 0, r = y * W; xx < W; xx++) if (idx[r + xx] !== prev[r + xx]) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) { x0 = y0 = x1 = y1 = 0; }
        const sw = x1 - x0 + 1, sh = y1 - y0 + 1; sub = new Uint8Array(sw * sh);
        for (let y = 0; y < sh; y++) for (let xx = 0; xx < sw; xx++) { const g = (y + y0) * W + xx + x0; sub[y * sw + xx] = idx[g] === prev[g] ? 255 : idx[g]; }
      }
      o.byte(0x21); o.byte(0xF9); o.byte(4); o.byte((1 << 2) | (prev ? 1 : 0)); o.word(delay); o.byte(255); o.byte(0);
      o.byte(0x2C); o.word(x0); o.word(y0); o.word(x1 - x0 + 1); o.word(y1 - y0 + 1); o.byte(0);
      lzw(o, sub);
      prev = idx;
      progress((f + 1) / n);
      await new Promise(r => setTimeout(r, 0));
    }
    o.byte(0x3B);
    return new Blob([o.out()], { type: 'image/gif' });
  }

  /* ---------- video: the browser's own recorder, fed one loop in real time ---------- */
  function videoType() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    for (const t of ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
      try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) {}
    }
    return null;
  }
  async function recordVideo(spec, opts, progress) {
    const type = videoType(); if (!type) throw Object.assign(new Error('novideo'), { code: 'novideo' });
    const c = document.createElement('canvas'); c.width = spec.W; c.height = spec.H;
    c.style.cssText = 'position:fixed;left:-20000px;top:0;width:2px;height:2px;pointer-events:none';
    document.body.append(c);
    const x = c.getContext('2d');
    frame(x, spec, 0);
    const stream = c.captureStream(opts.fps);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: Math.round(spec.W * spec.H * opts.fps * .35) });
    const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(r => { rec.onstop = r; });
    const D = secs(spec, opts) * 1000;
    rec.start(250);
    const t0 = performance.now();
    await new Promise(resolve => {
      const tick = () => {
        const el = performance.now() - t0;
        frame(x, spec, Math.min(el, D) / D % 1);
        progress(Math.min(1, el / D));
        if (el >= D + 1000 / opts.fps) resolve(); else setTimeout(tick, 1000 / opts.fps / 2);
      };
      tick();
    });
    rec.stop(); await done;
    stream.getTracks().forEach(t => t.stop()); c.remove();
    const mime = type.split(';')[0];
    return { blob: new Blob(chunks, { type: mime }), ext: mime === 'video/mp4' ? 'mp4' : 'webm' };
  }

  /* ---------- the sheet ---------- */
  const CSS = `
  .mo{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,14,12,.5);padding:env(safe-area-inset-top,0) 0 0}
  .mo[hidden],.mo-opt[hidden]{display:none!important}
  .mo-variant{align-items:flex-start}.mo-variant>span{padding-top:8px;white-space:nowrap}
  .mo-card{width:min(720px,100%);max-height:100%;overflow:auto;background:var(--mo-bg,#fff);color:var(--mo-ink,#222);border-radius:var(--mo-radius,14px) var(--mo-radius,14px) 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom,0px));font-family:var(--mo-font,inherit);box-shadow:0 -10px 40px rgba(0,0,0,.25);overscroll-behavior:contain}
  @media(min-width:760px){.mo{align-items:center}.mo-card{border-radius:var(--mo-radius,14px);max-height:92vh}}
  .mo-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}
  .mo-head h2{margin:0;font:var(--mo-title-font,600 17px/1.3 inherit);letter-spacing:var(--mo-title-track,0)}
  .mo-x{border:1px solid var(--mo-line,#ddd);background:transparent;color:inherit;border-radius:50%;width:34px;height:34px;font-size:18px;line-height:1;cursor:pointer}
  .mo-desc,.mo-note{margin:0 0 10px;font-size:13px;color:var(--mo-muted,#777);line-height:1.6}
  .mo-note{font-size:12px;margin:10px 0 0}
  .mo-stage{display:block;width:100%;height:auto;border-radius:calc(var(--mo-radius,14px) * .5);background:var(--mo-line,#ddd);margin:0 0 12px}
  .mo-opts{display:grid;gap:10px;margin:0 0 14px}
  .mo-opt{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px}
  .mo-seg{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  .mo-seg button,.mo-act button,.mo-res button{border:1px solid var(--mo-line,#ddd);background:transparent;color:inherit;border-radius:calc(var(--mo-radius,14px) * .45);padding:7px 11px;font:inherit;font-size:13px;cursor:pointer}
  .mo-seg button[aria-pressed="true"]{border-color:var(--mo-accent,#333);background:var(--mo-accent-bg,rgba(0,0,0,.06));color:var(--mo-accent,#333)}
  .mo-act{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .mo-act button{padding:12px 10px;font-size:14px}
  .mo-act .mo-main{background:var(--mo-accent,#333);border-color:var(--mo-accent,#333);color:var(--mo-on-accent,#fff)}
  .mo-act button:disabled{opacity:.45;cursor:default}
  .mo-status{min-height:1.4em;margin:10px 0 0;font-size:13px;color:var(--mo-muted,#777)}
  .mo-res{display:grid;gap:10px;margin-top:10px}
  .mo-res[hidden]{display:none!important}
  .mo-res img,.mo-res video{width:100%;border-radius:calc(var(--mo-radius,14px) * .5);background:var(--mo-line,#ddd)}
  .mo-res .mo-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}`;

  function mount(o) {
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    const el = document.createElement('div'); el.className = 'mo'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="mo-card">
      <div class="mo-head"><h2>${L.title}</h2><button type="button" class="mo-x" aria-label="${L.close}">×</button></div>
      <p class="mo-desc"></p>
      <canvas class="mo-stage"></canvas>
      <div class="mo-opts">
        <div class="mo-opt mo-variant" hidden><span>${L.variant}</span><div class="mo-seg mo-vseg"></div></div>
        <div class="mo-opt"><span>${L.length}</span><div class="mo-seg" data-k="duration"><button type="button" data-v="3">3${L.sec}</button><button type="button" data-v="5">5${L.sec}</button><button type="button" data-v="8">8${L.sec}</button></div></div>
        <div class="mo-opt"><span>${L.smooth}</span><div class="mo-seg" data-k="fps"><button type="button" data-v="12">12${L.fps}</button><button type="button" data-v="20">20${L.fps}</button></div></div>
        <div class="mo-opt"><span>${L.size}</span><div class="mo-seg" data-k="width"><button type="button" data-v="720">720</button><button type="button" data-v="1080">1080</button></div></div>
      </div>
      <div class="mo-act"><button type="button" class="mo-gif">${L.gif}</button><button type="button" class="mo-vid mo-main">${L.video}</button></div>
      <p class="mo-status" aria-live="polite"></p>
      <div class="mo-res" hidden><div class="mo-media"></div><div class="mo-row"><button type="button" class="mo-share">${L.saveAlbum}</button><button type="button" class="mo-dl">${L.download}</button></div></div>
      <p class="mo-note">${L.note}</p>
    </div>`;
    document.body.append(el);
    const $ = s => el.querySelector(s);
    const opts = { duration: 5, fps: 20, width: 1080 };
    try { const s = JSON.parse(localStorage.getItem('studio.motion') || '{}'); Object.assign(opts, s); } catch (e) {}
    const syncSeg = () => el.querySelectorAll('.mo-seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(opts[seg.dataset.k]) === b.dataset.v))));
    el.querySelectorAll('.mo-seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      opts[seg.dataset.k] = Number(b.dataset.v); syncSeg();
      try { localStorage.setItem('studio.motion', JSON.stringify(opts)); } catch (e) {}
      if (seg.dataset.k === 'duration') t0 = performance.now();
    })));
    syncSeg();
    let spec = null, raf = 0, t0 = 0, busy = false, result = null, openId = 0, variant = null;
    function renderVariants() {
      const list = (o.variants && o.variants()) || null, row = $('.mo-variant'), seg = $('.mo-vseg');
      row.hidden = !list; seg.textContent = '';
      if (!list) { variant = null; return; }
      if (!list.some(v => v.v === variant)) variant = list[0].v;
      for (const v of list) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = v.label; b.setAttribute('aria-pressed', String(v.v === variant));
        b.addEventListener('click', () => { if (variant === v.v || busy) return; variant = v.v; renderVariants(); open(true); });
        seg.append(b);
      }
    }
    const status = t => { $('.mo-status').textContent = t; };
    const stage = $('.mo-stage');
    function loop() {
      if (el.hidden || !spec) return;
      const t = ((performance.now() - t0) / (secs(spec, opts) * 1000)) % 1;
      frame(stage.getContext('2d'), spec, t);
      raf = requestAnimationFrame(loop);
    }
    async function open(keep) {
      const id = ++openId;
      if (keep !== true) renderVariants();
      el.hidden = false; document.documentElement.style.overflow = 'hidden';
      clearResult(); status(L.building); spec = null;
      const r = o.ratio(), pw = Math.min(900, Math.round((stage.clientWidth || 600) * Math.min(2, window.devicePixelRatio || 1)));
      stage.width = pw; stage.height = Math.round(pw / r);
      $('.mo-desc').textContent = o.describe(variant);
      const s = await o.build(stage.width, stage.height, variant).catch(e => { console.error(e); return null; });
      if (id !== openId || el.hidden) return;
      if (!s || s.none) { status((s && s.reason) || L.fail); setButtons(false); spec = null; if (s && s.still) stage.getContext('2d').drawImage(s.still, 0, 0); return; }
      spec = s; setButtons(true); status(''); t0 = performance.now(); cancelAnimationFrame(raf); loop();
    }
    function close() { el.hidden = true; openId++; cancelAnimationFrame(raf); spec = null; document.documentElement.style.overflow = ''; clearResult(); }
    function setButtons(on) { $('.mo-gif').disabled = !on || busy; $('.mo-vid').disabled = !on || busy || !videoType(); }
    function clearResult() { if (result && result.url) URL.revokeObjectURL(result.url); result = null; $('.mo-res').hidden = true; $('.mo-media').textContent = ''; }
    function showResult(blob, name) {
      clearResult();
      const url = URL.createObjectURL(blob); result = { blob, name, url };
      const m = blob.type.startsWith('video') ? Object.assign(document.createElement('video'), { src: url, loop: true, muted: true, autoplay: true, playsInline: true, controls: true }) : Object.assign(document.createElement('img'), { src: url, alt: name });
      $('.mo-media').append(m); $('.mo-res').hidden = false;
      let canShare = false; try { canShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: blob.type })] })); } catch (e) {}
      $('.mo-share').hidden = !canShare;
      m.scrollIntoView && setTimeout(() => m.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
    }
    const sizeLabel = b => b.size > 1048576 ? (b.size / 1048576).toFixed(1) + ' MB' : Math.round(b.size / 1024) + ' KB';
    async function make(kind) {
      if (busy) return; busy = true; setButtons(true); clearResult();
      cancelAnimationFrame(raf);
      try {
        const r = o.ratio(); let W = opts.width, H = Math.round(W / r);
        if (kind === 'video') { W -= W % 2; H -= H % 2; }
        status(L.building);
        const s = await o.build(W, H, variant);
        if (!s || s.none) throw new Error((s && s.reason) || L.fail);
        let blob, ext;
        if (kind === 'gif') { blob = await encodeGif(s, opts, p => status(L.gifWork.replace('%', Math.round(p * 100) + '%'))); ext = 'gif'; }
        else { const v = await recordVideo(s, opts, p => status(L.videoWork.replace('%', Math.round(p * 100) + '%'))); blob = v.blob; ext = v.ext; }
        const name = `${o.filename()}-${W}x${H}.${ext}`;
        status(L.done.replace('%', sizeLabel(blob)));
        showResult(blob, name);
      } catch (e) {
        console.error(e); status(e && e.code === 'novideo' ? L.noVideo : (e && e.message && e.message.length < 80 && !/^[A-Za-z]/.test(e.message) ? e.message : L.fail));
      } finally { busy = false; setButtons(!!spec); if (spec) { t0 = performance.now(); loop(); } }
    }
    $('.mo-gif').addEventListener('click', () => make('gif'));
    $('.mo-vid').addEventListener('click', () => make('video'));
    $('.mo-x').addEventListener('click', close);
    el.addEventListener('click', e => { if (e.target === el) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) close(); });
    $('.mo-share').addEventListener('click', async () => {
      if (!result) return;
      try { await navigator.share({ files: [new File([result.blob], result.name, { type: result.blob.type })] }); status(L.shareHint); }
      catch (err) { if (!err || err.name !== 'AbortError') $('.mo-dl').click(); }
    });
    $('.mo-dl').addEventListener('click', async () => {
      if (!result) return;
      if (o.save) { try { await o.save(result.blob, result.name); return; } catch (e) {} }
      const a = document.createElement('a'); a.href = result.url; a.download = result.name; document.body.append(a); a.click(); a.remove();
    });
    (o.buttons || []).forEach(b => b && b.addEventListener('click', () => open()));
    return { open, close, frame };
  }

  window.LoviaMotion = { mount, frame, encodeGif, keyed };
})();
