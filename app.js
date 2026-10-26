(() => {
  'use strict';

  const CANVAS_W = 3600;
  let CANVAS_H = 2700;
  const DEFAULT_IMAGES = ['assets/IMG_5735.JPG', 'assets/IMG_5733.JPG', 'assets/IMG_5721.PNG'];
  const DEFAULT_TEXT = { name: 'THE SURREAL LIBRARY', author: 'LOVIA', date: 'OCT. 2026' };
  const MODE_DESCRIPTIONS = {
    light: '自动提取截图中的柔和浅色作为底图。',
    dark: '从截图提取深色，形成鲜明的画廊对比。',
    custom: '自选纯色背景，不添加渐变或纹理。',
    image: '上传自己的底图，可实时调节模糊度与透明度。',
    glass: '取封面颜色，形成柔和的液态玻璃朦胧背景。',
    gradient: '默认自动提取截图颜色，生成从上到下的柔和渐变。',
  };

  const canvas = document.getElementById('posterCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const refs = {
    name: document.getElementById('themeName'),
    author: document.getElementById('authorName'),
    date: document.getElementById('dateText'),
    footerText: document.getElementById('footerText'),
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
  let lastPlacements = [];
  let dragState = null;
  let gradientCustomized = false;
  const backdropBuffer = document.createElement('canvas');

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
    if (layoutMode === 'focus' && count >= 2) {
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
    const offset = imageOffsets[index] || {x:0,y:0};
    x=Math.max(114,Math.min(CANVAS_W-114-w,x+offset.x));
    y=Math.max(315,Math.min(CANVAS_H-265-h,y+offset.y));
    return {x,y,w,h};
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
    ctx.imageSmoothingEnabled = !pixelExact;
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
    if (!['even','stagger','overlap','focus'].includes(key)) return;
    layoutMode = key;
    refs.layoutButtons.forEach(button=>{
      const selected=button.dataset.layout===key;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    document.getElementById('directionPanel').hidden = !['stagger','overlap'].includes(key);
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
  function posterPoint(event) {
    const bounds=canvas.getBoundingClientRect();
    return {x:(event.clientX-bounds.left)*CANVAS_W/bounds.width,y:(event.clientY-bounds.top)*CANVAS_H/bounds.height};
  }
  function bindCanvasDrag() {
    canvas.addEventListener('pointerdown',event=>{
      if (event.button!==0 && event.pointerType==='mouse') return;
      const p=posterPoint(event);
      for (let i=lastPlacements.length-1;i>=0;i--) {
        const q=lastPlacements[i];
        if (!q || !images[i]) continue;
        if (p.x>=q.x && p.x<=q.x+q.w && p.y>=q.y && p.y<=q.y+q.h) {
          dragState={pointerId:event.pointerId,index:i,startX:p.x,startY:p.y,offset:{...(imageOffsets[i]||{x:0,y:0})}};
          canvas.classList.add('is-dragging');
          canvas.setPointerCapture(event.pointerId);
          event.preventDefault();
          break;
        }
      }
    });
    canvas.addEventListener('pointermove',event=>{
      if (!dragState || event.pointerId!==dragState.pointerId) return;
      const p=posterPoint(event);
      imageOffsets[dragState.index]={x:dragState.offset.x+(p.x-dragState.startX),y:dragState.offset.y+(p.y-dragState.startY)};
      scheduleDraw();
      event.preventDefault();
    });
    function finishDrag(event) {
      if (!dragState || event.pointerId!==dragState.pointerId) return;
      dragState=null;
      canvas.classList.remove('is-dragging');
      scheduleDraw();
    }
    canvas.addEventListener('pointerup',finishDrag);
    canvas.addEventListener('pointercancel',finishDrag);
    canvas.addEventListener('lostpointercapture',()=>{dragState=null;canvas.classList.remove('is-dragging')});
    canvas.addEventListener('dblclick',event=>{
      const p=posterPoint(event);
      for(let i=lastPlacements.length-1;i>=0;i--){
        const q=lastPlacements[i];
        if(q && p.x>=q.x && p.x<=q.x+q.w && p.y>=q.y && p.y<=q.y+q.h){
          imageOffsets[i]={x:0,y:0};scheduleDraw();break;
        }
      }
    });
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

    const count = images.length;
    lastPlacements=images.map((image,i)=>imagePlacement(image,i,count));
    images.forEach((image,i) => {
      const p=lastPlacements[i];
      if (image) { drawAdaptiveFrame(p,line,theme); drawFittedImage(image,p); }
    });
    drawTrackedText(refs.name.value || DEFAULT_TEXT.name,179,175,
      {color:theme.ink,size:61,minSize:29,tracking:5,maxWidth:1670,bold:true,kinghwa:true});
    drawTrackedText('AUTHOR / '+(refs.author.value || DEFAULT_TEXT.author),3421,175,
      {color:theme.ink,size:48,minSize:28,tracking:8,maxWidth:1430,align:'right'});
    sortedColors(currentColors).forEach((color,i) => {
      const x=200+67*i,y=CANVAS_H-160;
      ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);
      ctx.fillStyle=color;ctx.fill();
      setStroke(line,2);ctx.stroke();
    });
    const message=refs.footerText.value.trim();
    if (message) {
      drawTrackedText(message,3421,CANVAS_H-190,
        {color:theme.ink,size:33,minSize:22,tracking:4,maxWidth:1450,align:'right'});
    }
    drawTrackedText(refs.date.value || DEFAULT_TEXT.date,3421,CANVAS_H-121,
      {color:theme.ink,size:41,minSize:27,tracking:7,maxWidth:900,align:'right'});
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

  function setCanvasRatio(ratio) {
    const square = ratio === '1:1';
    CANVAS_H = square ? 3600 : 2700;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.aspectRatio = square ? '1 / 1' : '4 / 3';
    refs.ratioButtons.forEach(button => {
      const selected = button.dataset.ratio === ratio;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const dims = CANVAS_W+' × '+CANVAS_H;
    document.getElementById('ratioPreviewLabel').textContent = square?'1:1 正方形':'4:3 横版';
    document.getElementById('resolutionPreviewLabel').textContent = dims+' px';
    document.getElementById('downloadResolution').textContent = dims;
    document.getElementById('dialogResolution').textContent = ' / '+dims;
    scheduleDraw();
  }

  function renderTiles() {
    const grid=refs.uploadGrid;
    grid.replaceChildren();
    images.forEach((image,index)=>{
      const tile=document.createElement('div');
      tile.className='upload-tile';
      tile.dataset.slot=String(index);
      const replace=document.createElement('button');
      replace.type='button';replace.className='tile-replace';
      replace.dataset.action='replace';replace.dataset.slot=String(index);
      replace.setAttribute('aria-label','替换第'+(index+1)+'张图片');
      const thumb=document.createElement('img');
      if(image) thumb.src=image.src;
      thumb.alt='第'+(index+1)+'张缩略图';
      const overlay=document.createElement('span');overlay.className='tile-shade';
      const count=document.createElement('strong');count.textContent=String(index+1).padStart(2,'0');
      const caption=document.createElement('small');caption.textContent='点击替换 ↗';
      overlay.append(count,caption);replace.append(thumb,overlay);tile.append(replace);
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
    updateSizeMessage();refreshAutoColors();
    currentColors=paletteFromImages(images);syncPaletteInputs();
    scheduleDraw();announce('已移除第 '+(index+1)+' 张图片');
  }

  function updateSizeMessage() {
    const dims=images.map(img=>img ? img.naturalWidth+' × '+img.naturalHeight : '—');
    const same=images.length===3&&images.every(img=>img && img.naturalWidth===942&&img.naturalHeight===2048);
    refs.info.textContent=images.length+' 张图片'+(same?'，均为 942 × 2048 px':'：'+dims.join(' / '))+
      ' · 图片完整保留，可在海报中拖动位置';
    renderTiles();
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
      updateSizeMessage();
      refreshAutoColors();
      currentColors=paletteFromImages(images);
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
      } else images[index]=loaded.image;
      userObjectURLs[index]=loaded.url;
      if (old) URL.revokeObjectURL(old);
      updateSizeMessage();
      refreshAutoColors();
      currentColors=paletteFromImages(images);
      syncPaletteInputs();
      scheduleDraw();
      announce('第 '+(index+1)+' 张图片已更新 · '+loaded.image.naturalWidth+' × '+loaded.image.naturalHeight);
    } catch(error) { announce(error.message || '图片读取失败，请换一张'); }
  }

  async function resetAll() {
    refs.name.value=DEFAULT_TEXT.name;
    refs.author.value=DEFAULT_TEXT.author;
    refs.date.value=DEFAULT_TEXT.date;
    refs.footerText.value='';
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
    try { images=await Promise.all(DEFAULT_IMAGES.map(loadImage)); }
    catch(error) { images=[null,null,null]; }
    gradientCustomized=false;
    updateSizeMessage();refreshAutoColors();setAutoGradient(false);currentColors=paletteFromImages(images);
    syncPaletteInputs();setLayoutDirection('left-high');setLayout('even');
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
    return `${(str || 'Lovia-Reading-Gallery').slice(0, 45)}-${CANVAS_W}x${CANVAS_H}.png`;
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
      announce(`高清 PNG 已开始下载 · ${CANVAS_W} × ${CANVAS_H} px`);
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
    for (const input of [refs.name, refs.author, refs.date, refs.footerText]) input.addEventListener('input', scheduleDraw);
    refs.colors.forEach(input => input.addEventListener('input', () => {
      currentColors[Number(input.dataset.color)] = input.value.toUpperCase();
      syncPaletteInputs();
      scheduleDraw();
    }));
    refs.styles.forEach(button => button.addEventListener('click', () => selectTheme(button.dataset.theme)));
    refs.borderStyles.forEach(button => button.addEventListener('click', () => selectBorder(button.dataset.border)));
    refs.ratioButtons.forEach(button => button.addEventListener('click', () => setCanvasRatio(button.dataset.ratio)));
    refs.layoutButtons.forEach(button=>button.addEventListener('click',()=>setLayout(button.dataset.layout)));
    refs.directionButtons.forEach(button=>button.addEventListener('click',()=>setLayoutDirection(button.dataset.direction)));
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
      if(images.length>=5){announce('已有 5 张图片，点击缩略图可替换');return;}
      activeSlot=images.length;refs.imageInput.click();
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
    document.getElementById('topExport').addEventListener('click', exportPNG);
    document.getElementById('mobileExport').addEventListener('click', exportPNG);
    document.getElementById('largePreview').addEventListener('click', openPreview);
    document.getElementById('closePreview').addEventListener('click', closePreview);
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

  async function initialize() {
    bindControls();
    bindCanvasDrag();
    syncPaletteInputs();
    try {
      images = await Promise.all(DEFAULT_IMAGES.map(loadImage));
      updateSizeMessage();
      refreshAutoColors();
      setAutoGradient(false);
      currentColors = paletteFromImages(images);
      syncPaletteInputs();
      setCanvasRatio('4:3');
      drawPoster();
      // Ensure the actual embedded old-Song font is used in the preview and export.
      document.fonts.load('bold 61px "KingHwaOldSong"').then(scheduleDraw).catch(() => {});
    } catch (error) {
      console.error('Default image loading failed', error);
      renderTiles();
      drawPoster();
      announce('默认图片未能载入，可点击重新选择图片');
    }
  }

  initialize();
})();
