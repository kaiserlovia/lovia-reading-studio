(() => {
  'use strict';

  const CANVAS_W = 3600;
  let CANVAS_H = 2700;
  const DEFAULT_IMAGES = ['assets/IMG_5735.JPG', 'assets/IMG_5733.JPG', 'assets/IMG_5721.PNG'];
  const DEFAULT_TEXT = { name: 'THE SURREAL LIBRARY', author: 'LOVIA', date: 'OCT. 2026' };
  // Font presets use native stacks, so switching does not download heavy fonts to mobile devices.
  const FONT_PRESETS = {
    kinghwa: '"KingHwaOldSong", "KingHwa_OldSong", "京華老宋体", "京华老宋体", "Songti SC", serif',
    song: '"Songti SC", "STSong", "Noto Serif CJK SC", "SimSun", serif',
    sans: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    light: '"Helvetica Neue", "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif',
    editorial: '"Didot", "Bodoni MT", "Times New Roman", "Songti SC", serif',
    kai: '"Kaiti SC", "STKaiti", "KaiTi", "Noto Serif CJK SC", serif',
    mono: '"Courier New", "SFMono-Regular", "Menlo", "Noto Serif CJK SC", monospace',
    round: '"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif',
  };
  const MODE_DESCRIPTIONS = {
    light: '自动提取截图中的柔和浅色作为底图。',
    dark: '从截图提取深色，形成鲜明的画廊对比。',
    custom: '自选纯色背景，不添加渐变或纹理。',
    image: '上传自己的底图，可实时调节模糊度与透明度。',
    glass: '取封面颜色，形成柔和的液态玻璃朦胧背景。',
    gradient: '默认自动提取截图颜色，生成从上到下的柔和渐变。',
  };

  const canvas = document.getElementById('posterCanvas');
  let ctx = canvas.getContext('2d', { alpha: false });
  const previewCtx=ctx;
  const miniCanvas=document.getElementById('mobileMiniCanvas');
  const miniCtx=miniCanvas.getContext('2d', {alpha:false});
  const compactMode=window.matchMedia('(max-width:580px)').matches;
  let previewScale=canvas.width/CANVAS_W;
  let previewZoom=1;
  let selectedExportQuality='original';
  let largePreviewInView=true;
  let hasSeenLargePreview=false;
  const refs = {
    name: document.getElementById('themeName'),
    author: document.getElementById('authorName'),
    date: document.getElementById('dateText'),
    footerText: document.getElementById('footerText'),
    titleSize: document.getElementById('titleFontSize'),
    authorSize: document.getElementById('authorFontSize'),
    dateSize: document.getElementById('dateFontSize'),
    messageSize: document.getElementById('messageFontSize'),
    fontPresets: [...document.querySelectorAll('[data-font]')],
    fontImportButton: document.getElementById('fontImportButton'),
    fontFileInput: document.getElementById('fontFileInput'),
    fontImportStatus: document.getElementById('fontImportStatus'),
    imageScale: document.getElementById('imageScale'),
    imageScaleNumber: document.getElementById('imageScaleNumber'),
    colors: [...document.querySelectorAll('[data-color]')],
    styles: [...document.querySelectorAll('.style-option')],
    borderStyles: [...document.querySelectorAll('[data-border]')],
    customColor: document.getElementById('customBackdropColor'),
    blur: document.getElementById('backgroundBlur'),
    backdropOpacity: document.getElementById('backgroundOpacity'),
    gradientStart: document.getElementById('gradientStart'),
    gradientEnd: document.getElementById('gradientEnd'),
    glassStrength: document.getElementById('glassStrength'),
    backgroundInput: document.getElementById('backgroundFileInput'),
    coverInput: document.getElementById('coverFileInput'),
    uploadGrid: document.getElementById('uploadGrid'),
    batchInput: document.getElementById('batchFileInput'),
    ratioButtons: [...document.querySelectorAll('[data-ratio]')],
    ruleColor: document.getElementById('ruleColor'),
    ruleOpacity: document.getElementById('ruleOpacity'),
    showRules: document.getElementById('showRules'),
    layoutButtons: [...document.querySelectorAll('[data-layout]')],
    directionButtons: [...document.querySelectorAll('[data-direction]')],
    imageInput: document.getElementById('imageFileInput'),
    info: document.getElementById('imageSizeMessage'),
    toast: document.getElementById('toast'),
    dialog: document.getElementById('previewDialog'),
    dialogImage: document.getElementById('largeImage'),
  };
  let currentTheme = 'light';
  let borderStyle = 'line';
  let currentColors = ['#F1EEE3', '#A5B09E', '#CA9194', '#667966', '#283029'];
  let derivedColors = { light: '#EBE7DC', dark: '#242B27', accent: '#8B4E40', medium: '#7B8A7C' };
  let backgroundImage = null;
  let coverImage = null;
  let backgroundObjectURL = null;
  let coverObjectURL = null;
  let images = [null, null, null];
  let activeSlot = 0;
  let pendingDraw = false;
  let previewURL = null;
  let toastTimeout = null;
  let userObjectURLs = [null, null, null];
  let layoutMode = 'even';
  let layoutDirection = 'left-high';
  let imageOffsets = [{x:0,y:0},{x:0,y:0},{x:0,y:0}];
  let imageScales = [100,100,100];
  let scaleMode = 'single';
  let selectedImageIndex = 0;
  let lastPlacements = [];
  let dragState = null;
  let gradientCustomized = false;
  let selectedFont='kinghwa';
  let importedFontFamily='';
  let importedFontFace=null;
  let fontImportVersion=0;
  const backdropBuffer = document.createElement('canvas');
  // Day/night: the live image variables above hold the group being edited; the other group waits here.
  const DN_LAYOUTS=['pairs','split','diagonal','alternate','compare','rows'];
  let compareAt=.5, comparePair=0, heroIndex=-1, compareHandle=false;
  let textMode='auto', textDay='#2F3A31', textNight='#F1F0E7', textTouched=false; // custom poster text colours
  let paletteLocked=false; // a saved setting with its own palette keeps it when screenshots change
  const keptFiles={background:null,cover:null,font:null}; // files behind the uploaded backdrop, cover and font
  let activeGroup='day';
  let dnOrder='dn'; // 'dn': day first (left / in front); 'nd': night first
  const groupStore={night:{images:[null],userObjectURLs:[null],imageOffsets:[{x:0,y:0}],imageScales:[100],selectedImageIndex:0}};
  let nightToneCache={key:'',colors:null};

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`图片加载失败：${src}`));
      image.src = src;
    });
  }

  function announce(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => refs.toast.classList.remove('show'), 2800);
  }

  function scheduleDraw() {
    if (pendingDraw) return;
    pendingDraw = true;
    requestAnimationFrame(() => {
      pendingDraw = false;
      renderPreview();
    });
  }

  function updateDockVisibility() {
    const dock=document.getElementById('mobilePreviewDock');
    dock.classList.toggle('is-empty', !compactMode || !images.some(Boolean) || !hasSeenLargePreview || largePreviewInView || refs.dialog.open);
  }

  function setupResponsivePreview() {
    if (!compactMode) return;
    const card=document.querySelector('.preview-card');
    // On phones the full-size preview belongs after every editing control.
    // The floating mini preview appears only after the user has reached the full-size preview once.
    const editor=document.querySelector('.editor');
    editor.after(card);
    card.classList.add('mobile-restored-preview');

    const refreshVisibility=()=>{
      const bounds=card.getBoundingClientRect();
      const viewportHeight=window.visualViewport?.height || window.innerHeight;
      largePreviewInView=bounds.bottom>77 && bounds.top<viewportHeight-80;
      if(largePreviewInView) hasSeenLargePreview=true;
      updateDockVisibility();
    };
    if ('IntersectionObserver' in window) {
      const observer=new IntersectionObserver(entries=>{
        largePreviewInView=Boolean(entries[0]?.isIntersecting);
        if(largePreviewInView) hasSeenLargePreview=true;
        updateDockVisibility();
      },{rootMargin:'-76px 0px -80px 0px',threshold:0});
      observer.observe(card);
    } else {
      let pending=false;
      window.addEventListener('scroll',()=>{
        if(pending)return;
        pending=true;
        requestAnimationFrame(()=>{pending=false;refreshVisibility();});
      },{passive:true});
    }
    window.addEventListener('resize',refreshVisibility,{passive:true});
    refreshVisibility();
  }

  function renderPreview() {
    refreshAndroidSwatches();
    ctx=previewCtx;
    ctx.setTransform(previewScale,0,0,previewScale,0,0);
    drawPoster();
    miniCtx.setTransform(1,0,0,1,0,0);
    miniCtx.clearRect(0,0,miniCanvas.width,miniCanvas.height);
    miniCtx.imageSmoothingEnabled=true;
    miniCtx.imageSmoothingQuality='high';
    miniCtx.drawImage(canvas,0,0,miniCanvas.width,miniCanvas.height);
    updateDockVisibility();
  }

  function setStroke(color, width = 3) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
  }

  function rectangle(x, y, width, height, stroke, lineWidth = 3) {
    setStroke(stroke, lineWidth);
    ctx.strokeRect(x, y, width, height);
  }

  function rule(x1, y1, x2, y2, stroke, lineWidth = 3) {
    setStroke(stroke, lineWidth);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function cross(x, y, color, size = 22) {
    rule(x - size, y, x + size, y, color, 3);
    rule(x, y - size, x, y + size, color, 3);
  }

  function activeFontFamily() {
    return selectedFont==='uploaded'&&importedFontFamily
      ? '"' + importedFontFamily + '", "Songti SC", serif'
      : FONT_PRESETS[selectedFont] || FONT_PRESETS.kinghwa;
  }

  function selectGlobalFont(key) {
    if(!(key in FONT_PRESETS) && !(key==='uploaded'&&importedFontFamily))return;
    selectedFont=key;
    refs.fontPresets.forEach(button=>{
      const active=button.dataset.font===key;
      button.classList.toggle('selected',active);
      button.setAttribute('aria-pressed',String(active));
    });
    scheduleDraw();
    if(key==='kinghwa'){
      document.fonts.load('bold 61px "KingHwaOldSong"').then(scheduleDraw).catch(()=>{});
    }
  }

  async function importLocalFont(file) {
    if(!file)return;
    if(!/\.(ttf|otf|woff2?)$/i.test(file.name)){
      refs.fontImportStatus.textContent='字体格式不支持，请选择 TTF、OTF、WOFF 或 WOFF2。';
      announce('请选择受支持的字体文件');
      return;
    }
    if(file.size>40*1024*1024){
      refs.fontImportStatus.textContent='字体文件过大，请选择 40MB 以内的文件。';
      announce('字体文件请控制在 40MB 以内');
      return;
    }
    const request=++fontImportVersion;
    refs.fontImportButton.disabled=true;
    refs.fontImportStatus.textContent='正在导入：'+file.name+'…';
    try {
      if(!('FontFace' in window))throw new Error('当前浏览器不支持本地字体导入');
      const data=await file.arrayBuffer();
      const family='LoviaImportedFont'+request;
      const face=new FontFace(family,data,{style:'normal',weight:'normal'});
      await face.load();
      if(request!==fontImportVersion)return;
      document.fonts.add(face);
      keptFiles.font=file;
      if(importedFontFace)document.fonts.delete(importedFontFace);
      importedFontFace=face;
      importedFontFamily=family;
      const customButton=document.getElementById('uploadedFontPreset');
      customButton.hidden=false;
      document.getElementById('uploadedFontSample').style.fontFamily='"'+family+'", serif';
      document.getElementById('uploadedFontLabel').textContent='已导入 · '+file.name.replace(/\.[^.]+$/,'').slice(0,12);
      refs.fontImportStatus.textContent='已导入 '+file.name+' · 本机使用，刷新后需重新导入';
      selectGlobalFont('uploaded');
      await document.fonts.ready;
      scheduleDraw();
      announce('字体已应用到整张画报');
    } catch(error) {
      console.error('Local font import failed',error);
      refs.fontImportStatus.textContent='字体读取失败，请确认文件完整且格式正确。';
      announce(error.message||'无法读取字体文件');
    } finally {
      refs.fontImportButton.disabled=false;
      refs.fontFileInput.value='';
    }
  }

  function drawTrackedText(raw, x, centerY, opts = {}) {
    const text = String(raw || '').trim();
    if (!text) return;
    const { color = '#333B31', maxWidth = 1450, size = 51, minSize = 25, tracking = 9, align = 'left', italic = false, bold = false, kinghwa = false } = opts;
    let selectedSize = size;
    let effectiveTracking = tracking;
    const family=activeFontFamily();
    const fontForSize = v => `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${v}px ${family}`;
    const lengthAt = (v, spacing) => {
      ctx.font = fontForSize(v);
      return [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, -spacing);
    };
    while (selectedSize > minSize && lengthAt(selectedSize, effectiveTracking) > maxWidth) selectedSize -= 1;
    if (lengthAt(selectedSize, effectiveTracking) > maxWidth) effectiveTracking = Math.max(0, (maxWidth - lengthAt(selectedSize, 0)) / Math.max(1, [...text].length - 1));
    const width = lengthAt(selectedSize, effectiveTracking);
    ctx.font = fontForSize(selectedSize);
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    let penX = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    for (const ch of text) {
      ctx.fillText(ch, penX, centerY);
      penX += ctx.measureText(ch).width + effectiveTracking;
    }
  }

  function rgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
  function luminance(color) {
    const [r, g, b] = Array.isArray(color) ? color : rgb(color);
    return .2126 * r + .7152 * g + .0722 * b;
  }
  function mixedColor(a, b, amount) {
    const first = Array.isArray(a) ? a : rgb(a);
    const second = Array.isArray(b) ? b : rgb(b);
    return rgbToHex(...first.map((v, i) => v * (1 - amount) + second[i] * amount));
  }
  function sortedColors(colors) { return [...colors].sort((a, b) => luminance(b) - luminance(a)); }
  function sampleImagePixels(sourceImages) {
    const small = document.createElement('canvas');
    small.width = 108;
    small.height = 108;
    const probe = small.getContext('2d', { willReadFrequently: true });
    const samples = [];
    for (const image of sourceImages.filter(Boolean)) {
      probe.clearRect(0, 0, 108, 108);
      probe.drawImage(image, 0, 0, 108, 108);
      const bytes = probe.getImageData(0, 0, 108, 108).data;
      for (let i = 0; i < bytes.length; i += 20) {
        if (bytes[i + 3] < 220) continue;
        samples.push([bytes[i], bytes[i + 1], bytes[i + 2]]);
      }
    }
    return samples;
  }
  function hslToHex(h, s, l) {
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  function analyzeColors(sourceImages) {
    const pixels = sampleImagePixels(sourceImages);
    if (!pixels.length) return { light: '#EBE7DC', dark: '#242B27', accent: '#8B4E40', medium: '#7B8A7C' };
    const ranges = [[], [], []];
    const hueBins = Array.from({ length: 24 }, () => ({ score: 0, hue: 0 }));
    for (const pixel of pixels) {
      const y = luminance(pixel);
      if (y >= 164) ranges[0].push(pixel);
      else if (y < 105) ranges[2].push(pixel);
      else ranges[1].push(pixel);
      const normalized = pixel.map(v => v / 255);
      const maximum = Math.max(...normalized), minimum = Math.min(...normalized);
      const delta = maximum - minimum;
      if (delta < .10 || y < 35 || y > 235) continue;
      let hue = 0;
      if (maximum === normalized[0]) hue = ((normalized[1] - normalized[2]) / delta) % 6;
      else if (maximum === normalized[1]) hue = (normalized[2] - normalized[0]) / delta + 2;
      else hue = (normalized[0] - normalized[1]) / delta + 4;
      hue = ((hue * 60) + 360) % 360;
      const saturation = delta / (1 - Math.abs(maximum + minimum - 1) + .0001);
      const bin = Math.floor(hue / 15) % 24;
      hueBins[bin].score += Math.pow(saturation, 1.6);
      hueBins[bin].hue += hue * Math.pow(saturation, 1.6);
    }
    const average = (items, fallback) => items.length ? items[0].map((_, k) => items.reduce((sum, p) => sum + p[k], 0) / items.length) : rgb(fallback);
    const light = mixedColor(average(ranges[0], '#E6E5DA'), '#EEEADF', .28);
    const dark = mixedColor(average(ranges[2], '#292E27'), '#27312B', .55);
    const medium = mixedColor(average(ranges[1], '#7B8A7C'), '#88948A', .20);
    const chosenBin = hueBins.reduce((best, item) => item.score > best.score ? item : best, hueBins[0]);
    let accent = chosenBin.score > 1 ? hslToHex(chosenBin.hue / chosenBin.score, .52, .34) : '#8B4E40';
    if (Math.sqrt(rgb(accent).reduce((sum, value, i) => sum + (value - rgb(dark)[i]) ** 2, 0)) < 74) accent = '#97523F';
    return { light, dark, medium, accent };
  }
  function isDayNightLayout() { return DN_LAYOUTS.includes(layoutMode); }
  function groupOf(name) {
    return name===activeGroup ? {images,userObjectURLs,imageOffsets,imageScales} : groupStore[name];
  }
  function syncGroupButtons() {
    document.querySelectorAll('[data-group]').forEach(button=>{
      const active=button.dataset.group===activeGroup;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const night=groupOf('night').images.filter(Boolean).length, day=groupOf('day').images.filter(Boolean).length;
    const dayCount=document.getElementById('dayGroupCount'), nightCount=document.getElementById('nightGroupCount');
    if(dayCount)dayCount.textContent=day?day+' 张':'尚未添加';
    if(nightCount)nightCount.textContent=night?night+' 张':'尚未添加';
  }
  function setActiveGroup(name) {
    if(!['day','night'].includes(name)||name===activeGroup){syncGroupButtons();return;}
    groupStore[activeGroup]={images,userObjectURLs,imageOffsets,imageScales,selectedImageIndex};
    const g=groupStore[name];delete groupStore[name];
    images=g.images;userObjectURLs=g.userObjectURLs;imageOffsets=g.imageOffsets;imageScales=g.imageScales;selectedImageIndex=g.selectedImageIndex||0;
    activeGroup=name;
    updateSelectedScaleUI();updateSizeMessage();refreshAutoColors();syncGroupButtons();scheduleDraw();
  }
  function nightTone() {
    const list=groupOf('night').images.filter(Boolean);
    const key=list.map(img=>img.src).join('|');
    if(nightToneCache.key!==key||!nightToneCache.colors)nightToneCache={key,colors:analyzeColors(list)};
    return nightToneCache.colors;
  }
  function refreshAutoColors() {
    derivedColors = analyzeColors(isDayNightLayout() ? groupOf('day').images : images);
    if (!gradientCustomized) setAutoGradient(false);
    if (currentTheme === 'light' || currentTheme === 'dark' || currentTheme === 'glass') scheduleDraw();
  }

  function paletteFromImages(sourceImages) {
    const data = sampleImagePixels(sourceImages).filter(p => luminance(p) > 16 && luminance(p) < 252);
    if (!data.length) return sortedColors(currentColors);
    let centers = [0, .19, .41, .69, .93].map(v => [...data[Math.floor(v * (data.length - 1))]]);
    for (let iteration = 0; iteration < 12; iteration++) {
      const groups = centers.map(() => [0, 0, 0, 0]);
      for (const pixel of data) {
        let best = 0, distance = Infinity;
        centers.forEach((center, i) => {
          const d = (pixel[0] - center[0]) ** 2 + (pixel[1] - center[1]) ** 2 + (pixel[2] - center[2]) ** 2;
          if (d < distance) { distance = d; best = i; }
        });
        for (let k = 0; k < 3; k++) groups[best][k] += pixel[k];
        groups[best][3]++;
      }
      centers = centers.map((old, i) => groups[i][3] ? groups[i].slice(0, 3).map(sum => sum / groups[i][3]) : old);
    }
    return sortedColors(centers.map(c => rgbToHex(...c)));
  }

  function drawFullBleedImage(image, blur) {
    if (!image) return;
    // Blur the background on a small intermediate canvas, keeping phone interactions smooth.
    if (blur > 0) {
      const ratio = CANVAS_W / 900;
      const bw = 900, bh = Math.round(CANVAS_H / ratio);
      if (backdropBuffer.width !== bw || backdropBuffer.height !== bh) {
        backdropBuffer.width = bw;
        backdropBuffer.height = bh;
      }
      const bctx = backdropBuffer.getContext('2d');
      bctx.clearRect(0, 0, bw, bh);
      const scale = Math.max(bw / image.naturalWidth, bh / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      bctx.save();
      bctx.filter = 'blur(' + Math.round(blur / ratio) + 'px)';
      bctx.drawImage(image, (bw - w)/2, (bh - h)/2, w, h);
      bctx.restore();
      ctx.drawImage(backdropBuffer, 0, 0, CANVAS_W, CANVAS_H);
      return;
    }
    const scale = Math.max(CANVAS_W / image.naturalWidth, CANVAS_H / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.drawImage(image, (CANVAS_W - w)/2, (CANVAS_H - h)/2, w, h);
  }
  function setAutoGradient(redraw = true) {
    // Tone-adapt to the uploaded screenshots unless the user overrides either picker.
    const light = derivedColors.light, medium = derivedColors.medium;
    refs.gradientStart.value = mixedColor(light, '#FFFFFF', .08);
    refs.gradientEnd.value = mixedColor(medium, light, .28);
    gradientCustomized = false;
    if (redraw) scheduleDraw();
  }

  function drawGlassBackground(image, strength, base) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawFullBleedImage(image, 55 + 1.2 * strength);
    ctx.fillStyle = `rgba(249, 249, 243, ${(.42 + .002 * strength).toFixed(3)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const bloomColors = sortedColors(paletteFromImages(image ? [image] : images));
    const points = [
      [400, 480, 1000, bloomColors[1]], [3100, 2150, 1050, bloomColors[2]], [1800, 1350, 1300, bloomColors[3]],
    ];
    points.forEach(([x, y, radius, hex]) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const [r, g, b] = rgb(hex);
      gradient.addColorStop(0, `rgba(${r},${g},${b},${(.10 + strength * .0016).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    });
    // Frosted, softly translucent sheet; all screenshot pixels are placed later, untouched.
    ctx.fillStyle = 'rgba(255,255,252,.10)';
    ctx.fillRect(68, 54, 3464, CANVAS_H - 108);
  }

  function displayColors() {
    const sample = currentTheme === 'glass' && coverImage ? analyzeColors([coverImage]) : derivedColors;
    let bg = sample.light;
    if (currentTheme === 'dark') bg = sample.dark;
    else if (currentTheme === 'custom') bg = refs.customColor.value;
    else if (currentTheme === 'gradient') bg = refs.gradientStart.value;
    const dark = currentTheme === 'dark' || (currentTheme === 'custom' && luminance(bg) < 125) || (currentTheme === 'gradient' && luminance(bg) < 125 && luminance(refs.gradientEnd.value) < 140);
    return {
      bg, band: dark ? mixedColor(sample.dark, '#101912', .48) : sample.dark, accent: sample.accent,
      ink: dark ? '#F1F0E7' : '#2F3A31',
      rule: dark ? '#99A99C' : mixedColor(sample.dark, '#91A290', .38),
      secondary: dark ? '#788C7F' : mixedColor(sample.light, sample.dark, .35),
      frame: dark ? '#B1C0AE' : mixedColor(sample.dark, '#71846F', .44),
    };
  }

  function rgbaFromHex(hex, alpha) {
    const [r,g,b] = rgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(2) + ')';
  }

  function imagePlacement(image, index, total) {
    const count = Math.max(1, Math.min(5, total));
    const areaX = 170, areaW = CANVAS_W - 340;
    const areaY = 330, areaH = CANVAS_H - 655;
    const nw = image?.naturalWidth || 942, nh = image?.naturalHeight || 2048;
    let x, y, w, h;
    if (layoutMode === 'hero' && count >= 2) {
      ({x,y,w,h}=heroLayout(areaX,areaY,areaW,areaH)[index]);
    } else if (layoutMode === 'focus' && count >= 2) {
      const center = (count-1)/2;
      const weights = Array.from({length:count},(_,i)=> i===Math.floor(center) ? 1.35 : count>3 ? (.76 - .12*Math.abs(i-center)) : .82);
      const gap = count >= 4 ? 44 : 90;
      const totalWeight = weights.reduce((a,b)=>a+b,0);
      const space = areaW - gap*(count-1);
      const widths = weights.map(n=>space*n/totalWeight);
      const cellX = areaX + widths.slice(0,index).reduce((a,b)=>a+b,0) + gap*index;
      const cellW = widths[index];
      const prominence = index===Math.floor(center) ? 1 : .8;
      const scale = Math.min(prominence, cellW/nw, (areaH-60)/nh);
      w=nw*scale;h=nh*scale;
      x=cellX+(cellW-w)/2;
      y=areaY+(areaH-h)/2+(index===Math.floor(center)?-8:35);
    } else if (layoutMode === 'overlap' && count >= 2) {
      const stride=.77;
      const cellW=Math.min(1150,areaW/(1+(count-1)*stride));
      const scale=Math.min(1,cellW/nw,(areaH-240)/nh);
      w=nw*scale;h=nh*scale;
      const photos = images.map(img=>{
        const iw=img?.naturalWidth||942,ih=img?.naturalHeight||2048;
        return Math.min(1,cellW/iw,(areaH-240)/ih)*iw;
      });
      const contentWidth = photos.reduce((sum,v)=>sum+v,0) - photos.slice(0,-1).reduce((sum,v)=>sum+v*(1-stride),0);
      const startX=areaX+(areaW-contentWidth)/2;
      x=startX+photos.slice(0,index).reduce((sum,v)=>sum+v*stride,0);
      const incline=(index-(count-1)/2)*110*(layoutDirection==='left-high'?1:-1);
      y=areaY+(areaH-h)/2+incline;
    } else {
      const gap = count===1?0:count===2?140:count===3?85:count===4?58:42;
      const cellW=(areaW-gap*(count-1))/count;
      const incline = layoutMode==='stagger' ? (index-(count-1)/2)*Math.min(128,270/Math.max(1,count-1))*(layoutDirection==='left-high'?1:-1) : 0;
      const extraH = layoutMode==='stagger' ? 320 : 0;
      const scale=Math.min(1,cellW/nw,(areaH-extraH)/nh);
      w=nw*scale;h=nh*scale;
      x=areaX+index*(cellW+gap)+(cellW-w)/2;
      y=areaY+(areaH-h)/2+incline;
    }
    const zoom=(imageScales[index] ?? 100)/100;
    const centerX=x+w/2,centerY=y+h/2;
    w*=zoom;h*=zoom;x=centerX-w/2;y=centerY-h/2;
    const offset = imageOffsets[index] || {x:0,y:0};
    x=Math.max(114,Math.min(CANVAS_W-114-w,x+offset.x));
    y=Math.max(315,Math.min(CANVAS_H-265-h,y+offset.y));
    return {x,y,w,h};
  }

  function currentHeroIndex() {
    if(heroIndex>=0&&heroIndex<images.length&&images[heroIndex])return heroIndex;
    for(let i=images.length-1;i>=0;i--)if(images[i])return i;
    return 0;
  }
  function heroLayout(areaX,areaY,areaW,areaH) {
    // one large screenshot plus the others in a small grid beside it; never enlarged past their own pixels
    const dims=images.map(img=>({w:img?.naturalWidth||942,h:img?.naturalHeight||2048}));
    const hi=currentHeroIndex(),others=dims.map((d,i)=>i).filter(i=>i!==hi);
    const gap=70,maxA=Math.max(...others.map(i=>dims[i].w/dims[i].h));
    let best=null;
    for(const f of [1,.92,.84,.76,.68,.6]){
      const hh=Math.min(areaH*f,dims[hi].h),hw=hh*dims[hi].w/dims[hi].h,restW=areaW-hw-gap;
      if(restW<=0)continue;
      for(let c=1;c<=Math.min(2,others.length);c++){
        const r=Math.ceil(others.length/c);
        let th=Math.min((areaH-(r-1)*gap)/r,(restW-(c-1)*gap)/(c*maxA),hh*.62);
        th=Math.min(th,...others.map(i=>dims[i].h));
        if(th<=0)continue;
        const area=hw*hh+others.reduce((sum,i)=>sum+th*th*dims[i].w/dims[i].h,0);
        if(!best||area>best.area)best={hh,hw,c,r,th,area};
      }
    }
    const out=[];
    if(!best)return dims.map(()=>({x:areaX,y:areaY,w:10,h:10}));
    const {hh,hw,c,r,th}=best,colW=maxA*th,totalW=hw+gap+c*colW+(c-1)*gap,x0=areaX+(areaW-totalW)/2;
    out[hi]={x:x0,y:areaY+(areaH-hh)/2,w:hw,h:hh};
    const gridH=r*th+(r-1)*gap,gy=areaY+(areaH-gridH)/2,gx=x0+hw+gap;
    others.forEach((i,k)=>{const col=k%c,row=Math.floor(k/c),w=th*dims[i].w/dims[i].h;
      out[i]={x:gx+col*(colW+gap)+(colW-w)/2,y:gy+row*(th+gap),w,h:th};});
    return out;
  }
  function dayNightGeometry() {
    const W=CANVAS_W,H=CANVAS_H,k=layoutMode==='diagonal'?.07:0;
    if(layoutMode==='rows'){
      const top=[[0,0],[W,0],[W,H/2],[0,H/2]],bottom=[[0,H/2],[W,H/2],[W,H],[0,H]];
      return dnOrder==='nd'?{k:0,day:bottom,night:top}:{k:0,day:top,night:bottom};
    }
    const left=k?[[0,0],[W*(.5+k),0],[W*(.5-k),H],[0,H]]:[[0,0],[W/2,0],[W/2,H],[0,H]];
    const right=k?[[W*(.5+k),0],[W,0],[W,H],[W*(.5-k),H]]:[[W/2,0],[W,0],[W,H],[W/2,H]];
    return dnOrder==='nd'?{k,day:right,night:left}:{k,day:left,night:right};
  }
  function tracePolygon(points) { ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); }
  function finishPlacement(group,index,p) {
    // same zoom, offset and bounds as the classic layouts
    const g=groupOf(group);
    const zoom=(g.imageScales[index] ?? 100)/100;
    let {x,y,w,h}=p;
    const centerX=x+w/2,centerY=y+h/2;
    w*=zoom;h*=zoom;x=centerX-w/2;y=centerY-h/2;
    const offset=g.imageOffsets[index]||{x:0,y:0};
    x=Math.max(114,Math.min(CANVAS_W-114-w,x+offset.x));
    y=Math.max(315,Math.min(CANVAS_H-265-h,y+offset.y));
    return {x,y,w,h};
  }
  function placeRow(items, box, gap) {
    // one row, equal heights, never enlarged past the screenshot's own pixels
    if(!items.length)return [];
    const aspect=it=>it.a;
    const total=items.reduce((sum,it)=>sum+aspect(it),0);
    let h=Math.min(box.h,(box.w-gap*(items.length-1))/total,...items.map(it=>it.maxH));
    const rowW=items.reduce((sum,it)=>sum+aspect(it)*h,0)+gap*(items.length-1);
    let x=box.x+(box.w-rowW)/2;const y=box.y+(box.h-h)/2;
    return items.map(it=>{const w=aspect(it)*h;const r={it,x,y,w,h};x+=w+gap;return r;});
  }
  function dayNightPlacements() {
    const areaX=170,areaW=CANVAS_W-340,areaY=330,areaH=CANVAS_H-655;
    const entry=(group,image,index)=>({group,image,index,a:image.naturalWidth/image.naturalHeight,maxH:image.naturalHeight});
    const list=group=>groupOf(group).images.map((img,i)=>img?entry(group,img,i):null).filter(Boolean);
    const first=list(dnOrder==='nd'?'night':'day'),second=list(dnOrder==='nd'?'day':'night');
    const out=[];
    if(layoutMode==='compare'){
      // one screenshot frame: the first group on the left, the second past the divider
      const n=Math.max(first.length,second.length);
      const i=Math.max(0,Math.min(comparePair,n-1));
      const a=first.find(e=>e.index===i)||first[0],b=second.find(e=>e.index===i)||second[0],one=a||b;
      if(one){
        const r=placeRow([one],{x:areaX,y:areaY,w:areaW,h:areaH},0)[0];
        const owner=groupOf(activeGroup).images[one.index]?activeGroup:one.group;
        out.push({...one,group:owner,compareFirst:a,compareSecond:a&&b?b:null,p:r});
      }
    } else if(layoutMode==='rows'){
      const half=(areaH-90)/2;
      for(const [items,y0] of [[first,areaY],[second,areaY+half+90]]){
        for(const r of placeRow(items,{x:areaX,y:y0,w:areaW,h:half},items.length>3?44:70))out.push({...r.it,p:r});
      }
    } else if(layoutMode==='split'||layoutMode==='diagonal'){
      const {k}=dayNightGeometry();
      const inner=70+k*CANVAS_W*.75;
      for(const [items,x0,x1] of [[first,areaX,CANVAS_W/2-inner],[second,CANVAS_W/2+inner,areaX+areaW]]){
        for(const r of placeRow(items,{x:x0,y:areaY,w:x1-x0,h:areaH},items.length>3?36:60))out.push({...r.it,p:r});
      }
    } else if(layoutMode==='alternate'){
      const seq=[];for(let i=0;i<Math.max(first.length,second.length);i++){if(first[i])seq.push(first[i]);if(second[i])seq.push(second[i]);}
      for(const r of placeRow(seq,{x:areaX,y:areaY,w:areaW,h:areaH},seq.length>6?30:44))out.push({...r.it,p:r});
    } else { // pairs: the second group peeks out behind the first
      const OX=.2,OY=.075,units=[];
      for(let i=0;i<Math.max(first.length,second.length);i++){
        const d=first[i],n=second[i],front=d||n;
        units.push({d,n,a:d&&n?front.a*(1+OX)/(1+OY):front.a,maxH:(d&&n?Math.min(d.maxH,n.maxH):front.maxH)*(d&&n?1+OY:1)});
      }
      for(const r of placeRow(units,{x:areaX,y:areaY,w:areaW,h:areaH},units.length>3?50:80)){
        const {d,n}=r.it;
        if(d&&n){const fw=r.w/(1+OX),fh=r.h/(1+OY);
          out.push({...n,p:{x:r.x+fw*OX,y:r.y,w:fw,h:fh}});
          out.push({...d,p:{x:r.x,y:r.y+fh*OY,w:fw,h:fh}});
        } else {const one=d||n;out.push({...one,p:{x:r.x,y:r.y,w:r.w,h:r.h}});}
      }
    }
    return out.map(item=>({...item,p:finishPlacement(item.group,item.index,{x:item.p.x,y:item.p.y,w:item.p.w,h:item.p.h})}));
  }

  function drawFittedImage(image, p) {
    ctx.fillStyle = '#f6f5ef';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    if (!image) {
      drawTrackedText('ADD IMAGE', p.x + p.w/2, p.y+p.h/2,
        {color:'#9baa9a',size:41,tracking:6,maxWidth:p.w-30,align:'center'});
      return;
    }
    const pixelExact = p.w === image.naturalWidth && p.h === image.naturalHeight;
    ctx.imageSmoothingEnabled = ctx===previewCtx || !pixelExact;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, p.x, p.y, p.w, p.h);
    ctx.imageSmoothingEnabled = true;
  }

  function drawAdaptiveFrame(p, line, theme) {
    const pad = Math.max(7, Math.min(14, Math.min(p.w,p.h)*.015));
    const x = p.x - pad, y = p.y - pad, w = p.w + pad*2, h = p.h + pad*2;
    if (borderStyle === 'shadow') {
      ctx.save();
      ctx.shadowColor = 'rgba(14,24,18,.30)';
      ctx.shadowBlur = 36;
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = '#f8f8f4';
      ctx.fillRect(x,y,w,h);
      ctx.restore();
      rectangle(x,y,w,h,line,2);
    } else if (borderStyle === 'matte') {
      const depth = pad*1.6;
      ctx.fillStyle = '#fbfbf8';
      ctx.fillRect(x-depth,y-depth,w+depth*2,h+depth*2);
      rectangle(x-depth,y-depth,w+depth*2,h+depth*2,line,2);
      rectangle(x,y,w,h,line,1);
    } else if (borderStyle === 'double') {
      rectangle(x-pad,y-pad,w+pad*2,h+pad*2,line,2);
      rectangle(x,y,w,h,line,2);
    } else if (borderStyle === 'line') {
      rectangle(x,y,w,h,line,3);
    } else if (borderStyle === 'dashed') {
      ctx.save();ctx.setLineDash([14,11]);
      rectangle(x,y,w,h,line,2);ctx.restore();
    } else if (borderStyle === 'inset') {
      rectangle(x-pad*.8,y-pad*.8,w+pad*1.6,h+pad*1.6,line,2);
      rectangle(x,y,w,h,line,2);
    } else if (borderStyle === 'corners') {
      const short = Math.min(72, w*.16, h*.16);
      for (const [xx,sx] of [[x,1],[x+w,-1]]) {
        for (const [yy,sy] of [[y,1],[y+h,-1]]) {
          rule(xx,yy,xx+sx*short,yy,line,4);
          rule(xx,yy,xx,yy+sy*short,line,4);
        }
      }
    }
  }

  function setLayout(key) {
    if (!['even','stagger','overlap','focus','hero',...DN_LAYOUTS].includes(key)) return;
    layoutMode = key;
    refs.layoutButtons.forEach(button=>{
      const selected=button.dataset.layout===key;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    document.getElementById('directionPanel').hidden = !['stagger','overlap'].includes(key);
    const orderPanel=document.getElementById('dnOrderPanel');
    if(orderPanel)orderPanel.hidden=!DN_LAYOUTS.includes(key);
    renderLayoutChoices();
    resetPositions(false);
    refreshAutoColors();
    scheduleDraw();
  }
  function renderLayoutChoices() {
    const comparePanel=document.getElementById('comparePanel'),heroPanel=document.getElementById('heroPanel');
    if(comparePanel){
      comparePanel.hidden=layoutMode!=='compare';
      const box=document.getElementById('comparePairs');box.textContent='';
      const n=Math.max(groupOf('day').images.length,groupOf('night').images.length);
      comparePair=Math.max(0,Math.min(comparePair,n-1));
      for(let i=0;i<n;i++){
        const b=document.createElement('button');b.type='button';b.className='direction-option'+(i===comparePair?' selected':'');
        b.textContent='第 '+(i+1)+' 组';b.setAttribute('aria-pressed',String(i===comparePair));
        b.addEventListener('click',()=>{comparePair=i;renderLayoutChoices();resetPositions(false);scheduleDraw();});
        box.append(b);
      }
    }
    if(heroPanel){
      heroPanel.hidden=layoutMode!=='hero';
      const box=document.getElementById('heroButtons');box.textContent='';
      const cur=currentHeroIndex();
      images.forEach((img,i)=>{if(!img)return;
        const b=document.createElement('button');b.type='button';b.className='direction-option'+(i===cur?' selected':'');
        b.textContent='第 '+(i+1)+' 张';b.setAttribute('aria-pressed',String(i===cur));
        b.addEventListener('click',()=>{heroIndex=i;renderLayoutChoices();resetPositions(false);scheduleDraw();});
        box.append(b);
      });
    }
  }
  function setDayNightOrder(key) {
    if(!['dn','nd'].includes(key))return;
    dnOrder=key;
    document.querySelectorAll('[data-dn-order]').forEach(button=>{
      const selected=button.dataset.dnOrder===key;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    resetPositions(false);
    scheduleDraw();
  }
  function setLayoutDirection(key) {
    if (!['left-high','left-low'].includes(key)) return;
    layoutDirection=key;
    refs.directionButtons.forEach(button=>{
      const selected=button.dataset.direction===key;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    resetPositions(false);
    scheduleDraw();
  }
  function resetPositions(notify=true) {
    imageOffsets=images.map(()=>({x:0,y:0}));
    if (notify) announce('所有图片已恢复到默认位置');
    scheduleDraw();
  }
  function posterPoint(event, surface) {
    const bounds=surface.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return {x:-1,y:-1};
    return {x:(event.clientX-bounds.left)*CANVAS_W/bounds.width,y:(event.clientY-bounds.top)*CANVAS_H/bounds.height};
  }
  function bindCanvasDrag() {
    for(const surface of [canvas,miniCanvas]){
      surface.addEventListener('pointerdown',event=>{
        if(event.button!==0&&event.pointerType==='mouse')return;
        const p=posterPoint(event,surface);
        for(let i=lastPlacements.length-1;i>=0;i--){
          const q=lastPlacements[i];
          if(!q||!images[i])continue;
          if(p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h){
            selectImage(i);
            dragState={pointerId:event.pointerId,target:surface,index:i,startX:p.x,startY:p.y,offset:{...(imageOffsets[i]||{x:0,y:0})}};
            surface.classList.add('is-dragging');
            surface.setPointerCapture(event.pointerId);
            event.preventDefault();
            break;
          }
        }
      });
      surface.addEventListener('pointermove',event=>{
        if(!dragState||event.pointerId!==dragState.pointerId||dragState.target!==surface)return;
        const p=posterPoint(event,surface);
        imageOffsets[dragState.index]={x:dragState.offset.x+(p.x-dragState.startX),y:dragState.offset.y+(p.y-dragState.startY)};
        scheduleDraw();event.preventDefault();
      });
      const finish=event=>{
        if(!dragState||event.pointerId!==dragState.pointerId||dragState.target!==surface)return;
        dragState=null;surface.classList.remove('is-dragging');scheduleDraw();
      };
      surface.addEventListener('pointerup',finish);
      surface.addEventListener('pointercancel',finish);
      surface.addEventListener('lostpointercapture',()=>{
        if(dragState?.target===surface)dragState=null;
        surface.classList.remove('is-dragging');
      });
      surface.addEventListener('dblclick',event=>{
        const p=posterPoint(event,surface);
        for(let i=lastPlacements.length-1;i>=0;i--){
          const q=lastPlacements[i];
          if(q&&p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h){
            imageOffsets[i]={x:0,y:0};scheduleDraw();break;
          }
        }
      });
    }
  }

  function drawPoster() {
    const theme = displayColors();
    const line = rgbaFromHex(refs.ruleColor.value, Number(refs.ruleOpacity.value)/100);
    ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
    if (currentTheme === 'gradient') {
      const vertical=ctx.createLinearGradient(0,0,0,CANVAS_H);
      vertical.addColorStop(0,refs.gradientStart.value);
      vertical.addColorStop(1,refs.gradientEnd.value);
      ctx.fillStyle=vertical;ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
    } else if (currentTheme === 'image') {
      ctx.save();
      ctx.globalAlpha=Number(refs.backdropOpacity.value)/100;
      drawFullBleedImage(backgroundImage || images[0], Number(refs.blur.value));
      ctx.restore();
    } else if (currentTheme === 'glass') {
      drawGlassBackground(coverImage || images[0], Number(refs.glassStrength.value), theme.bg);
    }

    if (refs.showRules.checked) {
      ctx.fillStyle = theme.band;
      ctx.fillRect(0,0,CANVAS_W,29);
      ctx.fillStyle = theme.accent;
      ctx.fillRect(CANVAS_W-365,0,365,29);
      ctx.fillRect(0,CANVAS_H-29,CANVAS_W,29);
      rectangle(67,54,CANVAS_W-135,CANVAS_H-109,line,4);
      rectangle(87,74,CANVAS_W-175,CANVAS_H-149,line,1);
      const footerRuleY = CANVAS_H-236;
      rule(166,269,3034,269,line,3);
      rule(3034,269,3434,269,line,3);
      rule(166,footerRuleY,3034,footerRuleY,line,3);
      rule(3034,footerRuleY,3434,footerRuleY,line,3);
      for (const x of [163,3437]) {
        cross(x,318,line);
        cross(x,CANVAS_H-282,line);
      }
    }

    if (isDayNightLayout()) { drawDayNightPoster(theme,line); return; }

    const count = images.length;
    lastPlacements=images.map((image,i)=>imagePlacement(image,i,count));
    images.forEach((image,i) => {
      const p=lastPlacements[i];
      if (image) { drawAdaptiveFrame(p,line,theme); drawFittedImage(image,p); }
    });
    drawTrackedText(refs.name.value || DEFAULT_TEXT.name,179,175,
      {color:textInk(theme.ink),size:Number(refs.titleSize.value),minSize:18,tracking:5,maxWidth:1670,bold:true,kinghwa:true});
    drawTrackedText('AUTHOR / '+(refs.author.value || DEFAULT_TEXT.author),3421,175,
      {color:textInk(theme.ink),size:Number(refs.authorSize.value),minSize:18,tracking:8,maxWidth:1430,align:'right'});
    sortedColors(currentColors).forEach((color,i) => {
      const x=200+67*i,y=CANVAS_H-160;
      ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);
      ctx.fillStyle=color;ctx.fill();
      setStroke(line,2);ctx.stroke();
    });
    const message=refs.footerText.value.trim();
    if (message) {
      drawTrackedText(message,3421,CANVAS_H-190,
        {color:textInk(theme.ink),size:Number(refs.messageSize.value),minSize:15,tracking:4,maxWidth:1450,align:'right'});
    }
    drawTrackedText(refs.date.value || DEFAULT_TEXT.date,3421,CANVAS_H-121,
      {color:textInk(theme.ink),size:Number(refs.dateSize.value),minSize:16,tracking:7,maxWidth:900,align:'right'});
  }

  function textInk(auto,side='day') {
    if(textMode!=='custom')return auto;
    return side==='night'?textNight:textDay;
  }
  function setTextMode(mode) {
    textMode=mode==='custom'?'custom':'auto';
    if(textMode==='custom'&&!textTouched){
      // start from the colours the poster shows now
      textDay=displayColors().ink;
      textNight=nightTone().dark&&luminance(nightTone().dark)<125?'#F1F0E7':'#2F3A31';
      textTouched=true;
    }
    document.querySelectorAll('[data-text-mode]').forEach(b=>{const on=b.dataset.textMode===textMode;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
    const box=document.getElementById('textColorInputs');if(box)box.hidden=textMode!=='custom';
    syncTextColorInputs();
    scheduleDraw();
  }
  function syncTextColorInputs() {
    for(const [id,v] of [['textDayColor',textDay],['textNightColor',textNight]]){
      const el=document.getElementById(id);if(!el)continue;
      el.value=v.toLowerCase();if(el.dataset.androidHsv)el.style.backgroundColor=v;
    }
  }
  function drawPosterText(ink) {
    drawTrackedText(refs.name.value || DEFAULT_TEXT.name,179,175,
      {color:ink,size:Number(refs.titleSize.value),minSize:18,tracking:5,maxWidth:1670,bold:true,kinghwa:true});
    drawTrackedText('AUTHOR / '+(refs.author.value || DEFAULT_TEXT.author),3421,175,
      {color:ink,size:Number(refs.authorSize.value),minSize:18,tracking:8,maxWidth:1430,align:'right'});
    const message=refs.footerText.value.trim();
    if (message) {
      drawTrackedText(message,3421,CANVAS_H-190,
        {color:ink,size:Number(refs.messageSize.value),minSize:15,tracking:4,maxWidth:1450,align:'right'});
    }
    drawTrackedText(refs.date.value || DEFAULT_TEXT.date,3421,CANVAS_H-121,
      {color:ink,size:Number(refs.dateSize.value),minSize:16,tracking:7,maxWidth:900,align:'right'});
  }
  function drawDayNightPoster(theme,line) {
    const halves=['split','diagonal','compare','rows'].includes(layoutMode);
    let nightInk=theme.ink;
    if(halves){
      // the night half takes its tone from the night screenshots
      const geo=dayNightGeometry();
      const tone=nightTone();
      const nightBg=currentTheme==='dark'?mixedColor(tone.dark,'#0E1210',.25):tone.dark;
      ctx.save();tracePolygon(geo.night);ctx.clip();
      ctx.globalAlpha=(currentTheme==='image'||currentTheme==='glass')?.88:1;
      ctx.fillStyle=nightBg;ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
      ctx.restore();
      nightInk=luminance(nightBg)<125?'#F1F0E7':'#2F3A31';
    }
    const placed=dayNightPlacements();
    lastPlacements=images.map(()=>null);
    for(const item of placed){
      drawAdaptiveFrame(item.p,line,theme);
      if(item.compareFirst){
        drawFittedImage(item.compareFirst.image,item.p);
        if(item.compareSecond){
          const p=item.p,xd=p.x+p.w*compareAt;
          ctx.save();ctx.beginPath();ctx.rect(xd,p.y,p.x+p.w-xd,p.h);ctx.clip();drawFittedImage(item.compareSecond.image,p);ctx.restore();
          ctx.save();ctx.shadowColor='rgba(14,24,18,.35)';ctx.shadowBlur=28;
          ctx.fillStyle='#fbfbf8';ctx.fillRect(xd-5,p.y,10,p.h);
          ctx.restore();
          if(ctx===previewCtx||compareHandle){ // the drag handle only shows on screen unless asked for
          ctx.save();ctx.shadowColor='rgba(14,24,18,.35)';ctx.shadowBlur=28;ctx.fillStyle='#fbfbf8';
          const cy=p.y+p.h/2,R=58;ctx.beginPath();ctx.arc(xd,cy,R,0,Math.PI*2);ctx.fill();ctx.restore();
          setStroke(line,2);ctx.beginPath();ctx.arc(xd,cy,R,0,Math.PI*2);ctx.stroke();
          ctx.fillStyle=line;const a=R*.36;
          for(const sx of [-1,1]){ctx.beginPath();ctx.moveTo(xd+sx*R*.22,cy-a);ctx.lineTo(xd+sx*(R*.22+a*.9),cy);ctx.lineTo(xd+sx*R*.22,cy+a);ctx.fill();}
          }
        }
      } else drawFittedImage(item.image,item.p);
      if(item.group===activeGroup)lastPlacements[item.index]=item.p;
    }
    if(halves){
      const geo=dayNightGeometry();
      ctx.save();tracePolygon(geo.day);ctx.clip();drawPosterText(textInk(theme.ink));ctx.restore();
      ctx.save();tracePolygon(geo.night);ctx.clip();drawPosterText(textInk(nightInk,'night'));ctx.restore();
    } else drawPosterText(textInk(theme.ink));
    sortedColors(currentColors).forEach((color,i) => {
      const x=200+67*i,y=CANVAS_H-160;
      ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);
      ctx.fillStyle=color;ctx.fill();
      setStroke(line,2);ctx.stroke();
    });
  }

  function syncPaletteInputs() {
    currentColors = sortedColors(currentColors);
    refs.colors.forEach((input, i) => input.value = currentColors[i]);
  }

  function selectTheme(key) {
    if (!MODE_DESCRIPTIONS[key]) return;
    currentTheme = key;
    document.getElementById('modeDescription').textContent = MODE_DESCRIPTIONS[key];
    document.getElementById('customColorPanel').hidden = key !== 'custom';
    document.getElementById('gradientBackdropPanel').hidden = key !== 'gradient';
    document.getElementById('imageBackdropPanel').hidden = key !== 'image';
    document.getElementById('glassBackdropPanel').hidden = key !== 'glass';
    refs.styles.forEach(button => {
      const selected = button.dataset.theme === key;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    scheduleDraw();
  }

  function selectBorder(key) {
    if (!['line', 'shadow', 'none', 'corners'].includes(key)) return;
    borderStyle = key;
    refs.borderStyles.forEach(button => {
      const selected = button.dataset.border === key;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    scheduleDraw();
  }

  function qualityDimensions(quality=selectedExportQuality) {
    const width=quality==='standard'?(CANVAS_H===3600?1080:1440):quality==='high'?(CANVAS_H===3600?2048:2560):3600;
    return {width,height:Math.round(width*CANVAS_H/CANVAS_W)};
  }
  function syncExportQuality() {
    const labels={standard:'qualityStandardSize',high:'qualityHighSize',original:'qualityOriginalSize'};
    for(const [quality,id] of Object.entries(labels)){
      const {width,height}=qualityDimensions(quality);
      document.getElementById(id).textContent=width+' × '+height;
    }
    document.querySelectorAll('[data-export-quality]').forEach(button=>{
      const selected=button.dataset.exportQuality===selectedExportQuality;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const {width,height}=qualityDimensions();
    const dims=width+' × '+height;
    document.getElementById('resolutionPreviewLabel').textContent='导出 '+dims+' px';
    document.getElementById('downloadResolution').textContent=dims;
  }

  function setCanvasRatio(ratio) {
    const square=ratio==='1:1';
    CANVAS_H=square?3600:2700;
    const physicalWidth=compactMode?900:window.matchMedia('(max-width:900px)').matches?1200:1800;
    previewScale=physicalWidth/CANVAS_W;
    canvas.width=physicalWidth;
    canvas.height=Math.round(CANVAS_H*previewScale);
    canvas.style.aspectRatio=square?'1 / 1':'4 / 3';
    miniCanvas.width=440;
    miniCanvas.height=square?440:330;
    miniCanvas.style.aspectRatio=square?'1 / 1':'4 / 3';
    refs.ratioButtons.forEach(button=>{
      const selected=button.dataset.ratio===ratio;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const dims=CANVAS_W+' × '+CANVAS_H;
    document.getElementById('ratioPreviewLabel').textContent=square?'1:1 正方形':'4:3 横版';
    document.getElementById('dialogResolution').textContent=' / '+dims;
    syncExportQuality();
    scheduleDraw();
  }

  function renderTiles() {
    const grid=refs.uploadGrid;
    grid.replaceChildren();
    images.forEach((image,index)=>{
      const tile=document.createElement('div');
      tile.className='upload-tile';
      tile.classList.toggle('selected-image', scaleMode==='single'&&index===selectedImageIndex);
      tile.dataset.slot=String(index);
      const replace=document.createElement('button');
      replace.type='button';replace.className='tile-replace';
      replace.dataset.action='replace';replace.dataset.slot=String(index);
      replace.setAttribute('aria-label','替换第'+(index+1)+'张图片');
      const thumb=document.createElement('img');
      if(image) thumb.src=image.src;
      else thumb.style.display='none';
      thumb.alt='第'+(index+1)+'张缩略图';
      const overlay=document.createElement('span');overlay.className='tile-shade';
      if(!image){
        const empty=document.createElement('span');empty.className='empty-tile-label';
        empty.textContent='＋ 添加图片';replace.append(empty);
      }
      const caption=document.createElement('small');caption.textContent='点击替换 ↗';
      overlay.append(caption);replace.append(thumb,overlay);tile.append(replace);
      const select=document.createElement('button');
      select.type='button';select.className='tile-select';
      select.dataset.action='select';select.dataset.slot=String(index);
      select.textContent=String(index+1).padStart(2,'0');
      select.setAttribute('aria-label','选中第'+(index+1)+'张图片以调整大小');
      tile.append(select);
      if(images.length>1){
        const remove=document.createElement('button');
        remove.type='button';remove.className='tile-remove';
        remove.dataset.action='remove';remove.dataset.slot=String(index);
        remove.setAttribute('aria-label','移除第'+(index+1)+'张图片');
        remove.textContent='×';tile.append(remove);
      }
      grid.append(tile);
    });
    if(images.length<5){
      const add=document.createElement('button');
      add.type='button';add.className='upload-tile upload-tile-add';
      add.dataset.action='add';add.dataset.slot=String(images.length);
      add.setAttribute('aria-label','添加第'+(images.length+1)+'张图片');
      add.innerHTML='<span class="add-icon">＋</span><span>添加第'+(images.length+1)+'张</span>';
      grid.append(add);
    }
  }
  function removeImage(index) {
    if(images.length<=1)return announce('至少保留 1 张图片');
    if(userObjectURLs[index]) URL.revokeObjectURL(userObjectURLs[index]);
    images.splice(index,1);
    userObjectURLs.splice(index,1);
    imageOffsets.splice(index,1);
    imageScales.splice(index,1);
    selectedImageIndex=Math.max(0,Math.min(selectedImageIndex,images.length-1));
    updateSelectedScaleUI();
    updateSizeMessage();refreshAutoColors();
    if(!paletteLocked)currentColors=paletteFromImages(images);syncPaletteInputs();
    scheduleDraw();announce('已移除第 '+(index+1)+' 张图片');
  }

  function updateSizeMessage() {
    const dims=images.map(img=>img ? img.naturalWidth+' × '+img.naturalHeight : '—');
    const same=images.length===3&&images.every(img=>img && img.naturalWidth===942&&img.naturalHeight===2048);
    refs.info.textContent=images.some(Boolean)?images.length+' 张图片'+(same?'，均为 942 × 2048 px':'：'+dims.join(' / '))+
      ' · 图片完整保留，可在海报中拖动位置':'尚未添加图片，请选择上方“逐张添加”或“一键添加”';
    renderTiles();
    syncGroupButtons();
    renderLayoutChoices();
  }

  async function loadUserFile(file) {
    if (!file || !/^image\/(png|jpeg|webp|avif|gif)$/i.test(file.type)) throw Error('请使用 PNG、JPG、WebP、AVIF 或 GIF 图片');
    if (file.size > 45*1024*1024) throw Error('单张图片需小于 45 MB');
    const url=URL.createObjectURL(file);
    try {
      const image=await loadImage(url);
      if (image.naturalWidth*image.naturalHeight>60000000) throw Error('图片像素过大，请缩小后重试');
      return {image,url};
    } catch(err) { URL.revokeObjectURL(url);throw err; }
  }

  async function importBatch(fileList) {
    const files=Array.from(fileList || []);
    if (files.length<1||files.length>5) return announce('请一次选择 1–5 张图片');
    const loaded=[];
    try {
      for (const file of files) loaded.push(await loadUserFile(file));
      userObjectURLs.forEach(url=>url&&URL.revokeObjectURL(url));
      images=loaded.map(item=>item.image);
      userObjectURLs=loaded.map(item=>item.url);
      imageOffsets=images.map(()=>({x:0,y:0}));
      imageScales=images.map(()=>100);selectedImageIndex=0;
      updateSelectedScaleUI();
      updateSizeMessage();
      refreshAutoColors();
      if(!paletteLocked)currentColors=paletteFromImages(images);
      syncPaletteInputs();
      scheduleDraw();
      announce('已放入 '+images.length+' 张图片 · 可直接在画布上拖动调整');
    } catch(error) {
      loaded.forEach(item=>URL.revokeObjectURL(item.url));
      announce(error.message || '上传失败，请重新选择');
    }
  }

  async function replaceImage(index,file) {
    if (!file) return;
    try {
      const loaded=await loadUserFile(file);
      const old=userObjectURLs[index];
      if (index>=images.length) {
        if(images.length>=5){URL.revokeObjectURL(loaded.url);return announce('最多只能展示 5 张图片');}
        images.push(loaded.image);
        imageOffsets.push({x:0,y:0});
        imageScales.push(100);
      } else images[index]=loaded.image;
      selectedImageIndex=index;updateSelectedScaleUI();
      userObjectURLs[index]=loaded.url;
      if (old) URL.revokeObjectURL(old);
      updateSizeMessage();
      refreshAutoColors();
      if(!paletteLocked)currentColors=paletteFromImages(images);
      syncPaletteInputs();
      scheduleDraw();
      announce('第 '+(index+1)+' 张图片已更新 · '+loaded.image.naturalWidth+' × '+loaded.image.naturalHeight);
    } catch(error) { announce(error.message || '图片读取失败，请换一张'); }
  }

  function selectImage(index) {
    if(index<0||index>=images.length)return;
    selectedImageIndex=index;
    scaleMode='single';
    updateSelectedScaleUI();
    renderTiles();
  }
  function setScaleMode(mode) {
    if(!['single','all'].includes(mode))return;
    scaleMode=mode;
    updateSelectedScaleUI();
    renderTiles();
  }
  function updateSelectedScaleUI() {
    selectedImageIndex=Math.max(0,Math.min(selectedImageIndex,images.length-1));
    const validScales=imageScales.filter((_,index)=>Boolean(images[index]));
    const all=scaleMode==='all';
    const average=validScales.length?validScales.reduce((sum,n)=>sum+n,0)/validScales.length:100;
    const value=all?Math.min(300,Math.max(20,Math.round(average))):(imageScales[selectedImageIndex]??100);
    refs.imageScale.value=String(value);
    refs.imageScaleNumber.value=String(value);
    const varied=all&&validScales.length>1&&new Set(validScales).size>1;
    document.getElementById('scaleApproxIndicator').hidden=!varied;
    document.getElementById('selectedImageLabel').textContent=all?'共 '+validScales.length+' 张':'第 '+(selectedImageIndex+1)+' 张';
    document.getElementById('scaleModeLabel').textContent=all?'全部图片大小':'所选图片大小';
    document.getElementById('imageScaleTip').textContent=all
      ?(varied?'各张图片目前大小不同；输入数字即可统一为指定百分比。':'滑动或输入百分比（20–300），同时调整所有图片大小，位置不变。')
      :'先点选缩略图或画布中的图片，再滑动或输入百分比（20–300）。';
    document.querySelectorAll('[data-scale-mode]').forEach(button=>{
      const active=button.dataset.scaleMode===scaleMode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function applyImageScale(number) {
    if(!Number.isFinite(number))return;
    const value=Math.min(300,Math.max(20,Math.round(number)));
    if(scaleMode==='all'){
      imageScales=imageScales.map((previous,index)=>images[index]?value:previous);
    } else {
      imageScales[selectedImageIndex]=value;
    }
    refs.imageScale.value=String(value);
    refs.imageScaleNumber.value=String(value);
    document.getElementById('scaleApproxIndicator').hidden=true;
    scheduleDraw();
  }

  async function resetAll() {
    if(activeGroup!=='day')setActiveGroup('day');
    (groupStore.night?.userObjectURLs||[]).forEach(url=>url&&URL.revokeObjectURL(url));
    groupStore.night={images:[null],userObjectURLs:[null],imageOffsets:[{x:0,y:0}],imageScales:[100],selectedImageIndex:0};
    selectGlobalFont('kinghwa');
    refs.name.value=DEFAULT_TEXT.name;
    refs.author.value=DEFAULT_TEXT.author;
    refs.date.value=DEFAULT_TEXT.date;
    refs.footerText.value='';
    for(const [ref,id] of [[refs.titleSize,'titleFontSizeValue'],[refs.authorSize,'authorFontSizeValue'],[refs.dateSize,'dateFontSizeValue'],[refs.messageSize,'messageFontSizeValue']]){
      const defaultSize={titleFontSizeValue:61,authorFontSizeValue:48,dateFontSizeValue:41,messageFontSizeValue:33}[id];
      ref.value=String(defaultSize);document.getElementById(id).textContent=String(defaultSize);
    }
    refs.customColor.value='#E9E6DB';
    document.getElementById('customColorValue').textContent='#E9E6DB';
    refs.blur.value='40';document.getElementById('backgroundBlurValue').textContent='40 px';
    refs.backdropOpacity.value='100';document.getElementById('backgroundOpacityValue').textContent='100%';
    refs.glassStrength.value='70';document.getElementById('glassStrengthValue').textContent='70%';
    refs.ruleColor.value='#000000';refs.ruleOpacity.value='100';refs.showRules.checked=true;
    document.getElementById('ruleStyleControls').hidden=false;
    document.getElementById('ruleOpacityValue').textContent='100%';
    for (const url of [backgroundObjectURL,coverObjectURL]) if(url) URL.revokeObjectURL(url);
    backgroundObjectURL=null;coverObjectURL=null;backgroundImage=null;coverImage=null;
    document.getElementById('backgroundFileName').textContent='未选择，暂用第一张截图预览';
    document.getElementById('coverFileName').textContent='未选择，默认取第一张截图颜色';
    userObjectURLs.forEach(url=>url&&URL.revokeObjectURL(url));
    userObjectURLs=[null,null,null];
    if(compactMode) images=[null];
    else { try { images=await Promise.all(DEFAULT_IMAGES.map(loadImage)); }
    catch(error) { images=[null]; } }
    userObjectURLs=images.map(()=>null);imageOffsets=images.map(()=>({x:0,y:0}));
    gradientCustomized=false;paletteLocked=false;setTextMode('auto');
    imageScales=images.map(()=>100);selectedImageIndex=0;scaleMode='single';
    updateSelectedScaleUI();
    updateSizeMessage();refreshAutoColors();setAutoGradient(false);currentColors=paletteFromImages(images);
    syncPaletteInputs();setLayoutDirection('left-high');setDayNightOrder('dn');setLayout('even');
    selectedExportQuality='original';
    selectTheme('light');selectBorder('line');setCanvasRatio('4:3');
    announce('已恢复默认展示');
  }

  function formatToday() {
    const date = new Date();
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase();
    return `${month}. ${date.getFullYear()}`;
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function extractPalette() {
    const source = currentTheme === 'glass' && coverImage ? [coverImage] : images;
    if (!source.some(Boolean)) return announce('请先添加一张图片');
    paletteLocked = false;
    currentColors = paletteFromImages(source);
    syncPaletteInputs();
    scheduleDraw();
    announce('已提取 5 种配色，并从浅到深排列');
  }

  async function replaceBackdropAsset(kind, file) {
    if (!file || !file.type.startsWith('image/')) return announce('请选择有效的图片');
    keptFiles[kind]=file;
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      if (kind === 'background') {
        if (backgroundObjectURL) URL.revokeObjectURL(backgroundObjectURL);
        backgroundObjectURL = url;
        backgroundImage = image;
        document.getElementById('backgroundFileName').textContent = file.name;
      } else {
        if (coverObjectURL) URL.revokeObjectURL(coverObjectURL);
        coverObjectURL = url;
        coverImage = image;
        document.getElementById('coverFileName').textContent = file.name;
        currentColors = paletteFromImages([image]);
        syncPaletteInputs();
      }
      scheduleDraw();
      announce(kind === 'background' ? '底图图片已替换' : '封面取色已更新');
    } catch (error) {
      URL.revokeObjectURL(url);
      announce('图片读取失败，请换一张');
    }
  }

  function safeFilename() {
    const str = (refs.name.value || 'Lovia-Reading-Gallery').trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/\s+/g, '-');
    const {width,height}=qualityDimensions();
    return `${(str || 'Lovia-Reading-Gallery').slice(0, 45)}-${width}x${height}.png`;
  }

  function canvasBlob(source) {
    return new Promise((resolve,reject)=>source.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG 创建失败')),'image/png'));
  }

  async function highResolutionBlob() {
    if(!images.some(Boolean))throw new Error('请先添加图片');
    await document.fonts.ready;
    // Full-resolution processing is deferred until the user exports, keeping phone previews light.
    announce('正在生成高清图片，请稍候…');
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const output=document.createElement('canvas');
    const {width,height}=qualityDimensions();
    output.width=width;output.height=height;
    const prior=ctx;
    try {
      ctx=output.getContext('2d',{alpha:false});
      const scale=width/CANVAS_W;
      ctx.setTransform(scale,0,0,scale,0,0);
      drawPoster();
    } finally { ctx=prior; }
    try {return await canvasBlob(output);}
    finally {output.width=1;output.height=1;}
  }

  async function exportPNG() {
    try {
      const blob=await highResolutionBlob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download=safeFilename();
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      const {width,height}=qualityDimensions();
      announce('高清 PNG 已开始下载 · '+width+' × '+height+' px');
    } catch(error){console.error(error);announce(error.message||'导出失败，请稍后重试');}
  }

  async function saveToAlbum() {
    try {
      const blob=await highResolutionBlob();
      const file=new File([blob],safeFilename(),{type:'image/png'});
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))) {
        try {
          await navigator.share({files:[file],title:'Lovia 阅读主题'});
          announce('已打开系统分享；可在菜单中选择“存储图像”');
          return;
        } catch(error) {
          if(error?.name==='AbortError')return;
          console.warn('Native share unavailable; using download',error);
        }
      }
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=safeFilename();
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      announce('已开始下载；如未自动入相册，请在图片菜单中选择“存储图像”');
    } catch(error){console.error(error);announce(error.message||'保存失败，请重试');}
  }

  function setPreviewZoom(next) {
    previewZoom=Math.min(3,Math.max(.5,next));
    const content=document.getElementById('dialogContent');
    const fitWidth=Math.max(220,content.clientWidth-20);
    refs.dialogImage.style.width=Math.round(fitWidth*previewZoom)+'px';
    document.getElementById('previewZoomValue').textContent=Math.round(previewZoom*100)+'%';
  }

  async function openPreview() {
    if(!images.some(Boolean))return announce('请先添加图片再放大预览');
    await document.fonts.ready;
    renderPreview();
    refs.dialogImage.src=canvas.toDataURL('image/jpeg',.90);
    refs.dialog.showModal();
    setPreviewZoom(1);
    document.getElementById('dialogContent').scrollTo(0,0);
  }

  function closePreview() {
    if(refs.dialog.open)refs.dialog.close();
    refs.dialogImage.removeAttribute('src');
    refs.dialogImage.style.removeProperty('width');
    if(previewURL)URL.revokeObjectURL(previewURL);
    previewURL=null;
  }

  function bindControls() {
    refs.fontPresets.forEach(button=>button.addEventListener('click',()=>selectGlobalFont(button.dataset.font)));
    refs.fontImportButton.addEventListener('click',()=>refs.fontFileInput.click());
    refs.fontFileInput.addEventListener('change',event=>importLocalFont(event.target.files?.[0]));
    for (const input of [refs.name, refs.author, refs.date, refs.footerText]) input.addEventListener('input', scheduleDraw);
    for(const [ref,valueId] of [[refs.titleSize,'titleFontSizeValue'],[refs.authorSize,'authorFontSizeValue'],[refs.dateSize,'dateFontSizeValue'],[refs.messageSize,'messageFontSizeValue']]){
      ref.addEventListener('input',()=>{document.getElementById(valueId).textContent=ref.value;scheduleDraw();});
    }
    document.querySelectorAll('[data-scale-mode]').forEach(button=>button.addEventListener('click',()=>setScaleMode(button.dataset.scaleMode)));
    document.querySelectorAll('[data-group]').forEach(button=>button.addEventListener('click',()=>setActiveGroup(button.dataset.group)));
    refs.imageScale.addEventListener('input',()=>applyImageScale(Number(refs.imageScale.value)));
    const compareRange=document.getElementById('compareAt');
    const handleBox=document.getElementById('compareHandle');
    if(handleBox)handleBox.addEventListener('change',()=>{compareHandle=handleBox.checked;scheduleDraw();});
    if(compareRange)compareRange.addEventListener('input',()=>{compareAt=Number(compareRange.value)/100;document.getElementById('compareAtValue').textContent=compareRange.value+'%';scheduleDraw();});
    refs.imageScaleNumber.addEventListener('input',()=>{
      const raw=refs.imageScaleNumber.value.trim();
      if(!raw)return;
      const number=Number(raw);
      if(Number.isFinite(number)&&number>=20&&number<=300)applyImageScale(number);
    });
    const confirmImageScaleNumber=()=>{
      const raw=refs.imageScaleNumber.value.trim();
      const number=raw?Number(raw):Number(refs.imageScale.value);
      applyImageScale(number);
    };
    refs.imageScaleNumber.addEventListener('change',confirmImageScaleNumber);
    refs.imageScaleNumber.addEventListener('blur',confirmImageScaleNumber);
    refs.imageScaleNumber.addEventListener('keydown',event=>{
      if(event.key==='Enter'){
        event.preventDefault();
        confirmImageScaleNumber();
        refs.imageScaleNumber.blur();
      }
    });
    document.querySelectorAll('[data-text-mode]').forEach(b=>b.addEventListener('click',()=>setTextMode(b.dataset.textMode)));
    for(const [id,set] of [['textDayColor',v=>{textDay=v;}],['textNightColor',v=>{textNight=v;}]]){
      const el=document.getElementById(id);if(el)el.addEventListener('input',()=>{set(el.value.toUpperCase());scheduleDraw();});
    }
    refs.colors.forEach(input => input.addEventListener('input', () => {
      currentColors[Number(input.dataset.color)] = input.value.toUpperCase();
      syncPaletteInputs();
      scheduleDraw();
    }));
    refs.styles.forEach(button => button.addEventListener('click', () => selectTheme(button.dataset.theme)));
    refs.borderStyles.forEach(button => button.addEventListener('click', () => selectBorder(button.dataset.border)));
    refs.ratioButtons.forEach(button => button.addEventListener('click', () => setCanvasRatio(button.dataset.ratio)));
    document.querySelectorAll('[data-export-quality]').forEach(button=>button.addEventListener('click',()=>{
      selectedExportQuality=button.dataset.exportQuality;
      syncExportQuality();
    }));
    refs.layoutButtons.forEach(button=>button.addEventListener('click',()=>setLayout(button.dataset.layout)));
    refs.directionButtons.forEach(button=>button.addEventListener('click',()=>setLayoutDirection(button.dataset.direction)));
    document.querySelectorAll('[data-dn-order]').forEach(button=>button.addEventListener('click',()=>setDayNightOrder(button.dataset.dnOrder)));
    document.getElementById('resetImagePositions').addEventListener('click',()=>resetPositions());
    refs.showRules.addEventListener('change',()=>{
      document.getElementById('ruleStyleControls').hidden=!refs.showRules.checked;
      scheduleDraw();
    });
    refs.ruleColor.addEventListener('input',scheduleDraw);
    refs.ruleOpacity.addEventListener('input',() => {
      document.getElementById('ruleOpacityValue').textContent = refs.ruleOpacity.value+'%';
      scheduleDraw();
    });
    document.getElementById('batchUploadButton').addEventListener('click',() => refs.batchInput.click());
    document.getElementById('singleUploadButton').addEventListener('click',()=>{
      const empty=images.findIndex(image=>!image);
      if(images.length>=5&&empty<0){announce('已有 5 张图片，点击缩略图可替换');return;}
      activeSlot=empty>=0?empty:images.length;refs.imageInput.click();
    });
    refs.batchInput.addEventListener('change', async () => {
      const files=Array.from(refs.batchInput.files);refs.batchInput.value='';
      await importBatch(files);
    });
    refs.gradientStart.addEventListener('input',()=>{gradientCustomized=true;scheduleDraw();});
    refs.gradientEnd.addEventListener('input',()=>{gradientCustomized=true;scheduleDraw();});
    document.getElementById('autoGradient').addEventListener('click',()=>{
      setAutoGradient();announce('已根据当前图片重新生成渐变色');
    });
    refs.customColor.addEventListener('input', () => {
      document.getElementById('customColorValue').textContent = refs.customColor.value.toUpperCase();
      scheduleDraw();
    });
    refs.blur.addEventListener('input', () => {
      document.getElementById('backgroundBlurValue').textContent = `${refs.blur.value} px`;
      scheduleDraw();
    });
    refs.backdropOpacity.addEventListener('input',()=>{
      document.getElementById('backgroundOpacityValue').textContent=refs.backdropOpacity.value+'%';
      scheduleDraw();
    });
    refs.glassStrength.addEventListener('input', () => {
      document.getElementById('glassStrengthValue').textContent = `${refs.glassStrength.value}%`;
      scheduleDraw();
    });
    document.getElementById('chooseBackground').addEventListener('click', () => refs.backgroundInput.click());
    document.getElementById('chooseCover').addEventListener('click', () => refs.coverInput.click());
    refs.backgroundInput.addEventListener('change', async () => {
      const file = refs.backgroundInput.files[0]; refs.backgroundInput.value = '';
      if (file) await replaceBackdropAsset('background', file);
    });
    refs.coverInput.addEventListener('change', async () => {
      const file = refs.coverInput.files[0]; refs.coverInput.value = '';
      if (file) await replaceBackdropAsset('cover', file);
    });
    document.getElementById('todayButton').addEventListener('click', () => { refs.date.value = formatToday(); scheduleDraw(); });
    document.getElementById('resetAll').addEventListener('click', resetAll);
    document.getElementById('extractPalette').addEventListener('click', extractPalette);
    document.getElementById('downloadButton').addEventListener('click', exportPNG);
    document.getElementById('topExport').addEventListener('click',compactMode?saveToAlbum:exportPNG);
    document.getElementById('mobileExport').addEventListener('click', saveToAlbum);
    document.getElementById('largePreview').addEventListener('click', openPreview);
    document.getElementById('closePreview').addEventListener('click', closePreview);
    document.getElementById('previewZoomIn').addEventListener('click',()=>setPreviewZoom(previewZoom+.25));
    document.getElementById('previewZoomOut').addEventListener('click',()=>setPreviewZoom(previewZoom-.25));
    document.getElementById('previewZoomFit').addEventListener('click',()=>setPreviewZoom(1));
    document.getElementById('mobilePreviewExpand').addEventListener('click',openPreview);
    document.getElementById('mobilePreviewToggle').addEventListener('click',()=>{
      const dock=document.getElementById('mobilePreviewDock');
      const collapsed=dock.classList.toggle('is-collapsed');
      document.getElementById('mobilePreviewToggle').setAttribute('aria-expanded',String(!collapsed));
      dock.querySelector('.dock-toggle-label').textContent=collapsed?'展开 ＋':'收起 −';
    });
    refs.dialog.addEventListener('click', event => { if (event.target === refs.dialog) closePreview(); });
    refs.dialog.addEventListener('close', () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = null;
    });

    refs.uploadGrid.addEventListener('click',event=>{
      const control=event.target.closest('[data-action]');
      if(!control)return;
      const index=Number(control.dataset.slot);
      if(control.dataset.action==='remove'){removeImage(index);return;}
      if(control.dataset.action==='select'){selectImage(index);return;}
      activeSlot=index;refs.imageInput.click();
    });
    refs.uploadGrid.addEventListener('dragover',event=>{
      event.preventDefault();
      const tile=event.target.closest('.upload-tile');
      if(tile)tile.classList.add('dragover');
    });
    refs.uploadGrid.addEventListener('dragleave',event=>{
      const tile=event.target.closest('.upload-tile');
      if(tile)tile.classList.remove('dragover');
    });
    refs.uploadGrid.addEventListener('drop',event=>{
      event.preventDefault();
      refs.uploadGrid.querySelectorAll('.dragover').forEach(el=>el.classList.remove('dragover'));
      const files=Array.from(event.dataTransfer.files||[]);
      if(files.length>=2 && files.length<=5){importBatch(files);return;}
      if(files.length===1){
        const tile=event.target.closest('.upload-tile');
        const index=tile ? Number(tile.dataset.slot) : Math.min(images.length,4);
        replaceImage(index,files[0]);
      }
    });
    refs.imageInput.addEventListener('change',async () => {
      const file=refs.imageInput.files[0];refs.imageInput.value='';
      if(file) await replaceImage(activeSlot,file);
    });
  }

  const onAndroid=/Android/i.test(navigator.userAgent);
  let hsvTarget=null,hsvSaved='#FFFFFF',hsvAccepted=false;
  let hsv={h:0,s:0,v:100};
  function hsvFromHex(hex) {
    const [r,g,b]=rgb(hex).map(x=>x/255);
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    let h=0;
    if(delta){if(max===r)h=((g-b)/delta)%6;else if(max===g)h=(b-r)/delta+2;else h=(r-g)/delta+4;h=(h*60+360)%360;}
    return {h:Math.round(h),s:max?Math.round(delta/max*100):0,v:Math.round(max*100)};
  }
  function hexFromHsv({h,s,v}) {
    const sat=s/100,val=v/100;
    const chroma=val*sat,x=chroma*(1-Math.abs(((h/60)%2)-1)),m=val-chroma;
    let c=[0,0,0];
    if(h<60)c=[chroma,x,0];else if(h<120)c=[x,chroma,0];
    else if(h<180)c=[0,chroma,x];else if(h<240)c=[0,x,chroma];
    else if(h<300)c=[x,0,chroma];else c=[chroma,0,x];
    return rgbToHex(...c.map(n=>(n+m)*255));
  }
  function refreshAndroidSwatches() {
    if(!onAndroid)return;
    document.querySelectorAll('input[data-android-hsv]').forEach(input=>{
      input.style.backgroundColor=input.value;
      input.setAttribute('aria-label','打开 HSV 调色盘，当前颜色 '+input.value);
    });
  }
  function updateHsvVisuals(updateTarget=true) {
    const hueColor=hexFromHsv({h:hsv.h,s:100,v:100});
    const square=document.getElementById('hsvSquare');
    square.style.background='linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent),'+hueColor;
    document.getElementById('hsvHandle').style.left=hsv.s+'%';
    document.getElementById('hsvHandle').style.top=(100-hsv.v)+'%';
    document.getElementById('hsvHue').value=String(hsv.h);
    const hex=hexFromHsv(hsv);
    document.getElementById('hsvColorCode').textContent=hex;
    document.getElementById('hsvColorPreview').style.backgroundColor=hex;
    if(updateTarget && hsvTarget) {
      hsvTarget.value=hex;
      hsvTarget.style.backgroundColor=hex;
      hsvTarget.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
  function initializePlatformColorPicker() {
    if(!onAndroid)return; // iOS retains its system-native <input type="color">.
    document.documentElement.classList.add('android-hsv');
    const dlg=document.getElementById('hsvPicker');
    for(const input of document.querySelectorAll('input[type="color"]')){
      input.dataset.androidHsv='true';
      input.type='button';
      input.classList.add('android-color-control');
      input.style.backgroundColor=input.value;
      input.addEventListener('click',()=>{
        hsvTarget=input;hsvSaved=input.value;hsvAccepted=false;
        hsv=hsvFromHex(input.value);
        updateHsvVisuals(false);
        dlg.showModal();
      });
    }
    const square=document.getElementById('hsvSquare');
    const moveSquare=event=>{
      const r=square.getBoundingClientRect();
      hsv.s=Math.max(0,Math.min(100,Math.round((event.clientX-r.left)*100/r.width)));
      hsv.v=Math.max(0,Math.min(100,Math.round((1-(event.clientY-r.top)/r.height)*100)));
      updateHsvVisuals();
    };
    square.addEventListener('pointerdown',event=>{square.setPointerCapture(event.pointerId);moveSquare(event);event.preventDefault();});
    square.addEventListener('pointermove',event=>{if(event.buttons||event.pointerType==='touch'&&square.hasPointerCapture(event.pointerId))moveSquare(event);});
    document.getElementById('hsvHue').addEventListener('input',event=>{hsv.h=Number(event.target.value);updateHsvVisuals();});
    document.getElementById('hsvDone').addEventListener('click',()=>{hsvAccepted=true;dlg.close();});
    document.getElementById('hsvClose').addEventListener('click',()=>dlg.close());
    dlg.addEventListener('close',()=>{
      if(!hsvAccepted && hsvTarget){
        hsvTarget.value=hsvSaved;hsvTarget.dispatchEvent(new Event('input',{bubbles:true}));
      }
      hsvTarget=null;refreshAndroidSwatches();
    });
    refreshAndroidSwatches();
  }

  async function initialize() {
    setupResponsivePreview();
    bindControls();
    bindCanvasDrag();
    initializePlatformColorPicker();
    syncPaletteInputs();
    if(compactMode){
      // Phone starts with no example screenshots: avoids background downloads and blank/frozen preview.
      images=[null];userObjectURLs=[null];imageOffsets=[{x:0,y:0}];imageScales=[100];selectedImageIndex=0;
      updateSelectedScaleUI();updateSizeMessage();
      refreshAutoColors();setCanvasRatio('4:3');
      scheduleDraw();
    } else {
      try {
        images=await Promise.all(DEFAULT_IMAGES.map(loadImage));
        imageScales=images.map(()=>100);
        updateSelectedScaleUI();updateSizeMessage();
        refreshAutoColors();currentColors=paletteFromImages(images);
        syncPaletteInputs();setAutoGradient(false);setCanvasRatio('4:3');
        renderPreview();
      } catch(error) {
        console.error('Default image loading failed',error);
        images=[null];userObjectURLs=[null];imageOffsets=[{x:0,y:0}];imageScales=[100];
        updateSelectedScaleUI();updateSizeMessage();setCanvasRatio('4:3');renderPreview();
      }
    }
    document.fonts.load('bold 61px "KingHwaOldSong"').then(scheduleDraw).catch(()=>{});
    mountPresets();
  }

  /* ---------- saved settings (设置): kept in this browser, shareable as a link ---------- */
  function collectSettings() {
    const hasImages=images.some(Boolean);
    const auto=hasImages?sortedColors(paletteFromImages(images)):null;
    const paletteCustom=paletteLocked||!auto||auto.join()!==sortedColors(currentColors).join();
    const settings={
      v:1, ratio:CANVAS_H===3600?'1:1':'4:3', theme:currentTheme, border:borderStyle, layout:layoutMode, direction:layoutDirection,
      order:dnOrder, compareAt, compareHandle, font:selectedFont,
      sizes:{title:refs.titleSize.value,author:refs.authorSize.value,date:refs.dateSize.value,message:refs.messageSize.value},
      text:{name:refs.name.value,author:refs.author.value,message:refs.footerText.value},
      rules:{show:refs.showRules.checked,color:refs.ruleColor.value,opacity:refs.ruleOpacity.value},
      customColor:refs.customColor.value, blur:refs.blur.value, opacity:refs.backdropOpacity.value, glass:refs.glassStrength.value,
      gradient:{start:refs.gradientStart.value,end:refs.gradientEnd.value,customized:gradientCustomized},
      quality:selectedExportQuality, palette:paletteCustom?[...currentColors]:null,
      textMode, textDay, textNight, textTouched,
    };
    const files={};
    if(currentTheme==='image'&&keptFiles.background)files.background=keptFiles.background;
    if(currentTheme==='glass'&&keptFiles.cover)files.cover=keptFiles.cover;
    if(selectedFont==='uploaded'&&keptFiles.font)files.font=keptFiles.font;
    return {settings,files};
  }
  function setControl(el,value,event='input') {
    if(!el||value===undefined||value===null)return;
    if(el.type==='checkbox')el.checked=!!value;else el.value=String(value);
    if(el.dataset.androidHsv)el.style.backgroundColor=String(value);
    el.dispatchEvent(new Event(event,{bubbles:true}));
  }
  async function applySettings(st,files={}) {
    const asFile=(b,n)=>b instanceof File?b:new File([b],n,{type:b.type||''});
    if(files.background)await replaceBackdropAsset('background',asFile(files.background,'background.png'));
    if(files.cover)await replaceBackdropAsset('cover',asFile(files.cover,'cover.png'));
    if(st.font==='uploaded'&&files.font)await importLocalFont(asFile(files.font,files.font.name||'font.ttf'));
    else if(st.font in FONT_PRESETS)selectGlobalFont(st.font);
    if(st.ratio)setCanvasRatio(st.ratio);
    let theme=st.theme;
    if(theme==='image'&&!backgroundImage)theme='light';
    if(theme)selectTheme(theme);
    if(st.border)selectBorder(st.border);
    if(st.direction)setLayoutDirection(st.direction);
    if(st.order)setDayNightOrder(st.order);
    if(st.layout)setLayout(st.layout);
    if(st.compareAt!==undefined)setControl(document.getElementById('compareAt'),Math.round(st.compareAt*100));
    if(st.compareHandle!==undefined)setControl(document.getElementById('compareHandle'),st.compareHandle,'change');
    const sz=st.sizes||{};
    setControl(refs.titleSize,sz.title);setControl(refs.authorSize,sz.author);setControl(refs.dateSize,sz.date);setControl(refs.messageSize,sz.message);
    const tx=st.text||{};
    setControl(refs.name,tx.name);setControl(refs.author,tx.author);setControl(refs.footerText,tx.message);
    const ru=st.rules||{};
    setControl(refs.showRules,ru.show,'change');setControl(refs.ruleColor,ru.color);setControl(refs.ruleOpacity,ru.opacity);
    setControl(refs.customColor,st.customColor);setControl(refs.blur,st.blur);setControl(refs.backdropOpacity,st.opacity);setControl(refs.glassStrength,st.glass);
    const gr=st.gradient||{};
    if(gr.customized){refs.gradientStart.value=gr.start;refs.gradientEnd.value=gr.end;gradientCustomized=true;
      for(const el of [refs.gradientStart,refs.gradientEnd])if(el.dataset.androidHsv)el.style.backgroundColor=el.value;}
    else setAutoGradient(false);
    if(st.quality){selectedExportQuality=st.quality;syncExportQuality();}
    if(Array.isArray(st.palette)&&st.palette.length===currentColors.length){currentColors=[...st.palette];paletteLocked=true;}
    else{paletteLocked=false;if(images.some(Boolean))currentColors=paletteFromImages(images);}
    syncPaletteInputs();
    for(const el of refs.colors)if(el.dataset.androidHsv)el.style.backgroundColor=el.value;
    if(st.textDay)textDay=st.textDay;if(st.textNight)textNight=st.textNight;textTouched=!!st.textTouched;
    setTextMode(st.textMode||'auto');
    renderLayoutChoices();
    scheduleDraw();
  }
  function mountPresets(tries=0) {
    if(window.LoviaStudio&&window.LoviaStudio.mountPresets){
      window.LoviaStudio.mountPresets({bar:document.getElementById('presetBar'),saveButtons:[document.getElementById('savePreset')],collect:collectSettings,apply:applySettings,notify:announce});
    } else if(tries<50) setTimeout(()=>mountPresets(tries+1),100);
  }

  window.LoviaClassicAPI={
    imageSources(name){return groupOf(name).images.filter(Boolean).map(img=>img.src);},
    async loadFiles(name,files){
      const back=activeGroup;setActiveGroup(name);
      await importBatch(files);
      setActiveGroup(back);
    },
    setLayout(key){setLayout(key);},
  };

  initialize();
})();