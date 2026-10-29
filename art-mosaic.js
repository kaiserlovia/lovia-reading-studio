/* Original artwork textures. Source images are never modified. Shared by both studios. */
(() => {
  'use strict';
  const STYLES = [
    ['stardust','星砂雾影'], ['flow','流线密纹'], ['engrave','银雕暗纹'], ['glass','琉璃折影'],
    ['weave','织影网格'], ['frost','霜雾玻璃'], ['stars','星屑刻印'], ['halftone','灰阶网印'],
  ];
  const DEFAULTS = {enabled:false,style:'flow',strength:72,visibility:12,density:64,opacity:100,
    colorMode:'auto',colors:['#8795E8','#A1A9DC','#ADB6CB','#D3D8EB','#F4F5FC'],colorIndex:0,seed:1837,
    spacing:50,thickness:45,amplitude:55,frequency:45,direction:'horizontal',luminance:80,
    refraction:65,blur:35,highlights:45,retention:60};
  let settings = new WeakMap(), controller;
  let isArtisticMosaicExpanded = false;
  let isArtisticMosaicEnabled = false;
  let isComparing = false;
  const cache = new Map(); // A bounded LRU: canvases are released on every settings edit.
  const paletteCache = new WeakMap();
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const number = (v,d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const size = im => [im.naturalWidth||im.width,im.naturalHeight||im.height];
  const makeCanvas = (w,h) => {const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
  const rgb = h => h.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16));
  const hex = c => '#'+c.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
  const lum = (d,i) => (d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255;
  function random(seed) {let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function normalize(value={}) {
    const s={...DEFAULTS,...value};
    for(const k of Object.keys(DEFAULTS))if(typeof DEFAULTS[k]==='number')s[k]=clamp(number(s[k],DEFAULTS[k]),0,k==='seed'?2147483647:k==='colorIndex'?4:100);
    s.seed=Math.round(s.seed);s.colorIndex=Math.round(s.colorIndex);
    s.enabled=!!s.enabled;
    if(!STYLES.some(([id])=>id===s.style))s.style=DEFAULTS.style;
    if(!['auto','light','dark','mono','custom'].includes(s.colorMode))s.colorMode='auto';
    s.colors=Array.from({length:5},(_,i)=>/^#[0-9a-f]{6}$/i.test(s.colors?.[i])?s.colors[i]:DEFAULTS.colors[i]);
    s.direction=s.direction==='vertical'?'vertical':'horizontal';
    return s;
  }
  const get = image => settings.get(image)||normalize();
  function set(image,value) {settings.set(image,normalize(value));cache.clear();}
  function extractPalette(image) {
    if(paletteCache.has(image))return paletteCache.get(image);
    const c=makeCanvas(48,48),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,48,48);
    const d=x.getImageData(0,0,48,48).data,pixels=[];
    for(let i=0;i<d.length;i+=16)if(d[i+3]>128)pixels.push([d[i],d[i+1],d[i+2]]);
    pixels.sort((a,b)=>a[0]*.2126+a[1]*.7152+a[2]*.0722-b[0]*.2126-b[1]*.7152-b[2]*.0722);
    const p=pixels.length?[.08,.27,.5,.73,.92].map(t=>hex(pixels[Math.floor(t*(pixels.length-1))])):[...DEFAULTS.colors];
    paletteCache.set(image,p);return p;
  }
  function palette(image,s) {
    if(s.colorMode==='custom')return s.colors;
    if(s.colorMode==='mono')return ['#242630','#585b66','#91949f','#c6c8d2','#f4f5f8'];
    const p=extractPalette(image);
    if(s.colorMode==='auto')return p;
    return p.map(h=>hex(rgb(h).map(v=>s.colorMode==='light'?v*.5+127:v*.55)));
  }
  // Three separable box passes approximate a Gaussian kernel in O(width * height).
  function gaussian(input,w,h,radius) {
    let data=new Uint8ClampedArray(input),tmp=new Uint8ClampedArray(data.length);
    const r=Math.max(1,Math.round(radius)),span=r*2+1;
    for(let pass=0;pass<3;pass++){
      for(let y=0;y<h;y++)for(let ch=0;ch<4;ch++){
        let sum=0;for(let k=-r;k<=r;k++)sum+=data[(y*w+clamp(k,0,w-1))*4+ch];
        for(let x=0;x<w;x++){tmp[(y*w+x)*4+ch]=sum/span;sum+=data[(y*w+clamp(x+r+1,0,w-1))*4+ch]-data[(y*w+clamp(x-r,0,w-1))*4+ch];}
      }
      for(let x=0;x<w;x++)for(let ch=0;ch<4;ch++){
        let sum=0;for(let k=-r;k<=r;k++)sum+=tmp[(clamp(k,0,h-1)*w+x)*4+ch];
        for(let y=0;y<h;y++){data[(y*w+x)*4+ch]=sum/span;sum+=tmp[(clamp(y+r+1,0,h-1)*w+x)*4+ch]-tmp[(clamp(y-r,0,h-1)*w+x)*4+ch];}
      }
    }
    return data;
  }
  // Bilinear displacement sampling, clamped at the source image's edges.
  function sample(data,w,h,x,y,out,i) {
    x=clamp(x,0,w-1);y=clamp(y,0,h-1);
    const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
    const a=(y0*w+x0)*4,b=(y0*w+Math.min(w-1,x0+1))*4,c=(Math.min(h-1,y0+1)*w+x0)*4,e=(Math.min(h-1,y0+1)*w+Math.min(w-1,x0+1))*4;
    for(let ch=0;ch<4;ch++)out[i+ch]=(data[a+ch]*(1-fx)+data[b+ch]*fx)*(1-fy)+(data[c+ch]*(1-fx)+data[e+ch]*fx)*fy;
  }
  function renderEffect(image,value,width,height) {
    const s=normalize(value),c=makeCanvas(width,height),x=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height;
    x.drawImage(image,0,0,w,h);
    const original=x.getImageData(0,0,w,h),d=original.data,output=x.createImageData(w,h),o=output.data;
    const colors=palette(image,s),cs=colors.map(rgb),rnd=random(s.seed),mn=Math.min(w,h),power=s.strength/100;
    const at=(px,py)=>lum(d,(clamp(Math.round(py),0,h-1)*w+clamp(Math.round(px),0,w-1))*4);
    const tint=(v,ch)=>{const t=clamp(v,0,1)*4,j=Math.min(3,Math.floor(t));return cs[j][ch]*(1-(t-j))+cs[j+1][ch]*(t-j);};
    const cell=Math.max(1.3,mn*(.009+(100-s.density)*.00042));
    const phase=(s.seed%997)/997*Math.PI*2;
    if(['glass','frost','stardust'].includes(s.style)){
      const radius=mn*(s.style==='stardust'?.004+power*.018:.0003+s.blur/100*.008);
      const blurred=gaussian(d,w,h,Math.max(1,radius));
      for(let py=0;py<h;py++)for(let px=0;px<w;px++){
        const i=(py*w+px)*4,nx=px/mn,ny=py/mn;
        if(s.style==='stardust'){
          const v=clamp((lum(blurred,i)-.5)*(1.05+power)+.5,0,1),grain=(rnd()-.5)*9;
          for(let ch=0;ch<3;ch++)o[i+ch]=tint(v,ch)*.72+v*255*.28+grain;
          o[i+3]=d[i+3];
        }else{
          const freq=14+s.density*.72,amp=mn*(.001+s.refraction*.00021)*power;
          let dx,dy;
          if(s.style==='glass'){
            dx=(Math.sin(ny*freq+phase+Math.sin(nx*9)*1.7)+.4*Math.sin(nx*freq*1.7))*amp;
            dy=(Math.cos(nx*freq*.83+phase)+.3*Math.sin(ny*freq*1.3))*amp;
          }else{dx=(rnd()-.5)*amp*.7;dy=(rnd()-.5)*amp*.7;}
          sample(blurred,w,h,px+dx,py+dy,o,i);
          const v=lum(o,i),light=s.style==='glass'?Math.pow(Math.max(0,Math.cos(ny*freq+phase+Math.sin(nx*9)*1.7)),14)*s.highlights*.45:(rnd()-.5)*7+s.highlights*.025;
          for(let ch=0;ch<3;ch++)o[i+ch]=o[i+ch]*(s.retention/100)+tint(v,ch)*(1-s.retention/100)+light;
        }
      }
      x.putImageData(output,0,0);
      if(s.style==='stardust'){
        const count=Math.round(w*h/(cell*cell)*.48);
        for(let i=0;i<count;i++){const px=rnd()*w,py=rnd()*h,v=at(px,py);x.fillStyle=colors[v>.5?4:2];x.globalAlpha=.2+rnd()*.6;x.beginPath();x.arc(px,py,mn*(.0006+rnd()*.0015),0,Math.PI*2);x.fill();}
        x.globalAlpha=1;
      }
    }else if(s.style==='engrave'){
      const step=Math.max(1,Math.round(mn*(.0008+power*.0025))),smooth=gaussian(d,w,h,Math.max(1,step));
      for(let py=0;py<h;py++)for(let px=0;px<w;px++){
        const i=(py*w+px)*4,a=(clamp(py-step,0,h-1)*w+clamp(px-step,0,w-1))*4,b=(clamp(py+step,0,h-1)*w+clamp(px+step,0,w-1))*4;
        const gradient=lum(smooth,a)-lum(smooth,b),v=clamp(.35+gradient*(2+power*7)*(s.luminance/100)+Math.sin((px+py)/cell*9+phase)*.025,0,1);
        for(let ch=0;ch<3;ch++)o[i+ch]=tint(v,ch)*.5+v*255*.5;o[i+3]=d[i+3];
      }
      x.putImageData(output,0,0);
    }else{
      x.fillStyle=colors[4];x.fillRect(0,0,w,h);x.lineCap='round';x.lineJoin='round';
      if(s.style==='flow'){
        const vertical=s.direction==='vertical',across=vertical?h:w,along=vertical?w:h;
        const gap=Math.max(1.6,cell*(.35+s.spacing/100)),stride=Math.max(1,mn*.0015);
        for(let row=-gap;row<along+gap;row+=gap){
          let previous=null;
          for(let pos=0;pos<=across;pos+=stride){
            const v=vertical?at(row,pos):at(pos,row),influence=s.luminance/100;
            const wave=Math.sin(pos/mn*(6+s.frequency*.5)+row/mn*5+phase);
            const displacement=wave*gap*(.08+s.amplitude*.021)*power+(v-.5)*gap*influence*2.8*power;
            const point=vertical?[row+displacement,pos]:[pos,row+displacement];
            if(previous){x.strokeStyle=colors[Math.min(3,Math.floor(v*4))];x.lineWidth=Math.max(.4,gap*(.07+s.thickness*.006)*(1+(1-v)*influence));x.beginPath();x.moveTo(...previous);x.lineTo(...point);x.stroke();}
            previous=point;
          }
        }
      }else if(s.style==='weave'){
        for(let py=-cell+rnd()*cell;py<h;py+=cell)for(let px=-cell+((s.seed%97)/97)*cell;px<w;px+=cell){
          const v=at(px+cell/2,py+cell/2),odd=(Math.round(px/cell)+Math.round(py/cell))%2;
          x.strokeStyle=colors[Math.min(3,Math.floor(v*4))];x.lineWidth=cell*(.1+(1-v)*.55*power);
          x.beginPath();x.moveTo(px,py+cell*.5);x.lineTo(px+cell,py+cell*.5);x.stroke();
          x.strokeStyle=colors[odd?1:2];x.lineWidth=cell*(.12+(1-v)*.2);x.beginPath();x.moveTo(px+cell*.5,py+cell*(odd?.22:0));x.lineTo(px+cell*.5,py+cell*(odd?.78:1));x.stroke();
        }
      }else if(s.style==='stars'){
        for(let py=cell*.5;py<h;py+=cell)for(let px=cell*.5;px<w;px+=cell){
          const xx=px+(rnd()-.5)*cell*.4,yy=py+(rnd()-.5)*cell*.4,v=at(xx,yy),r=cell*(.06+(1-v)*.39)*(.5+power*.5);
          x.strokeStyle=colors[Math.min(3,Math.floor(v*4))];x.lineWidth=Math.max(.45,mn*.0007);x.beginPath();
          x.moveTo(xx-r,yy);x.lineTo(xx+r,yy);x.moveTo(xx,yy-r);x.lineTo(xx,yy+r);x.moveTo(xx-r*.5,yy-r*.5);x.lineTo(xx+r*.5,yy+r*.5);x.stroke();
          x.fillStyle=x.strokeStyle;x.fillRect(xx-r*.2,yy-r*.2,r*.4,r*.4);
        }
      }else if(s.style==='halftone'){
        x.fillStyle='#f5f5f3';x.fillRect(0,0,w,h);x.fillStyle='#27282d';
        for(let py=rnd()*cell;py<h;py+=cell)for(let px=((s.seed%97)/97)*cell;px<w;px+=cell){const v=at(px,py),r=cell*.49*Math.sqrt(1-v)*(.35+power*.65);x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();}
      }
    }
    // Blend once from the untouched original. The two controls have independent meanings.
    const effect=x.getImageData(0,0,w,h),e=effect.data,mix=(s.opacity/100)*(1-s.visibility/100)*power;
    for(let i=0;i<e.length;i+=4){for(let ch=0;ch<3;ch++)e[i+ch]=d[i+ch]*(1-mix)+e[i+ch]*mix;e[i+3]=d[i+3];}
    x.putImageData(effect,0,0);return c;
  }
  function source(image,ctx,rect,fallback=image) {
    const s=get(image);
    const live=ctx&&['posterCanvas','cv'].includes(ctx.canvas.id);
    if(!isArtisticMosaicEnabled||!s.enabled||(isComparing&&live)||s.strength===0||s.opacity===0||s.visibility===100)return fallback;
    const [iw,ih]=size(image),t=ctx?.getTransform(),scale=t?Math.max(Math.hypot(t.a,t.b),Math.hypot(t.c,t.d)):1;
    const desired=rect?Math.max(rect.w*scale/iw,rect.h*scale/ih):Math.min(1,1000/Math.max(iw,ih));
    // Resolution buckets reduce slider/drag churn; exports always calculate from the original.
    const maxSide=live?1400:4096,k=Math.min(1,maxSide/Math.max(iw,ih),Math.sqrt(8000000/(iw*ih)),Math.ceil(Math.max(.01,desired)*16)/16);
    const w=Math.max(1,Math.round(iw*k)),h=Math.max(1,Math.round(ih*k));
    const key=JSON.stringify([s,w,h]);
    const hit=cache.get(image);
    if(hit?.key===key){cache.delete(image);cache.set(image,hit);return hit.canvas;}
    const out=renderEffect(image,s,w,h);cache.set(image,{key,canvas:out});
    while(cache.size>10)cache.delete(cache.keys().next().value);
    return out;
  }
  function draw(ctx,image,rect,fallback=image){ctx.drawImage(source(image,ctx,rect,fallback),rect.x,rect.y,rect.w,rect.h);}
  function serialize(slots=controller?.slots()||[]) {
    return {enabled:isArtisticMosaicEnabled,images:slots.map(it=>({group:it.group,index:it.index,settings:get(it.image)}))};
  }
  function restore(data,slots=controller?.slots()||[]) {
    isArtisticMosaicEnabled=!!data?.enabled;settings=new WeakMap();cache.clear();
    const savedImages=Array.isArray(data?.images)?data.images:[];
    for(const it of slots){const saved=savedImages.find(s=>s&&s.group===it.group&&s.index===it.index);if(saved)set(it.image,saved.settings);}
    isComparing=false;controller?.refresh();controller?.change();
  }
  function mount(options) {
    const root=document.createElement('section');root.className='art-mosaic';root.setAttribute('aria-label','原创艺术打码');
    root.innerHTML=`<button class="am-heading" type="button" aria-expanded="false" aria-controls="am-body">
      <span class="am-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3 7c5-8 13 8 18 0M3 12c5-8 13 8 18 0M3 17c5-8 13 8 18 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
      <span class="am-heading-copy"><span class="am-title">原创艺术打码 <small>NEW</small></span><span class="am-subtitle">让图片藏进独特的纹理里 · 点击展开</span></span>
      <span class="am-status">未启用</span><span class="am-chevron" aria-hidden="true">⌄</span>
      <span class="am-ribbon" aria-hidden="true">${DEFAULTS.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</span></button>
      <div id="am-body" class="am-collapse" inert><div class="am-collapse-inner"><div class="am-body">
        <label class="am-enable"><strong>启用原创打码</strong><input id="am-enabled" type="checkbox" role="switch"></label>
        <div class="am-section"><h3>应用范围</h3><div class="am-scope" role="group" aria-label="应用范围"><button type="button" data-scope="current" aria-pressed="true">当前图片</button><button type="button" data-scope="all" aria-pressed="false">全部图片</button><button type="button" data-scope="custom" aria-pressed="false">自定义选择</button></div><div class="am-images" aria-label="选择独立设置的图片"></div><p class="am-empty">请先在原有上传区添加图片。</p><label class="am-per-image"><input id="am-image-enabled" type="checkbox"> 对当前图片启用效果</label></div>
        <div class="am-section"><h3>选择打码风格</h3><div class="am-styles">${STYLES.map(([id,name])=>`<button type="button" data-art-style="${id}" aria-pressed="false"><canvas width="200" height="112" aria-hidden="true"></canvas><span>${name}</span></button>`).join('')}</div></div>
        <div class="am-section"><h3>细节调整</h3><div class="am-sliders">${[['strength','打码强度',72],['visibility','原图可见度',12],['density','图案密度',64],['opacity','纹理透明度',100]].map(([id,name,v])=>`<label>${name}<output for="am-${id}">${v}</output><input id="am-${id}" data-param="${id}" type="range" min="0" max="100" value="${v}"></label>`).join('')}</div></div>
        <div class="am-section"><h3>纹理配色</h3><div class="am-color-modes" role="group" aria-label="纹理配色">${[['auto','自动取色'],['light','浅色取色'],['dark','深色取色'],['mono','黑白灰'],['custom','自定义颜色']].map(([id,name])=>`<button type="button" data-color-mode="${id}">${name}</button>`).join('')}</div><div class="am-colors"></div><label class="am-custom-color">编辑所选颜色 <input id="am-color" type="color" value="#8795e8"></label></div>
        <details class="am-advanced"><summary>高级设置</summary><div class="am-advanced-controls am-sliders"></div></details>
        <div class="am-actions"><button type="button" data-action="compare" aria-pressed="false">原图对比</button><button type="button" data-action="random">随机纹理</button><button type="button" data-action="reset">恢复默认</button><button type="button" data-action="save">保存为预设</button><button type="button" data-action="all">应用到全部图片</button></div>
        <label class="am-preset-label">已保存预设 <select id="am-presets"><option value="">选择预设…</option></select></label><p class="am-feedback" role="status" aria-live="polite"></p>
      </div></div></div>`;
    options.before.before(root);
    const q=s=>root.querySelector(s),qa=s=>[...root.querySelectorAll(s)];
    let selected=null,scope='current',targets=new Set(),thumbnailImage=null,uiFrame=0,presets=[];
    try{const stored=JSON.parse(localStorage.getItem('lovia.art-mosaic.presets')||'[]');if(Array.isArray(stored))presets=stored.slice(0,20);}catch(e){}
    const slots=()=>options.images().filter(it=>it.image);
    const current=()=>slots().find(it=>it.image===selected)||slots()[0];
    const tell=text=>q('.am-feedback').textContent=text;
    function chosen(){const list=slots();return scope==='all'?list:scope==='custom'?list.filter(it=>targets.has(it.image)):list.filter(it=>it.image===current()?.image);}
    function update(patch){const it=current();if(!it)return tell('请先添加图片');const next=normalize({...get(it.image),...patch});for(const target of chosen())set(target.image,next);refreshControls();options.change();}
    function showPresets(){const select=q('#am-presets');select.replaceChildren(new Option('选择预设…',''));presets.forEach((p,i)=>select.add(new Option(p.name,String(i))));}
    function refreshImages(){
      const list=slots(),it=current();selected=it?.image||null;
      const live=new Set(list.map(it=>it.image));for(const image of targets)if(!live.has(image))targets.delete(image);
      for(const image of cache.keys())if(!live.has(image))cache.delete(image);
      if(!it)thumbnailImage=null;
      const box=q('.am-images');box.replaceChildren();
      for(const item of list){const wrap=document.createElement('div');wrap.className='am-image-item';
        const b=document.createElement('button');b.type='button';b.textContent=item.label;b.setAttribute('aria-pressed',String(item.image===selected));b.addEventListener('click',()=>{selected=item.image;refreshImages();refreshControls();});
        if(scope==='custom'){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=targets.has(item.image);check.setAttribute('aria-label','应用到'+item.label);check.addEventListener('change',()=>{if(check.checked)targets.add(item.image);else targets.delete(item.image);});label.append(check);wrap.append(label);}
        wrap.append(b);box.append(wrap);
      }
      q('.am-empty').hidden=!!list.length;q('.am-per-image').hidden=!list.length;
    }
    function advanced(s){
      const defs=s.style==='flow'?[['spacing','线条间距'],['thickness','线条粗细'],['amplitude','波纹幅度'],['frequency','波纹频率'],['luminance','原图明暗影响强度']]
        :['glass','frost'].includes(s.style)?[['refraction','折射幅度'],['blur','模糊半径'],['highlights','高光强度'],['retention','颜色保留程度']]
        :s.style==='engrave'?[['luminance','浮雕明暗影响']]:[];
      const box=q('.am-advanced-controls'),signature=s.style;
      if(box.dataset.style!==signature){box.dataset.style=signature;box.replaceChildren();
        for(const[k,name]of defs){const label=document.createElement('label'),output=document.createElement('output'),input=document.createElement('input');label.append(name,output,input);input.id='am-adv-'+k;input.type='range';input.min=0;input.max=100;input.dataset.param=k;output.htmlFor=input.id;box.append(label);}
        if(s.style==='flow'){const label=document.createElement('label');label.textContent='纹理方向';const select=document.createElement('select');select.dataset.direction='true';select.add(new Option('横向','horizontal'));select.add(new Option('纵向','vertical'));label.append(select);box.append(label);}
        if(!defs.length){const p=document.createElement('p');p.textContent='使用图案密度、强度与随机纹理调整此风格。';box.append(p);}
      }
    }
    function refreshControls(){
      const it=current(),s=it?get(it.image):normalize();
      q('#am-enabled').checked=isArtisticMosaicEnabled;q('#am-image-enabled').checked=s.enabled;
      const on=isArtisticMosaicEnabled&&slots().some(it=>get(it.image).enabled);
      q('.am-status').textContent=on?'已启用':'未启用';q('.am-status').classList.toggle('is-on',on);
      q('.am-subtitle').textContent=on?'当前：'+STYLES.find(([id])=>id===s.style)[1]:'让图片藏进独特的纹理里 · 点击展开';
      qa('[data-art-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.artStyle===s.style)));
      advanced(s);
      qa('[data-param]').forEach(input=>{input.value=s[input.dataset.param];input.previousElementSibling.value=input.value;});
      if(q('[data-direction]'))q('[data-direction]').value=s.direction;
      qa('[data-color-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.colorMode===s.colorMode)));
      const colors=it?palette(it.image,s):DEFAULTS.colors,box=q('.am-colors');box.replaceChildren();
      colors.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.style.setProperty('--am-swatch',c);b.setAttribute('aria-label','选择纹理颜色 '+(i+1)+' '+c);b.setAttribute('aria-pressed',String(i===s.colorIndex));b.addEventListener('click',()=>update({colorIndex:i}));box.append(b);});
      q('#am-color').value=colors[s.colorIndex];q('.am-custom-color').hidden=s.colorMode!=='custom';
      qa('[data-action]').forEach(b=>b.disabled=!it);q('#am-image-enabled').disabled=!it;
      q('[data-action="compare"]').setAttribute('aria-pressed',String(isComparing));q('[data-action="compare"]').textContent=isComparing?'返回效果':'原图对比';
      if(isArtisticMosaicExpanded&&it&&thumbnailImage!==it.image){thumbnailImage=it.image;
        requestAnimationFrame(()=>{if(thumbnailImage!==it.image)return;qa('[data-art-style]').forEach(b=>{const preview=renderEffect(it.image,{...DEFAULTS,enabled:true,strength:100,visibility:0,style:b.dataset.artStyle},200,112);b.querySelector('canvas').getContext('2d').drawImage(preview,0,0);});});
      }
    }
    function refresh(){if(uiFrame)return;uiFrame=requestAnimationFrame(()=>{uiFrame=0;refreshImages();refreshControls();});}
    q('.am-heading').addEventListener('click',()=>{
      isArtisticMosaicExpanded=!isArtisticMosaicExpanded;root.classList.toggle('is-expanded',isArtisticMosaicExpanded);
      q('.am-heading').setAttribute('aria-expanded',String(isArtisticMosaicExpanded));q('#am-body').inert=!isArtisticMosaicExpanded;refreshControls();
    });
    q('#am-enabled').addEventListener('change',e=>{isArtisticMosaicEnabled=e.target.checked;isComparing=false;
      if(isArtisticMosaicEnabled&&current()&&!slots().some(it=>get(it.image).enabled))set(current().image,{...get(current().image),enabled:true});refreshControls();options.change();});
    q('#am-image-enabled').addEventListener('change',e=>update({enabled:e.target.checked}));
    qa('[data-scope]').forEach(b=>b.addEventListener('click',()=>{scope=b.dataset.scope;if(current())targets.add(current().image);qa('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scope===scope)));if(scope==='all')update({});refreshImages();}));
    qa('[data-art-style]').forEach(b=>b.addEventListener('click',()=>{isComparing=false;update({style:b.dataset.artStyle,enabled:true});}));
    root.addEventListener('input',e=>{if(e.target.dataset.param)update({[e.target.dataset.param]:Number(e.target.value)});});
    root.addEventListener('change',e=>{if(e.target.dataset.direction)update({direction:e.target.value});});
    qa('[data-color-mode]').forEach(b=>b.addEventListener('click',()=>{const it=current();update({colorMode:b.dataset.colorMode,...(it&&b.dataset.colorMode==='custom'?{colors:palette(it.image,get(it.image))}:{})});}));
    q('#am-color').addEventListener('input',e=>{if(!current())return;const s=get(current().image),colors=[...s.colors];colors[s.colorIndex]=e.target.value;update({colors});});
    qa('[data-action]').forEach(b=>b.addEventListener('click',()=>{
      const it=current();if(!it)return;
      if(b.dataset.action==='compare'){isComparing=!isComparing;refreshControls();options.change();}
      if(b.dataset.action==='random')update({seed:Math.floor(Math.random()*2147483647)});
      if(b.dataset.action==='reset'){isComparing=false;update({...DEFAULTS,enabled:get(it.image).enabled});}
      if(b.dataset.action==='all'){const s=get(it.image);for(const item of slots())set(item.image,s);refreshControls();options.change();tell('已按每张原图应用当前设置');}
      if(b.dataset.action==='save'){const name=STYLES.find(([id])=>id===get(it.image).style)[1]+' · '+(presets.length+1);presets.unshift({name,settings:get(it.image)});presets=presets.slice(0,20);
        try{localStorage.setItem('lovia.art-mosaic.presets',JSON.stringify(presets));showPresets();tell('已保存预设：'+name);}catch(e){tell('浏览器未允许保存预设');}}
    }));
    q('#am-presets').addEventListener('change',e=>{if(e.target.value!==''&&presets[Number(e.target.value)])update(presets[Number(e.target.value)].settings);});
    controller={slots,refresh,change:options.change,root};showPresets();refresh();return controller;
  }
  window.LoviaArtMosaic={mount,draw,source,get,set,palette,serialize,restore,renderEffect,styles:STYLES,
    refresh:()=>controller?.refresh(),reset:()=>restore(null),
    enabled:()=>isArtisticMosaicEnabled};
})();
