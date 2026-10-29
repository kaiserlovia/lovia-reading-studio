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
    '长長间間电電页頁顺順颗顆么麼齐齊鹜鶩较較寻尋经經级級志誌萤螢着著组組启啟带帶范範钮鈕内內' +
    '删刪区區结結连連链鏈侧側订訂项項压壓备備扫掃畅暢轮輪转轉云雲别別继繼续續栏欄还還独獨夹夾写寫头頭';
  // whole words that differ beyond single characters
  const WORDS_S2T = [['屏幕', '螢幕'], ['复制', '複製'], ['视频', '影片'], ['相册', '相簿'], ['制作', '製作']];
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
        const images={day:await grab('day'),night:await grab('night')};
        // Index by transferred uploads, excluding desktop sample screenshots.
        const artMosaic=api?.artSettings?.();
        if(artMosaic){artMosaic.images=[];for(const group of ['day','night']){
          const uploads=(api.artImages?.(group)||[]).filter(it=>it.image.src.startsWith('blob:'));
          uploads.forEach((it,index)=>artMosaic.images.push({group,index,settings:window.LoviaArtMosaic.get(it.image)}));
        }}
        return { text: { title: val('themeName'), author: val('authorName'), date: val('dateText'), message: val('footerText') }, images, artMosaic };
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
          if (d.artMosaic) api.applyArtSettings?.(d.artMosaic);
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
  .ss-seg a:focus-visible,.ss-lang:focus-visible,.ss-home:focus-visible{outline:2px solid var(--ss-focus,#687c6b);outline-offset:2px}
  .ss-short{display:none}
  .ss-home{width:32px;height:32px;flex:none;border-radius:50%;border:1px solid var(--ss-line,rgba(46,57,49,.28));background:var(--ss-bg,rgba(255,255,255,.55));color:inherit;display:inline-flex;align-items:center;justify-content:center}
  .ss-home svg{width:15px;height:15px}
  .ss-lang{width:32px;height:32px;border-radius:50%;border:1px solid var(--ss-line,rgba(46,57,49,.28));background:var(--ss-bg,rgba(255,255,255,.55));color:inherit;font:600 13px/1 inherit;cursor:pointer;padding:0}
  .studio-switch-row{display:flex;justify-content:center;padding:12px 16px 0}
  html{touch-action:pan-y pinch-zoom}
  html,body{overflow-x:clip;overscroll-behavior-x:none}
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
      `<div class="ss"><a class="ss-home" href="../" title="回 Reeden 小工具" aria-label="回 Reeden 小工具"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg></a>` +
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

  /* ---------- saved settings (設置): this browser only, plus a shareable link without images ---------- */
  const PT = SRC === 'sc'
    ? { name: '设置', saved: '已存成「%」，下次在「我的设置」点一下就能套用。', applied: '已套用「%」，换上新截图就好。', link: '已复制设置链接，贴到其他装置或传给朋友打开就能套用（不含截图和上传的档案）。',
        linkFail: '无法自动复制，请长按下面的链接复制：', fromLink: '已套用链接里的设置。想留着用，请到导出按「储存本次设定」。', del: '删除', delSure: '确定删除？',
        overwrite: '用目前设定覆盖', copy: '复制链接', done: '完成', rename: '设置名称', more: '更多选项', head: '我的设置', updated: '已用目前设定更新「%」。', full: '浏览器空间不足，这次没有存成功。', files: '（含上传的底图、封面或字体）',
        cloud: '存到云端', cloudUpdate: '更新云端', cloudBusy: '储存中…', cloudSaved: '已把「%」存到云端，分享链接已复制。', cloudUpdated: '已更新云端的「%」。',
        share: '复制分享链接', edit: '复制编辑链接', shareDone: '已复制分享链接，对方打开就能套用（含底图和封面，不含字体）。', editDone: '已复制编辑链接，请自己保存好。',
        cloudNote: '存到云端后，分享链接会带上底图和封面；编辑链接可以在别的装置继续修改，请不要给别人。',
        cloudOpened: '已套用云端设置「%」。想留着用，请到导出按「储存本次设定」。', cloudOwned: '已打开云端设置「%」，并加到「我的设置」。', noFont: '这个设置用的字体「%」这台装置没有，先用默认字体；上传同一个字体就会换回来。',
        loading: '正在读取云端设置…', mine: '我的作品集', make: '制作', toMine: '看我的作品集', open: '打开', goOn: '继续改', current: '目前这个', noThumb: '套用一次就会有预览图', remove: '移除', removeSure: '确定移除？', collLabel: '作品集链接', collCopy: '复制作品集链接', collDone: '已复制作品集链接，请自己保存好。', collMoved: '已把作品集搬到这台装置。', collMissing: '找不到这个作品集，链接可能不完整。',
        h: 0, hMine: '你的代号：%。别人输入代号就能看你的作品集，也能套用成自己的一份，但改不到你的作品。', hCopy: '复制作品集页链接', hCopied: '已复制作品集页链接，可以直接分享。', hPwBtn: '看密码', hPwHide: '收起密码', hPwNew: '换新密码', hPwSure: '确定换？原本的密码会失效', hPwCopy: '复制', hPwCopied: '已复制密码，请存好。', hPwNote: '换装置时，输入代号和这组密码就能拿回作品。请另外存好；这台装置随时能再按「看密码」。', hPwDone: '换好新密码了，请存好。', hClaimNote: '取一个代号：别人输入代号就能看你的作品集；密码由系统产生，换装置时输入代号和密码，就能拿回全部作品继续改。', hName: '代号', hPw: '密码', hCreate: '建立', hCreated: '代号「%」建立好了，请存好密码。', hLoginSum: '在别的装置做过？用代号和密码拿回作品', hLogin: '登入', hLoggedIn: '已用「%」拿回作品集。', hLook: '看别人的作品集', hLookBtn: '查看', hNotFound: '找不到这个代号。', oHead: '「%」的作品集：可以打开看、套用成自己的一份，改不到原本的作品。', oBack: '← 回到我的作品集', oSvg: '看 SVG 工坊的作品', oNone: '这个作品集里没有展示作品。', oApply: '打开套用', oNoThumb: '没有预览图',
        collNote: '在新装置打开作品集链接，就能把整个作品集搬过去。这个链接可以修改你所有的作品，请自己保存好，不要给别人。', styleLovia: 'Lovia 经典', styleDn: 'Day Night',
        mineNote: '这台装置存过云端的设置，两种风格都在这里；在别的装置用编辑链接打开过的，也会列在那台装置上。', mineEmpty: '目前没有存到云端的设置。在「我的设置」按设置旁的「⋯」，再按「存到云端」，就会出现在这里。' }
    : { name: '設置', saved: '已存成「%」，下次在「我的設置」點一下就能套用。', applied: '已套用「%」，換上新截圖就好。', link: '已複製設置連結，貼到其他裝置或傳給朋友打開就能套用（不含截圖和上傳的檔案）。',
        linkFail: '無法自動複製，請長按下面的連結複製：', fromLink: '已套用連結裡的設置。想留著用，請到匯出按「儲存本次設定」。', del: '刪除', delSure: '確定刪除？',
        overwrite: '用目前設定覆蓋', copy: '複製連結', done: '完成', rename: '設置名稱', more: '更多選項', head: '我的設置', updated: '已用目前設定更新「%」。', full: '瀏覽器空間不足，這次沒有存成功。', files: '（含上傳的底圖、封面或字體）',
        cloud: '存到雲端', cloudUpdate: '更新雲端', cloudBusy: '儲存中…', cloudSaved: '已把「%」存到雲端，分享連結已複製。', cloudUpdated: '已更新雲端的「%」。',
        share: '複製分享連結', edit: '複製編輯連結', shareDone: '已複製分享連結，對方打開就能套用（含底圖和封面，不含字體）。', editDone: '已複製編輯連結，請自己保存好。',
        cloudNote: '存到雲端後，分享連結會帶上底圖和封面；編輯連結可以在別的裝置繼續修改，請不要給別人。',
        cloudOpened: '已套用雲端設置「%」。想留著用，請到匯出按「儲存本次設定」。', cloudOwned: '已打開雲端設置「%」，並加到「我的設置」。', noFont: '這個設置用的字體「%」這台裝置沒有，先用默認字體；上傳同一個字體就會換回來。',
        loading: '正在讀取雲端設置…', mine: '我的作品集', make: '製作', toMine: '看我的作品集', open: '打開', goOn: '繼續改', current: '目前這個', noThumb: '套用一次就會有預覽圖', remove: '移除', removeSure: '確定移除？', collLabel: '作品集連結', collCopy: '複製作品集連結', collDone: '已複製作品集連結，請自己保存好。', collMoved: '已把作品集搬到這台裝置。', collMissing: '找不到這個作品集，連結可能不完整。',
        h: 0, hMine: '你的代號：%。別人輸入代號就能看你的作品集，也能套用成自己的一份，但改不到你的作品。', hCopy: '複製作品集頁連結', hCopied: '已複製作品集頁連結，可以直接分享。', hPwBtn: '看密碼', hPwHide: '收起密碼', hPwNew: '換新密碼', hPwSure: '確定換？原本的密碼會失效', hPwCopy: '複製', hPwCopied: '已複製密碼，請存好。', hPwNote: '換裝置時，輸入代號和這組密碼就能拿回作品。請另外存好；這台裝置隨時能再按「看密碼」。', hPwDone: '換好新密碼了，請存好。', hClaimNote: '取一個代號：別人輸入代號就能看你的作品集；密碼由系統產生，換裝置時輸入代號和密碼，就能拿回全部作品繼續改。', hName: '代號', hPw: '密碼', hCreate: '建立', hCreated: '代號「%」建立好了，請存好密碼。', hLoginSum: '在別的裝置做過？用代號和密碼拿回作品', hLogin: '登入', hLoggedIn: '已用「%」拿回作品集。', hLook: '看別人的作品集', hLookBtn: '查看', hNotFound: '找不到這個代號。', oHead: '「%」的作品集：可以打開看、套用成自己的一份，改不到原本的作品。', oBack: '← 回到我的作品集', oSvg: '看 SVG 工坊的作品', oNone: '這個作品集裡沒有展示作品。', oApply: '打開套用', oNoThumb: '沒有預覽圖',
        collNote: '在新裝置打開作品集連結，就能把整個作品集搬過去。這個連結可以修改你所有的作品，請自己保存好，不要給別人。', styleLovia: 'Lovia 經典', styleDn: 'Day Night',
        mineNote: '這台裝置存過雲端的設置，兩種風格都在這裡；在別的裝置用編輯連結打開過的，也會列在那台裝置上。', mineEmpty: '目前沒有存到雲端的設置。在「我的設置」按設置旁的「⋯」，再按「存到雲端」，就會出現在這裡。' };
  const PCSS = `
  .sp{display:grid;gap:8px;margin:4px 0 14px}
  .sp[hidden]{display:none!important}
  .sp-head{font-size:12px;letter-spacing:.04em;opacity:.7}
  .sp-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 1px 4px;touch-action:pan-x pan-y}
  .sp-row::-webkit-scrollbar{display:none}
  .sp-chip{display:inline-flex;align-items:stretch;flex:none;border:1px solid var(--sp-line,rgba(46,57,49,.28));border-radius:999px;background:var(--sp-bg,#fff);overflow:hidden}
  .sp-chip[data-active]{border-color:var(--sp-active,#2e3931);box-shadow:inset 0 0 0 1px var(--sp-active,#2e3931)}
  .sp-chip button{border:0;background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer}
  .sp-apply{padding:8px 4px 8px 13px;max-width:11em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sp-more{padding:8px 11px 8px 7px;opacity:.6;letter-spacing:1px}
  .sp-edit{display:grid;gap:8px;padding:10px;border:1px solid var(--sp-line,rgba(46,57,49,.28));border-radius:10px;background:var(--sp-bg,#fff)}
  .sp-edit input{width:100%;box-sizing:border-box;border:1px solid var(--sp-line,rgba(46,57,49,.28));border-radius:8px;padding:8px 10px;font:inherit;font-size:14px;background:transparent;color:inherit}
  .sp-acts{display:flex;flex-wrap:wrap;gap:6px}
  .sp-acts button{border:1px solid var(--sp-line,rgba(46,57,49,.28));background:transparent;color:inherit;border-radius:8px;padding:7px 10px;font:inherit;font-size:13px;cursor:pointer}
  .sp-acts .sp-del[data-sure]{border-color:#b4533f;color:#b4533f}
  .sp-acts .sp-done{margin-left:auto}
  .sp-link{width:100%;box-sizing:border-box;font-size:12px!important}
  .sp-note{margin:0;font-size:12px;line-height:1.5;opacity:.7}
  .sp-cloud{font-size:11px;opacity:.55;margin-left:4px}
  .sp-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .sp-mine-btn{border:0;background:none;color:inherit;font:inherit;font-size:12px;padding:4px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px;opacity:.8}
  .sv{display:flex;justify-content:center;gap:4px;border-bottom:1px solid var(--sp-line,rgba(46,57,49,.2));margin:8px auto 0;max-width:1200px;padding:0 16px;font:500 14px/1 -apple-system,BlinkMacSystemFont,"PingFang SC","PingFang TC","Microsoft YaHei",sans-serif}
  .sv button{appearance:none;background:none;border:0;color:inherit;opacity:.6;font:inherit;padding:12px 14px 11px;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;white-space:nowrap}
  .sv button[aria-selected="true"]{opacity:1;border-bottom-color:currentColor}
  .sg{display:none;max-width:1200px;margin:0 auto;padding:18px 16px 60px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","PingFang TC","Microsoft YaHei",sans-serif}
  html.sp-mine .sg{display:block}
  html.sp-mine main,html.sp-mine .mobile-actions,html.sp-mine .mobile-preview-dock,html.sp-mine .site-footer{display:none!important}
  .sg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:14px}
  .sg-card{display:grid;gap:8px;align-content:start;padding:10px;border:1px solid var(--sp-line,rgba(46,57,49,.28));border-radius:12px;background:var(--sp-bg,#fff);min-width:0}
  .sg-card[data-cur]{border-color:var(--sp-active,#2e3931);box-shadow:inset 0 0 0 1px var(--sp-active,#2e3931)}
  .sg-card img{display:block;width:100%;height:auto;border-radius:8px;background:rgba(0,0,0,.04)}
  .sg-none{display:grid;place-items:center;aspect-ratio:4/3;border:1px dashed var(--sp-line,rgba(46,57,49,.28));border-radius:8px;font-size:12px;opacity:.6;text-align:center;padding:10px}
  .sg-t{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;font-size:14px;min-width:0}
  .sg-t b{font-weight:600;overflow-wrap:anywhere}
  .sg-coll{display:grid;gap:6px;margin-top:10px;justify-items:start}
  .sg-coll .sp-note{color:#b4533f;opacity:1}
  .sg-h{display:grid;gap:8px;margin-top:12px;padding:12px;border:1px solid var(--sp-line,rgba(46,57,49,.28));border-radius:12px;background:var(--sp-bg,#fff);font-size:13px}
  .sg-h form{display:flex;flex-wrap:wrap;gap:6px;margin:0;align-items:center}
  .sg-h input{flex:1 1 120px;min-width:0;box-sizing:border-box;border:1px solid var(--sp-line,rgba(46,57,49,.28));border-radius:8px;padding:7px 10px;font:inherit;background:transparent;color:inherit}
  .sg-h button{border:1px solid var(--sp-line,rgba(46,57,49,.28));background:transparent;color:inherit;border-radius:8px;padding:7px 10px;font:inherit;cursor:pointer}
  .sg-h summary{cursor:pointer;opacity:.75}
  .sg-h details form{margin-top:6px}
  .sg-h p{margin:0;line-height:1.5}
  .sg-pw{display:grid;gap:6px}
  .sg-pw div{display:flex;gap:6px}
  .sg-pw input{font-family:ui-monospace,Menlo,monospace;letter-spacing:.04em}
  .sg-h [hidden]{display:none!important}
  .sp-acts .sp-rm[data-sure]{border-color:#b4533f;color:#b4533f}
  .sp-tag{font-size:11px;opacity:.6}`;
  const presetKey = 'studio.presets.' + PAGE;
  const readList = (page = PAGE) => { try { return JSON.parse(store.get('studio.presets.' + page) || '[]'); } catch (e) { return []; } };
  const writeList = list => { try { localStorage.setItem(presetKey, JSON.stringify(list)); return true; } catch (e) { return false; } };
  function fileDb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('lovia-studio-presets', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function fileOp(mode, fn) {
    const db = await fileDb();
    try { return await new Promise((res, rej) => { const tx = db.transaction('files', mode); const out = fn(tx.objectStore('files')); tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error); }); }
    finally { db.close(); }
  }
  const putFiles = (id, files) => fileOp('readwrite', st => { st.delete(id); if (files && Object.keys(files).length) st.put(files, id); });
  const getFiles = id => fileOp('readonly', st => st.get(id)).catch(() => null);
  const dropFiles = id => fileOp('readwrite', st => { st.delete(id); }).catch(() => {});
  // settings travel in the link as base64url-encoded UTF-8 JSON
  const encode = obj => { const b = new TextEncoder().encode(JSON.stringify(obj)); let bin = ''; b.forEach(c => { bin += String.fromCharCode(c); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const decode = str => { const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))); };
  const fill = (t, name) => fromSrc(t).replace('%', name);
  // the shared cloud client lives at the site root (reeden-tools.github.io/shared/); without it, cloud buttons stay hidden
  let cloudLoad = null;
  const cloud = () => cloudLoad || (cloudLoad = new Promise(res => {
    if (window.ReedenCloud) return res(window.ReedenCloud);
    const sc = document.createElement('script'); sc.src = '/shared/cloud.v1.js?v=3';
    sc.onload = () => res(window.ReedenCloud || null); sc.onerror = () => res(null);
    document.head.append(sc);
  }));
  const PAGE_FILE = { lovia: 'index.html', daynight: 'daynight.html' };
  // a small JPEG of the poster as it looks now, for the gallery
  function snapshot() {
    const cv = document.getElementById(PAGE === 'lovia' ? 'posterCanvas' : 'cv');
    if (!cv || !cv.width) return null;
    try {
      const w = 480, h = Math.round(cv.height * w / cv.width), c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(cv, 0, 0, w, h); return c.toDataURL('image/jpeg', 0.78);
    } catch (e) { return null; }
  }
  const settle = () => new Promise(r => setTimeout(r, 600));
  // backgrounds and covers go up no larger than the poster (3600 px), as JPEG when that is smaller
  async function shrinkImage(file, max = 3600) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (k === 1 && file.size < 2.5e6) return file;
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
      return blob && blob.size < file.size ? new File([blob], (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch (e) { return file; }
  }
  const isFontSlot = k => /^font\d*$/.test(k);
  // fonts never go to the cloud; a saved setting only names its font. Look for the same file in this browser's saved settings.
  async function findLocalFont(meta) {
    if (!meta || !meta.name) return null;
    try {
      const all = await fileOp('readonly', st => st.getAll());
      for (const set of all || []) for (const k of Object.keys(set || {})) {
        const f = /^font\d*$/.test(k) && set[k];
        if (f && (f.name || '') === meta.name && (!meta.size || f.size === meta.size)) return f;
      }
    } catch (e) {}
    return null;
  }

  function mountPresets(o) {
    // o: {bar, saveButtons[], collect():{settings, files}, apply(settings, files), notify(msg)}
    if (!o || !o.bar) return;
    const style = document.createElement('style'); style.textContent = PCSS; document.head.append(style);
    const bar = o.bar; bar.classList.add('sp');
    let activeId = null, editingId = null, view = 'make';
    const notify = msg => { try { o.notify(msg); } catch (e) {} };
    function nextName(list) { let n = 1; const names = new Set(list.map(p => p.name)); while (names.has(fromSrc(PT.name) + ' ' + n)) n++; return fromSrc(PT.name) + ' ' + n; }
    async function save() {
      const list = readList(); const { settings, files } = await o.collect();
      const p = { id: 'p' + Date.now().toString(36), name: nextName(list), settings, files: Object.keys(files || {}), at: Date.now() };
      list.push(p);
      if (!writeList(list)) { notify(fromSrc(PT.full)); return; }
      try { await putFiles(p.id, files); } catch (e) { p.files = []; writeList(list); }
      activeId = p.id; render(); notify(fill(PT.saved, p.name) + (p.files.length ? fromSrc(PT.files) : ''));
      setThumb(p.id);
    }
    async function apply(p) {
      const files = p.files && p.files.length ? (await getFiles(p.id)) || {} : {};
      await o.apply(JSON.parse(JSON.stringify(p.settings)), files);
      activeId = p.id; render(); notify(fill(PT.applied, p.name));
      settle().then(() => setThumb(p.id));
    }
    async function overwrite(p) {
      const list = readList(), it = list.find(x => x.id === p.id); if (!it) return;
      const { settings, files } = await o.collect();
      it.settings = settings; it.files = Object.keys(files || {}); it.at = Date.now();
      if (!writeList(list)) { notify(fromSrc(PT.full)); return; }
      try { await putFiles(it.id, files); } catch (e) {}
      activeId = it.id; render(); notify(fill(PT.updated, it.name));
      setThumb(it.id);
    }
    function setThumb(id) {
      const t = snapshot(); if (!t) return;
      const l = readList(), it = l.find(x => x.id === id); if (!it) return;
      it.thumb = t; if (!writeList(l)) { it.thumb = null; writeList(l); }
      if (view === 'mine') renderMine();
    }
    async function copyLink(p, holder) {
      const url = location.href.split('#')[0] + '#s=' + encode({ v: 1, page: PAGE, name: p.name, settings: p.settings });
      copyUrl(url, holder, PT.link);
    }
    async function copyUrl(url, holder, okText) {
      try { await navigator.clipboard.writeText(url); notify(fromSrc(okText)); }
      catch (e) {
        notify(fromSrc(PT.linkFail));
        const inp = document.createElement('input'); inp.className = 'sp-link'; inp.readOnly = true; inp.value = url; inp.setAttribute('data-i18n-skip', '');
        holder.append(inp); inp.focus(); inp.select();
      }
    }
    let cloudBusy = false, RC = null;
    async function cloudSave(p, holder, btn) {
      if (cloudBusy || !RC) return; cloudBusy = true;
      const label = btn.textContent; btn.disabled = true; btn.textContent = fromSrc(PT.cloudBusy);
      try {
        const it = readList().find(x => x.id === p.id) || p;
        const files = it.files && it.files.length ? (await getFiles(it.id)) || {} : {};
        const meta = {}; for (const k of Object.keys(files)) meta[k] = { name: files[k].name || '', type: files[k].type || '', size: files[k].size || 0 };
        const up = {}; for (const k of Object.keys(files)) if (!isFontSlot(k)) up[k] = await shrinkImage(files[k]);
        const body = { data: { page: PAGE, name: it.name, settings: it.settings, files: meta }, title: it.name, schema_version: PAGE === 'lovia' ? 'lovia-1' : 'dn-0' };
        let c = it.cloud, fresh = false;
        if (!c || !c.key) { const r = await RC.create('showcase', body); c = { id: r.id, key: r.key, slots: [] }; fresh = true; }
        else await RC.update('showcase', c.id, c.key, body);
        for (const k of Object.keys(up)) await RC.putFile('showcase', c.id, c.key, k, up[k], up[k].name || k);
        for (const k of c.slots || []) if (!up[k] && k !== 'thumb') await RC.deleteFile('showcase', c.id, c.key, k).catch(() => {});
        const th = (readList().find(y => y.id === it.id) || {}).thumb;
        if (th) await RC.putFile('showcase', c.id, c.key, 'thumb', await (await fetch(th)).blob(), 'thumb.jpg').catch(() => {});
        c.slots = Object.keys(up); c.at = Date.now();
        const l = readList(), x = l.find(y => y.id === it.id); if (x) { x.cloud = c; writeList(l); }
        render(); syncMine({ keep: [c.id] });
        if (fresh) { try { await navigator.clipboard.writeText(RC.links(c.id).share); notify(fill(PT.cloudSaved, it.name)); } catch (e) { notify(fill(PT.cloudUpdated, it.name)); } }
        else notify(fill(PT.cloudUpdated, it.name));
      } catch (e) { notify(RC.message(e)); }
      finally { cloudBusy = false; btn.disabled = false; btn.textContent = label; }
    }
    async function openCloud(link) {
      history.replaceState(null, '', location.href.split('#')[0]);
      let w;
      try { notify(fromSrc(PT.loading)); w = await RC.get('showcase', link.id, link.key); }
      catch (e) { notify(RC.message(e)); return; }
      const d = w.data || {};
      if (d.page && d.page !== PAGE && PAGE_FILE[d.page]) { location.replace(PAGE_FILE[d.page] + '#w=' + link.id + (link.key ? '.' + link.key : '')); return; }
      if (!d.settings) return;
      const files = {};
      for (const f of w.files || []) {
        if (f.slot === 'thumb') continue;
        try {
          const b = await RC.getFile('showcase', link.id, f.slot, link.key);
          const m = (d.files || {})[f.slot] || {};
          files[f.slot] = new File([b], m.name || f.filename || f.slot, { type: m.type || f.mime || b.type });
        } catch (e) {}
      }
      const missing = [];
      for (const [sl, fontMeta] of Object.entries(d.files || {})) {
        if (!isFontSlot(sl) || files[sl]) continue;
        const f = await findLocalFont(fontMeta); if (f) files[sl] = f; else missing.push(fontMeta.name || '');
      }
      const missingFont = missing.length > 0;
      const st = JSON.parse(JSON.stringify(d.settings));
      if (missingFont && PAGE === 'lovia' && st.font === 'uploaded' && !files.font) st.font = 'kinghwa';
      await o.apply(st, files);
      const name = d.name || w.title || fromSrc(PT.name);
      const fontNote = missingFont ? fill(PT.noFont, missing.join('、')) : '';
      if (w.owner) {
        const l = readList(); let it = l.find(x => x.cloud && x.cloud.id === link.id); const had = !!it;
        if (!it) { it = { id: 'p' + Date.now().toString(36), name, settings: st, files: [], at: Date.now() }; l.push(it); }
        it.name = name; it.settings = st; it.files = Object.keys(files); it.at = Date.now();
        it.cloud = { id: link.id, key: link.key, slots: (w.files || []).map(f => f.slot).filter(x => x !== 'thumb'), at: w.updated_at || Date.now() };
        writeOnly(readOnly().filter(x => x.id !== link.id));
        if (writeList(l)) { try { await putFiles(it.id, files); } catch (e) { it.files = []; writeList(l); } }
        activeId = it.id; render(); notify(fill(had ? PT.applied : PT.cloudOwned, name) + fontNote);
        settle().then(() => setThumb(it.id)); syncMine({ keep: [link.id] });
      } else notify(fill(PT.cloudOpened, name) + fontNote);
    }
    // every cloud-saved setting in this browser, from both styles
    // works that came in through the collection from another device and have not been opened here yet
    const readOnly = () => { try { return JSON.parse(store.get('studio.cloudOnly') || '[]'); } catch (e) { return []; } };
    const writeOnly = l => store.set('studio.cloudOnly', JSON.stringify(l));
    const mineList = () => {
      const own = ['lovia', 'daynight'].flatMap(pg => readList(pg).filter(p => p.cloud && p.cloud.key).map(p => ({ p, page: pg })));
      const ids = new Set(own.map(x => x.p.cloud.id));
      const far = readOnly().filter(x => !ids.has(x.id) && PAGE_FILE[x.page]).map(x => ({ p: { id: 'c' + x.id, name: x.name, cloud: { id: x.id, key: x.key, at: x.at } }, page: x.page, far: true }));
      return own.concat(far).sort((a, b) => (b.p.cloud.at || b.p.at || 0) - (a.p.cloud.at || a.p.at || 0));
    };
    // merge this browser's works into the cloud collection, then take in what other devices added or removed
    function syncMine(opt) {
      if (!RC || !RC.collection) return Promise.resolve();
      const local = mineList().map(({ p, page }) => ({ id: p.cloud.id, key: p.cloud.key, name: p.name, page, at: p.cloud.at || p.at }));
      return RC.collection.sync('showcase', local, opt).then(all => {
        const gone = new Set(all.removed || []);
        for (const pg of ['lovia', 'daynight']) {
          const l = readList(pg); let ch = false;
          for (const x of l) if (x.cloud && gone.has(x.cloud.id)) { delete x.cloud; ch = true; }
          if (ch) store.set('studio.presets.' + pg, JSON.stringify(l));
        }
        const known = new Set(mineList().filter(x => !x.far).map(x => x.p.cloud.id));
        writeOnly(all.filter(it => it.tool === 'showcase' && !known.has(it.id) && PAGE_FILE[it.page]).map(it => ({ id: it.id, key: it.key, name: it.name || '', page: it.page, at: it.at || 0 })));
        render();
      }).catch(() => {});
    }
    // the gallery tab: every cloud-saved setting from both styles, shown as its poster
    let nav = null, gal = null;
    function mountGallery() {
      const main = document.querySelector('main'); if (!main || nav) return;
      nav = document.createElement('nav'); nav.className = 'sv'; nav.setAttribute('role', 'tablist');
      gal = document.createElement('section'); gal.className = 'sg'; gal.setAttribute('aria-live', 'polite');
      main.before(nav, gal); renderTabs();
    }
    function renderTabs() {
      if (!nav) return; nav.textContent = '';
      const n = mineList().length;
      for (const [v, txt] of [['make', fromSrc(PT.make)], ['mine', fromSrc(PT.mine) + (n ? ' · ' + n : '')]]) {
        const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = txt; b.setAttribute('aria-selected', String(view === v));
        b.addEventListener('click', () => { if (v === 'mine') other = null; setView(v); }); nav.append(b);
      }
    }
    function setView(v) {
      view = v; root.classList.toggle('sp-mine', v === 'mine'); renderTabs();
      if (v === 'mine') renderMine(); else window.dispatchEvent(new Event('resize'));
      scrollTo({ top: 0 });
    }
    function renderMine() {
      if (!gal) return; gal.textContent = '';
      if (other) return renderOther();
      const items = mineList();
      const note = document.createElement('p'); note.className = 'sp-note'; note.textContent = fromSrc(items.length ? PT.mineNote : PT.mineEmpty);
      const grid = document.createElement('div'); grid.className = 'sg-grid';
      for (const { p, page, far } of items) {
        const cur = page === PAGE && p.id === activeId;
        const card = document.createElement('div'); card.className = 'sg-card'; if (cur) card.dataset.cur = '';
        const none = () => { const n = document.createElement('div'); n.className = 'sg-none'; n.textContent = fromSrc(PT.noThumb); return n; };
        const src = p.thumb || (RC.fileUrl && RC.fileUrl('showcase', p.cloud.id, 'thumb') + '?t=' + (p.cloud.at || 0));
        if (src) { const im = document.createElement('img'); im.src = src; im.alt = p.name; im.loading = 'lazy'; im.onerror = () => im.replaceWith(none()); card.append(im); }
        else card.append(none());
        const t = document.createElement('div'); t.className = 'sg-t';
        const n = document.createElement('b'); n.textContent = p.name; n.setAttribute('data-i18n-skip', '');
        const tag = document.createElement('span'); tag.className = 'sp-tag'; tag.textContent = fromSrc(page === 'lovia' ? PT.styleLovia : PT.styleDn);
        const at = p.cloud.at || p.at; const d = at ? new Date(at) : null;
        const when = document.createElement('span'); when.className = 'sp-tag'; when.setAttribute('data-i18n-skip', '');
        if (d) when.textContent = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
        t.append(n, tag, when);
        if (cur) { const c = document.createElement('span'); c.className = 'sp-tag'; c.textContent = fromSrc(PT.current); t.append(c); }
        const acts = document.createElement('div'); acts.className = 'sp-acts';
        const b = (txt, fn) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = fromSrc(txt); x.addEventListener('click', fn); acts.append(x); };
        b(cur ? PT.goOn : PT.open, () => {
          if (page === PAGE && far) { setView('make'); openCloud({ id: p.cloud.id, key: p.cloud.key }); }
          else if (page === PAGE) { setView('make'); if (!cur) apply(p); }
          else location.href = PAGE_FILE[page] + '#w=' + p.cloud.id + '.' + p.cloud.key;
        });
        b(PT.share, () => copyUrl(RC.links(p.cloud.id).share.replace(/[^/]*#/, PAGE_FILE[page] + '#'), card, PT.shareDone));
        b(PT.edit, () => copyUrl(RC.links(p.cloud.id, p.cloud.key).edit.replace(/[^/]*#/, PAGE_FILE[page] + '#'), card, PT.editDone));
        const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'sp-rm'; rm.textContent = fromSrc(PT.remove);
        rm.addEventListener('click', () => {
          if (!rm.hasAttribute('data-sure')) { rm.setAttribute('data-sure', ''); rm.textContent = fromSrc(PT.removeSure); return; }
          writeOnly(readOnly().filter(x => x.id !== p.cloud.id));
          const l = readList(page), x = l.find(y => y.cloud && y.cloud.id === p.cloud.id);
          if (x) { delete x.cloud; store.set('studio.presets.' + page, JSON.stringify(l)); }
          render(); syncMine({ remove: [p.cloud.id] });
        });
        acts.append(rm);
        card.append(t, acts); grid.append(card);
      }
      gal.append(note);
      if (RC.handles) gal.append(handleBox(items.length));
      gal.append(grid);
    }
    // ---- handles: anyone with the name can look and apply; the password brings the works back ----
    let other = null; // someone's collection being looked at: {handle, items}
    let pwOpen = false; // the generated password is shown right after it is made, then on request
    function form(fields, label, onSubmit) {
      const f = document.createElement('form');
      const ins = fields.map(([ph, type, ac]) => { const i = document.createElement('input'); i.placeholder = fromSrc(ph); i.setAttribute('aria-label', fromSrc(ph)); i.type = type || 'text'; if (ac) i.autocomplete = ac; i.maxLength = type === 'password' ? 128 : 20; if (type === 'password') { i.autocapitalize = 'off'; i.spellcheck = false; } i.setAttribute('data-i18n-skip', ''); return i; });
      const b = document.createElement('button'); b.type = 'submit'; b.textContent = fromSrc(label);
      f.append(...ins, b);
      f.addEventListener('submit', async e => { e.preventDefault(); b.disabled = true; try { await onSubmit(ins.map(i => i.value.trim())); } catch (err) { notify(err && err.code === 'not_found' ? fromSrc(PT.hNotFound) : RC.message(err)); } finally { b.disabled = false; } });
      return f;
    }
    const para = t => { const p = document.createElement('p'); p.textContent = t; return p; };
    function handleBox(n) {
      const H = RC.handles, h = H.mine(), box = document.createElement('div'); box.className = 'sg-h';
      if (h) {
        box.append(para(fill(PT.hMine, h)));
        const acts = document.createElement('div'); acts.className = 'sp-acts';
        const c = document.createElement('button'); c.type = 'button'; c.textContent = fromSrc(PT.hCopy); c.addEventListener('click', () => copyUrl(H.link(), box, PT.hCopied));
        const pwBox = document.createElement('div'); pwBox.className = 'sg-pw'; pwBox.hidden = !(pwOpen && H.password());
        const pwIn = document.createElement('input'); pwIn.readOnly = true; pwIn.value = H.password() || ''; pwIn.setAttribute('aria-label', fromSrc(PT.hPw)); pwIn.setAttribute('data-i18n-skip', '');
        const pwCp = document.createElement('button'); pwCp.type = 'button'; pwCp.textContent = fromSrc(PT.hPwCopy); pwCp.addEventListener('click', () => copyUrl(pwIn.value, pwBox, PT.hPwCopied));
        const row = document.createElement('div'); row.append(pwIn, pwCp); pwBox.append(row, para(fromSrc(PT.hPwNote)));
        const pw = document.createElement('button'); pw.type = 'button'; pw.textContent = fromSrc(pwBox.hidden ? PT.hPwBtn : PT.hPwHide); pw.hidden = !H.password();
        pw.addEventListener('click', () => { pwOpen = pwBox.hidden; pwBox.hidden = !pwOpen; pw.textContent = fromSrc(pwOpen ? PT.hPwHide : PT.hPwBtn); });
        const nw = document.createElement('button'); nw.type = 'button'; nw.textContent = fromSrc(PT.hPwNew); let sure = 0;
        nw.addEventListener('click', async () => {
          if (Date.now() - sure > 4000) { sure = Date.now(); nw.textContent = fromSrc(PT.hPwSure); setTimeout(() => { if (Date.now() - sure >= 4000) nw.textContent = fromSrc(PT.hPwNew); }, 4100); return; }
          sure = 0; nw.disabled = true;
          try { await H.setPassword(); pwOpen = true; notify(fromSrc(PT.hPwDone)); renderMine(); } catch (err) { notify(RC.message(err)); nw.disabled = false; nw.textContent = fromSrc(PT.hPwNew); }
        });
        acts.append(c, pw, nw); box.append(acts, pwBox);
      } else {
        if (n || (RC.collection && RC.collection.get())) {
          box.append(para(fromSrc(PT.hClaimNote)), form([[PT.hName, 'text', 'username']], PT.hCreate, async ([name]) => {
            await syncMine(); const r = await H.claim(name); pwOpen = true; notify(fill(PT.hCreated, r)); renderMine();
          }));
        }
        const d = document.createElement('details'); const sum = document.createElement('summary'); sum.textContent = fromSrc(PT.hLoginSum);
        d.append(sum, form([[PT.hName, 'text', 'username'], [PT.hPw, 'password', 'current-password']], PT.hLogin, async ([name, pw]) => {
          const r = await H.login(name, pw); await syncMine(); notify(fill(PT.hLoggedIn, r)); renderMine();
        }));
        box.append(d);
      }
      const look = form([[PT.hName, 'text']], PT.hLookBtn, async ([name]) => { if (name) await lookHandle(name); });
      look.prepend(Object.assign(document.createElement('span'), { textContent: fromSrc(PT.hLook) }));
      box.append(look);
      return box;
    }
    async function lookHandle(name) {
      const r = await RC.handles.view(name);
      other = { handle: r.handle, items: r.items || [] }; setView('mine');
    }
    function renderOther() {
      gal.textContent = '';
      const mine = other.items.filter(it => it.tool === 'showcase' && PAGE_FILE[it.page]), svg = other.items.filter(it => it.tool === 'svg').length;
      const head = document.createElement('p'); head.className = 'sp-note'; head.textContent = fill(PT.oHead, other.handle);
      const acts = document.createElement('div'); acts.className = 'sp-acts';
      const back = document.createElement('button'); back.type = 'button'; back.textContent = fromSrc(PT.oBack);
      back.addEventListener('click', () => { other = null; history.replaceState(null, '', location.href.split('#')[0]); renderMine(); });
      acts.append(back);
      if (svg) { const a = document.createElement('a'); a.href = '../svg-studio/#u=' + encodeURIComponent(other.handle); a.textContent = fromSrc(PT.oSvg) + ' · ' + svg; a.style.cssText = 'align-self:center;font-size:13px;color:inherit'; acts.append(a); }
      const grid = document.createElement('div'); grid.className = 'sg-grid';
      for (const it of mine) {
        const card = document.createElement('div'); card.className = 'sg-card';
        const none = () => { const n = document.createElement('div'); n.className = 'sg-none'; n.textContent = fromSrc(PT.oNoThumb); return n; };
        const im = document.createElement('img'); im.src = RC.fileUrl('showcase', it.id, 'thumb') + '?t=' + (it.at || 0); im.alt = it.name || ''; im.loading = 'lazy'; im.onerror = () => im.replaceWith(none());
        const t = document.createElement('div'); t.className = 'sg-t';
        const n = document.createElement('b'); n.textContent = it.name || fromSrc(PT.name); n.setAttribute('data-i18n-skip', '');
        const tag = document.createElement('span'); tag.className = 'sp-tag'; tag.textContent = fromSrc(it.page === 'lovia' ? PT.styleLovia : PT.styleDn);
        t.append(n, tag);
        const a2 = document.createElement('div'); a2.className = 'sp-acts';
        const b = (txt, fn) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = fromSrc(txt); x.addEventListener('click', fn); a2.append(x); };
        b(PT.oApply, () => { if (it.page === PAGE) { other = null; setView('make'); openCloud({ id: it.id, key: null }); } else location.href = PAGE_FILE[it.page] + '#w=' + it.id; });
        b(PT.share, () => copyUrl(RC.links(it.id).share.replace(/[^/]*#/, PAGE_FILE[it.page] + '#'), card, PT.shareDone));
        card.append(im, t, a2); grid.append(card);
      }
      gal.append(head, acts);
      if (!mine.length) gal.append(para(fromSrc(PT.oNone)));
      gal.append(grid);
    }
    function render() {
      const list = readList();
      const mine = RC ? mineList() : [];
      renderTabs(); if (view === 'mine') renderMine();
      bar.hidden = !list.length && !mine.length; bar.textContent = '';
      if (bar.hidden) return;
      const top = document.createElement('div'); top.className = 'sp-top';
      const head = document.createElement('div'); head.className = 'sp-head'; head.textContent = fromSrc(PT.head);
      top.append(head);
      if (mine.length) {
        const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'sp-mine-btn';
        mb.textContent = fromSrc(PT.toMine) + ' · ' + mine.length;
        mb.addEventListener('click', () => setView('mine'));
        top.append(mb);
      }
      const row = document.createElement('div'); row.className = 'sp-row';
      for (const p of list) {
        const chip = document.createElement('span'); chip.className = 'sp-chip'; if (p.id === activeId) chip.dataset.active = '';
        const a = document.createElement('button'); a.type = 'button'; a.className = 'sp-apply'; a.textContent = p.name; a.setAttribute('data-i18n-skip', '');
        if (p.cloud) { const ic = document.createElement('span'); ic.className = 'sp-cloud'; ic.textContent = '☁'; ic.setAttribute('aria-hidden', 'true'); a.append(ic); }
        a.addEventListener('click', () => apply(p));
        const m = document.createElement('button'); m.type = 'button'; m.className = 'sp-more'; m.textContent = '⋯'; m.setAttribute('aria-label', fromSrc(PT.more) + ' · ' + p.name); m.setAttribute('data-i18n-skip', '');
        m.addEventListener('click', () => { editingId = editingId === p.id ? null : p.id; render(); });
        chip.append(a, m); row.append(chip);
      }
      if (list.length) bar.append(top, row); else bar.append(top);
      const p = list.find(x => x.id === editingId);
      if (p) {
        const box = document.createElement('div'); box.className = 'sp-edit';
        const name = document.createElement('input'); name.type = 'text'; name.maxLength = 24; name.value = p.name; name.setAttribute('aria-label', fromSrc(PT.rename)); name.setAttribute('data-i18n-skip', '');
        const commit = () => { const v = name.value.trim(); if (!v || v === p.name) return; const l = readList(), it = l.find(x => x.id === p.id); if (it) { it.name = v; p.name = v; writeList(l); } };
        name.addEventListener('change', () => { commit(); render(); });
        name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); editingId = null; render(); } });
        const acts = document.createElement('div'); acts.className = 'sp-acts';
        const btn = (txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = fromSrc(txt); if (cls) b.className = cls; b.addEventListener('click', fn); acts.append(b); return b; };
        btn(PT.overwrite, '', () => { commit(); overwrite(p); });
        btn(PT.copy, '', () => { commit(); copyLink(readList().find(x => x.id === p.id) || p, box); });
        const del = btn(PT.del, 'sp-del', () => {
          if (!del.hasAttribute('data-sure')) { del.setAttribute('data-sure', ''); del.textContent = fromSrc(PT.delSure); return; }
          writeList(readList().filter(x => x.id !== p.id)); dropFiles(p.id); if (activeId === p.id) activeId = null; editingId = null; render();
        });
        btn(PT.done, 'sp-done', () => { commit(); editingId = null; render(); });
        box.append(name, acts);
        if (RC) {
          const acts2 = document.createElement('div'); acts2.className = 'sp-acts';
          const b2 = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = fromSrc(txt); b.addEventListener('click', () => fn(b)); acts2.append(b); return b; };
          b2(p.cloud && p.cloud.key ? PT.cloudUpdate : PT.cloud, b => { commit(); cloudSave(p, box, b); });
          if (p.cloud) {
            b2(PT.share, () => copyUrl(RC.links(p.cloud.id).share, box, PT.shareDone));
            if (p.cloud.key) b2(PT.edit, () => copyUrl(RC.links(p.cloud.id, p.cloud.key).edit, box, PT.editDone));
          }
          const note = document.createElement('p'); note.className = 'sp-note'; note.textContent = fromSrc(PT.cloudNote);
          box.append(acts2, note);
        }
        bar.append(box);
      }
    }
    (o.saveButtons || []).forEach(b => b && b.addEventListener('click', save));
    render();
    cloud().then(rc => {
      RC = rc; if (!rc) return;
      mountGallery(); render();
      const link = rc.parseHash(), cl = rc.collection && rc.collection.parse(), hu = rc.handles && rc.handles.parse();
      if (link) openCloud(link);
      else if (hu) lookHandle(hu).catch(e => notify(e && e.code === 'not_found' ? fromSrc(PT.hNotFound) : rc.message(e)));
      else if (cl) {
        history.replaceState(null, '', location.href.split('#')[0]);
        rc.collection.adopt(cl).then(() => syncMine()).then(() => { setView('mine'); notify(fromSrc(PT.collMoved)); }, e => notify(e && e.code === 'not_found' ? fromSrc(PT.collMissing) : rc.message(e)));
      } else if (rc.collection && (rc.collection.get() || mineList().length)) syncMine();
    });
    // a shared link: #s=...
    const m = location.hash.match(/^#s=([A-Za-z0-9_-]+)/);
    if (m) {
      try {
        const d = decode(m[1]);
        history.replaceState(null, '', location.href.split('#')[0]);
        if (d && d.settings && (!d.page || d.page === PAGE)) Promise.resolve(o.apply(d.settings, {})).then(() => notify(fromSrc(PT.fromLink)));
      } catch (e) { console.warn('settings link unreadable', e); }
    }
    return { refresh: render };
  }

  window.LoviaStudio = {
    get lang() { return lang; },
    t: fromSrc,
    onLang(fn) { listeners.push(fn); },
    registerPage,
    mountPresets,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
