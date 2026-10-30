/* Lovia & Chi: one editor for both the Lovia classic look and Day Night.
   One drawing engine (from Day Night); the classic one-line masthead, card frame with crosses and five colour dots are options of it.
   Settings saved by the old classic page (lovia) and the old Day Night page are converted when they are opened. */
(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const T=s=>window.LoviaStudio?window.LoviaStudio.t(s):s;

/* ---------------- constants ---------------- */
const RATIOS={'4:3':[3600,2700],'1:1':[3000,3000],'3:4':[2700,3600],'9:16':[2160,3840]};
// 網路字型（Google 的繁體字型）沒有部分簡體字，後面都接同風格的簡體字型補字
const FONTS={
  wenkai:{name:'霞鶩文楷',stack:'"LXGW WenKai TC","LXGW WenKai","Noto Serif TC","Noto Serif SC",serif',fam:'LXGW WenKai TC',tw:700,bw:400},
  serif:{name:'思源宋體',stack:'"Noto Serif TC","Noto Serif SC","Songti TC","Songti SC",serif',fam:'Noto Serif TC',tw:700,bw:500},
  sans:{name:'思源黑體',stack:'"Noto Sans TC","Noto Sans SC","PingFang TC","PingFang SC",sans-serif',fam:'Noto Sans TC',tw:700,bw:400},
  iansui:{name:'芫荽',stack:'Iansui,"LXGW WenKai TC","LXGW WenKai",serif',fam:'Iansui',tw:400,bw:400},
  huninn:{name:'粉圓',stack:'Huninn,"Noto Sans TC","Noto Sans SC",sans-serif',fam:'Huninn',tw:400,bw:400},
  garamond:{name:'英文襯線',stack:'"Cormorant Garamond","Noto Serif TC","Noto Serif SC",serif',fam:'Cormorant Garamond',tw:600,bw:500},
  /* Lovia presets (native stacks, same as the Lovia page) */
  kinghwa:{name:'京華老宋',stack:'"KingHwaOldSong","KingHwa_OldSong","京華老宋体","京华老宋体","Songti SC",serif',fam:'KingHwaOldSong',tw:400,bw:400},
  song:{name:'典雅宋體',stack:'"Songti SC","STSong","Noto Serif CJK SC","SimSun",serif',fam:'Songti SC',tw:400,bw:400},
  lsans:{name:'現代黑體',stack:'"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif',fam:'PingFang SC',tw:600,bw:400},
  light:{name:'輕盈無襯線',stack:'"Helvetica Neue","Avenir Next","PingFang SC","Microsoft YaHei",sans-serif',fam:'Helvetica Neue',tw:300,bw:300},
  editorial:{name:'雜誌襯線',stack:'"Didot","Bodoni MT","Times New Roman","Songti SC",serif',fam:'Didot',tw:400,bw:400},
  kai:{name:'書卷楷體',stack:'"Kaiti SC","STKaiti","KaiTi","Noto Serif CJK SC",serif',fam:'Kaiti SC',tw:400,bw:400},
  mono:{name:'復古打字機',stack:'"Courier New","SFMono-Regular","Menlo","Noto Serif CJK SC",monospace',fam:'Courier New',tw:400,bw:400},
  round:{name:'溫柔圓體',stack:'"Hiragino Maru Gothic ProN","Arial Rounded MT Bold","PingFang SC","Microsoft YaHei",sans-serif',fam:'Hiragino Maru Gothic ProN',tw:400,bw:400},
};
const SAMPLE_IMGS={day:[['首頁','assets/weather/day-home.jpg'],['書架','assets/weather/day-shelf.jpg'],['閱讀頁','assets/weather/day-read.jpg']],night:[['首頁','assets/weather/night-home.jpg'],['書架','assets/weather/night-shelf.jpg'],['閱讀頁','assets/weather/night-read.jpg']]};
const MAX_PER_SIDE=5;
const DEFAULT_LABELS=['首頁','書架','閱讀頁','目錄','筆記'];
const BG_DESC={
  solid:'用日間、夜間各自的底色。',
  light:'自動提取截圖中的柔和淺色作為底圖。',
  dark:'從截圖提取深色，形成鮮明的畫廊對比。',
  custom:'自選一個純色背景，不加漸層或紋理。',
  gradient:'用各自的底色做出柔和的斜向漸層。',
  tb:'從上到下的柔和漸層，預設從截圖取色，也可以自選。',
  blur:'把第一張截圖模糊後當底圖，再蓋上一層底色。',
  image:'上傳自己的底圖，可以調整模糊程度和透明度。',
  glass:'取封面顏色，形成柔和的液態玻璃朦朧背景。',
};

/* ---------------- state ---------------- */
const fmtToday=()=>{const d=new Date();return`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;};
// the classic page's date: OCT. 2026
const fmtMonth=()=>{const d=new Date();return new Intl.DateTimeFormat('en-US',{month:'short'}).format(d).toUpperCase()+'. '+d.getFullYear();};
const S={
  headline:'bar', cardFrame:true, span:'both', authorPrefix:true,
  ratio:'4:3', layout:'single-even', single:'day', splitDir:'auto', tilt:'alt', order:'dn', compareAt:.5, comparePair:0, compareHandle:false, heroIndex:-1, newsHero:-1,
  size:1, gap:1, radius:0, frame:'line',
  rules:true, ruleColor:'#000000', ruleOpacity:1,
  bg:'solid', tint:.7, grain:0, customBg:'#E9E6DB', tbTop:'#EDE9DE', tbBottom:'#A5B09E', tbCustom:false,
  bgImage:null, bgBlur:40, bgOpacity:1, cover:null, glass:.7,
  palette:'five', five:['#F1EEE3','#A5B09E','#CA9194','#667966','#283029'], fiveCustom:false,
  swatches:true, hexes:false,
  title:'Weather', tagline:'一套日間與夜間的閱讀主題', author:'Lovia&Chi', message:'',
  showDate:true, date:fmtMonth(),
  sideLabels:false, labelDay:'日間', labelNight:'夜間', captions:false,
  textMode:'auto', textDay:'#342E2A', textNight:'#E7E7EB',
  font:'kinghwa', textStyle:{}, taglineSize:1, labelSize:1, titleSize:1, authorSize:1, dateSize:1, messageSize:1, align:'left', quality:'高清',
  colors:{day:{bg:'#F4EDE5',ink:'#342E2A',accent:'#ECAC81'},night:{bg:'#3A3D45',ink:'#E7E7EB',accent:'#A5A6AC'}},
  autoColor:{day:true,night:true},
  shots:{day:[],night:[]},
  sel:null, scaleMode:'single'
};
let uid=0;const localFonts={}; // imported fonts by key: local, local2, local3…
try{
  const a=localStorage.getItem('lc.author'); if(a!==null&&a!=='') S.author=a;
  const f=localStorage.getItem('lc.font'); if(f&&FONTS[f]) S.font=f;
}catch(e){}

/* ---------------- colour utils ---------------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hexToRgb(h){h=h.replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('').toUpperCase();}
function mix(a,b,t){const A=hexToRgb(a),B=hexToRgb(b);return rgbToHex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t);}
function relLum(c){const [r,g,b]=(Array.isArray(c)?c:hexToRgb(c)).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;}
function contrast(a,b){const x=relLum(a),y=relLum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function rgba(hex,a){const[r,g,b]=hexToRgb(hex);return`rgba(${r},${g},${b},${a})`;}
const isHex=v=>/^#?[0-9a-fA-F]{6}$/.test(v);
const normHex=v=>('#'+v.replace('#','')).toUpperCase();

/* ---------------- drawing helpers ---------------- */
function rr(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function polyPath(ctx,pts){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function panelPath(ctx,p){if(p.poly)polyPath(ctx,p.poly);else{ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);}}
let MARKS=null; // filled only while drawing the preview
function fontByKey(k){return /^local\d*$/.test(k||'')?localFonts[k]:FONTS[k];}
function curFont(){return fontByKey(S.font)||FONTS.wenkai;}
// a text field's own font, or the overall one
function fieldFont(key){const k=S.textStyle[key]&&S.textStyle[key].font;return(k&&fontByKey(k))||curFont();}
function fieldInk(key,side){const t=S.textStyle[key];return t&&t[side]||null;}
function font(size,weight,f=curFont()){return`${weight} ${size}px ${f.stack}`;}
const iw=im=>im.naturalWidth||im.width, ih=im=>im.naturalHeight||im.height;
function drawCover(ctx,img,p,scale=1){const k=Math.max(p.w/iw(img),p.h/ih(img))*scale;ctx.imageSmoothingQuality='high';ctx.drawImage(img,p.x+(p.w-iw(img)*k)/2,p.y+(p.h-ih(img)*k)/2,iw(img)*k,ih(img)*k);}

let noiseCanvas=null;
function noise(){
  if(noiseCanvas)return noiseCanvas;
  const c=document.createElement('canvas');c.width=c.height=220;const x=c.getContext('2d');const d=x.createImageData(220,220);
  for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}
  x.putImageData(d,0,0);return noiseCanvas=c;
}
const blurCache=new Map();
function blurredImage(img,amount){ // amount in px on a 3600-wide poster; 0 = sharp
  if(!img)return null; if(amount<=0)return img;
  const key=(img.__id||(img.__id=++uid))+':'+amount;
  if(blurCache.has(key))return blurCache.get(key);
  const w=Math.max(6,Math.round(1600/(1+amount/3))),h=Math.max(6,Math.round(w*ih(img)/iw(img)));
  const a=document.createElement('canvas');a.width=w;a.height=h;const ax=a.getContext('2d');ax.imageSmoothingQuality='high';ax.drawImage(img,0,0,w,h);
  const b=document.createElement('canvas');b.width=Math.min(1600,w*4);b.height=Math.round(b.width*h/w);const bx=b.getContext('2d');bx.imageSmoothingQuality='high';bx.drawImage(a,0,0,b.width,b.height);
  if(blurCache.size>24)blurCache.clear();blurCache.set(key,b);return b;
}

/* ---------------- shots ---------------- */
function downscale(src,maxH){
  const w=iw(src),h=ih(src);
  if(h<=maxH)return src;
  const k=maxH/h,c=document.createElement('canvas');c.width=Math.round(w*k);c.height=maxH;
  const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);return c;
}
function makeShot(src,label,sample=false){
  const w=iw(src),h=ih(src),shown=T(label||'');
  return{id:++uid,src,prev:downscale(src,1000),w,h,a:w/h,label:shown,labelSrc:label||'',labelOut:shown,sample,dx:0,dy:0,scale:1,blur:null};
}
function blurredShot(shot){
  if(shot.blur)return shot.blur;
  const a=document.createElement('canvas');a.width=16;a.height=Math.max(8,Math.round(16/shot.a));
  a.getContext('2d').drawImage(shot.prev,0,0,a.width,a.height);
  const b=document.createElement('canvas');b.width=64;b.height=Math.round(64/shot.a);
  const bx=b.getContext('2d');bx.imageSmoothingQuality='high';bx.drawImage(a,0,0,b.width,b.height);
  return shot.blur=b;
}
function fileToImage(file){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.decoding='async';
    im.onload=()=>res(im);im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error(`無法讀取「${file.name||'圖片'}」，請改用 PNG 或 JPG`));};im.src=url;});
}
// a picture that is no longer used lets go of its uploaded file
function freeImg(im){const u=im&&im.src;if(u&&u.startsWith('blob:'))URL.revokeObjectURL(u);}
function imgFrom(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}

/* ---------------- colour extraction ---------------- */
function samplePixels(shots){
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d',{willReadFrequently:true});
  const px=[];
  for(const s of shots){x.clearRect(0,0,96,96);const sw=iw(s.prev),sh=ih(s.prev),top=sh*.065;x.drawImage(s.prev,0,top,sw,sh-top,0,0,96,96);
    const d=x.getImageData(0,0,96,96).data;
    for(let i=0;i<d.length;i+=4){if(d[i+3]<200)continue;px.push([d[i],d[i+1],d[i+2]]);}}
  return px;
}
const qkey=p=>((p[0]>>4)<<8)|((p[1]>>4)<<4)|(p[2]>>4);
function binsOf(list){const m=new Map();for(const p of list){const k=qkey(p);let e=m.get(k);if(!e)m.set(k,e={n:0,r:0,g:0,b:0});e.n++;e.r+=p[0];e.g+=p[1];e.b+=p[2];}return[...m.values()].map(e=>({n:e.n,c:[e.r/e.n,e.g/e.n,e.b/e.n]}));}
function mode(list){let t=null;for(const e of binsOf(list))if(!t||e.n>t.n)t=e;return t?t.c:null;}
function extract(shots){
  const px=samplePixels(shots);
  if(!px.length)return null;
  const bg=mode(px),Lb=relLum(bg);
  const inkPx=px.filter(p=>{const L=relLum(p);return(Math.max(L,Lb)+.05)/(Math.min(L,Lb)+.05)>4;});
  let ink=inkPx.length>px.length*.004?mode(inkPx):null;
  if(!ink)ink=Lb>.4?[40,46,56]:[226,229,234];
  const bins=Array.from({length:24},()=>({w:0,r:0,g:0,b:0}));
  for(const p of px){
    const [r,g,b]=p.map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,l=(mx+mn)/2;
    if(d<.12||l<.12||l>.82)continue;
    const s=d/(1-Math.abs(2*l-1)+1e-4);if(s<.25)continue;
    const h=hueOf(r,g,b,mx,d);
    const bi=Math.floor(h/15)%24,wt=Math.pow(s,2.4)*(1-Math.abs(l-.55));bins[bi].w+=wt;bins[bi].r+=p[0]*wt;bins[bi].g+=p[1]*wt;bins[bi].b+=p[2]*wt;
  }
  const best=bins.reduce((a,b)=>b.w>a.w?b:a,bins[0]);
  const bgHex=rgbToHex(...bg),inkHex=rgbToHex(...ink);
  const accent=best.w>2?rgbToHex(best.r/best.w,best.g/best.w,best.b/best.w):mix(inkHex,bgHex,.38);
  return{bg:bgHex,ink:inkHex,accent};
}
// hue in degrees from 0–1 RGB, its max channel and its spread (max − min, not 0)
function hueOf(r,g,b,mx,d){const h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return(h*60+360)%360;}
// average colour of a list of [r,g,b] pixels
const avg=a=>rgbToHex(...[0,1,2].map(k=>a.reduce((s,p)=>s+p[k],0)/a.length));
function autoColors(side){
  toneCache.clear();
  if(!S.autoColor[side])return;
  const shots=S.shots[side];
  if(!shots.length)return;
  const own=shots.filter(s=>!s.sample);
  const r=extract(own.length?own:shots);if(r)Object.assign(S.colors[side],r);
}
const toneCache=new Map();
function tonesFor(side){
  const shots=S.shots[side]||[];const key=side+':'+shots.map(s=>s.id).join(',');
  if(toneCache.has(key))return toneCache.get(key);
  let light=mix(S.colors[side].bg,'#FFFFFF',.2),dark=mix(S.colors[side].bg,'#000000',.55);
  const px=samplePixels(shots);
  if(px.length){
    const L=px.filter(p=>relLum(p)>.5),D=px.filter(p=>relLum(p)<.1);
    if(L.length)light=mix(avg(L),'#EEEADF',.28);
    if(D.length)dark=mix(avg(D),'#27312B',.45);
  }
  const r={light,dark};toneCache.set(key,r);return r;
}
function autoTB(){
  const all=[...S.shots.day,...S.shots.night];if(!all.length)return;
  const px=samplePixels(all);if(!px.length)return;
  const sorted=px.slice().sort((a,b)=>relLum(b)-relLum(a));
  const n=Math.max(1,Math.floor(sorted.length*.2));
  S.tbTop=mix(avg(sorted.slice(0,n)),'#EEEADF',.25);S.tbBottom=mix(avg(sorted.slice(Math.floor(sorted.length*.45),Math.floor(sorted.length*.65)+1)),'#7B8A7C',.15);
}
function autoFive(){
  const all=[...S.shots.day,...S.shots.night];const px=samplePixels(all);if(!px.length)return;
  const bins=binsOf(px).sort((a,b)=>b.n-a.n);const picked=[];
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  for(const e of bins){if(picked.every(p=>dist(p,e.c)>48))picked.push(e.c);if(picked.length===5)break;}
  while(picked.length<5)picked.push(picked.length?picked[picked.length-1].map(v=>v*.7):[200,200,200]);
  S.five=picked.sort((a,b)=>relLum(b)-relLum(a)).map(c=>rgbToHex(...c));
}
function refreshDerived(){if(!S.tbCustom)autoTB();if(!S.fiveCustom)autoFive();toneCache.clear();}

/* ---------------- layout engine ---------------- */
function fit(items,box,gap,capH,maxRows=3){
  const n=items.length;if(!n||box.w<=0||box.h<=0)return[];
  let best=null;
  for(let rows=1;rows<=Math.min(n,maxRows);rows++){
    const per=Math.ceil(n/rows),groups=[];for(let i=0;i<n;i+=per)groups.push(items.slice(i,i+per));
    const mw=g=>Math.max(...g.map(i=>i.wt||1));
    let h=(box.h-gap*(groups.length-1)-capH*groups.length)/groups.reduce((s,g)=>s+mw(g),0);
    for(const g of groups){const sa=g.reduce((s,i)=>s+i.a*(i.wt||1),0);h=Math.min(h,(box.w-gap*(g.length-1))/sa);}
    if(h>0&&(!best||h>best.h*1.02))best={h,groups};
  }
  if(!best)return[];
  const{h,groups}=best,mw=g=>Math.max(...g.map(i=>i.wt||1));
  const total=groups.reduce((s,g)=>s+mw(g)*h+capH,0)+gap*(groups.length-1);
  let y=box.y+(box.h-total)/2;const out=[];
  for(const g of groups){
    const rh=mw(g)*h,rw=g.reduce((s,i)=>s+i.a*(i.wt||1)*h,0)+gap*(g.length-1);let x=box.x+(box.w-rw)/2;
    for(const it of g){const ih_=(it.wt||1)*h,iw_=it.a*ih_;out.push({it,x,y:y+(rh-ih_)/2,w:iw_,h:ih_});x+=iw_+gap;}
    y+=rh+capH+gap;
  }
  return out;
}
function shrinkBox(b,k){const w=b.w*k,h=b.h*k;return{x:b.x+(b.w-w)/2,y:b.y+(b.h-h)/2,w,h};}
function isSingle(l){return l.startsWith('single');}
function geometry(W,H,lay,side,A='day',B='night'){
  if(isSingle(lay))return{kind:'single',panels:[{side,x:0,y:0,w:W,h:H}]};
  if(lay==='compare')return{kind:'split',dir:'v',k:0,A,B,panels:[{side:A,x:0,y:0,w:W/2,h:H,poly:null},{side:B,x:W/2,y:0,w:W/2,h:H,poly:null}]};
  if(lay==='rows')return{kind:'blend',dir:'h',A,B,panels:[{side:'blend',x:0,y:0,w:W,h:H}]};
  const dir=S.splitDir==='auto'?(W>=H?'v':'h'):S.splitDir;
  if(lay==='split'||lay==='diagonal'){
    const k=lay==='diagonal'?.07:0;
    let d,n,pd=null,pn=null;
    if(dir==='v'){d={x:0,y:0,w:W/2,h:H};n={x:W/2,y:0,w:W/2,h:H};
      if(k){pd=[[0,0],[W*(.5+k),0],[W*(.5-k),H],[0,H]];pn=[[W*(.5+k),0],[W,0],[W,H],[W*(.5-k),H]];}}
    else{d={x:0,y:0,w:W,h:H/2};n={x:0,y:H/2,w:W,h:H/2};
      if(k){pd=[[0,0],[W,0],[W,H*(.5-k)],[0,H*(.5+k)]];pn=[[0,H*(.5+k)],[W,H*(.5-k)],[W,H],[0,H]];}}
    return{kind:'split',dir,k,A,B,panels:[{side:A,...d,poly:pd},{side:B,...n,poly:pn}]};
  }
  return{kind:'blend',dir:W>=H?'v':'h',A,B,panels:[{side:'blend',x:0,y:0,w:W,h:H}]};
}
function textInk(side,auto,key){
  const own=key&&fieldInk(key,side);if(own)return own;
  if(S.textMode!=='custom')return auto;
  return side==='night'?S.textNight:S.textDay;
}
function bestInkFor(bg,prefer){
  const cands=[prefer,S.colors.day.ink,S.colors.night.ink].filter(Boolean);
  if(prefer&&contrast(prefer,bg)>=3.2)return prefer;
  let best=cands[0];for(const c of cands)if(contrast(c,bg)>contrast(best,bg))best=c;
  if(contrast(best,bg)<3)best=relLum(bg)>.3?'#1E2024':'#F4F2EC';
  return best;
}

/* ---------------- backgrounds ---------------- */
let TB={top:'#EDE9DE',bottom:'#A5B09E'}; // gradient ends for the poster being drawn
function sideBase(side){
  if(S.bg==='light')return tonesFor(side).light;
  if(S.bg==='dark')return tonesFor(side).dark;
  if(S.bg==='custom')return S.customBg;
  return S.colors[side].bg;
}
function overlayImageModes(ctx,p,side,base){
  if(S.bg==='image'&&S.bgImage){ctx.save();ctx.globalAlpha=S.bgOpacity;drawCover(ctx,blurredImage(S.bgImage,S.bgBlur),p);ctx.restore();}
  else if(S.bg==='glass'){
    const src=S.cover||(S.shots[side][0]||S.shots.day[0]||S.shots.night[0]||{}).prev;
    if(src){
      drawCover(ctx,blurredImage(src,110+S.glass*80),p,1.25);
      ctx.fillStyle=rgba(base,.12+.5*(1-S.glass));ctx.fillRect(p.x,p.y,p.w,p.h);
      const g=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.06)');
      ctx.fillStyle=g;ctx.fillRect(p.x,p.y,p.w,p.h);
    }
  }
}
function paintPanel(ctx,panel,W,H){
  const p=panel.poly?{...panel,x:0,y:0,w:W,h:H}:panel,side=panel.side,base=sideBase(side);
  ctx.save();panelPath(ctx,panel);ctx.clip();
  ctx.fillStyle=base;ctx.fillRect(p.x,p.y,p.w,p.h);
  const sh=S.shots[side][0];
  if(S.bg==='blur'&&sh){
    const b=blurredShot(sh),k=Math.max(p.w/b.width,p.h/b.height)*1.15;
    ctx.imageSmoothingQuality='high';ctx.drawImage(b,p.x+(p.w-b.width*k)/2,p.y+(p.h-b.height*k)/2,b.width*k,b.height*k);
    ctx.fillStyle=rgba(base,S.tint);ctx.fillRect(p.x,p.y,p.w,p.h);
  }else if(S.bg==='gradient'){
    const g=ctx.createLinearGradient(p.x,p.y,p.x+p.w*.3,p.y+p.h),dark=relLum(base)<.25;
    g.addColorStop(0,mix(base,'#FFFFFF',dark?.07:.35));g.addColorStop(1,mix(base,dark?'#000000':S.colors[side].ink,dark?.28:.10));
    ctx.fillStyle=g;ctx.fillRect(p.x,p.y,p.w,p.h);
  }else if(S.bg==='tb'){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,TB.top);g.addColorStop(1,TB.bottom);ctx.fillStyle=g;ctx.fillRect(p.x,p.y,p.w,p.h);
  }else overlayImageModes(ctx,p,side,base);
  ctx.restore();
}
/* blend layouts: one background across the canvas; returns a function giving the colour at a point */
function paintBlend(ctx,geo,W,H){
  const full={x:0,y:0,w:W,h:H};
  if(S.bg==='custom'){ctx.fillStyle=S.customBg;ctx.fillRect(0,0,W,H);return()=>S.customBg;}
  if(S.bg==='tb'){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,TB.top);g.addColorStop(1,TB.bottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);return(x,y)=>mix(TB.top,TB.bottom,clamp(y/H,0,1));}
  const tone=side=>S.bg==='light'?tonesFor(side).light:S.bg==='dark'?tonesFor(side).dark:S.colors[side].bg;
  const dc=tone(geo.A),nc=tone(geo.B);
  const g=geo.dir==='v'?ctx.createLinearGradient(0,0,W,0):ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,dc);g.addColorStop(.28,dc);g.addColorStop(.72,nc);g.addColorStop(1,nc);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  overlayImageModes(ctx,full,geo.A,mix(dc,nc,.5));
  return(x,y)=>{const t=geo.dir==='v'?x/W:y/H;return mix(dc,nc,clamp((t-.28)/.44,0,1));};
}

/* ---------------- poster ---------------- */
// 報紙和風琴頁可以日夜一起，或只放其中一邊
function drawPoster(ctx,W,H,opt={}){
  const lay=opt.layout||S.layout;
  if((lay==='fold'||lay==='news')&&S.span!=='both'){
    const other=S.span==='day'?'night':'day',keep=S.shots[other];
    S.shots[other]=[];
    try{return drawPosterInner(ctx,W,H,{...opt,order:S.span==='day'?'dn':'nd'});}finally{S.shots[other]=keep;}
  }
  return drawPosterInner(ctx,W,H,opt);
}
// line colour on one side: dark lines on a dark half carry on in a light tone
function lineFor(side){
  const base=sideBase(side);
  if(relLum(base)<.2&&relLum(S.ruleColor)<.2)return rgba('#F1F0E7',S.ruleOpacity);
  return rgba(S.ruleColor,S.ruleOpacity);
}
function drawPosterInner(ctx,W,H,opt={}){
  const lay=opt.layout||S.layout, singleSide=opt.side||S.single;
  const u=Math.min(W,H)/100, m=u*6, bar=S.headline==='bar';
  const A=(opt.order||S.order)==='nd'?'night':'day',B=A==='day'?'night':'day';
  if(lay==='single-card')return drawCardPoster(ctx,W,H,singleSide,opt);
  if(lay==='news')return drawNewsPoster(ctx,W,H,A,B,opt);
  const geo=geometry(W,H,lay,singleSide,A,B);
  const flipTB=geo.kind!=='single'&&geo.dir==='h'&&A==='night';
  TB=flipTB?{top:S.tbBottom,bottom:S.tbTop}:{top:S.tbTop,bottom:S.tbBottom};
  const hits=[];
  let bgAt=null;

  /* backgrounds */
  const fill=opt.fill&&geo.kind!=='single'?opt.fill:null; // motion layer: one side painted across the whole poster
  if(fill)paintPanel(ctx,{side:fill,x:0,y:0,w:W,h:H},W,H);
  else if(geo.kind==='blend')bgAt=paintBlend(ctx,geo,W,H);
  else for(const p of geo.panels)paintPanel(ctx,p,W,H);
  paintGrain(ctx,W,H);

  /* text block */
  const ts=u*6.4*S.titleSize, ss=u*2.25, tsz=ss*S.taglineSize;
  const as_=ss*S.authorSize, ds=ss*.88*S.dateSize, ms=ss*.88*S.messageSize;
  const title=S.title.trim(),sub=S.tagline.trim(),author=S.author.trim(),date=S.showDate?S.date.trim():'',msg=S.message.trim();
  const fT=fieldFont('title'),fS=fieldFont('tagline'),fA=fieldFont('author'),fD=fieldFont('date'),fM=fieldFont('message');
  const els=[];let top=m;
  ctx.textBaseline='alphabetic';
  if(bar){
    // 一行報頭 (the Lovia classic masthead): title top left, AUTHOR / name top right, date and message bottom right
    const X=u*6.63,hy=u*6.48;
    const tr=(t,key,f,weight,size,track,maxW,minSize,x,y,align,alpha=1)=>{
      const r=fitTracked(ctx,t,f,weight,size,track,maxW,minSize);els.push({t,key,f,x,y,size:r.size,w:weight,align,alpha,track:r.track,mid:true});};
    if(title)tr(title,'title',fT,fT.tw,u*2.26*S.titleSize,u*.185,W*.464,u*.67,X,hy,'left');
    if(author)tr((S.authorPrefix?'AUTHOR / ':'')+author,'author',fA,fA.bw,u*1.78*S.authorSize,u*.3,W*.397,u*.67,W-X,hy,'right');
    if(sub)tr(sub,'tagline',fS,fS.bw,u*1.05*S.taglineSize,u*.1,W*.464,u*.5,X,u*8.75,'left',.72);
    if(msg)tr(msg,'message',fM,fM.bw,u*1.22*S.messageSize,u*.15,W*.4,u*.55,W-X,H-u*7.04,'right');
    if(date)tr(date,'date',fD,fD.bw,u*1.52*S.dateSize,u*.26,W*.25,u*.6,W-X,H-u*4.48,'right');
    top=u*10.4;
  }else if(S.align==='left'){
    let rw=0;
    if(author){ctx.font=font(as_,fA.bw,fA);rw=Math.max(rw,ctx.measureText(author).width);}
    if(date){ctx.font=font(ds,fD.bw,fD);rw=Math.max(rw,ctx.measureText(date).width);}
    if(msg){ctx.font=font(ms,fM.bw,fM);rw=Math.max(rw,Math.min(ctx.measureText(msg).width,W*.34));}
    let ry=m;
    if(author){ry+=as_*.95;els.push({t:author,key:'author',f:fA,x:W-m,y:ry,size:as_,w:fA.bw,align:'right',alpha:.92});ry+=as_*.6;}
    if(date){ry+=ds*.95;els.push({t:date,key:'date',f:fD,x:W-m,y:ry,size:ds,w:fD.bw,align:'right',alpha:.62});ry+=ds*.6;}
    if(msg){ry+=ms*.95;els.push({t:msg,key:'message',f:fM,x:W-m,y:ry,size:ms,w:fM.bw,align:'right',alpha:.72,maxW:W*.34});ry+=ms*.6;}
    const maxW=W-2*m-(rw?rw+u*5:0);
    let y=m;
    if(title){let s=ts;ctx.font=font(s,fT.tw,fT);while(ctx.measureText(title).width>maxW&&s>u*2.5){s*=.94;ctx.font=font(s,fT.tw,fT);}
      els.push({t:title,key:'title',f:fT,x:m,y:m+s*.86,size:s,w:fT.tw,align:'left',alpha:1});y=m+s*1.1;}
    if(sub){y+=tsz*.35;els.push({t:sub,key:'tagline',f:fS,x:m,y:y+tsz*.9,size:tsz,w:fS.bw,align:'left',alpha:.7,maxW});y+=tsz*1.5;}
    top=Math.max(y,ry);
  }else{
    let y=m;
    if(title){let s=ts;ctx.font=font(s,fT.tw,fT);while(ctx.measureText(title).width>W-2*m&&s>u*2.5){s*=.94;ctx.font=font(s,fT.tw,fT);}
      els.push({t:title,key:'title',f:fT,x:W/2,y:m+s*.86,size:s,w:fT.tw,align:'center',alpha:1});y=m+s*1.1;}
    // a centred line can join two fields; each part keeps its own font and colour
    const segs1=[sub&&{t:sub,key:'tagline',f:fS},author&&{t:author,key:'author',f:fA}].filter(Boolean);
    if(segs1.length){const b=sub?tsz:ss;y+=b*.35;els.push(joinEl(segs1,'　／　',{x:W/2,y:y+b*.9,size:Math.max(b,author?as_*.9:ss),align:'center',alpha:.75,maxW:W-2*m}));y+=Math.max(b,as_*.9)*1.5;}
    const segs2=[date&&{t:date,key:'date',f:fD},msg&&{t:msg,key:'message',f:fM}].filter(Boolean);
    if(segs2.length){const sz=Math.max(date?ds:0,msg?ms:0);els.push(joinEl(segs2,'　',{x:W/2,y:y+sz*.85,size:sz,align:'center',alpha:.6,maxW:W-2*m}));y+=sz*1.45;}
    top=y;
  }
  const hasTop=els.length>0;
  const topEdge=bar?u*12.2:hasTop?top+u*3.2:m;
  const fivePal=S.palette==='five'&&S.swatches;
  const panelBg=(side,y)=>S.bg==='tb'?mix(TB.top,TB.bottom,clamp(y/H,0,1)):sideBase(side);
  if(fill&&geo.kind==='blend')bgAt=(x,y)=>panelBg(fill,y);
  const inkAt=(side,y)=>(S.bg==='image'||S.bg==='glass')?S.colors[side].ink:bestInkFor(panelBg(side,y),S.colors[side].ink);
  const footOn=S.sideLabels||(S.swatches&&!fivePal)||fivePal;
  const footH=footOn?u*8.2:0;
  const capOn=S.captions&&(S.shots.day.some(s=>s.label)||S.shots.night.some(s=>s.label));
  const capH=capOn?u*4.2:0;
  const gap=u*3.2*S.gap;

  /* placements */
  const placed=[];let foldBox=null;
  const areaOf=(p,innerL=0,innerR=0,innerT=0,innerB=0)=>{
    const x=p.x+m+innerL,w=p.w-2*m-innerL-innerR;
    const yTop=p.y===0?topEdge:p.y+m+innerT;
    const yBot=bar?(p.y+p.h>=H-1?H-u*12:p.y+p.h-m)-innerB:p.y+p.h-(footOn?footH+m*.55:m)-innerB;
    return{x,y:yTop,w,h:yBot-yTop};
  };
  const frameScale=S.frame==='phone'?1.09:1;
  const phoneGap=S.frame==='phone'?u*1.4:0;
  const addOne=(sh,side,x,y,w,h,extra={})=>placed.push({shot:sh,side,x,y,w:w/frameScale,h:h/frameScale,ox:w*(1-1/frameScale)/2,oy:h*(1-1/frameScale)/2,z:0,cap:true,...extra});
  const pushFit=(list,box,sideOf,opts={})=>{
    const items=list.map((sh,i)=>({a:sh.a,wt:opts.wts?opts.wts[i]:1,sh,side:sideOf(sh,i),i}));
    let b=shrinkBox(box,S.size);
    const tilted=opts.stagger||opts.overlap;
    if(tilted)b={x:b.x,y:b.y+b.h*.07,w:b.w,h:b.h*.86};
    const g=opts.overlap?-Math.min(b.w,b.h)*.09:gap+phoneGap;
    const r=fit(items,b,g,capH,opts.maxRows||3);
    const n=r.length;
    r.forEach((q,j)=>{
      let y=q.y;
      if(n>1&&tilted){
        if(opts.stagger&&S.tilt==='alt')y+=(j%2?1:-1)*b.h*.065;
        else{const sign=S.tilt==='left-low'?-1:1;y+=(j/(n-1)-.5)*2*b.h*.065*sign;}
      }
      addOne(q.it.sh,q.it.side,q.x,y,q.w,q.h,{z:opts.z?opts.z(q.it):(opts.overlap?j:0)});
    });
  };
  if(geo.kind==='single'){
    const list=S.shots[singleSide],box=areaOf(geo.panels[0]);
    if(lay==='single-hero'&&list.length>1){
      // one large main screenshot, the others as a small grid beside it
      const hi=heroIndexFor(list),hero=list[hi],thumbs=list.filter((_,i)=>i!==hi);
      const b=shrinkBox(box,S.size),g=gap+phoneGap,maxA=Math.max(...thumbs.map(t=>t.a));
      let best=null;
      for(const f of[1,.92,.84,.76,.68,.6]){
        const hh=(b.h-capH)*f,hw=hero.a*hh,restW=b.w-hw-g;if(restW<=0)continue;
        for(let c=1;c<=Math.min(2,thumbs.length);c++){
          const r=Math.ceil(thumbs.length/c);
          const th=Math.min((b.h-(r-1)*g-r*capH)/r,(restW-(c-1)*g)/(c*maxA),hh*.62);
          if(th<=0)continue;
          const area=hw*hh+thumbs.reduce((sum,t)=>sum+t.a*th*th,0);
          if(!best||area>best.area)best={hh,hw,c,r,th,area};
        }
      }
      if(best){
        const{hh,hw,c,r,th}=best,colW=maxA*th,totalW=hw+g+c*colW+(c-1)*g,x0=b.x+(b.w-totalW)/2;
        addOne(hero,singleSide,x0,b.y+(b.h-hh-capH)/2,hw,hh,{z:1});
        const gridH=r*(th+capH)+(r-1)*g,gy=b.y+(b.h-gridH)/2,gx=x0+hw+g;
        thumbs.forEach((t,i)=>{const col=i%c,row=Math.floor(i/c),w=t.a*th;addOne(t,singleSide,gx+col*(colW+g)+(colW-w)/2,gy+row*(th+capH+g),w,th);});
      }else pushFit(list,box,()=>singleSide);
    }else if(lay==='single-focus'){
      const n=list.length,c=Math.floor((n-1)/2);const wts=list.map((_,i)=>n<2?1:i===c?1.22:.84);
      pushFit(list,box,()=>singleSide,{wts,maxRows:1,z:it=>it.wt});
    }else pushFit(list,box,()=>singleSide,{stagger:lay==='single-stagger',overlap:lay==='single-overlap',maxRows:lay==='single-even'?3:1});
  }else if(lay==='compare'){
    // one phone: the first side on the left, the second revealed past the divider
    const box=shrinkBox(areaOf({x:0,y:0,w:W,h:H}),S.size);
    const n=Math.max(S.shots[A].length,S.shots[B].length),i=clamp(S.comparePair,0,Math.max(0,n-1));
    const a=S.shots[A][i]||S.shots[A][0],b2=S.shots[B][i]||S.shots[B][0],first=a||b2;
    if(first){
      let h=box.h-capH,w=first.a*h;if(w>box.w){w=box.w;h=w/first.a;}
      addOne(first,a?A:B,W/2-w/2,box.y+(box.h-h)/2,w,h,{z:1,cap:false,compare:a&&b2?{shot:b2,side:B}:null});
    }
  }else if(geo.kind==='split'){
    for(const p of geo.panels){
      const extra=geo.k?geo.k*(geo.dir==='v'?W:H)*.75:0;
      const box=geo.dir==='v'
        ?areaOf(p,p===geo.panels[1]?extra:0,p===geo.panels[0]?extra:0)
        :areaOf(p,0,0,p===geo.panels[1]?extra:0,p===geo.panels[0]?extra:0);
      pushFit(S.shots[p.side],box,()=>p.side);
    }
  }else{
    const box=areaOf(geo.panels[0]);
    if(lay==='rows'){
      const h2=(box.h-gap)/2;
      pushFit(S.shots[A],{x:box.x,y:box.y,w:box.w,h:h2},()=>A,{maxRows:1});
      pushFit(S.shots[B],{x:box.x,y:box.y+h2+gap,w:box.w,h:h2},()=>B,{maxRows:1});
    }else if(lay==='alternate'){
      const seq=[];const n=Math.max(S.shots.day.length,S.shots.night.length);
      for(let i=0;i<n;i++){if(S.shots[A][i])seq.push([A,S.shots[A][i]]);if(S.shots[B][i])seq.push([B,S.shots[B][i]]);}
      pushFit(seq.map(s=>s[1]),box,(sh,i)=>seq[i][0]);
    }else if(lay==='fold'){
      foldBox=shrinkBox(box,S.size);
    }else{
      const n=Math.max(S.shots.day.length,S.shots.night.length);
      const units=[];const OX=.2,OY=.075;
      for(let i=0;i<n;i++){const d=S.shots[A][i],nn=S.shots[B][i];const front=d||nn;
        units.push({a:d&&nn?front.a*(1+OX)/(1+OY):front.a,d,nn});}
      const b=shrinkBox(box,S.size);
      const r=fit(units.map(un=>({a:un.a,un})),b,gap*1.1+phoneGap,capH,2);
      for(const[ui,q]of r.entries()){const{d,nn}=q.it.un;
        if(d&&nn){const fw=q.w/(1+OX),fh=q.h/(1+OY);
          addOne(nn,B,q.x+fw*OX,q.y,fw,fh,{cap:false,unit:ui});
          addOne(d,A,q.x,q.y+fh*OY,fw,fh,{z:1,capW:q.w,capX:q.x,unit:ui});
        }else{const s=d||nn;addOne(s,d?A:B,q.x,q.y,q.w,q.h,{z:1});}
      }
    }
  }

  /* shots */
  const mn=Math.min(W,H);
  placed.sort((a,b)=>a.z-b.z);
  for(const pl of placed){
    const s=pl.shot;
    if(fill&&pl.side!==fill)continue;
    let x=pl.x+pl.ox,y=pl.y+pl.oy,w=pl.w,h=pl.h;
    const cx=x+w/2,cy=y+h/2;w*=s.scale;h*=s.scale;x=cx-w/2+s.dx*mn;y=cy-h/2+s.dy*mn;
    if(opt.collect)opt.collect.push({shot:s,side:pl.side,rect:{x,y,w,h},unit:pl.unit,z:pl.z});
    if(!opt.noShots){
      let extra=pl.compare?(c2,r,rad)=>drawCompareHalf(c2,r,rad,pl.compare,u,opt.preview):null;
      if(pl.compare&&opt.compareOnly==='first')extra=null;
      if(pl.compare&&opt.compareOnly==='second')extra=(c2,r,rad)=>drawCompareHalf(c2,r,rad,pl.compare,u,opt.preview,0,true);
      drawShot(ctx,s,{x,y,w,h},pl.side,u,opt.preview,extra);
    }
    hits.push({shot:s,side:pl.side,x,y,w,h,compare:!!pl.compare});
    if(capOn&&pl.cap&&s.label&&!opt.noCaptions){
      const ink=textInk(bgAt?posSide(x+w/2,y+h):pl.side,bgAt?bestInkFor(bgAt(x+w/2,y+h)):inkAt(pl.side,y+h),'labels');
      drawCaption(ctx,s.label,pl.capX!==undefined?pl.capX+pl.capW/2+s.dx*mn:x+w/2,{x,y,w,h},u,ink);
    }
  }

  if(foldBox){
    // day and night screenshots take turns along one fold; each panel is paper in that side's colour
    const seq=[];const n=Math.max(S.shots.day.length,S.shots.night.length);
    for(let i=0;i<n;i++){if(S.shots[A][i])seq.push([A,S.shots[A][i]]);if(S.shots[B][i])seq.push([B,S.shots[B][i]]);}
    const fL=fieldFont('labels'),capY=foldBox.y+foldBox.h;
    const plan=LoviaExtra.foldPlan(seq.map(s=>s[1].a),foldBox,capOn?u*4.2:0,(S.gap-1)*.15);
    const shots=seq.map(([,s])=>({img:opt.preview?s.prev:s.src,a:s.a}));
    // each screenshot's size sets its panel; dragging any panel moves the whole fold
    const offset=seq.reduce((o,[,s])=>({x:o.x+s.dx*mn,y:o.y+s.dy*mn}),{x:0,y:0});
    const fo={paper:i=>{const bg=S.colors[seq[i][0]].bg;return mix(bg,'#FFFFFF',relLum(bg)<.2?.12:.55);},shade:.16,shadow:.28,capY:u*3.6,
      scales:seq.map(([,s])=>s.scale),offset,bounds:{x:m*.5,y:m*.5,w:W-m,h:H-m},drawImg:(c,i,r)=>drawShot(c,seq[i][1],r,seq[i][0],u,opt.preview),
      labels:capOn?seq.map(([,s])=>s.label):null,capFont:font(u*1.85*S.labelSize,fL.bw,fL),
      capColor:x=>textInk(posSide(x,capY),bgAt?bestInkFor(bgAt(x,capY)):inkAt(posSide(x,capY),capY),'labels')};
    if(opt.foldCapture)Object.assign(opt.foldCapture,{plan,shots,o:fo});
    if(!opt.noShots)LoviaExtra.drawFold(ctx,plan,shots,{...fo,open:opt.foldOpen??1}).forEach((r,i)=>hits.push({shot:seq[i][1],side:seq[i][0],...r,compare:false}));
  }

  /* text */
  function posSide(x,y){ // which side a point of a blended poster sits on
    if(fill)return fill;
    if(geo.kind==='single')return singleSide;
    return (geo.dir==='v'?x<W/2:y<H/2)?A:B;
  }
  const drawEl=(e,side,auto)=>{
    if(MARKS)MARKS.push(...elBoxes(ctx,e));
    if(e.segs&&!sameLook(e.segs,side)){drawSegs(ctx,e,side,auto);return;}
    const ff=e.segs?e.segs[0].f:e.f,key=e.segs?e.segs[0].key:e.key;
    ctx.font=font(e.size,e.w,ff);ctx.textAlign=e.align;ctx.fillStyle=rgba(textInk(side,auto,key),e.alpha);
    if(e.track!==undefined)drawTracked(ctx,e);else if(e.maxW)fitText(ctx,e.t,e.x,e.y,e.maxW);else ctx.fillText(e.t,e.x,e.y);};
  if(geo.kind==='split'&&fill){
    els.forEach(e=>drawEl(e,fill,inkAt(fill,e.y)));
  }else if(geo.kind==='split'){
    for(const p of geo.panels){ctx.save();panelPath(ctx,p);ctx.clip();els.forEach(e=>drawEl(e,p.side,inkAt(p.side,e.y)));ctx.restore();}
  }else if(geo.kind==='blend'){
    for(const e of els){const bx=e.align==='left'?e.x+u*10:e.align==='right'?e.x-u*10:e.x;drawEl(e,posSide(bx,e.y),bestInkFor(bgAt(bx,e.y)));}
  }else els.forEach(e=>drawEl(e,singleSide,inkAt(singleSide,e.y)));

  /* lines: the classic masthead rules, or the edge and top/bottom lines; each half gets its own tone */
  const eachHalf=fn=>{
    if(fill||geo.kind==='single'){fn(lineFor(fill||singleSide));return;}
    if(geo.kind==='split'){for(const p of geo.panels){ctx.save();panelPath(ctx,p);ctx.clip();fn(lineFor(p.side));ctx.restore();}return;}
    for(const [sd,r] of geo.dir==='v'?[[A,[0,0,W/2,H]],[B,[W/2,0,W/2,H]]]:[[A,[0,0,W,H/2]],[B,[0,H/2,W,H/2]]]){ctx.save();ctx.beginPath();ctx.rect(...r);ctx.clip();fn(lineFor(sd));ctx.restore();}
  };
  if(S.rules)eachHalf(line=>{
    ctx.save();ctx.strokeStyle=line;
    if(bar){ctx.lineWidth=u*.11;const x0=u*6.15;for(const y of[u*9.96,H-u*8.74]){ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(W-x0,y);ctx.stroke();}}
    else{
      ctx.lineWidth=u*.09;const e=m*.36;ctx.strokeRect(e,e,W-2*e,H-2*e);
      if(hasTop){const y=topEdge-u*1.7;ctx.beginPath();ctx.moveTo(m,y);ctx.lineTo(W-m,y);ctx.stroke();}
      const yb=H-(footOn?footH+m*.25:m*.8);ctx.beginPath();ctx.moveTo(m,yb);ctx.lineTo(W-m,yb);ctx.stroke();
    }
    ctx.restore();
  });
  if(S.cardFrame){drawBands(ctx,W,H,u,A);eachHalf(line=>drawCardFrame(ctx,W,H,u,line,bar));}

  /* footers */
  if(bar){
    // labels (and the three colours of each side) bottom left, then the five dots
    const y=H-u*5.93,X=u*6.63,three=S.swatches&&S.palette==='three';let dotsLeft=X;
    if(S.sideLabels||three){
      if(geo.kind==='single'){drawFooter(ctx,singleSide,X,y,'left',textInk(singleSide,inkAt(singleSide,y)),u,three);dotsLeft=X+footerWidth(ctx,singleSide,u,three);}
      else if(geo.kind==='split'){
        for(const p of geo.panels){if(fill&&p.side!==fill)continue;
          let x=p.x+X;if(geo.k&&geo.dir==='v'&&p===geo.panels[1])x=p.x-geo.k*W+X;
          const yy=p.y+p.h>=H-1?y:p.y+p.h-u*2.6;
          drawFooter(ctx,p.side,x,yy,'left',textInk(p.side,inkAt(p.side,yy)),u,three);
          if(p.y+p.h>=H-1)dotsLeft=Math.max(dotsLeft,x+footerWidth(ctx,p.side,u,three));}
      }else{
        let x=X;for(const sd of[A,B]){if(fill&&sd!==fill)continue;drawFooter(ctx,sd,x,y,'left',textInk(posSide(x+u*8,y),bestInkFor(bgAt(x+u*8,y))),u,three);x+=footerWidth(ctx,sd,u,three);}
        dotsLeft=x;
      }
    }
    if(S.swatches&&S.palette==='five'){
      const sd=posSide(dotsLeft+u,y);
      const ink=geo.kind==='blend'?textInk(sd,bestInkFor(bgAt(dotsLeft+u,y))):textInk(sd,inkAt(sd,y));
      drawBarDots(ctx,S.five,dotsLeft,y,u,lineFor(sd),ink);
    }
  }else if(footOn){
    const fy=p=>p.y+p.h-m*.95-u*1.2;
    const sw=S.swatches&&!fivePal;
    let dotsLeft=m;
    if(geo.kind==='single'){const p=geo.panels[0];drawFooter(ctx,singleSide,m,fy(p),'left',textInk(singleSide,inkAt(singleSide,fy(p))),u,sw);dotsLeft=m+footLabelWidth(ctx,singleSide,u);}
    else if(geo.kind==='split'){
      for(const p of geo.panels){if(fill&&p.side!==fill)continue;let x=p.x+m;if(geo.k&&geo.dir==='v'&&p===geo.panels[1])x=p.x-geo.k*W+m;drawFooter(ctx,p.side,x,fy(p),'left',textInk(p.side,inkAt(p.side,fy(p))),u,sw);
        if(p.y+p.h>=H-1)dotsLeft=Math.max(dotsLeft,x+footLabelWidth(ctx,p.side,u));}
    }else{
      const y=H-m*.95-u*1.2;
      if(!fill||fill===A)drawFooter(ctx,A,m,y,'left',textInk(posSide(m+u*8,y),bestInkFor(bgAt(m+u*8,y))),u,sw);
      const showB=!fill||fill===B;
      if(showB&&!fivePal)drawFooter(ctx,B,W-m,y,'right',textInk(posSide(W-m-u*8,y),bestInkFor(bgAt(W-m-u*8,y))),u,sw);
      else if(showB&&S.sideLabels)drawFooter(ctx,B,m+footLabelWidth(ctx,A,u),y,'left',textInk(posSide(m+u*20,y),bestInkFor(bgAt(m+u*20,y))),u,false);
      dotsLeft=m+footLabelWidth(ctx,A,u)+(fivePal?footLabelWidth(ctx,B,u):0);
    }
    if(fivePal){
      const y=H-m*.95-u*1.2,x=W-m;
      let ink;
      if(geo.kind==='single')ink=textInk(singleSide,inkAt(singleSide,y));
      else if(geo.kind==='split'){const sd=fill||geo.panels[1].side;ink=textInk(sd,inkAt(sd,y));}
      else ink=textInk(posSide(x-u*10,y),bestInkFor(bgAt(x-u*10,y)));
      drawDots(ctx,S.five,x,y,'right',ink,u,x-dotsLeft-u*2);
    }
  }
  return hits;
}
// 借閱卡: the whole poster becomes a library card in this side's colours
function drawCardPoster(ctx,W,H,side,opt){
  const c=S.colors[side],list=S.shots[side],mn=Math.min(W,H);
  TB={top:S.tbTop,bottom:S.tbBottom};
  const base=S.bg==='tb'?mix(TB.top,TB.bottom,.5):sideBase(side);
  const plain=['solid','light','dark','custom'].includes(S.bg);
  const auto=(S.bg==='image'||S.bg==='glass')?c.ink:bestInkFor(base,c.ink);
  const own=k=>{const f=S.textStyle[k]&&S.textStyle[k].font&&fontByKey(S.textStyle[k].font);return f?f.stack:FONTS.mono.stack;};
  const ink=k=>textInk(side,auto,k);
  const rects=LoviaExtra.drawCard(ctx,W,H,{bg:base,paint:plain?null:cx=>paintPanel(cx,{x:0,y:0,w:W,h:H,side},W,H),ink:ink(),inks:{title:ink('title'),author:ink('author'),date:ink('date'),message:ink('message')},
    title:S.title.trim(),author:S.author.trim(),date:S.showDate?S.date.trim():'',message:S.message.trim(),
    labels:S.captions?list.map(s=>s.label):[],shots:list.map(s=>({img:opt.preview?s.prev:s.src,a:s.a})),
    swatches:S.swatches?(S.palette==='five'?S.five:[c.bg,c.accent,c.ink]):[],
    fonts:{head:curFont().stack,title:own('title'),author:own('author'),date:own('date'),message:fieldFont('message').stack,labels:fieldFont('labels').stack},
    sizes:{title:S.titleSize,author:S.authorSize,date:S.dateSize,message:S.messageSize,labels:S.labelSize},
    size:S.size,gap:S.gap,scales:list.map(s=>s.scale),offsets:list.map(s=>({x:s.dx*mn,y:s.dy*mn})),
    drawImg:(cx,i,r)=>drawShot(cx,list[i],r,side,mn/100,opt.preview),framePad:S.frame==='phone'?.045:0,
    rules:S.rules?{color:S.ruleColor,alpha:S.ruleOpacity}:null,hexes:S.hexes,grain:cx=>paintGrain(cx,W,H),
    note:[S.tagline.trim(),S.sideLabels?(side==='day'?S.labelDay:S.labelNight).trim():''].filter(Boolean).join('  ·  '),noteSize:S.taglineSize},opt.cardT??null);
  return rects.map((r,i)=>({shot:list[i],side,x:r.x,y:r.y,w:r.w,h:r.h,compare:false}));
}
// 報紙: one large screenshot and the rest beside it on a front page; the paper is the first side's background
function drawNewsPoster(ctx,W,H,A,B,opt){
  const c=S.colors[A],list=[...S.shots[A].map(s=>[A,s]),...S.shots[B].map(s=>[B,s])],mn=Math.min(W,H);
  TB={top:S.tbTop,bottom:S.tbBottom};
  const base=S.bg==='tb'?mix(TB.top,TB.bottom,.5):sideBase(A);
  const plain=['solid','light','dark','custom'].includes(S.bg);
  const auto=(S.bg==='image'||S.bg==='glass')?c.ink:bestInkFor(base,c.ink);
  const own=k=>{const f=S.textStyle[k]&&S.textStyle[k].font&&fontByKey(S.textStyle[k].font);return f?f.stack:null;};
  const ink=k=>textInk(A,auto,k);
  const hero=newsHeroFor(list,A,B);
  const rects=LoviaExtra.drawNews(ctx,W,H,{bg:base,paint:plain?null:cx=>paintPanel(cx,{x:0,y:0,w:W,h:H,side:A},W,H),ink:ink(),accent:c.accent,
    inks:{title:ink('title'),tagline:ink('tagline'),author:ink('author'),date:ink('date'),message:ink('message'),labels:ink('labels')},
    title:S.title.trim(),tagline:S.tagline.trim(),author:S.author.trim(),date:S.showDate?S.date.trim():'',message:S.message.trim(),
    labels:list.map(([sd,s])=>[S.sideLabels?(sd==='day'?S.labelDay:S.labelNight).trim():'',S.captions?s.label:''].filter(Boolean).join(' · ')),align:S.align,shots:list.map(([,s])=>({img:opt.preview?s.prev:s.src,a:s.a})),hero,
    swatches:S.swatches?(S.palette==='five'?S.five:[A,B].flatMap(sd=>[S.colors[sd].bg,S.colors[sd].accent,S.colors[sd].ink])):[],hexes:S.hexes,
    fonts:{head:curFont().stack,title:own('title'),tagline:fieldFont('tagline').stack,author:own('author'),date:own('date'),message:fieldFont('message').stack,labels:fieldFont('labels').stack},
    sizes:{title:S.titleSize,tagline:S.taglineSize,author:S.authorSize,date:S.dateSize,message:S.messageSize,labels:S.labelSize},
    size:S.size,gap:S.gap,scales:list.map(([,s])=>s.scale),offsets:list.map(([,s])=>({x:s.dx*mn,y:s.dy*mn})),
    drawImg:(cx,i,r)=>drawShot(cx,list[i][1],r,list[i][0],mn/100,opt.preview),
    rules:S.rules?{color:S.ruleColor,alpha:S.ruleOpacity}:null,grain:cx=>paintGrain(cx,W,H)},opt.newsT??null);
  return rects.map((r,i)=>r&&({shot:list[i][1],side:list[i][0],x:r.x,y:r.y,w:r.w,h:r.h,compare:false})).filter(Boolean);
}
function paintGrain(ctx,W,H){
  if(S.grain<=0)return;
  ctx.save();const k=W/1400;ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=S.grain*.55;
  ctx.scale(k,k);ctx.fillStyle=ctx.createPattern(noise(),'repeat');ctx.fillRect(0,0,W/k,H/k);ctx.restore();
}
// 報紙: the large photo can be any shot of either side; default is the reading page of the first side
function newsHeroFor(list,A,B){
  if(S.newsHero>=0&&S.newsHero<list.length)return S.newsHero;
  return S.shots[A].length?heroIndexFor(S.shots[A]):S.shots[A].length+heroIndexFor(S.shots[B]);
}
function heroIndexFor(list){
  if(S.heroIndex>=0&&S.heroIndex<list.length)return S.heroIndex;
  const i=list.findIndex(s=>(s.labelSrc||s.label)==='閱讀頁'||s.label==='阅读页');
  return i>=0?i:list.length-1;
}
function drawCompareHalf(ctx,r,rad,other,u,preview,at=S.compareAt,noDivider=false){
  const img=preview?other.shot.prev:other.shot.src,xd=r.x+r.w*at;
  ctx.save();rr(ctx,r.x,r.y,r.w,r.h,rad);ctx.clip();ctx.beginPath();ctx.rect(xd,r.y,r.x+r.w-xd,r.h);ctx.clip();
  ctx.imageSmoothingQuality='high';ctx.drawImage(img,r.x,r.y,r.w,r.h);ctx.restore();
  if(!noDivider)drawCompareDivider(ctx,r,xd,u,preview);
}
function drawCompareDivider(ctx,r,xd,u,preview){
  ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=u*1.2;
  ctx.fillStyle='rgba(255,255,255,.95)';ctx.fillRect(xd-u*.18,r.y,u*.36,r.h);ctx.restore();
  if(!preview&&!S.compareHandle)return; // the drag handle only shows on screen unless asked for
  ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=u*1.2;ctx.fillStyle='rgba(255,255,255,.95)';
  const cy=r.y+r.h/2,R=u*1.9;ctx.beginPath();ctx.arc(xd,cy,R,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.fillStyle='rgba(40,44,52,.75)';const a=R*.42;
  ctx.beginPath();ctx.moveTo(xd-R*.25,cy-a);ctx.lineTo(xd-R*.25-a*.9,cy);ctx.lineTo(xd-R*.25,cy+a);ctx.fill();
  ctx.beginPath();ctx.moveTo(xd+R*.25,cy-a);ctx.lineTo(xd+R*.25+a*.9,cy);ctx.lineTo(xd+R*.25,cy+a);ctx.fill();ctx.restore();
}
function fitText(ctx,t,x,y,maxW){
  if(ctx.measureText(t).width<=maxW){ctx.fillText(t,x,y);return;}
  let s=t;while(s.length>1&&ctx.measureText(s+'…').width>maxW)s=s.slice(0,-1);ctx.fillText(s+'…',x,y);
}
// letter-spaced text (the classic masthead): shrink until it fits, then squeeze the spacing
function trackedWidth(ctx,t,track){return[...t].reduce((w,ch)=>w+ctx.measureText(ch).width+track,-track);}
function fitTracked(ctx,t,f,weight,size,track,maxW,minSize){
  ctx.font=font(size,weight,f);
  while(size>minSize&&trackedWidth(ctx,t,track)>maxW){size-=Math.max(.5,size*.02);ctx.font=font(size,weight,f);}
  if(trackedWidth(ctx,t,track)>maxW)track=Math.max(0,(maxW-trackedWidth(ctx,t,0))/Math.max(1,[...t].length-1));
  return{size,track};
}
function drawTracked(ctx,e){
  const w=trackedWidth(ctx,e.t,e.track);let x=e.align==='right'?e.x-w:e.align==='center'?e.x-w/2:e.x;
  ctx.textAlign='left';if(e.mid)ctx.textBaseline='middle';
  for(const ch of e.t){ctx.fillText(ch,x,e.y);x+=ctx.measureText(ch).width+e.track;}
  ctx.textBaseline='alphabetic';
}
// 卡紙外框: the colour band along the top and bottom
function drawBands(ctx,W,H,u,A){
  const c=S.colors[A],band=relLum(c.bg)<.2?mix(c.bg,'#000000',.45):mix(c.ink,'#000000',.2);
  ctx.save();ctx.fillStyle=band;ctx.fillRect(0,0,W,u*1.07);
  ctx.fillStyle=c.accent;ctx.fillRect(W-u*13.5,0,u*13.5,u*1.07);ctx.fillRect(0,H-u*1.07,W,u*1.07);ctx.restore();
}
// 卡紙外框: a double frame around the poster and four registration crosses
function drawCardFrame(ctx,W,H,u,line,bar){
  ctx.save();ctx.strokeStyle=line;
  ctx.lineWidth=u*.15;ctx.strokeRect(u*2.48,u*2.48,W-u*4.96,H-u*4.96);
  ctx.lineWidth=u*.037;ctx.strokeRect(u*3.22,u*3.22,W-u*6.44,H-u*6.44);
  const xs=bar?[u*6.04,W-u*6.04]:[u*4.6,W-u*4.6],ys=bar?[u*11.8,H-u*10.44]:[u*4.6,H-u*4.6],c=u*.81;
  ctx.lineWidth=u*.11;
  for(const x of xs)for(const y of ys){ctx.beginPath();ctx.moveTo(x-c,y);ctx.lineTo(x+c,y);ctx.moveTo(x,y-c);ctx.lineTo(x,y+c);ctx.stroke();}
  ctx.restore();
}
// the five dots of the classic masthead, outlined in the line colour
function drawBarDots(ctx,cols,x,y,u,stroke,ink){
  const r=u*.78,hs=u*1.1,gap=u*.93;ctx.font=HEXFONT(hs);
  let cx=x;ctx.textBaseline='middle';
  for(const c of cols){
    ctx.beginPath();ctx.arc(cx+r,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.lineWidth=u*.074;ctx.strokeStyle=stroke;ctx.stroke();
    cx+=r*2;
    if(S.hexes){ctx.font=HEXFONT(hs);ctx.textAlign='left';ctx.fillStyle=rgba(ink,.66);ctx.fillText(c.toUpperCase(),cx+u*.5,y);cx+=u*.5+ctx.measureText(c.toUpperCase()).width;}
    cx+=gap;
  }
  ctx.textBaseline='alphabetic';
}
// a centred line made of two fields
function joinEl(segs,sep,o){
  const all=segs.map((g,i)=>({...g,t:i<segs.length-1?g.t+sep:g.t,w:g.f.bw}));
  return{...o,t:segs.map(g=>g.t).join(sep),segs:all,w:segs[0].f.bw,key:segs[0].key,f:segs[0].f};
}
function sameLook(segs,side){return segs.every(g=>g.f===segs[0].f&&fieldInk(g.key,side)===fieldInk(segs[0].key,side));}
function drawSegs(ctx,e,side,auto){
  const parts=e.segs.map(g=>{ctx.font=font(e.size,g.w,g.f);return{...g,ww:ctx.measureText(g.t).width};});
  let total=parts.reduce((a,g)=>a+g.ww,0);
  if(e.maxW&&total>e.maxW){ // cut from the end, like fitText
    while(parts.length){const g=parts[parts.length-1];ctx.font=font(e.size,g.w,g.f);
      const ell=ctx.measureText('…').width,room=e.maxW-(total-g.ww)-ell;
      if(room>0){let t=g.t;while(t.length>1&&ctx.measureText(t).width>room)t=t.slice(0,-1);g.t=t+'…';total+=ctx.measureText(g.t).width-g.ww;g.ww=ctx.measureText(g.t).width;break;}
      total-=g.ww;parts.pop();}
  }
  let x=e.align==='center'?e.x-total/2:e.align==='right'?e.x-total:e.x;
  ctx.textAlign='left';
  for(const g of parts){ctx.font=font(e.size,g.w,g.f);ctx.fillStyle=rgba(textInk(side,auto,g.key),e.alpha);ctx.fillText(g.t,x,e.y);x+=g.ww;}
}
// where each field's text sits, for the dashed outline in the preview
function elBoxes(ctx,e){
  if(e.track!==undefined){ctx.font=font(e.size,e.w,e.f);const w=trackedWidth(ctx,e.t,e.track),x=e.align==='right'?e.x-w:e.align==='center'?e.x-w/2:e.x;
    return[{key:e.key,x,y:e.y-e.size*.62,w,h:e.size*1.24}];}
  const parts=e.segs||[{t:e.t,key:e.key,f:e.f,w:e.w}];
  const ws=parts.map(g=>{ctx.font=font(e.size,g.w||e.w,g.f);return Math.min(ctx.measureText(g.t).width,e.maxW||Infinity);});
  const total=ws.reduce((a,b)=>a+b,0);
  let x=e.align==='center'?e.x-total/2:e.align==='right'?e.x-total:e.x;
  return parts.map((g,i)=>{const b={key:g.key,x,y:e.y-e.size*.9,w:ws[i],h:e.size*1.15};x+=ws[i];return b;});
}
const HEXFONT=hs=>`500 ${hs}px -apple-system,"PingFang TC","Noto Sans TC",sans-serif`;
function footLabelWidth(ctx,side,u){const l=S.sideLabels?(side==='day'?S.labelDay:S.labelNight).trim():'';if(!l)return 0;const lf=fieldFont('labels');ctx.font=font(u*2.05*S.labelSize,lf.tw,lf);return ctx.measureText(l).width+u*5;}
function drawDots(ctx,cols,x,y,align,ink,u,maxW=Infinity){
  const r=u*1.45,hs=u*1.45,gapC=u*1.9;ctx.font=HEXFONT(hs);
  let hex=S.hexes;
  let ws=cols.map(c=>r*2+(hex?u*.9+ctx.measureText(c).width:0));
  if(hex&&ws.reduce((a,b)=>a+b,0)+gapC*(cols.length-1)>maxW){hex=false;ws=cols.map(()=>r*2);}
  const total=ws.reduce((a,b)=>a+b,0)+gapC*(cols.length-1);
  let cx=align==='right'?x-total:x;ctx.textBaseline='middle';
  cols.forEach((c,i)=>{ctx.beginPath();ctx.arc(cx+r,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.lineWidth=u*.14;ctx.strokeStyle=rgba(ink,.28);ctx.stroke();
    if(hex){ctx.font=HEXFONT(hs);ctx.textAlign='left';ctx.fillStyle=rgba(ink,.66);ctx.fillText(c.toUpperCase(),cx+r*2+u*.9,y);}
    cx+=ws[i]+gapC;});
  ctx.textBaseline='alphabetic';
}
// how much room drawFooter takes, plus the gap after it
function footerWidth(ctx,side,u,withSwatches){
  const label=S.sideLabels?(side==='day'?S.labelDay:S.labelNight).trim():'',lf=fieldFont('labels');
  ctx.font=font(u*2.05*S.labelSize,lf.tw,lf);const lw=label?ctx.measureText(label).width:0;
  let dotsW=0;if(withSwatches){const c=S.colors[side];ctx.font=HEXFONT(u*1.45);dotsW=[c.bg,c.ink,c.accent].reduce((s,col)=>s+u*2.9+(S.hexes?u*.9+ctx.measureText(col).width:0),0)+u*1.9*2;}
  const total=lw+(label&&dotsW?u*2.6:0)+dotsW;return total?total+u*2.4:0;
}
function drawFooter(ctx,side,x,y,align,ink,u,withSwatches){
  const c=S.colors[side],label=S.sideLabels?(side==='day'?S.labelDay:S.labelNight).trim():'';
  const ls=u*2.05*S.labelSize,lf=fieldFont('labels'),lInk=fieldInk('labels',side)||ink;
  ctx.font=font(ls,lf.tw,lf);
  const lw=label?ctx.measureText(label).width:0;
  const cols=withSwatches?[c.bg,c.ink,c.accent]:[];
  if(!label&&!cols.length)return;
  let dotsW=0;
  if(cols.length){ctx.font=HEXFONT(u*1.45);dotsW=cols.reduce((s,col)=>s+u*2.9+(S.hexes?u*.9+ctx.measureText(col).width:0),0)+u*1.9*(cols.length-1);}
  const total=lw+(label&&cols.length?u*2.6:0)+dotsW;
  let cx=align==='right'?x-total:x;
  ctx.textBaseline='middle';
  if(label){if(MARKS)MARKS.push({key:'labels',x:cx,y:y-ls*.7,w:lw,h:ls*1.4});ctx.font=font(ls,lf.tw,lf);ctx.textAlign='left';ctx.fillStyle=rgba(lInk,.95);ctx.fillText(label,cx,y);cx+=lw+(cols.length?u*2.6:0);}
  ctx.textBaseline='alphabetic';
  if(cols.length)drawDots(ctx,cols,cx,y,'left',ink,u);
}
// one screenshot on its own transparent canvas (with room around it), for the moving GIF layers
function shotSprite(shot,r,side,u,k,extraH=0){
  const pad=u*8+r.w*.06,c=document.createElement('canvas');
  c.width=Math.ceil((r.w+pad*2)*k);c.height=Math.ceil((r.h+pad*2+extraH)*k);
  const x=c.getContext('2d');x.setTransform(k,0,0,k,(pad-r.x)*k,(pad-r.y)*k);drawShot(x,shot,r,side,u,false);
  return{c,x,pad};
}
// the page name under a screenshot
function drawCaption(ctx,label,cx,r,u,ink){
  const pad=S.frame==='phone'?r.w*.045:S.frame==='corners'?u*1.2:0,fL=fieldFont('labels');
  ctx.font=font(u*1.85*S.labelSize,fL.bw,fL);ctx.textAlign='center';ctx.fillStyle=rgba(ink,.74);
  ctx.fillText(label,cx,r.y+r.h+pad+u*2.9);
}
function drawShot(ctx,s,r,side,u,preview,extra=null){
  const img=preview?s.prev:s.src,c=S.colors[side];
  const night=relLum(c.bg)<.2;
  let rad=r.w*S.radius;
  ctx.save();
  if(S.frame==='phone'){
    const pad=r.w*.045;rad=Math.max(rad,r.w*.11);
    ctx.shadowColor=night?'rgba(0,0,0,.55)':'rgba(20,28,40,.26)';ctx.shadowBlur=u*3.2;ctx.shadowOffsetY=u*1.1;
    ctx.fillStyle='#17181B';rr(ctx,r.x-pad,r.y-pad,r.w+pad*2,r.h+pad*2,rad+pad);ctx.fill();
    ctx.shadowColor='transparent';ctx.lineWidth=Math.max(1,pad*.18);ctx.strokeStyle='rgba(255,255,255,.14)';
    rr(ctx,r.x-pad+ctx.lineWidth/2,r.y-pad+ctx.lineWidth/2,r.w+pad*2-ctx.lineWidth,r.h+pad*2-ctx.lineWidth,rad+pad);ctx.stroke();
  }else if(S.frame==='shadow'){
    ctx.shadowColor=night?'rgba(0,0,0,.5)':'rgba(25,35,50,.2)';ctx.shadowBlur=u*3.4;ctx.shadowOffsetY=u*1.2;
    ctx.fillStyle=c.bg;rr(ctx,r.x,r.y,r.w,r.h,rad);ctx.fill();
  }
  ctx.restore();
  ctx.save();rr(ctx,r.x,r.y,r.w,r.h,rad);ctx.clip();ctx.imageSmoothingQuality='high';ctx.drawImage(img,r.x,r.y,r.w,r.h);ctx.restore();
  if(extra)extra(ctx,r,rad);
  if(S.frame==='line'){ctx.save();ctx.lineWidth=u*.2;ctx.strokeStyle=rgba(c.ink,.42);rr(ctx,r.x,r.y,r.w,r.h,rad);ctx.stroke();ctx.restore();}
  if(S.frame==='corners'){
    ctx.save();ctx.lineWidth=u*.16;ctx.strokeStyle=rgba(c.ink,.6);const o=u*.9,L=u*2.4;
    for(const[x,y,sx,sy]of[[r.x-o,r.y-o,1,1],[r.x+r.w+o,r.y-o,-1,1],[r.x-o,r.y+r.h+o,1,-1],[r.x+r.w+o,r.y+r.h+o,-1,-1]]){
      ctx.beginPath();ctx.moveTo(x+sx*L,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*L);ctx.stroke();}
    ctx.restore();
  }
  if(S.frame==='phone'){ctx.save();ctx.fillStyle='#050506';const iw_=r.w*.29,ih_=r.w*.082;rr(ctx,r.x+(r.w-iw_)/2,r.y+r.w*.03,iw_,ih_,ih_/2);ctx.fill();ctx.restore();}
  if(preview&&S.scaleMode==='single'&&S.sel===s.id){ctx.save();ctx.setLineDash([u*1.2,u*.8]);ctx.lineWidth=u*.35;ctx.strokeStyle='#2F7DE1';rr(ctx,r.x-u*.8,r.y-u*.8,r.w+u*1.6,r.h+u*1.6,rad+u*.8);ctx.stroke();ctx.restore();}
}

/* ---------------- preview render ---------------- */
const cv=$('#cv'),stage=$('#stage');let raf=0,lastHits=[],view={W:3600,H:2700};
function dims(){return RATIOS[S.ratio];}
function req(){if(!raf)raf=requestAnimationFrame(render);}
function render(){
  raf=0;const[W,H]=dims();stage.style.setProperty('--ar',(W/H).toFixed(4));
  const sw=stage.clientWidth-24,sh=stage.clientHeight-24;if(sw<=0||sh<=0)return;
  const k=Math.min(sw/W,sh/H),cw=Math.floor(W*k),ch=Math.floor(H*k),dpr=Math.min(window.devicePixelRatio||1,2);
  cv.style.width=cw+'px';cv.style.height=ch+'px';
  const pw=Math.round(cw*dpr),ph=Math.round(ch*dpr);if(cv.width!==pw||cv.height!==ph){cv.width=pw;cv.height=ph;}
  const ctx=cv.getContext('2d');ctx.setTransform(pw/W,0,0,ph/H,0,0);
  // Diagonal clipping has antialiased edges; start each preview from a clean canvas like export.
  ctx.clearRect(0,0,W,H);
  MARKS=[];lastHits=drawPoster(ctx,W,H,{preview:true});view={W,H};const marks=MARKS;MARKS=null;markText(marks);
  LoviaArtMosaic.apply(ctx,{preview:true});
  if(!drag)refreshChips();
  $('#stageMeta').textContent=`${W}×${H}`;
  syncCbar();
}
new ResizeObserver(req).observe(stage);

/* ---------------- drag ---------------- */
let drag=null,pinned=false;
// 固定截圖: while pinned the preview ignores drags so a stray touch can't move a screenshot
$('#pinShots').addEventListener('click',e=>{pinned=!pinned;const b=e.currentTarget;
  b.setAttribute('aria-pressed',String(pinned));b.lastChild.textContent=pinned?'已固定':'固定截圖';cv.classList.toggle('pinned',pinned);});
function toLogical(e){const b=cv.getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*view.W,y:(e.clientY-b.top)/b.height*view.H};}
cv.addEventListener('pointerdown',e=>{
  if(pinned)return;
  const p=toLogical(e);let hit=null;
  for(let i=lastHits.length-1;i>=0;i--){const h=lastHits[i];if(p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){hit=h;break;}}
  if(!hit){if(S.sel&&S.scaleMode==='single'){S.sel=null;syncSel();req();}return;}
  e.preventDefault();S.sel=hit.shot.id;drag={shot:hit.shot,sx:p.x,sy:p.y,dx:hit.shot.dx,dy:hit.shot.dy};
  cv.setPointerCapture(e.pointerId);cv.classList.add('dragging');syncSel();req();
});
cv.addEventListener('pointermove',e=>{if(!drag)return;const p=toLogical(e),mn=Math.min(view.W,view.H);
  drag.shot.dx=drag.dx+(p.x-drag.sx)/mn;drag.shot.dy=drag.dy+(p.y-drag.sy)/mn;req();});
const endDrag=()=>{drag=null;cv.classList.remove('dragging');};
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
// 雙擊放回原位
cv.addEventListener('dblclick',e=>{
  if(pinned)return;const p=toLogical(e);
  for(let i=lastHits.length-1;i>=0;i--){const h=lastHits[i];if(p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){h.shot.dx=h.shot.dy=0;req();break;}}
});

/* ---------------- UI: tabs ---------------- */
function showPane(id){
  $$('.tabs [role=tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.pane===id)));
  $$('.pane').forEach(p=>p.classList.toggle('is-active',p.id===id));
  if(openField&&id!=='pane-text'){openField=null;renderTextCards();req();}
}
$$('.tabs [role=tab]').forEach(t=>t.addEventListener('click',()=>showPane(t.dataset.pane)));
// arrow keys move between tabs
$$('.tabs').forEach(list=>list.addEventListener('keydown',e=>{
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
  const tabs=[...list.querySelectorAll('[role=tab]')],i=tabs.indexOf(document.activeElement);if(i<0)return;
  const n=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];n.focus();showPane(n.dataset.pane);e.preventDefault();
}));

/* ---------------- file pickers: a button opens the hidden input once ---------------- */
let pickerOpenedAt=0;
function openPicker(input){const now=Date.now();if(now-pickerOpenedAt<900)return;pickerOpenedAt=now;input.click();}
$$('[data-file]').forEach(btn=>btn.addEventListener('click',()=>openPicker(document.getElementById(btn.dataset.file))));

/* ---------------- UI: shots ---------------- */
function findShot(id){for(const side of['day','night']){const i=S.shots[side].findIndex(s=>s.id===id);if(i>=0)return{side,i,shot:S.shots[side][i]};}return null;}
let replaceTarget=null;
function renderLists(){
  LoviaArtMosaic.refresh();
  for(const side of['day','night']){
    const ul=$('#list-'+side);ul.textContent='';
    S.shots[side].forEach((s,i)=>{
      const li=document.createElement('li');if(S.scaleMode==='single'&&S.sel===s.id)li.className='sel';
      const th=document.createElement('canvas');const tw=44,thh=Math.round(tw/s.a);th.width=tw*2;th.height=thh*2;th.style.width=tw+'px';th.style.height=thh+'px';
      th.getContext('2d').drawImage(s.prev,0,0,th.width,th.height);th.title='選取這張';
      th.addEventListener('click',()=>{S.sel=s.id;if(S.scaleMode!=='single')setScaleMode('single');syncSel();req();});
      const mid=document.createElement('div');mid.style.minWidth='0';
      const inp=document.createElement('input');inp.type='text';inp.value=s.label;inp.placeholder='頁面名稱';inp.setAttribute('list','labelOptions');inp.maxLength=12;
      inp.setAttribute('aria-label',`${side==='day'?'日間':'夜間'}第 ${i+1} 張的頁面名稱`);
      inp.addEventListener('input',()=>{s.label=inp.value;req();});
      const tools=document.createElement('div');tools.className='shot-tools';
      // name and buttons share one row so the buttons line up with the name, not with the 示範 tag below it
      const row=document.createElement('div');row.className='shot-row';row.append(inp,tools);mid.className='shot-mid';mid.append(row);
      if(s.sample){const t=document.createElement('span');t.className='tag';t.textContent='示範';mid.append(t);}
      const up=document.createElement('button');up.className='icon-btn';up.textContent='↑';up.setAttribute('aria-label','往前移');up.disabled=i===0;
      up.addEventListener('click',()=>{const a=S.shots[side];[a[i-1],a[i]]=[a[i],a[i-1]];renderLists();req();});
      const rep=document.createElement('button');rep.className='icon-btn';rep.textContent='↺';rep.title='換一張圖';rep.setAttribute('aria-label','替換這張圖片');
      rep.addEventListener('click',()=>{replaceTarget={side,id:s.id};openPicker($('#replaceFile'));});
      const del=document.createElement('button');del.className='icon-btn';del.textContent='×';del.setAttribute('aria-label','移除這張');
      del.addEventListener('click',()=>{freeImg(S.shots[side].splice(i,1)[0].src);if(S.sel===s.id)S.sel=null;afterShotsChanged(side);syncSel();});
      tools.append(up,rep,del);
      li.append(th,mid);ul.append(li);
    });
    $('#count-'+side).textContent=`${S.shots[side].length} / ${MAX_PER_SIDE}`;
    document.querySelector(`[data-file="file-${side}"]`).hidden=S.shots[side].length>=MAX_PER_SIDE&&!S.shots[side].some(s=>s.sample);
  }
  syncPairNote();
  $('#clearSamples').hidden=![...S.shots.day,...S.shots.night].some(s=>s.sample);
  renderLayoutChoices();
}
function afterShotsChanged(side){autoColors(side);refreshDerived();syncColorInputs();renderLists();req();}
const imageFiles=files=>[...files].filter(f=>f.type.startsWith('image/')||/\.(png|jpe?g|webp|heic|gif|avif)$/i.test(f.name));
async function addFiles(side,files,{replace=false}={}){
  files=imageFiles(files);
  if(!files.length)return;
  if(replace){
    if(files.length>MAX_PER_SIDE){status(`一次最多選 ${MAX_PER_SIDE} 張。`);return;}
    S.shots[side].forEach(x=>freeImg(x.src));S.shots[side]=[];
  }else if(S.shots[side].some(s=>s.sample))S.shots[side]=S.shots[side].filter(s=>!s.sample);
  const room=MAX_PER_SIDE-S.shots[side].length;
  if(files.length>room)status(`每邊最多 ${MAX_PER_SIDE} 張，多出的 ${files.length-room} 張沒有加入。`);
  for(const f of files.slice(0,Math.max(0,room))){
    try{const im=await fileToImage(f);const n=S.shots[side].length;S.shots[side].push(makeShot(im,DEFAULT_LABELS[n]||'',false));}
    catch(err){status(err.message);}
  }
  afterShotsChanged(side);
}
for(const side of['day','night']){
  $('#file-'+side).addEventListener('change',e=>{addFiles(side,e.target.files);e.target.value='';});
  $('#batch-'+side).addEventListener('change',e=>{addFiles(side,e.target.files,{replace:true});e.target.value='';});
  const box=document.querySelector(`.side-box[data-side="${side}"]`);
  box.addEventListener('dragover',e=>{e.preventDefault();});
  box.addEventListener('drop',e=>{e.preventDefault();addFiles(side,e.dataTransfer.files);});
}
$('#replaceFile').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file||!replaceTarget)return;
  const{side,id}=replaceTarget;replaceTarget=null;
  const i=S.shots[side].findIndex(s=>s.id===id);if(i<0)return;
  try{const im=await fileToImage(file);const old=S.shots[side][i];freeImg(old.src);const nw=makeShot(im,old.labelSrc||old.label,false);nw.label=old.label;nw.labelOut=old.label;S.shots[side][i]=nw;if(S.sel===id)S.sel=nw.id;afterShotsChanged(side);syncSel();status('已替換。');}
  catch(err){status(err.message);}
});
$('#clearSamples').addEventListener('click',()=>{for(const side of['day','night'])S.shots[side]=S.shots[side].filter(s=>!s.sample);S.sel=null;renderLists();syncSel();req();});
$('#resetPos').addEventListener('click',()=>{for(const s of[...S.shots.day,...S.shots.night]){s.dx=s.dy=0;s.scale=1;}syncSel();req();});
function setScaleMode(v){S.scaleMode=v;setSeg('scaleMode',v);syncSel();req();}
function syncSel(){
  const box=$('#selbox');
  if(S.scaleMode==='all'){
    const all=[...S.shots.day,...S.shots.night];box.hidden=!all.length;
    const v=all.length?Math.round(all[0].scale*100):100;
    $('#selText').textContent='全部截圖一起縮放';$('#selScale').value=v;$('#selScaleNum').value=v;
  }else{
    const f=S.sel&&findShot(S.sel);box.hidden=!f;
    if(f){$('#selText').textContent=`已選取：${f.side==='day'?'日間':'夜間'}第 ${f.i+1} 張${f.shot.label?'（'+f.shot.label+'）':''}`;
      const v=Math.round(f.shot.scale*100);$('#selScale').value=v;$('#selScaleNum').value=v;}
  }
  $('#selHint').hidden=!box.hidden;
  renderLists();
}
function applyScale(v){
  v=clamp(Math.round(v),20,300);
  if(S.scaleMode==='all')for(const s of[...S.shots.day,...S.shots.night])s.scale=v/100;
  else{const f=findShot(S.sel);if(!f)return;f.shot.scale=v/100;}
  $('#selScale').value=v;req();
}
$('#selScale').addEventListener('input',e=>{$('#selScaleNum').value=e.target.value;applyScale(Number(e.target.value));});
$('#selScaleNum').addEventListener('change',e=>{const v=clamp(Number(e.target.value)||100,20,300);e.target.value=v;applyScale(v);});
$('#selReset').addEventListener('click',()=>{
  if(S.scaleMode==='all'){for(const s of[...S.shots.day,...S.shots.night]){s.dx=s.dy=0;s.scale=1;}}
  else{const f=findShot(S.sel);if(!f)return;f.shot.dx=f.shot.dy=0;f.shot.scale=1;}
  syncSel();req();
});
$('#selDone').addEventListener('click',()=>{if(S.scaleMode==='all')setScaleMode('single');S.sel=null;syncSel();req();});

/* ---------------- colour bar under the preview, contrast warnings ---------------- */
let cbarKey='';
const NAMES={bg:'底色',ink:'文字',accent:'強調'};
function syncCbar(){
  const key=JSON.stringify(S.colors);if(key===cbarKey)return;cbarKey=key;
  const bar=$('#cbar');bar.textContent='';
  for(const side of['day','night']){
    const lab=document.createElement('span');lab.className='lab'+(side==='night'?' n':'');lab.textContent=side==='day'?'日':'夜';bar.append(lab);
    for(const k of['bg','ink','accent']){const c=S.colors[side][k];
      const b=document.createElement('button');b.type='button';b.title=`${side==='day'?'日間':'夜間'}${NAMES[k]} ${c}`;
      const i=document.createElement('i');i.style.background=c;const t=document.createElement('b');t.textContent=c;b.append(i,t);
      b.addEventListener('click',()=>{showPane('pane-look');const el=document.querySelector(`[data-colors="${side}"] [data-c="${k}"]`);if(el){el.scrollIntoView({block:'center'});el.focus();}});
      bar.append(b);}
  }
  for(const side of['day','night']){
    const w=document.querySelector(`[data-warn="${side}"]`);if(!w)continue;
    const{bg,ink:fg}=S.colors[side],r=contrast(fg,bg);
    w.hidden=r>=3;w.textContent='';if(r>=3)continue;
    const fix=relLum(bg)>.3?'#1E2024':'#F4F2EC';
    const m=document.createElement('span');m.textContent=`文字和底色太接近（對比 ${r.toFixed(1)}），畫報上可能看不清楚。`;
    const b=document.createElement('button');b.type='button';b.textContent=`改用 ${fix}`;
    b.addEventListener('click',()=>{S.colors[side].ink=fix;S.autoColor[side]=false;syncColorInputs();req();});
    w.append(m,b);
  }
}

/* ---------------- header, drawer ---------------- */
const lib=$('#lib');
function openLib(){if(!lib.open)lib.showModal();}
for(const id of['#topLib','#openLib'])$(id).addEventListener('click',openLib);
$('#libClose').addEventListener('click',()=>lib.close());
lib.addEventListener('click',e=>{if(e.target===lib)lib.close();});
for(const id of['#topSave','#stSave','#libSave'])$(id).addEventListener('click',()=>$('#savePreset').click());
for(const id of['#topExport','#stExport'])$(id).addEventListener('click',()=>$('#exportOne').click());

/* ---------------- UI: layout / segs ---------------- */
function syncPairNote(){
  const d=S.shots.day.length,n=S.shots.night.length,el=$('#pairNote');
  el.hidden=isSingle(S.layout)||d===n||!d||!n;
  el.textContent=`日間 ${d} 張、夜間 ${n} 張。成對的版型會依序一張日配一張夜，多出來的那張單獨放。`;
}
function syncLayoutUI(){
  $$('.lays button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===S.layout)));
  const spanable=S.layout==='fold'||S.layout==='news';
  $('#grpSingle').hidden=!isSingle(S.layout);
  $('#grpSpan').hidden=!spanable;
  $('#grpOrder').hidden=isSingle(S.layout)||(spanable&&S.span!=='both');
  $('#grpCompare').hidden=S.layout!=='compare';
  $('#grpHero').hidden=S.layout!=='single-hero'&&S.layout!=='news';
  renderLayoutChoices();
  $('#exportPair').textContent=isSingle(S.layout)?'日間、夜間各存一張':'日夜、夜日各存一張';
  $('#grpDir').hidden=!(S.layout==='split'||S.layout==='diagonal');
  $('#grpTilt').hidden=!(S.layout==='single-stagger'||S.layout==='single-overlap');
  $('#tiltAlt').hidden=S.layout==='single-overlap';
  if(S.layout==='single-overlap'&&S.tilt==='alt'){S.tilt='left-high';setSeg('tilt','left-high');}
  const blend=S.layout==='pairs'||S.layout==='alternate';
  $('#blendNote').hidden=!blend||['solid','custom','tb'].includes(S.bg);
  $('#tintRow').hidden=S.bg!=='blur'||blend;
  $('#customRow').hidden=S.bg!=='custom';
  $('#tbRow').hidden=S.bg!=='tb';
  $('#imageRow').hidden=S.bg!=='image';
  $('#glassRow').hidden=S.bg!=='glass';
  $('#bgDesc').textContent=BG_DESC[S.bg]||'';
  $('#five').parentElement.hidden=S.palette!=='five';
  $('#ruleColorRow').hidden=!S.rules;$('#ruleOpRow').hidden=!S.rules;
  $('#textColorRows').hidden=S.textMode!=='custom';
  // 只屬於某一種標題排法的選項，切到另一種就收起來
  $('#alignRow').hidden=S.headline==='bar';
  $('#prefixRow').hidden=S.headline!=='bar';
  $('#noDetails').hidden=['#grpOrder','#grpDir','#grpTilt','#grpCompare','#grpHero'].some(id=>!$(id).hidden);
  syncPairNote();
}
$$('.lays button').forEach(b=>b.addEventListener('click',()=>{S.layout=b.dataset.layout;S.sel=null;syncLayoutUI();syncSel();req();}));
$$('#ratios button').forEach(b=>b.addEventListener('click',()=>{S.ratio=b.dataset.ratio;$$('#ratios button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));syncQuality();req();}));
function bindSeg(seg){
  const key=seg.dataset.seg;
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    if(key==='scaleMode'){setScaleMode(b.dataset.v);return;}
    S[key]=b.dataset.v;
    seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    syncLayoutUI();req();
  }));
}
$$('[data-seg]').forEach(seg=>{if(seg.dataset.seg!=='quality')bindSeg(seg);});
function renderLayoutChoices(){
  const pairs=$('#comparePairs'),heroes=$('#heroButtons');if(!pairs||!heroes)return;
  const n=Math.max(S.shots.day.length,S.shots.night.length);pairs.textContent='';
  if(S.comparePair>=n)S.comparePair=Math.max(0,n-1);
  for(let i=0;i<n;i++){const b=document.createElement('button');b.type='button';b.textContent=String(i+1);
    const lab=(S.shots.day[i]||S.shots.night[i]||{}).label;if(lab)b.textContent=`${i+1} ${lab}`;
    b.setAttribute('aria-pressed',String(i===S.comparePair));b.addEventListener('click',()=>{S.comparePair=i;renderLayoutChoices();req();});pairs.append(b);}
  heroes.textContent='';
  if(S.layout==='news'){
    const A=S.order==='nd'?'night':'day',B=A==='day'?'night':'day',all=[...S.shots[A].map(s=>[A,s]),...S.shots[B].map(s=>[B,s])];
    const cur=all.length?newsHeroFor(all,A,B):-1;
    all.forEach(([sd,sh],i)=>{const b=document.createElement('button');b.type='button';const k=sd==='day'?'日':'夜',j=S.shots[sd].indexOf(sh)+1;
      b.textContent=sh.label?`${k}${j} ${sh.label}`:`${k}${j}`;
      b.setAttribute('aria-pressed',String(i===cur));b.addEventListener('click',()=>{S.newsHero=i;renderLayoutChoices();req();});heroes.append(b);});
    return;
  }
  const list=S.shots[S.single]||[];
  const cur=list.length?heroIndexFor(list):-1;
  list.forEach((sh,i)=>{const b=document.createElement('button');b.type='button';b.textContent=sh.label?`${i+1} ${sh.label}`:String(i+1);
    b.setAttribute('aria-pressed',String(i===cur));b.addEventListener('click',()=>{S.heroIndex=i;renderLayoutChoices();req();});heroes.append(b);});
}
function syncSegs(){$$('[data-seg]').forEach(seg=>{const k=seg.dataset.seg;if(k!=='quality'&&S[k]!==undefined)setSeg(k,S[k]);});}
function setSeg(key,v){const seg=document.querySelector(`[data-seg="${key}"]`);if(seg)seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===String(v))));}
function qualityOptions(){
  const[W,H]=dims(),L=Math.max(W,H);
  const raw=[['1080P',1440/L],['標準',.5],['2K 高清',2560/L],['高清',.75],['原尺寸',1],['原畫超清',3600/L]];
  const out=[];
  for(const[n,k]of raw){const w=Math.round(W*k),h=Math.round(H*k);const ex=out.find(o=>Math.abs(o.w-w)<4);
    if(ex)ex.names.push(n);else out.push({names:[n],k,w,h});}
  return out.sort((a,b)=>a.w-b.w);
}
function currentQuality(){const o=qualityOptions();return o.find(q=>q.names.includes(S.quality))||o.find(q=>q.names.includes('高清'))||o[o.length-1];}
function syncQuality(){
  const seg=$('#qualitySeg');seg.textContent='';const cur=currentQuality();
  for(const q of qualityOptions()){
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(q.w===cur.w&&q.h===cur.h));
    b.innerHTML=`<b></b><small></small>`;b.querySelector('b').textContent=q.names.join('／');b.querySelector('small').textContent=`${q.w}×${q.h}`;
    b.addEventListener('click',()=>{S.quality=q.names[0];syncQuality();});
    seg.append(b);
  }
}
// [slider id, S value = slider ÷ this, unit shown]
const SLIDERS=[['size',100,'%'],['gap',100,'%'],['radius',100,''],['tint',100,'%'],['grain',100,''],['titleSize',100,'%'],
  ['authorSize',100,'%'],['dateSize',100,'%'],['messageSize',100,'%'],['taglineSize',100,'%'],['labelSize',100,'%'],
  ['bgBlur',1,' px'],['bgOpacity',100,'%'],['glass',100,'%'],['ruleOpacity',100,'%'],['compareAt',100,'%']];
for(const[id,div]of SLIDERS){
  const el=$('#'+id),out=$('#'+id+'Out');
  const h=()=>{S[id]=Number(el.value)/div;if(document.activeElement!==out)out.value=el.value;req();};
  el.addEventListener('input',h);
  // 旁邊的數字框：輸入完就套用，超出範圍會拉回最近的值
  const typed=commit=>{if(out.value==='')return;let v=Number(out.value);if(!isFinite(v))return;
    const lo=Number(el.min),hi=Number(el.max);if(!commit&&(v<lo||v>hi))return;v=clamp(Math.round(v),lo,hi);
    el.value=String(v);if(commit)out.value=el.value;S[id]=v/div;req();};
  out.addEventListener('input',()=>typed(false));
  out.addEventListener('change',()=>{if(out.value==='')out.value=el.value;typed(true);});
  h();
}
$('#ruleColor').addEventListener('input',e=>{S.ruleColor=e.target.value.toUpperCase();req();});
function syncTextColors(){for(const k of['textDay','textNight']){$('#'+k).value=S[k].toLowerCase();$('#'+k+'Hex').textContent=S[k];}}
for(const k of['textDay','textNight'])$('#'+k).addEventListener('input',e=>{S[k]=e.target.value.toUpperCase();$('#'+k+'Hex').textContent=S[k];req();});
// switching to custom starts from the colours the poster shows now
$$('[data-seg="textMode"] button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.v==='custom'&&!S.textTouched){S.textDay=S.colors.day.ink;S.textNight=S.colors.night.ink;S.textTouched=true;syncTextColors();req();}}));

/* ---------------- UI: colours ---------------- */
function syncColorInputs(){
  for(const side of['day','night']){const g=document.querySelector(`[data-colors="${side}"]`);
    for(const k of['bg','ink','accent']){g.querySelector(`[data-c="${k}"]`).value=S.colors[side][k].toLowerCase();g.querySelector(`[data-hex="${k}"]`).value=S.colors[side][k].toUpperCase();}}
  $('#customBg').value=S.customBg.toLowerCase();$('#customBgHex').value=S.customBg;
  $('#tbTop').value=S.tbTop.toLowerCase();$('#tbBottom').value=S.tbBottom.toLowerCase();$('#tbTopHex').textContent=S.tbTop;$('#tbBottomHex').textContent=S.tbBottom;
  renderFive();
}
for(const side of['day','night']){const g=document.querySelector(`[data-colors="${side}"]`);
  for(const k of['bg','ink','accent']){
    g.querySelector(`[data-c="${k}"]`).addEventListener('input',e=>{S.colors[side][k]=e.target.value.toUpperCase();S.autoColor[side]=false;g.querySelector(`[data-hex="${k}"]`).value=S.colors[side][k];toneCache.clear();req();});
    g.querySelector(`[data-hex="${k}"]`).addEventListener('change',e=>{const v=e.target.value.trim();if(isHex(v)){S.colors[side][k]=normHex(v);S.autoColor[side]=false;syncColorInputs();req();}else{e.target.value=S.colors[side][k];status('色碼格式是 # 加 6 位數，例如 #E3E8EB。');}});
  }
}
$$('[data-reextract]').forEach(b=>b.addEventListener('click',()=>{const side=b.dataset.reextract;S.autoColor[side]=true;autoColors(side);syncColorInputs();req();status(`已從${side==='day'?'日間':'夜間'}截圖重新取色。`);}));
$('#customBg').addEventListener('input',e=>{S.customBg=e.target.value.toUpperCase();$('#customBgHex').value=S.customBg;req();});
$('#customBgHex').addEventListener('change',e=>{const v=e.target.value.trim();if(isHex(v)){S.customBg=normHex(v);syncColorInputs();req();}else e.target.value=S.customBg;});
$('#tbTop').addEventListener('input',e=>{S.tbTop=e.target.value.toUpperCase();S.tbCustom=true;$('#tbTopHex').textContent=S.tbTop;req();});
$('#tbBottom').addEventListener('input',e=>{S.tbBottom=e.target.value.toUpperCase();S.tbCustom=true;$('#tbBottomHex').textContent=S.tbBottom;req();});
$('#tbAuto').addEventListener('click',()=>{S.tbCustom=false;autoTB();syncColorInputs();req();status('已從截圖重新取色。');});
function renderFive(){
  const box=$('#five');box.textContent='';
  S.five.forEach((c,i)=>{const l=document.createElement('label');l.className='dot';l.style.background=c;l.title=c;
    const inp=document.createElement('input');inp.type='color';inp.value=c.toLowerCase();inp.setAttribute('aria-label',`第 ${i+1} 個顏色 ${c}`);
    inp.addEventListener('input',()=>{S.five[i]=inp.value.toUpperCase();l.style.background=S.five[i];l.title=S.five[i];S.fiveCustom=true;req();});
    l.append(inp);box.append(l);});
}
$('#fiveAuto').addEventListener('click',()=>{S.fiveCustom=false;autoFive();renderFive();req();status('已重新取色。');});
const keptFiles={bg:null,cover:null}; // the files behind the uploaded backdrop and cover (fonts keep theirs in localFonts)
async function pickImage(input,nameEl,set){
  const file=input.files[0];input.value='';if(!file)return;
  try{const im=await fileToImage(file);set(im,file);nameEl.textContent=file.name;req();}catch(err){status(err.message);}
}
$('#bgFile').addEventListener('change',e=>pickImage(e.target,$('#bgFileName'),(im,f)=>{freeImg(S.bgImage);S.bgImage=im;keptFiles.bg=f;}));
$('#coverFile').addEventListener('change',e=>pickImage(e.target,$('#coverFileName'),(im,f)=>{freeImg(S.cover);S.cover=im;keptFiles.cover=f;}));

/* ---------------- UI: text ---------------- */
const textIds=['title','tagline','author','date','message','labelDay','labelNight'];
function setText(id,v){const el=$('#'+id);if(!el||typeof v!=='string')return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}
for(const id of textIds){const el=$('#'+id);if(id!=='tagline'&&id!=='labelDay'&&id!=='labelNight')el.value=S[id];el.addEventListener('input',()=>{S[id]=el.value;if(id==='author'){try{localStorage.setItem('lc.author',el.value);}catch(e){}}req();});S[id]=el.value;}
$('#today').addEventListener('click',()=>{setText('date',fmtToday());$('#showDate').checked=true;S.showDate=true;req();});
$('#thisMonth').addEventListener('click',()=>{setText('date',fmtMonth());$('#showDate').checked=true;S.showDate=true;req();});
const TOGGLES=['showDate','sideLabels','captions','swatches','hexes','compareHandle','cardFrame','authorPrefix','rules'];
for(const id of TOGGLES){const el=$('#'+id);el.checked=S[id];el.addEventListener('change',()=>{S[id]=el.checked;syncLayoutUI();req();});}
function allFonts(){return{...FONTS,...localFonts};}
function renderFonts(){
  const box=$('#fonts');box.textContent='';
  for(const[k,f]of Object.entries(allFonts())){
    const b=document.createElement('button');b.setAttribute('aria-pressed',String(S.font===k));
    const big=document.createElement('b');big.textContent='Aa 字';big.style.fontFamily=f.stack;
    const sm=document.createElement('span');sm.textContent=f.name;b.append(big,sm);
    b.addEventListener('click',async()=>{S.font=k;try{localStorage.setItem('lc.font',k);}catch(e){}renderFonts();await ensureFont();req();});
    box.append(b);
  }
  const g=curFont();$('#globalFontName').textContent=g.name;$('#globalFontSample').style.fontFamily=g.stack;
  renderTextCards();
}
$('#globalFontBtn').addEventListener('click',()=>{const b=$('#globalFontBtn'),open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(open));$('#globalFontBox').hidden=!open;});
const famsOf=f=>(f.stack.match(/"[^"]+"|[A-Za-z][\w ]*(?=,|$)/g)||[f.fam]).map(x=>x.replace(/"/g,'').trim()).filter(x=>!/^(serif|sans-serif|monospace)$/.test(x));
async function ensureFont(){
  await window.dnFontCss;
  const txt=[S.title,S.tagline,S.author,S.date,S.message,S.labelDay,S.labelNight,'首頁書架閱讀頁目錄筆記#0123456789ABCDEF'].join('');
  const fonts=new Set([curFont(),...TEXT_FIELDS.map(fieldFont)]);
  // 整串字型都要載入：繁體字型缺的簡體字由後面的字型補上，沒先載好畫出來會變成系統字
  const loads=[];for(const f of fonts)for(const fam of famsOf(f))loads.push(document.fonts.load(`${f.tw} 40px "${fam}"`,txt),document.fonts.load(`${f.bw} 40px "${fam}"`,txt));
  try{await Promise.race([Promise.all(loads),new Promise(r=>setTimeout(r,4000))]);}catch(e){}
}
// imported fonts: no limit; each gets its own key (local, local2…) and file slot (font, font2…)
const fontSlot=k=>k.replace('local','font'), slotKey=sl=>sl.replace('font','local');
async function loadLocalFont(file,key){
  if(!('FontFace'in window))throw new Error('這個瀏覽器不支援匯入字體。');
  if(!key){
    const same=Object.entries(localFonts).find(([,f])=>f.file&&f.file.name===file.name&&f.file.size===file.size);
    if(same)return same[0];
    let n=1;while(localFonts[n===1?'local':'local'+n])n++;key=n===1?'local':'local'+n;
  }
  const fam=key==='local'?'ShowcaseLocal':'ShowcaseLocal'+key.slice(5);
  const face=new FontFace(fam,await file.arrayBuffer());await face.load();
  if(localFonts[key]&&localFonts[key].face)document.fonts.delete(localFonts[key].face);
  document.fonts.add(face);
  localFonts[key]={name:(file.name||'font').replace(/\.[^.]+$/,'').slice(0,10),stack:`"${fam}",serif`,fam,tw:400,bw:400,file,face};
  return key;
}
let fontTarget=null; // null = the overall font, otherwise the text field that asked for the import
$('[data-file="fontFile"]').addEventListener('click',()=>{fontTarget=null;},true);
$('#fontFile').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{
    const key=await loadLocalFont(file);
    if(fontTarget)styleOf(fontTarget).font=key;else S.font=key;
    renderFonts();req();status(`已套用字體「${localFonts[key].name}」。`);
  }catch(err){status(err.message&&err.message.includes('瀏覽器')?err.message:'這個字體檔無法讀取，請確認是 TTF、OTF、WOFF 或 WOFF2。');}
});

/* ---------------- text cards: each field's own font, size and colour ---------------- */
const TEXT_FIELDS=['title','tagline','author','date','message','labels'];
const FIELD_NAMES={title:'主題名稱',tagline:'副標',author:'作者',date:'日期',message:'想說的話',labels:'標籤與頁面名稱'};
const SIZE_OF={title:'titleSize',tagline:'taglineSize',author:'authorSize',date:'dateSize',message:'messageSize',labels:'labelSize'};
let openField=null;
function styleOf(key){if(!S.textStyle[key])S.textStyle[key]={};return S.textStyle[key];}
function tidyStyle(key){const t=S.textStyle[key];if(t&&!t.font&&!t.day&&!t.night)delete S.textStyle[key];}
// the colour a field shows now on each side, for the swatches
function shownInk(side){return S.textMode==='custom'?(side==='night'?S.textNight:S.textDay):S.colors[side].ink;}
function renderTextCards(){
  for(const card of $$('.tcard')){
    const key=card.dataset.field,t=S.textStyle[key]||{},own=t.font&&fontByKey(t.font),open=openField===key;
    card.classList.toggle('open',open);
    renderChips(card);
    const ed=card.querySelector('.tedit');ed.hidden=!open;
    ed.querySelectorAll('.tfonts,.tcolors').forEach(x=>x.remove());
    if(!open)continue;
    const strip=document.createElement('div');strip.className='tfonts';strip.setAttribute('role','group');strip.setAttribute('aria-label',`${FIELD_NAMES[key]}的字體`);
    const fbtn=(k,f)=>{const b=document.createElement('button');b.type='button';b.className='tfont'+(k?'':' follow');b.setAttribute('aria-pressed',String((t.font||null)===(k||null)||(!k&&!own)));
      const big=document.createElement('b');const sm=document.createElement('small');
      if(k){big.textContent='Aa 字';big.style.fontFamily=f.stack;sm.textContent=f.name;}else{big.textContent='跟整體';sm.textContent=curFont().name;}
      b.append(big,sm);b.addEventListener('click',async()=>{if(k)styleOf(key).font=k;else if(S.textStyle[key]){delete S.textStyle[key].font;tidyStyle(key);}renderTextCards();await ensureFont();req();});strip.append(b);};
    fbtn(null);for(const[k,f]of Object.entries(allFonts()))fbtn(k,f);
    const add=document.createElement('button');add.type='button';add.className='tfont add-font';add.innerHTML='<b style="font-size:13px;line-height:1.75">＋ 匯入</b><small>TTF・OTF・WOFF</small>';
    add.addEventListener('click',()=>{fontTarget=key;openPicker($('#fontFile'));});strip.append(add);
    ed.prepend(strip);
    const cols=document.createElement('div');cols.className='tcolors';
    for(const side of['day','night']){
      const l=document.createElement('label');const inp=document.createElement('input');inp.type='color';inp.value=(t[side]||shownInk(side)).toLowerCase();
      inp.setAttribute('aria-label',`${FIELD_NAMES[key]}在${side==='day'?'日間':'夜間'}那一側的顏色`);
      inp.addEventListener('input',()=>{const st=styleOf(key);st[side]=inp.value.toUpperCase();
        // the first pick fixes both sides, so the other side does not jump back to auto
        const o=side==='day'?'night':'day';if(!st[o])st[o]=shownInk(o);renderChips(card);req();});
      l.append(inp,document.createTextNode(side==='day'?'日間':'夜間'));cols.append(l);
    }
    const reset=document.createElement('button');reset.type='button';reset.className='btn ghost small treset';reset.textContent='還原成整體';
    reset.addEventListener('click',async()=>{delete S.textStyle[key];const sl=$('#'+SIZE_OF[key]);sl.value='100';sl.dispatchEvent(new Event('input'));renderTextCards();await ensureFont();req();});
    cols.append(reset);ed.append(cols);
  }
}
// rebuild every card's chips; a chip that had keyboard focus gets it back
function refreshChips(){
  const a=document.activeElement,card=a&&a.classList.contains('tchip')&&a.closest('.tcard'),i=card?[...card.querySelectorAll('.tchip')].indexOf(a):-1;
  $$('.tcard').forEach(renderChips);
  if(card){const c=card.querySelectorAll('.tchip')[i];if(c)c.focus();}
}
function renderChips(card){
  const key=card.dataset.field,t=S.textStyle[key]||{},own=t.font&&fontByKey(t.font),open=openField===key;
  const chips=card.querySelector('.tchips');chips.textContent='';
  const chip=(html,set)=>{const b=document.createElement('button');b.type='button';b.className='tchip'+(set?' set':'');b.innerHTML=html;
    b.setAttribute('aria-expanded',String(open));
    b.addEventListener('click',()=>{openField=open?null:key;renderTextCards();markText(lastMarks);});chips.append(b);return b;};
  const fc=chip('<span style="font-family:inherit">Aa</span><span class="tn"></span>',!!own);
  fc.querySelector('span').style.fontFamily=(own||curFont()).stack;fc.querySelector('.tn').textContent=own?own.name:'跟整體';
  const pct=Math.round(S[SIZE_OF[key]]*100);chip(`字級 ${pct}%`,pct!==100);
  const hasInk=!!(t.day||t.night);
  const d=hasInk?(t.day||shownInk('day')):null,n=hasInk?(t.night||shownInk('night')):null;
  chip(hasInk?`<span class="td" style="background:${d}"></span><span class="td" style="background:${n}"></span>自訂`:`<span class="td" style="background:conic-gradient(${shownInk('day')} 0 50%,${shownInk('night')} 0)"></span>跟整體`,hasInk);
}
let lastMarks=[];
function markText(marks){
  lastMarks=marks||[];const el=$('#textMark');
  const bs=lastMarks.filter(b=>b.key===openField&&b.w>0);
  if(!bs.length){el.hidden=true;return;}
  const x0=Math.min(...bs.map(b=>b.x)),y0=Math.min(...bs.map(b=>b.y)),x1=Math.max(...bs.map(b=>b.x+b.w)),y1=Math.max(...bs.map(b=>b.y+b.h));
  const cb=cv.getBoundingClientRect(),sb=stage.getBoundingClientRect(),kx=cb.width/view.W,ky=cb.height/view.H,pad=6;
  Object.assign(el.style,{left:(cb.left-sb.left+x0*kx-pad)+'px',top:(cb.top-sb.top+y0*ky-pad)+'px',width:((x1-x0)*kx+pad*2)+'px',height:((y1-y0)*ky+pad*2)+'px'});
  el.hidden=false;
}
document.fonts&&document.fonts.addEventListener&&document.fonts.addEventListener('loadingdone',req);
LoviaExtra.fontsReady.then(req);

/* ---------------- Android colour picker (as on the Lovia page) ---------------- */
if(/Android/i.test(navigator.userAgent)){
  const dlg=$('#hsv'),sq=$('#hsvSquare'),hue=$('#hsvHue'),hexOut=$('#hsvHex');let target=null,hsv={h:0,s:0,v:1};
  const toHex=({h,s,v})=>{const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1));};return rgbToHex(f(5)*255,f(3)*255,f(1)*255);};
  const fromHex=hx=>{const[r,g,b]=hexToRgb(hx).map(x=>x/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d)h=hueOf(r,g,b,mx,d);return{h,s:mx?d/mx:0,v:mx};};
  const drawSq=()=>{const x=sq.getContext('2d'),w=sq.width,h=sq.height;x.fillStyle=`hsl(${hsv.h},100%,50%)`;x.fillRect(0,0,w,h);
    let g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#fff');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);
    g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,w,h);
    x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(hsv.s*w,(1-hsv.v)*h,7,0,Math.PI*2);x.stroke();
    const hx=toHex(hsv);hexOut.textContent=hx;if(target){target.value=hx.toLowerCase();target.dispatchEvent(new Event('input',{bubbles:true}));}};
  const move=e=>{const b=sq.getBoundingClientRect();hsv.s=clamp((e.clientX-b.left)/b.width,0,1);hsv.v=1-clamp((e.clientY-b.top)/b.height,0,1);drawSq();};
  let down=false;sq.addEventListener('pointerdown',e=>{down=true;sq.setPointerCapture(e.pointerId);move(e);});sq.addEventListener('pointermove',e=>{if(down)move(e);});sq.addEventListener('pointerup',()=>down=false);
  hue.addEventListener('input',()=>{hsv.h=Number(hue.value);drawSq();});
  $('#hsvDone').addEventListener('click',()=>dlg.close());dlg.addEventListener('close',()=>{target=null;});
  document.addEventListener('click',e=>{const t=e.target;if(t instanceof HTMLInputElement&&t.type==='color'){e.preventDefault();target=t;hsv=fromHex(t.value);hue.value=Math.round(hsv.h);dlg.showModal();drawSq();}},true);
}

/* ---------------- large preview ---------------- */
let zoom=1,largeURL=null;
async function openLarge(){
  await ensureFont();
  const[W,H]=dims(),k=Math.min(1,2400/Math.max(W,H)),c=document.createElement('canvas');c.width=Math.round(W*k);c.height=Math.round(H*k);
  const x=c.getContext('2d',{alpha:false});x.setTransform(k,0,0,k,0,0);drawPoster(x,W,H,{preview:false});LoviaArtMosaic.apply(x);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));if(largeURL)URL.revokeObjectURL(largeURL);largeURL=URL.createObjectURL(blob);
  $('#largeImg').src=largeURL;zoom=1;applyZoom();$('#large').showModal();$('#largeClose').focus();
}
function applyZoom(){$('#largeImg').style.width=(zoom*100)+'%';$('#zoomOutVal').textContent=Math.round(zoom*100)+'%';}
$('#openLarge').addEventListener('click',openLarge);$('#openLarge2').addEventListener('click',openLarge);
$('#zoomIn').addEventListener('click',()=>{zoom=Math.min(4,zoom+.25);applyZoom();});
$('#zoomOut').addEventListener('click',()=>{zoom=Math.max(.5,zoom-.25);applyZoom();});
$('#zoomFit').addEventListener('click',()=>{zoom=1;applyZoom();});
$('#largeClose').addEventListener('click',()=>$('#large').close());
$('#large').addEventListener('click',e=>{if(e.target.id==='large')$('#large').close();});

/* ---------------- export ---------------- */
let statusTimer=0;
function status(t){const el=$('#status');el.textContent=t;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{el.textContent='';},7000);}
function safeName(s){return(s||'reeden').replace(/[\\/:*?"<>|\s]+/g,'-').slice(0,40);}
async function renderBlob(opts={}){
  await ensureFont();
  const[W,H]=dims(),q=currentQuality(),c=document.createElement('canvas');c.width=q.w;c.height=q.h;
  const x=c.getContext('2d',{alpha:false});x.setTransform(c.width/W,0,0,c.height/H,0,0);drawPoster(x,W,H,{...opts,preview:false});LoviaArtMosaic.apply(x);
  const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('圖片產生失敗，請改用較小的尺寸再試一次。')),'image/png'));
  c.width=c.height=1;return{blob,w:q.w,h:q.h};
}
let dlNS=null;
try{if(window.claude&&typeof window.claude.use==='function')window.claude.use('downloads').then(n=>{dlNS=n;}).catch(()=>{});}catch(e){}
async function saveFile(blob,name){
  if(dlNS){
    try{await dlNS.save({filename:name,data:blob});return'saved';}
    catch(err){if(err&&err.code==='declined')return'declined';if(err&&err.code==='rate_limited'){await new Promise(r=>setTimeout(r,1500));try{await dlNS.save({filename:name,data:blob});return'saved';}catch(e2){if(e2&&e2.code==='declined')return'declined';}}}
  }
  tryDownload(blob,name);return'fallback';
}
function tryDownload(blob,name){
  try{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){}
}
let resultFiles=[];
function showResult(items,text){
  resultFiles=items.map(it=>new File([it.blob],it.name,{type:'image/png'}));
  let canShareAll=false;try{canShareAll=!!(navigator.share&&navigator.canShare&&navigator.canShare({files:resultFiles}));}catch(e){}
  $('#resultText').textContent=text||(canShareAll?'按「存到相簿」，或長按圖片選「儲存到照片」。':'長按圖片選「儲存到照片」，或按「下載 PNG」。');
  $('#resultShare').hidden=!canShareAll;
  $('#resultShare').textContent=items.length>1?`全部存到相簿（${items.length} 張）`:'存到相簿';
  $('#resultDownload').textContent=items.length>1?`下載 PNG（${items.length} 張）`:'下載 PNG';
  $('#resultDownload').classList.toggle('pri',!canShareAll);
  const box=$('#resultImgs');box.textContent='';
  for(const it of items){const im=document.createElement('img');im.src=URL.createObjectURL(it.blob);im.alt=it.name;box.append(im);}
  $('#result').showModal();$('#resultClose').focus();
}
$('#resultShare').addEventListener('click',async()=>{
  try{await navigator.share({files:resultFiles,title:S.title||'Day Night'});status('在分享選單選「儲存影像」就會存進相簿。');}
  catch(err){if(!err||err.name!=='AbortError')status('無法開啟分享，請長按圖片儲存。');}
});
$('#resultDownload').addEventListener('click',async()=>{
  for(const f of resultFiles){const how=await saveFile(f,f.name);if(how==='declined'){status('已取消儲存。');return;}}
  status(resultFiles.length>1?`已下載 ${resultFiles.length} 張。`:'已下載。');
});
$('#resultClose').addEventListener('click',()=>$('#result').close());
$('#result').addEventListener('click',e=>{if(e.target.id==='result')$('#result').close();});
$('#result').addEventListener('close',()=>$$('#resultImgs img').forEach(i=>URL.revokeObjectURL(i.src)));
function hasShots(){return S.shots.day.length+S.shots.night.length>0;}
async function busy(fn){if(!hasShots()){status('先在「截圖」加入至少一張截圖。');return;}
  const all=$$('#pane-export .btn');all.forEach(b=>b.disabled=true);status('正在產生高清圖片…');
  try{await fn();}catch(err){console.error(err);status(err.message||'匯出失敗，請再試一次。');}
  finally{all.forEach(b=>b.disabled=false);}}
$('#exportOne').addEventListener('click',()=>busy(async()=>{
  const r=await renderBlob();const name=`${safeName(S.title)}-${r.w}x${r.h}.png`;
  // 不自動下載（手機會先跳下載視窗），直接打開成品畫面，從那裡存到相簿或下載
  showResult([{blob:r.blob,name}]);status(`已產生 ${r.w}×${r.h} PNG。`);
}));
$('#exportPair').addEventListener('click',()=>busy(async()=>{
  const out=[];
  if(isSingle(S.layout)){
    for(const side of['day','night']){if(!S.shots[side].length)continue;
      const r=await renderBlob({layout:S.layout,side});out.push({blob:r.blob,name:`${safeName(S.title)}-${side==='day'?'日間':'夜間'}-${r.w}x${r.h}.png`});}
  }else{
    for(const order of['dn','nd']){
      const r=await renderBlob({order});out.push({blob:r.blob,name:`${safeName(S.title)}-${order==='dn'?'日夜':'夜日'}-${r.w}x${r.h}.png`});}
  }
  const q=currentQuality();
  showResult(out,`長按圖片選「儲存到照片」，或按下方按鈕一次存進相簿。尺寸 ${q.w}×${q.h}。`);
  status(`已產生 ${out.length} 張，尺寸 ${q.w}×${q.h}。`);
}));
if(navigator.share&&navigator.canShare){
  $('#shareOne').hidden=false;$('#exportOne').classList.add('ghost');
  $('#shareOne').addEventListener('click',()=>busy(async()=>{
    const r=await renderBlob();const name=`${safeName(S.title)}-${r.w}x${r.h}.png`;const file=new File([r.blob],name,{type:'image/png'});
    if(navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:S.title||'Day Night'});status('在分享選單選「儲存影像」就會存進相簿。');return;}
      catch(err){if(err&&err.name==='AbortError'){status('');return;}}}
    showResult([{blob:r.blob,name}]);status('請長按圖片儲存。');
  }));
}
let resetArmed=0;
$('#resetAll').addEventListener('click',e=>{
  const b=e.currentTarget;
  if(Date.now()-resetArmed<4000){try{localStorage.removeItem('lc.author');localStorage.removeItem('lc.font');}catch(err){}location.reload();return;}
  resetArmed=Date.now();b.textContent='再按一次，確認重置';setTimeout(()=>{if(Date.now()-resetArmed>=4000)b.textContent='↺ 全部重置';},4100);
});

/* ---------------- samples, language, hand-off ---------------- */
async function loadSamples(){
  for(const side of['day','night']){
    const list=[];
    for(const[label,src]of SAMPLE_IMGS[side]){try{list.push(makeShot(await imgFrom(src),label,true));}catch(e){}}
    S.shots[side]=list;autoColors(side);
  }
  refreshDerived();syncColorInputs();
}
if(window.LoviaStudio){
  LoviaStudio.onLang(()=>{
    for(const s of[...S.shots.day,...S.shots.night]){if(s.labelSrc&&s.label===s.labelOut){s.label=T(s.labelSrc);s.labelOut=s.label;}}
    renderLists();syncSel();syncQuality();renderFonts();syncLayoutUI();req();
  });
}
let readyResolve;const ready=new Promise(r=>readyResolve=r);
if(window.LoviaStudio){
  LoviaStudio.registerPage({
    ready,
    async collect(){
      const pick=async side=>{const out=[];for(const s of S.shots[side]){if(s.sample)continue;const src=s.src.currentSrc||s.src.src||'';
        if(src.startsWith('blob:')){try{out.push({blob:await(await fetch(src)).blob(),label:s.label});}catch(e){}}}return out;};
      const images={day:await pick('day'),night:await pick('night')};
      const artMosaic=LoviaArtMosaic.handoff();
      return{text:{title:S.title,author:S.author,date:S.date,message:S.message},images,artMosaic};
    },
    async apply(d){
      if(d.text){for(const k of['title','author','date','message'])if(typeof d.text[k]==='string')setText(k,d.text[k]);}
      const imgs=d.images||{};let any=false;
      const incoming=(imgs.day||[]).length+(imgs.night||[]).length;
      if(incoming)status(`正在帶入 ${incoming} 張截圖…`);
      for(const side of['day','night']){
        const list=(imgs[side]||[]).slice(0,MAX_PER_SIDE);if(!list.length)continue;any=true;
        S.shots[side].forEach(x=>freeImg(x.src));S.shots[side]=[];
        for(const[i,it]of list.entries()){try{const im=await fileToImage(it.blob);S.shots[side].push(makeShot(im,it.label||DEFAULT_LABELS[i]||'',false));}catch(e){}}
        autoColors(side);
      }
      if(any)for(const side of['day','night'])if(S.shots[side].every(s=>s.sample))S.shots[side]=[];
      if(d.artMosaic)await LoviaArtMosaic.restore(d.artMosaic);
      refreshDerived();syncColorInputs();renderLists();syncSel();req();
      if(incoming)status(`已帶入 ${incoming} 張截圖。`);
    },
  });
}

/* ---------------- motion (GIF / video) ---------------- */
const MOTION_DESC={
  split:'兩半輪流壓過彼此：日間那半慢慢蓋過夜間，再被夜間蓋回來。',diagonal:'兩半沿著斜線輪流壓過彼此。',rows:'上下兩半輪流壓過彼此。',
  compare:'中間的分隔線來回掃過，日夜在同一支手機裡切換。',pairs:'每組前後交換，後面那張翻到前面。',alternate:'整張畫報在日夜、夜日兩種順序之間淡入淡出。',
  'single-hero':'主圖輪流換人，每張截圖輪流當大圖。',
  fold:'整組截圖從合起來慢慢展開，停一下再收回去。',news:'報頭先出現，標題一個字一個字打出來，截圖一張張印上去，最後登出引言。','single-card':'書名、作者和日期一個字一個字打出來，截圖一張張夾上去，最後蓋章、寫上留言。',
};
const ROTATING={'single-focus':'中間放大的那張輪流換人，旁邊的截圖跟著移位。','single-overlap':'最上面那張滑到最底下，下一張浮上來，一張一張輪流翻到最上層。'};
function motionDesc(v){
  if(v==='relay')return'接力換圖：日間第一張蓋過去，夜間第一張再蓋回來；被蓋住的那一半趁機換下一張，日夜依序輪完所有截圖。';
  if(ROTATING[S.layout]&&v!=='daynight')return ROTATING[S.layout]+(v==='both'?'日間轉完淡入夜間，再轉一輪。':'');
  return MOTION_DESC[S.layout]||'整張畫報在日間版和夜間版之間淡入淡出。';
}
function motionVariants(){
  if(['split','diagonal','rows','compare'].includes(S.layout))return[{v:'push',label:'日夜互壓'},{v:'relay',label:'接力換圖'}];
  if(!ROTATING[S.layout])return null;
  return[{v:'one',label:'只轉這一組'},{v:'both',label:'日間轉完換夜間'},{v:'daynight',label:'日夜淡入淡出'}];
}
// the screenshots of one side, rotated one slot per step; each shot becomes a sprite that moves between slots
function rotationSpec(OW,OH,side,dir){
  const[LW,LH]=dims(),k=OW/LW,u=Math.min(LW,LH)/100,keep=S.shots[side],n=keep.length;
  const capOn=S.captions&&keep.some(s=>s.label);
  const steps=[],maxRect={};
  try{
    for(let i=0;i<n;i++){
      const rot=dir==='left'?[...keep.slice(i),...keep.slice(0,i)]:[...keep.slice(n-i),...keep.slice(0,n-i)];
      S.shots[side]=rot;
      const items=[];drawPoster(document.createElement('canvas').getContext('2d'),LW,LH,{side,preview:false,noShots:true,noCaptions:true,collect:items});
      steps.push(items.map(it=>{const slot=rot.indexOf(it.shot);const r=it.rect;
        if(!maxRect[it.shot.id]||r.w>maxRect[it.shot.id].w)maxRect[it.shot.id]=r;return{id:it.shot.id,rect:r,z:it.z||0,slot};}));
    }
  }finally{S.shots[side]=keep;}
  const base=document.createElement('canvas');base.width=OW;base.height=OH;
  {const x=base.getContext('2d',{alpha:false});x.setTransform(k,0,0,k,0,0);drawPoster(x,LW,LH,{side,preview:false,noShots:true,noCaptions:true});}
  const ink=textInk(side,(S.bg==='image'||S.bg==='glass')?S.colors[side].ink:bestInkFor(sideBase(side),S.colors[side].ink),'labels');
  const sprites={};
  for(const sh of keep){
    const r=maxRect[sh.id];if(!r)continue;
    const{c,x,pad}=shotSprite(sh,r,side,u,k,capOn?u*3:0);
    if(capOn&&sh.label){x.textBaseline='alphabetic';drawCaption(x,sh.label,r.x+r.w/2,r,u,ink);}
    sprites[sh.id]={img:c,sr:r,pad};
  }
  return{W:OW,H:OH,type:'tween',k,base,sprites,steps,wrap:dir==='left'?'fade':'under',paletteSources:[base,...Object.values(sprites).map(s=>s.img)]};
}
async function buildMotion(OW,OH,variant){
  await ensureFont();
  const[LW,LH]=dims(),k=OW/LW,lay=S.layout;
  const A=S.order==='nd'?'night':'day',B=A==='day'?'night':'day';
  const layer=(o={})=>{const c=document.createElement('canvas');c.width=OW;c.height=OH;const x=c.getContext('2d',{alpha:false});x.setTransform(k,0,0,k,0,0);drawPoster(x,LW,LH,{...o,preview:false});return c;};
  const has=side=>S.shots[side].length>0, both=has('day')&&has('night');
  const none=reason=>({none:true,reason,still:layer()});
  const NEED_BOTH='動態需要日間和夜間都有截圖。';
  const base={W:OW,H:OH};
  if(lay==='single-card'){
    if(!has(S.single))return none('這一組還沒有截圖。');
    return{...base,type:'draw',draw:(ctx,t)=>{ctx.setTransform(k,0,0,k,0,0);drawPoster(ctx,LW,LH,{preview:false,cardT:t});},paletteSources:[layer()],paletteExtra:['#C9483B','#FFFFFF']};
  }
  if(lay==='news'){
    if(!has('day')&&!has('night'))return none('先加入截圖。');
    return{...base,type:'draw',draw:(ctx,t)=>{ctx.setTransform(k,0,0,k,0,0);drawPoster(ctx,LW,LH,{preview:false,newsT:t});},paletteSources:[layer()]};
  }
  if(lay==='fold'){
    if(!has('day')&&!has('night'))return none('先加入截圖。');
    const cap={},bg=layer({noShots:true,foldCapture:cap});
    return{...base,type:'draw',draw:(ctx,t)=>{ctx.drawImage(bg,0,0);ctx.setTransform(k,0,0,k,0,0);LoviaExtra.drawFold(ctx,cap.plan,cap.shots,{...cap.o,open:LoviaExtra.foldOpenAt(t)});},paletteSources:[layer(),bg]};
  }
  if(lay==='split'||lay==='diagonal'||lay==='rows'){
    if(!both)return none(NEED_BOTH);
    const LA=layer({fill:A}),LB=layer({fill:B});
    let spec={...base,type:'push',A:LA,B:LB,paletteSources:[LA,LB]};
    if(variant==='relay'){
      // one screenshot pair at a time: each side shows its i-th shot, swapped while the other side covers it
      const n=Math.max(S.shots[A].length,S.shots[B].length),keep={day:S.shots.day,night:S.shots.night};
      const pick=(side,i)=>[keep[side][i%keep[side].length]];
      const As=[],Bs=[];
      try{for(let i=0;i<n;i++){S.shots[A]=pick(A,i);S.shots[B]=pick(B,i);As.push(layer({fill:A}));Bs.push(layer({fill:B}));}}
      finally{S.shots.day=keep.day;S.shots.night=keep.night;}
      const states=[{s:0,a:0,b:0},{s:1,a:0,b:0}];
      for(let i=0;i<n;i++){states.push({s:-1,a:i,b:i});states.push({s:1,a:(i+1)%n,b:i});}
      spec={...base,type:'relay',As,Bs,states,hold:.3,moves:states.length,paletteSources:[...As,...Bs]};
    }
    if(lay==='rows'){
      const band=Math.min(LW,LH)*.06*k;
      spec.soft={dir:'h',band,pos:s=>(LH/2+s*(LH/2+band/k))*k};
    }else{
      const geo=geometry(LW,LH,lay,S.single,A,B),p=geo.panels[0],dir=geo.dir;
      const pts=p.poly?p.poly.map(q=>[...q]):[[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]];
      const reach=(dir==='v'?LW:LH)*(.5+(geo.k||0))+2, sign=(dir==='v'?pts.some(q=>q[0]===0):pts.some(q=>q[1]===0))?1:-1;
      spec.clipA=(ctx,s)=>{ctx.beginPath();pts.forEach(([x,y],i)=>{
        if(dir==='v'){if(x>0&&x<LW)x=clamp(x+sign*s*reach,0,LW);}else{if(y>0&&y<LH)y=clamp(y+sign*s*reach,0,LH);}
        i?ctx.lineTo(x*k,y*k):ctx.moveTo(x*k,y*k);});ctx.closePath();};
    }
    return spec;
  }
  if(lay==='compare'){
    const probe=document.createElement('canvas').getContext('2d');
    const hits=drawPoster(probe,LW,LH,{preview:false,noShots:true});
    const ph=hits.find(h=>h.compare);if(!ph)return none(NEED_BOTH);
    const u=Math.min(LW,LH)/100;
    const divider=(ctx,x,p)=>{ctx.save();ctx.setTransform(k,0,0,k,0,0);drawCompareDivider(ctx,{x:p.x/k,y:p.y/k,w:p.w/k,h:p.h/k},x/k,u,false);ctx.restore();};
    const pairAt=()=>{const h=drawPoster(document.createElement('canvas').getContext('2d'),LW,LH,{preview:false,noShots:true}).find(h=>h.compare);
      return{first:layer({compareOnly:'first'}),second:layer({compareOnly:'second'}),phone:{x:h.x*k,y:h.y*k,w:h.w*k,h:h.h*k}};};
    if(variant==='relay'){
      // the divider sweeps all the way across; the side it hides moves on to the next pair
      const n=Math.max(S.shots[A].length,S.shots[B].length),keepPair=S.comparePair,pairs=[];
      try{for(let i=0;i<n;i++){S.comparePair=i;pairs.push(pairAt());}}finally{S.comparePair=keepPair;}
      const states=[{s:0,a:0,b:0},{s:1,a:0,b:0}];
      for(let i=0;i<n;i++){states.push({s:-1,a:i,b:i});states.push({s:1,a:(i+1)%n,b:i});}
      return{...base,type:'relay',wipe:true,pairs,states,hold:.3,moves:states.length,divider,paletteSources:pairs.flatMap(p=>[p.first,p.second]),paletteExtra:['#FFFFFF']};
    }
    const{first,second,phone}=pairAt();
    return{...base,type:'wipe',first,second,paletteSources:[first,second],paletteExtra:['#FFFFFF'],phone,divider};
  }
  if(lay==='pairs'){
    const items=[];const baseL=layer({noShots:true,collect:items});
    const u=Math.min(LW,LH)/100;
    const sprite=it=>{const r=it.rect,{c,pad}=shotSprite(it.shot,r,it.side,u,k);return{img:c,x:(r.x-pad)*k,y:(r.y-pad)*k,w:r.w*k};};
    const units=new Map(),statics=[];
    for(const it of items){if(it.unit===undefined){statics.push(sprite(it));continue;}if(!units.has(it.unit))units.set(it.unit,[]);units.get(it.unit).push(it);}
    const pairs=[];
    for(const list of units.values()){const front=list.find(i=>i.z===1),back=list.find(i=>i.z===0);if(front&&back)pairs.push({a:sprite(front),b:sprite(back)});else list.forEach(i=>statics.push(sprite(i)));}
    if(!pairs.length)return none(NEED_BOTH);
    return{...base,type:'swap',base:baseL,pairs,statics,paletteSources:[layer()]};
  }
  if(ROTATING[lay]&&variant!=='daynight'){
    const dir=lay==='single-focus'?'left':'right';
    const first=S.single,second=first==='day'?'night':'day';
    if(S.shots[first].length<2)return none('輪轉需要這一組至少兩張截圖。');
    const a=rotationSpec(OW,OH,first,dir);
    if(variant!=='both')return a;
    if(S.shots[second].length<2)return none('日間轉完換夜間需要兩組都至少兩張截圖。');
    const b=rotationSpec(OW,OH,second,dir),la=layer({side:first}),lb=layer({side:second});
    const na=a.steps.length,nb=b.steps.length;
    return{...base,type:'seq',parts:[{spec:a,weight:na},{spec:{...base,type:'xfade',from:la,to:lb},weight:.7},{spec:b,weight:nb},{spec:{...base,type:'xfade',from:lb,to:la},weight:.7}],
      paletteSources:[...a.paletteSources,...b.paletteSources]};
  }
  if(lay==='single-hero'){
    const list=S.shots[S.single];if(list.length<2)return none('主圖輪流需要至少兩張截圖。');
    const keep=S.heroIndex,layers=[];
    try{for(let i=0;i<list.length;i++){S.heroIndex=i;layers.push(layer());}}finally{S.heroIndex=keep;}
    return{...base,type:'cycle',layers,paletteSources:layers};
  }
  if(lay==='alternate'){
    if(!both)return none(NEED_BOTH);
    const l0=layer({order:S.order}),l1=layer({order:S.order==='dn'?'nd':'dn'});
    return{...base,type:'fade',layers:[l0,l1],paletteSources:[l0,l1]};
  }
  // single-sided layouts: the day poster and the night poster fade into each other
  if(!both)return none(NEED_BOTH);
  const first=S.single,second=first==='day'?'night':'day';
  const l0=layer({side:first}),l1=layer({side:second});
  return{...base,type:'fade',layers:[l0,l1],paletteSources:[l0,l1]};
}

/* ---------------- saved settings (設置) ---------------- */
const PRESET_KEYS=['ratio','layout','single','splitDir','tilt','order','compareAt','compareHandle','size','gap','radius','frame',
  'rules','ruleColor','ruleOpacity','bg','tint','grain','customBg','tbTop','tbBottom','tbCustom','bgBlur','bgOpacity','glass',
  'palette','five','fiveCustom','swatches','hexes','title','tagline','author','date','message','showDate',
  'headline','cardFrame','span','authorPrefix','sideLabels','labelDay','labelNight',
  'captions','font','textStyle','taglineSize','labelSize','titleSize','authorSize','dateSize','messageSize','align','quality','colors','autoColor','textMode','textDay','textNight','textTouched'];
function collectSettings(){
  const settings={};for(const k of PRESET_KEYS)if(S[k]!==undefined)settings[k]=JSON.parse(JSON.stringify(S[k]));
  settings.artMosaic=LoviaArtMosaic.serialize();
  const files={...LoviaArtMosaic.files()};
  if(S.bg==='image'&&keptFiles.bg)files.bg=keptFiles.bg;
  if(S.bg==='glass'&&keptFiles.cover)files.cover=keptFiles.cover;
  const used=new Set([S.font,...Object.values(S.textStyle).map(t=>t.font)]);
  for(const k of used)if(k&&localFonts[k])files[fontSlot(k)]=localFonts[k].file;
  return{settings,files};
}
// 舊「經典」頁存的設置（v:1，有 theme 和 border）換成這一頁的欄位
function isClassic(st){return!!st&&st.v===1&&'theme'in st&&'border'in st;}
function fromClassic(st){
  const o={headline:'bar',span:'day',cardFrame:true,authorPrefix:true,single:'day'};
  const L={even:'single-even',stagger:'single-stagger',overlap:'single-overlap',focus:'single-focus',hero:'single-hero',card:'single-card'};
  if(st.layout)o.layout=L[st.layout]||st.layout;
  if(st.ratio)o.ratio=st.ratio;
  o.bg={light:'light',dark:'dark',custom:'custom',gradient:'tb',image:'image',glass:'glass'}[st.theme]||'light';
  if(st.border)o.frame=st.border;
  if(st.direction)o.tilt=st.direction;
  if(st.order)o.order=st.order;
  if(st.compareAt!==undefined)o.compareAt=Number(st.compareAt);
  if(st.compareHandle!==undefined)o.compareHandle=!!st.compareHandle;
  if(st.font)o.font=st.font==='sans'?'lsans':String(st.font).replace(/^uploaded/,'local');
  const base={title:61,author:48,date:41,message:33},sz=st.sizes||{};
  for(const k in base)if(sz[k]!==undefined&&sz[k]!=='')o[k+'Size']=clamp(Number(sz[k])/base[k],.3,2);
  const tx=st.text||{};
  if(typeof tx.name==='string')o.title=tx.name;
  if(typeof tx.author==='string')o.author=tx.author;
  if(typeof tx.message==='string')o.message=tx.message;
  const ru=st.rules||{};
  if(ru.show!==undefined){o.rules=!!ru.show;o.cardFrame=!!ru.show;}
  if(ru.color)o.ruleColor=String(ru.color).toUpperCase();
  if(ru.opacity!==undefined)o.ruleOpacity=Number(ru.opacity)/100;
  if(st.customColor)o.customBg=String(st.customColor).toUpperCase();
  if(st.blur!==undefined)o.bgBlur=Number(st.blur);
  if(st.opacity!==undefined)o.bgOpacity=Number(st.opacity)/100;
  if(st.glass!==undefined)o.glass=Number(st.glass)/100;
  const gr=st.gradient||{};
  if(gr.customized){o.tbTop=String(gr.start).toUpperCase();o.tbBottom=String(gr.end).toUpperCase();o.tbCustom=true;}
  o.quality={standard:'1080P',high:'2K 高清',original:'原畫超清'}[st.quality]||'原畫超清';
  if(Array.isArray(st.palette)&&st.palette.length===5){o.five=st.palette.map(c=>String(c).toUpperCase());o.fiveCustom=true;}
  o.palette='five';
  for(const k of['textMode','textDay','textNight','textTouched'])if(st[k]!==undefined)o[k]=st[k];
  if(st.textStyle&&typeof st.textStyle==='object'){o.textStyle={};for(const[k,t]of Object.entries(st.textStyle)){if(!t)continue;const c={...t};if(c.font)c.font=c.font==='sans'?'lsans':String(c.font).replace(/^uploaded/,'local');o.textStyle[k]=c;}}
  o.artMosaic=st.artMosaic;
  return o;
}
async function applySettings(st,files={}){
  st=st||{};
  if(isClassic(st)){st=fromClassic(st);if(files.background&&!files.bg){files={...files,bg:files.background};}}
  else if(!('headline'in st)){st={headline:'big',cardFrame:false,span:'both',authorPrefix:false,...st};}
  await LoviaArtMosaic.restore(st.artMosaic,files);
  // settings saved before per-field styles existed leave every field following the overall style
  S.textStyle={};S.taglineSize=1;S.labelSize=1;
  for(const k of PRESET_KEYS)if(k in st)S[k]=JSON.parse(JSON.stringify(st[k]));
  if(!S.textStyle||typeof S.textStyle!=='object')S.textStyle={};
  S.sel=null;openField=null;
  const asFile=(b,n)=>b instanceof File?b:new File([b],n,{type:b.type});
  try{if(files.bg){const f=asFile(files.bg,'background');S.bgImage=await fileToImage(f);keptFiles.bg=f;$('#bgFileName').textContent=f.name;}}catch(e){}
  try{if(files.cover){const f=asFile(files.cover,'cover');S.cover=await fileToImage(f);keptFiles.cover=f;$('#coverFileName').textContent=f.name;}}catch(e){}
  for(const sl of Object.keys(files).filter(x=>/^font\d*$/.test(x))){try{await loadLocalFont(asFile(files[sl],'font'),slotKey(sl));}catch(e){}}
  if(!fontByKey(S.font))S.font='wenkai';
  for(const k of Object.keys(S.textStyle)){const t=S.textStyle[k];if(!t||typeof t!=='object'||!TEXT_FIELDS.includes(k)){delete S.textStyle[k];continue;}if(t.font&&!fontByKey(t.font))delete t.font;tidyStyle(k);}
  if(S.bg==='image'&&!S.bgImage)S.bg='solid';
  // controls
  $$('#ratios button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.ratio===S.ratio)));
  syncSegs();
  for(const[id,f]of SLIDERS){const el=$('#'+id);if(!el)continue;el.value=String(Math.round(S[id]*f));el.dispatchEvent(new Event('input'));}
  $('#ruleColor').value=S.ruleColor.toLowerCase();
  for(const id of TOGGLES)$('#'+id).checked=!!S[id];
  for(const id of['title','tagline','author','date','message','labelDay','labelNight'])$('#'+id).value=S[id];
  for(const side of['day','night'])if(S.autoColor[side])autoColors(side);
  refreshDerived();
  syncColorInputs();syncTextColors();renderFonts();syncQuality();syncLayoutUI();syncSel();
  await ensureFont();req();
}

/* ---------------- init ---------------- */
// 注意：不可移動 Day Night 的預覽位置（.stage-wrap 和裡面的 .tabs 要留在原處，手機上固定在頂端）。
// 新功能的卡片請放進 .panel，不要把預覽搬到編輯區下方或拆開分頁列。
LoviaArtMosaic.mount({before:$('#artMount'),change:req});
async function init(){
  syncQuality();syncColorInputs();syncSegs();
  renderFonts();syncLayoutUI();
  await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]);
  await loadSamples();renderLists();syncSel();req();
  readyResolve();
  ensureFont().then(req);
  if(window.LoviaMotion)LoviaMotion.mount({buttons:[$('#openMotion')],ratio:()=>{const[w,h]=dims();return w/h;},describe:motionDesc,build:buildMotion,variants:motionVariants,
    filename:()=>safeName(S.title)+'-'+(S.layout||'poster'),save:(blob,name)=>saveFile(blob,name)});
  if(window.LoviaStudio&&LoviaStudio.mountPresets)LoviaStudio.mountPresets({bar:$('#presetBar'),saveButtons:[$('#savePreset')],collect:collectSettings,apply:applySettings,notify:status});
}
init();
})();
