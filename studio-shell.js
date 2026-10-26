/*
 * Lovia Reading Studio · shared shell
 * - style switch between the Lovia classic page (index.html) and the day/night page (daynight.html)
 * - hand-off: text and uploaded screenshots follow you to the other page (kept in this browser only)
 * - 繁 / 简 toggle for the interface text (character table covers every character used by both pages)
 * Lovia's own app.js is untouched; this file only observes and fills its inputs.
 */
(() => {
  'use strict';

  /* ---------- 繁簡 character table: simplified, traditional, ... ---------- */
  const PAIRS =
    '与與个個为為义義书書于於从從仅僅会會传傳体體倾傾储儲关關册冊创創务務动動华華单單变變叠疊号號后後' +
    '图圖圆圓块塊处處复復实實对對导導层層应應开開张張当當态態报報择擇损損换換据據数數无無时時显顯暂暫' +
    '杂雜条條来來样樣欢歡浅淺浏瀏渐漸温溫点點现現种種称稱纯純纹紋线線细細终終绘繪统統编編缘緣缩縮节節' +
    '衬襯装裝览覽计計认認设設试試话話说說请請读讀调調败敗贴貼轻輕载載辑輯输輸边邊过過进進适適选選错錯' +
    '键鍵闭閉阅閱阴陰随隨预預题題颜顏风風饰飾饱飽鲜鮮顶頂击擊并並机機横橫画畫盘盤确確约約胧朧师師' +
    '两兩汇匯昼晝标標档檔没沒准準产產码碼积積笔筆签籤红紅纸紙给給缀綴脑腦盖蓋里裡记記详詳这這录錄' +
    '长長间間电電页頁顺順颗顆么麼齐齊鹜鶩较較寻尋经經级級志誌萤螢着著组組启啟带帶范範钮鈕内內';
  // whole words that differ beyond single characters
  const WORDS_S2T = [['屏幕', '螢幕']];
  const s2t = new Map(), t2s = new Map();
  for (let i = 0; i + 1 < PAIRS.length; i += 2) { s2t.set(PAIRS[i], PAIRS[i + 1]); t2s.set(PAIRS[i + 1], PAIRS[i]); }

  const root = document.documentElement;
  const PAGE = root.dataset.studioPage || 'lovia';          // 'lovia' | 'daynight'
  const SRC = root.dataset.srcLang || 'sc';                 // language the page is written in
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  let lang = store.get('lovia.lang') === 'tc' ? 'tc' : (store.get('lovia.lang') === 'sc' ? 'sc' : 'sc');

  function convert(str, to) {
    if (!str) return str;
    for (const [sc, tc] of WORDS_S2T) str = to === 'tc' ? str.split(sc).join(tc) : str.split(tc).join(sc);
    const map = to === 'tc' ? s2t : t2s;
    let out = '';
    for (const ch of str) out += map.get(ch) || ch;
    return out;
  }
  const fromSrc = str => (lang === SRC ? str : convert(str, lang));

  /* ---------- DOM conversion (keeps the page's original text so switching back is exact) ---------- */
  const textOrig = new WeakMap();
  const attrOrig = new WeakMap();
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const skip = el => el.closest && el.closest('[data-i18n-skip]');

  function convertAttr(el, a) {
    if (!el.hasAttribute(a) || skip(el)) return;
    let m = attrOrig.get(el); if (!m) { m = {}; attrOrig.set(el, m); }
    const cur = el.getAttribute(a);
    let r = m[a];
    if (!r || r.out !== cur) { r = { src: cur }; m[a] = r; }
    const out = fromSrc(r.src); r.out = out;
    if (cur !== out) el.setAttribute(a, out);
  }
  function convertNode(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode;
      if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TEXTAREA' || skip(p)) return;
      let r = textOrig.get(n);
      if (!r || r.out !== n.data) { r = { src: n.data }; textOrig.set(n, r); }
      const out = fromSrc(r.src); r.out = out;
      if (n.data !== out) n.data = out;
    } else if (n.nodeType === 1) {
      if (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE' || n.hasAttribute('data-i18n-skip')) return;
      for (const a of ATTRS) convertAttr(n, a);
      if (n.nodeName === 'OPTION') convertAttr(n, 'value');
      for (const c of n.childNodes) convertNode(c);
    }
  }
  /* inputs marked data-i18n-value follow the language until the person edits them */
  const valueOrig = new WeakMap();
  function convertValues() {
    document.querySelectorAll('input[data-i18n-value]').forEach(el => {
      let r = valueOrig.get(el);
      if (!r) { r = { src: el.defaultValue || el.value, out: el.value }; valueOrig.set(el, r); }
      if (el.value !== r.out) return; // edited by the person: leave it
      const out = fromSrc(r.src); r.out = out;
      if (el.value !== out) { el.value = out; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  }
  const mo = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') convertNode(m.target);
      else if (m.type === 'childList') m.addedNodes.forEach(convertNode);
      else if (m.type === 'attributes' && (m.attributeName !== 'value' || m.target.nodeName === 'OPTION')) convertAttr(m.target, m.attributeName);
    }
    mo.takeRecords(); // drop the records our own edits just produced
  });

  const listeners = [];
  function applyLang() {
    root.lang = lang === 'tc' ? 'zh-Hant' : 'zh-Hans';
    if (!root.dataset.titleSrc) root.dataset.titleSrc = document.title;
    document.title = fromSrc(root.dataset.titleSrc);
    listeners.forEach(fn => { try { fn(lang); } catch (e) { console.error(e); } });
    convertNode(document.body);
    mo.takeRecords();
    convertValues();
    const btn = document.getElementById('ssLang');
    if (btn) {
      btn.textContent = lang === 'tc' ? '简' : '繁';
      btn.setAttribute('aria-label', lang === 'tc' ? '切換為簡體中文' : '切换为繁体中文');
    }
  }
  function setLang(next) { lang = next; store.set('lovia.lang', next); applyLang(); }

  /* ---------- hand-off storage (IndexedDB, this browser only) ---------- */
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('lovia-studio', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function put(key, value) {
    const db = await idb();
    await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(value, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }
  async function take(key) {
    const db = await idb();
    const value = await new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite'); const st = tx.objectStore('kv');
      const g = st.get(key); g.onsuccess = () => { st.delete(key); }; tx.oncomplete = () => res(g.result); tx.onerror = () => rej(tx.error);
    });
    db.close(); return value;
  }

  /* ---------- page adapters ---------- */
  let adapter = null;
  function registerPage(a) { adapter = a; maybeReceive(); }

  // Lovia classic: read and fill its existing controls, without changing app.js
  function loviaAdapter() {
    const val = id => (document.getElementById(id) || {}).value || '';
    const setVal = (id, v) => { const el = document.getElementById(id); if (el && typeof v === 'string') { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    const ready = new Promise(res => {
      const t0 = Date.now();
      (function poll() {
        const img = document.querySelector('#uploadGrid img[src]');
        const tile = document.querySelector('#uploadGrid .upload-tile');
        if ((img && img.complete) || (tile && window.LoviaClassicAPI && !img) || Date.now() - t0 > 6000) setTimeout(res, 150); else setTimeout(poll, 120);
      })();
    });
    return {
      ready,
      async collect() {
        const api = window.LoviaClassicAPI;
        const sources = name => api ? api.imageSources(name)
          : (name === 'day' ? [...document.querySelectorAll('#uploadGrid .upload-tile img')].map(i => i.getAttribute('src') || '') : []);
        const grab = async name => {
          const out = [];
          for (const s of sources(name).filter(s => s.startsWith('blob:'))) { try { out.push({ blob: await (await fetch(s)).blob(), label: '' }); } catch (e) {} }
          return out;
        };
        return { text: { title: val('themeName'), author: val('authorName'), date: val('dateText'), message: val('footerText') }, images: { day: await grab('day'), night: await grab('night') } };
      },
      async apply(d) {
        await ready;
        if (d.text) { setVal('themeName', d.text.title); setVal('authorName', d.text.author); setVal('dateText', d.text.date); setVal('footerText', d.text.message); }
        const toFiles = list => (list || []).slice(0, 5).map((it, i) => new File([it.blob], `screenshot-${i + 1}.${(it.blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`, { type: it.blob.type || 'image/png' }));
        const day = toFiles(d.images && d.images.day), night = toFiles(d.images && d.images.night);
        const api = window.LoviaClassicAPI;
        if (api) {
          if (day.length) await api.loadFiles('day', day);
          if (night.length) await api.loadFiles('night', night);
          if (day.length && night.length) api.setLayout('pairs');
          return;
        }
        const files = day.length ? day : night;
        const input = document.getElementById('batchFileInput');
        if (files.length && input && typeof DataTransfer !== 'undefined') {
          try { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { console.warn(e); }
        }
      },
    };
  }

  async function maybeReceive() {
    if (!adapter || !('indexedDB' in window)) return;
    let d = null;
    try { d = await take('handoff'); } catch (e) { return; }
    if (!d || d.to !== PAGE || Date.now() - (d.at || 0) > 15 * 60 * 1000) return;
    try { await adapter.ready; await adapter.apply(d); } catch (e) { console.warn('hand-off failed', e); }
  }

  async function goTo(target, href) {
    if (target === PAGE) return;
    if (adapter && 'indexedDB' in window) {
      try { const d = await adapter.collect(); d.to = target; d.from = PAGE; d.at = Date.now(); await put('handoff', d); } catch (e) { console.warn('hand-off not saved', e); }
    }
    location.href = href;
  }

  /* ---------- the switch itself ---------- */
  const CSS = `
  .ss{display:inline-flex;align-items:center;gap:8px;font:500 12px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","PingFang TC","Microsoft YaHei",sans-serif;color:var(--ss-ink,#2e3931)}
  .ss-seg{display:inline-flex;border:1px solid var(--ss-line,rgba(46,57,49,.28));border-radius:999px;padding:2px;background:var(--ss-bg,rgba(255,255,255,.55))}
  .ss-seg a{display:inline-flex;align-items:center;gap:5px;padding:7px 11px;border-radius:999px;color:inherit;text-decoration:none;white-space:nowrap}
  .ss-seg a[aria-current="page"]{background:var(--ss-active,#2e3931);color:var(--ss-active-ink,#fbfaf6)}
  .ss-seg a:focus-visible,.ss-lang:focus-visible{outline:2px solid var(--ss-focus,#687c6b);outline-offset:2px}
  .ss-short{display:none}
  .ss-lang{width:32px;height:32px;border-radius:50%;border:1px solid var(--ss-line,rgba(46,57,49,.28));background:var(--ss-bg,rgba(255,255,255,.55));color:inherit;font:600 13px/1 inherit;cursor:pointer;padding:0}
  .studio-switch-row{display:flex;justify-content:center;padding:12px 16px 0}
  html{touch-action:manipulation}
  html,body{overflow-x:clip}
  @media(max-width:959px){input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=button]):not([type=file]),select,textarea{font-size:16px!important}}
  @media(max-width:580px){.ss-full{display:none}.ss-short{display:inline}.ss-seg a{padding:7px 9px}.ss{gap:6px}}`;
  function mountSwitch() {
    const mount = document.getElementById('studioShell');
    if (!mount) return;
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    const T = SRC === 'sc'
      ? { group: '展示风格', lovia: 'Lovia 经典', loviaS: '经典', dn: 'Day Night', dnS: 'Day Night' }
      : { group: '展示風格', lovia: 'Lovia 經典', loviaS: '經典', dn: 'Day Night', dnS: 'Day Night' };
    mount.innerHTML =
      `<div class="ss"><nav class="ss-seg" aria-label="${T.group}">` +
      `<a href="./index.html" data-target="lovia"><span class="ss-full">${T.lovia}</span><span class="ss-short">${T.loviaS}</span></a>` +
      `<a href="./daynight.html" data-target="daynight"><span class="ss-full">${T.dn}</span><span class="ss-short">${T.dnS}</span></a>` +
      `</nav><button class="ss-lang" id="ssLang" type="button" data-i18n-skip></button></div>`;
    mount.querySelectorAll('a[data-target]').forEach(a => {
      if (a.dataset.target === PAGE) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', e => { e.preventDefault(); goTo(a.dataset.target, a.getAttribute('href')); });
    });
    document.getElementById('ssLang').addEventListener('click', () => setLang(lang === 'tc' ? 'sc' : 'tc'));
  }

  function start() {
    mountSwitch();
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value']) });
    applyLang();
    if (PAGE === 'lovia') registerPage(loviaAdapter());
  }

  window.LoviaStudio = {
    get lang() { return lang; },
    t: fromSrc,
    onLang(fn) { listeners.push(fn); },
    registerPage,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
