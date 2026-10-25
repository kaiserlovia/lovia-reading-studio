(() => {
  'use strict';

  const CANVAS_W = 3600;
  const CANVAS_H = 2700;
  const PANEL_W = 942;
  const PANEL_H = 2048;
  const PANEL_Y = 342;
  const PANEL_X = [267, 1329, 2391];
  const DEFAULT_IMAGES = ['assets/IMG_5735.JPG', 'assets/IMG_5733.JPG', 'assets/IMG_5721.PNG'];
  const DEFAULT_TEXT = { name: 'THE SURREAL LIBRARY', author: 'LOVIA', date: 'OCT. 2026' };
  const MODE_DESCRIPTIONS = {
    light: '自动提取截图中的柔和浅色作为底图。',
    dark: '从截图提取深色，形成鲜明的画廊对比。',
    custom: '自选纯色背景，不添加渐变或纹理。',
    image: '使用指定图片铺满底图，可自由调整模糊度。',
    glass: '取封面颜色，形成柔和的液态玻璃朦胧背景。',
  };

  const canvas = document.getElementById('posterCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const refs = {
    name: document.getElementById('themeName'),
    author: document.getElementById('authorName'),
    date: document.getElementById('dateText'),
    colors: [...document.querySelectorAll('[data-color]')],
    styles: [...document.querySelectorAll('.style-option')],
    borderStyles: [...document.querySelectorAll('[data-border]')],
    customColor: document.getElementById('customBackdropColor'),
    blur: document.getElementById('backgroundBlur'),
    glassStrength: document.getElementById('glassStrength'),
    backgroundInput: document.getElementById('backgroundFileInput'),
    coverInput: document.getElementById('coverFileInput'),
    tiles: [...document.querySelectorAll('.upload-tile')],
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
      drawPoster();
    });
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

  function drawTrackedText(raw, x, centerY, opts = {}) {
    const text = String(raw || '').trim();
    if (!text) return;
    const { color = '#333B31', maxWidth = 1450, size = 51, minSize = 25, tracking = 9, align = 'left', italic = false, bold = false, kinghwa = false } = opts;
    let selectedSize = size;
    let effectiveTracking = tracking;
    const family = kinghwa
      ? '"KingHwaOldSong", "KingHwa_OldSong", "京華老宋体", "京华老宋体", "Songti SC", serif'
      : /[\u3400-\u9fff]/.test(text) ? 'Georgia, "Songti SC", "Noto Serif CJK SC", serif' : 'Georgia, "Times New Roman", serif';
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
  function refreshAutoColors() {
    derivedColors = analyzeColors(images);
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
    const scale = Math.max(CANVAS_W / image.naturalWidth, CANVAS_H / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.save();
    ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
    ctx.drawImage(image, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
    ctx.restore();
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
    ctx.fillRect(68, 54, 3464, 2592);
  }

  function displayColors() {
    const sample = currentTheme === 'glass' && coverImage ? analyzeColors([coverImage]) : derivedColors;
    let bg = sample.light;
    if (currentTheme === 'dark') bg = sample.dark;
    else if (currentTheme === 'custom') bg = refs.customColor.value;
    const dark = currentTheme === 'dark' || (currentTheme === 'custom' && luminance(bg) < 125);
    return {
      bg, band: dark ? mixedColor(sample.dark, '#101912', .48) : sample.dark, accent: sample.accent,
      ink: dark ? '#F1F0E7' : '#2F3A31',
      rule: dark ? '#99A99C' : mixedColor(sample.dark, '#91A290', .38),
      secondary: dark ? '#788C7F' : mixedColor(sample.light, sample.dark, .35),
      frame: dark ? '#B1C0AE' : mixedColor(sample.dark, '#71846F', .44),
    };
  }

  function drawCoverImage(img, x, y) {
    if (!img) {
      ctx.fillStyle = '#f3f1e9';
      ctx.fillRect(x, y, PANEL_W, PANEL_H);
      drawTrackedText('ADD IMAGE', x + PANEL_W / 2, y + PANEL_H / 2, { color: '#9baa9a', size: 41, tracking: 8, align: 'center' });
      return;
    }
    ctx.fillStyle = '#f6f5ee';
    ctx.fillRect(x, y, PANEL_W, PANEL_H);
    const ratio = Math.min(PANEL_W / img.naturalWidth, PANEL_H / img.naturalHeight);
    const drawW = img.naturalWidth * ratio;
    const drawH = img.naturalHeight * ratio;
    const drawX = x + (PANEL_W - drawW) / 2;
    const drawY = y + (PANEL_H - drawH) / 2;
    // Exact 942 × 2048 screenshots are drawn at 1:1 with no resizing or crop.
    ctx.imageSmoothingEnabled = !(img.naturalWidth === PANEL_W && img.naturalHeight === PANEL_H);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.imageSmoothingEnabled = true;
  }

  function drawPoster() {
    const theme = displayColors();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    if (currentTheme === 'image') {
      drawFullBleedImage(backgroundImage || images[0], Number(refs.blur.value));
      ctx.fillStyle = 'rgba(249,248,243,.62)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else if (currentTheme === 'glass') {
      drawGlassBackground(coverImage || images[0], Number(refs.glassStrength.value), theme.bg);
    }

    ctx.fillStyle = theme.band;
    ctx.fillRect(0, 0, CANVAS_W, 29);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(CANVAS_W - 365, 0, 365, 29);
    ctx.fillRect(0, CANVAS_H - 29, CANVAS_W, 29);

    rectangle(67, 54, 3465, 2591, theme.rule, 4);
    rectangle(87, 74, 3425, 2551, theme.secondary, 1);
    rule(166, 269, 3034, 269, theme.rule, 3);
    rule(3034, 269, 3434, 269, theme.accent, 3);
    rule(166, 2464, 3034, 2464, theme.rule, 3);
    rule(3034, 2464, 3434, 2464, theme.accent, 3);
    for (const x of [163, 3437]) {
      cross(x, 318, theme.rule);
      cross(x, 2418, theme.rule);
    }

    PANEL_X.forEach((x, i) => {
      if (borderStyle === 'shadow') {
        ctx.save();
        ctx.shadowColor = 'rgba(17,27,19,.38)';
        ctx.shadowBlur = 42;
        ctx.shadowOffsetX = 13;
        ctx.shadowOffsetY = 18;
        ctx.fillStyle = '#F6F5EF';
        ctx.fillRect(x - 5, PANEL_Y - 5, PANEL_W + 10, PANEL_H + 10);
        ctx.restore();
      } else if (borderStyle === 'double') {
        rectangle(x - 16, PANEL_Y - 16, PANEL_W + 32, PANEL_H + 32, theme.secondary, 2);
        rectangle(x - 6, PANEL_Y - 6, PANEL_W + 12, PANEL_H + 12, theme.frame, 3);
      } else if (borderStyle === 'line') {
        rectangle(x - 6, PANEL_Y - 6, PANEL_W + 12, PANEL_H + 12, theme.frame, 3);
      }
      drawCoverImage(images[i], x, PANEL_Y);
    });

    drawTrackedText(refs.name.value || DEFAULT_TEXT.name, 179, 175, { color: theme.ink, size: 61, minSize: 29, tracking: 5, maxWidth: 1670, bold: true, kinghwa: true });
    drawTrackedText('AUTHOR / ' + (refs.author.value || DEFAULT_TEXT.author), 3421, 175, { color: theme.ink, size: 48, minSize: 28, tracking: 8, maxWidth: 1430, align: 'right' });

    sortedColors(currentColors).forEach((color, i) => {
      const x = 200 + 67 * i;
      const y = 2540;
      ctx.beginPath();
      ctx.arc(x, y, 21, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      setStroke(theme.rule, 2);
      ctx.stroke();
    });
    drawTrackedText(refs.date.value || DEFAULT_TEXT.date, 3421, 2540, { color: theme.ink, size: 45, minSize: 29, tracking: 8, maxWidth: 780, align: 'right' });
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
    if (!['line', 'double', 'shadow', 'none'].includes(key)) return;
    borderStyle = key;
    refs.borderStyles.forEach(button => {
      const selected = button.dataset.border === key;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    scheduleDraw();
  }

  function updateSizeMessage() {
    const dims = images.map(img => img ? `${img.naturalWidth} × ${img.naturalHeight}` : '—');
    const same = dims.every(d => d === '942 × 2048');
    refs.info.textContent = same
      ? '三张均为 942 × 2048 px，导出时以 1:1 原始像素嵌入'
      : `图片尺寸：${dims.join('  /  ')}。不同尺寸完整等比适配，无裁切。`;
  }

  async function replaceImage(index, file) {
    if (!file || !file.type.startsWith('image/')) return announce('请选择 PNG、JPG 或 WebP 图片');
    const temporaryURL = URL.createObjectURL(file);
    try {
      const image = await loadImage(temporaryURL);
      const oldURL = userObjectURLs[index];
      userObjectURLs[index] = temporaryURL;
      images[index] = image;
      document.getElementById(`thumb${index}`).src = temporaryURL;
      if (oldURL) URL.revokeObjectURL(oldURL);
      updateSizeMessage();
      refreshAutoColors();
      currentColors = paletteFromImages(images);
      syncPaletteInputs();
      scheduleDraw();
      announce(`第 ${index + 1} 张截图已替换 · ${image.naturalWidth} × ${image.naturalHeight}`);
    } catch (err) {
      URL.revokeObjectURL(temporaryURL);
      announce('这张图片暂时无法读取，请换一张再试');
    }
  }

  async function resetAll() {
    refs.name.value = DEFAULT_TEXT.name;
    refs.author.value = DEFAULT_TEXT.author;
    refs.date.value = DEFAULT_TEXT.date;
    refs.customColor.value = '#E9E6DB';
    document.getElementById('customColorValue').textContent = '#E9E6DB';
    refs.blur.value = '40';
    document.getElementById('backgroundBlurValue').textContent = '40 px';
    refs.glassStrength.value = '70';
    document.getElementById('glassStrengthValue').textContent = '70%';
    for (const url of [backgroundObjectURL, coverObjectURL]) if (url) URL.revokeObjectURL(url);
    backgroundObjectURL = null;
    coverObjectURL = null;
    backgroundImage = null;
    coverImage = null;
    document.getElementById('backgroundFileName').textContent = '未选择，暂用第一张截图预览';
    document.getElementById('coverFileName').textContent = '未选择，默认取第一张截图颜色';
    userObjectURLs.forEach(url => url && URL.revokeObjectURL(url));
    userObjectURLs = [null, null, null];
    await Promise.all(DEFAULT_IMAGES.map(async (src, i) => {
      images[i] = await loadImage(src);
      document.getElementById(`thumb${i}`).src = src;
    }));
    updateSizeMessage();
    refreshAutoColors();
    currentColors = paletteFromImages(images);
    syncPaletteInputs();
    selectTheme('light');
    selectBorder('line');
    scheduleDraw();
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
    currentColors = paletteFromImages(source);
    syncPaletteInputs();
    scheduleDraw();
    announce('已提取 5 种配色，并从浅到深排列');
  }

  async function replaceBackdropAsset(kind, file) {
    if (!file || !file.type.startsWith('image/')) return announce('请选择有效的图片');
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
    return `${(str || 'Lovia-Reading-Gallery').slice(0, 45)}-3600x2700.png`;
  }

  function canvasBlob() {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 创建失败')), 'image/png'));
  }

  async function exportPNG() {
    try {
      await document.fonts.ready;
      drawPoster();
      const blob = await canvasBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      announce('高清 PNG 已开始下载 · 3600 × 2700 px');
    } catch (error) {
      console.error(error);
      announce('导出遇到问题，请稍后重试');
    }
  }

  async function openPreview() {
    await document.fonts.ready;
    drawPoster();
    const blob = await canvasBlob();
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(blob);
    refs.dialogImage.src = previewURL;
    refs.dialog.showModal();
  }

  function closePreview() {
    refs.dialog.close();
    refs.dialogImage.removeAttribute('src');
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = null;
  }

  function bindControls() {
    for (const input of [refs.name, refs.author, refs.date]) input.addEventListener('input', scheduleDraw);
    refs.colors.forEach(input => input.addEventListener('input', () => {
      currentColors[Number(input.dataset.color)] = input.value.toUpperCase();
      syncPaletteInputs();
      scheduleDraw();
    }));
    refs.styles.forEach(button => button.addEventListener('click', () => selectTheme(button.dataset.theme)));
    refs.borderStyles.forEach(button => button.addEventListener('click', () => selectBorder(button.dataset.border)));
    refs.customColor.addEventListener('input', () => {
      document.getElementById('customColorValue').textContent = refs.customColor.value.toUpperCase();
      scheduleDraw();
    });
    refs.blur.addEventListener('input', () => {
      document.getElementById('backgroundBlurValue').textContent = `${refs.blur.value} px`;
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
    document.getElementById('topExport').addEventListener('click', exportPNG);
    document.getElementById('mobileExport').addEventListener('click', exportPNG);
    document.getElementById('largePreview').addEventListener('click', openPreview);
    document.getElementById('closePreview').addEventListener('click', closePreview);
    refs.dialog.addEventListener('click', event => { if (event.target === refs.dialog) closePreview(); });
    refs.dialog.addEventListener('close', () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = null;
    });

    refs.tiles.forEach(tile => {
      const slot = Number(tile.dataset.slot);
      tile.addEventListener('click', () => { activeSlot = slot; refs.imageInput.click(); });
      tile.addEventListener('dragover', event => { event.preventDefault(); tile.classList.add('dragover'); });
      tile.addEventListener('dragleave', () => tile.classList.remove('dragover'));
      tile.addEventListener('drop', event => {
        event.preventDefault();
        tile.classList.remove('dragover');
        replaceImage(slot, event.dataTransfer.files[0]);
      });
    });
    refs.imageInput.addEventListener('change', async () => {
      const file = refs.imageInput.files[0];
      refs.imageInput.value = '';
      if (file) await replaceImage(activeSlot, file);
    });
  }

  async function initialize() {
    bindControls();
    syncPaletteInputs();
    try {
      images = await Promise.all(DEFAULT_IMAGES.map(loadImage));
      updateSizeMessage();
      refreshAutoColors();
      currentColors = paletteFromImages(images);
      syncPaletteInputs();
      drawPoster();
      // Ensure the actual embedded old-Song font is used in the preview and export.
      document.fonts.load('bold 61px "KingHwaOldSong"').then(scheduleDraw).catch(() => {});
    } catch (error) {
      console.error('Default image loading failed', error);
      drawPoster();
      announce('默认图片未能载入，可点击右侧重新上传');
    }
  }

  initialize();
})();
