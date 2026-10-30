const {test,expect}=require('@playwright/test');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs/promises');
const ROOT=path.resolve(__dirname,'..');
const evidence=path.join(os.tmpdir(),'lovia-art-mosaic-evidence');
const files=['IMG_5735.JPG','IMG_5733.JPG','IMG_5721.PNG'].map(f=>path.join(ROOT,'assets',f));

async function frame(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function hash(page,id){return page.evaluate(id=>{
  const c=document.querySelector(id),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let h=2166136261;for(let i=0;i<d.length;i+=37)h=Math.imul(h^d[i],16777619);return h>>>0;
},id);}
async function slider(page,id,value){await page.locator(id).fill(String(value));await page.locator(id).dispatchEvent('input');await frame(page);}
async function open(page,route,mobile=false){
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|fontsapi\.zeoseven\.com)\//,route=>route.fulfill({contentType:'text/css',body:''}));
  // Optional cloud presets live in the parent website, outside this repository.
  await page.route('**/shared/cloud.v1.js*',route=>route.fulfill({contentType:'text/javascript',body:'/* Parent-site cloud integration is excluded from isolated local QA. */'}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text()+' ('+msg.location().url+')');});
  await page.goto(route);await expect(page.locator('.art-mosaic')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
  expect(await page.title()).toMatch(/Lovia|LOVIA/);
  expect(page.url()).toContain(route);
  await expect(page.locator('vite-error-overlay,nextjs-portal')).toHaveCount(0);
  return errors;
}
async function upload(page,daynight){
  if(daynight){await expect(page.locator('#clearSamples')).toBeVisible();await page.locator('#clearSamples').click();}
  await page.locator(daynight?'#batch-day':'#batchFileInput').setInputFiles(files);
  if(daynight)await expect(page.locator('#list-day li')).toHaveCount(3);
  if(!daynight)await expect(page.locator('#uploadGrid img[src^="blob:"]')).toHaveCount(3);
  await page.evaluate(()=>document.fonts.ready);await frame(page);
}

﻿for(const daynight of [false,true])for(const mobile of [false,true]){
  test(`${daynight?'Day Night':'Classic'} ${mobile?'mobile':'desktop'} full-poster controls, collapse and PNG`,async({page})=>{
    const errors=await open(page,daynight?'/daynight.html':'/index.html',mobile),id=daynight?'#cv':'#posterCanvas',heading=page.locator('.am-heading');
    await expect(heading).toHaveAttribute('aria-expanded','false');await expect(page.locator('#am-body')).toHaveAttribute('inert','');
    await upload(page,daynight);const before=await hash(page,id);
    await heading.click();await expect(page.locator('[data-scope],.am-images,#am-image-enabled,[data-action="all"]')).toHaveCount(0);
    expect(await page.locator('[data-art-style] span').allTextContents()).toEqual(['模糊','摩尔纹','水印图','星砂雾影','流线密纹','银雕暗纹','琉璃折影','织影网格','霜雾玻璃','星屑刻印','灰阶网印']);
    await expect(page.locator('[data-color-mode]')).toHaveCount(2);expect(await page.locator('[data-color-mode]').allTextContents()).toEqual(['自动取色','自选颜色']);
    await page.locator('#am-enabled').check();await page.locator('[data-art-style="moire"]').click();await slider(page,'#am-strength',100);await slider(page,'#am-visibility',0);
    await expect.poll(()=>hash(page,id)).not.toBe(before);
    await page.locator('[data-color-mode="custom"]').click();await page.locator('#am-color').fill('#8970ba');await page.locator('#am-color').dispatchEvent('input');await frame(page);
    const state=await page.evaluate(()=>LoviaArtMosaic.serialize());expect(state.settings.colors[0]).toBe('#8970ba');expect(state.images).toBeUndefined();
    const active=await hash(page,id);await heading.click();await frame(page);expect(await hash(page,id)).toBe(active);await expect(page.locator('.am-status')).toHaveText('已启用');
    await heading.click();await page.locator('#am-enabled').uncheck();await frame(page);expect(await hash(page,id)).toBe(before);
    await page.locator('#am-enabled').check();await frame(page);expect(await hash(page,id)).toBe(active);
    await page.locator('[data-action="compare"]').click();await frame(page);expect(await hash(page,id)).toBe(before);
    await heading.click();
    const getPNG=async()=>{const pending=page.waitForEvent('download');if(daynight){if(mobile)await page.locator('#tab-export').click();await page.locator('#exportOne').click();}else await page.locator('#downloadButton').click();const d=await pending,b=await fs.readFile(await d.path());if(daynight&&await page.locator('#result').isVisible())await page.locator('#resultClose').click();return b;};
    const png=await getPNG();expect(png.subarray(1,4).toString()).toBe('PNG');expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(2560);
    await page.evaluate(s=>LoviaArtMosaic.restore({...s,enabled:false}),state);const originalPNG=await getPNG();expect(png.equals(originalPNG)).toBe(false);
    await page.evaluate(s=>LoviaArtMosaic.restore(s),state);await frame(page);
    await fs.mkdir(evidence,{recursive:true});await heading.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,`full-poster-${daynight?'daynight':'classic'}-${mobile?'mobile':'desktop'}.png`),animations:'disabled'});
    await heading.click();await page.locator('[data-art-style="watermark"]').click();await expect(page.locator('.am-watermark')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
  });
}
async function importWatermark(page){
  const base64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=120;c.height=60;const x=c.getContext('2d');x.fillStyle='#ed3344';x.fillRect(3,3,40,28);x.fillStyle='#148f72';x.font='bold 17px sans-serif';x.fillText('LOVIA',5,53);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#am-watermark-file').setInputFiles({name:'my-watermark.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
  await expect(page.locator('#am-watermark-name')).toHaveText('my-watermark.png');await frame(page);
}
test('watermark image survives preset save, removal, refresh and original studio presets',async({page})=>{
  const errors=await open(page,'/index.html');await upload(page,false);await page.locator('.am-heading').click();await page.locator('#am-enabled').check();await page.locator('[data-art-style="watermark"]').click();await importWatermark(page);
  await page.locator('.am-advanced summary').click();await slider(page,'#am-adv-watermarkScale',55);await slider(page,'#am-opacity',45);
  const before=await hash(page,'#posterCanvas');await page.locator('[data-action="save"]').click();await expect(page.locator('#am-presets option')).toHaveCount(2);
  await page.locator('#am-remove-watermark').click();await expect(page.locator('#am-watermark-preview')).toBeHidden();await page.locator('#am-presets').selectOption('0');await expect(page.locator('#am-watermark-name')).toHaveText('my-watermark.png');await frame(page);expect(await hash(page,'#posterCanvas')).toBe(before);
  await fs.mkdir(evidence,{recursive:true});await page.locator('.art-mosaic').screenshot({path:path.join(evidence,'watermark-preset-panel.png'),animations:'disabled'});
  // The existing whole-studio save includes the watermark file as well.
  await page.locator('#savePreset').click();await expect(page.locator('#presetBar .sp-apply')).toHaveCount(1);
  await page.locator('#am-remove-watermark').click();await page.locator('.ed-presets').click();await page.locator('#presetBar .sp-apply').click();await page.locator('.ed-dialog-head button').click();await expect(page.locator('#am-watermark-name')).toHaveText('my-watermark.png');
  await page.reload();await upload(page,false);await page.locator('.am-heading').click();await expect(page.locator('#am-presets option')).toHaveCount(2);await page.locator('#am-presets').selectOption('0');await expect(page.locator('#am-watermark-name')).toHaveText('my-watermark.png');
  expect((await page.evaluate(()=>LoviaArtMosaic.serialize())).settings.opacity).toBe(45);await expect(page.locator('#am-enabled')).toBeChecked();
  const download=page.waitForEvent('download');await page.locator('#downloadButton').click();const png=await fs.readFile(await (await download).path());expect(png.readUInt32BE(16)).toBe(3600);
  // Invalid imports preserve the previously valid watermark.
  await page.locator('#am-watermark-file').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('invalid')});await expect(page.locator('.am-feedback')).toContainText('读取失败');await expect(page.locator('#am-watermark-name')).toHaveText('my-watermark.png');expect(errors).toEqual([]);
});
test('watermark and global settings transfer both ways; keyboard, mobile and dark mode remain available',async({page})=>{
  const errors=await open(page,'/index.html',true);await upload(page,false);await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  const heading=page.locator('.am-heading');await heading.focus();await page.keyboard.press('Enter');await expect(heading).toHaveAttribute('aria-expanded','true');
  expect(await page.locator('.am-collapse').evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
  await page.locator('#am-enabled').check();await page.locator('[data-art-style="watermark"]').click();await importWatermark(page);await slider(page,'#am-opacity',36);
  await heading.focus();await page.keyboard.press('Space');await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('#am-body'))).toBe(false);
  await page.locator('a[data-target="daynight"]').click();await page.waitForURL('**/daynight.html');await page.locator('.am-heading').click();await expect(page.locator('#am-watermark-name')).toHaveText('my-watermark.png');await expect(page.locator('#am-enabled')).toBeChecked();await expect(page.locator('#am-opacity')).toHaveValue('36');
  await page.locator('a[data-target="lovia"]').click();await page.waitForURL('**/index.html');await page.locator('.am-heading').click();await expect(page.locator('#am-watermark-name')).toHaveText('my-watermark.png');await expect(page.locator('#am-opacity')).toHaveValue('36');expect(errors).toEqual([]);
});
test('eleven renderers preserve raw source and full-poster apply covers all corners exactly once',async({page})=>{
  await open(page,'/index.html');
  const result=await page.evaluate(async()=>{
    const a=document.createElement('canvas');a.width=240;a.height=180;const x=a.getContext('2d'),g=x.createLinearGradient(0,0,240,180);g.addColorStop(0,'#0e2345');g.addColorStop(1,'#ffe8b0');x.fillStyle=g;x.fillRect(0,0,240,180);x.fillStyle='#d33';x.fillRect(25,25,100,90);
    const before=a.toDataURL(),results=[];const hash=c=>{let h=2166136261;for(const v of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^v,16777619);return h>>>0;};
    for(const [style]of LoviaArtMosaic.styles){const s={style,strength:100,visibility:0,opacity:100},one=LoviaArtMosaic.renderEffect(a,s,240,180,a),two=LoviaArtMosaic.renderEffect(a,s,240,180,a),zero=LoviaArtMosaic.renderEffect(a,{...s,strength:0},240,180,a);results.push({style,hash:hash(one),same:hash(one)===hash(two),zero:hash(zero)===hash(a)});}
    await LoviaArtMosaic.restore({version:2,enabled:true,settings:{style:'moire',strength:100,visibility:0,opacity:100}});
    const raw=x.getImageData(0,0,240,180).data,expected=hash(LoviaArtMosaic.renderEffect(a,LoviaArtMosaic.get(),240,180));LoviaArtMosaic.apply(x);const actual=hash(a),after=x.getImageData(0,0,240,180).data;
    const corners=[[0,0],[220,0],[0,160],[220,160]].map(([xx,yy])=>{let changed=0;for(let y=yy;y<yy+20;y++)for(let px=xx;px<xx+20;px++){const i=(y*240+px)*4;if(after[i]!==raw[i]||after[i+1]!==raw[i+1])changed++;}return changed;});
    return {results,untouched:before===(()=>{const c=document.createElement('canvas');c.width=240;c.height=180;c.getContext('2d').putImageData(new ImageData(raw,240,180),0,0);return c.toDataURL();})(),corners,expected,actual};
  });
  expect(new Set(result.results.map(r=>r.hash)).size).toBe(11);for(const r of result.results){expect(r.same,r.style).toBe(true);expect(r.zero,r.style).toBe(true);}expect(result.untouched).toBe(true);expect(result.corners.every(n=>n>300)).toBe(true);expect(result.actual).toBe(result.expected);
});

test('motion sequences and GIF apply the whole-poster effect once after composition',async({page})=>{
  await open(page,'/index.html');
  const result=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=160;c.height=120;const x=c.getContext('2d');
    const paint=ctx=>{ctx.fillStyle='#eeeecc';ctx.fillRect(0,0,160,120);ctx.fillStyle='#161c4a';ctx.fillRect(35,20,70,75);};
    paint(x);const raw=document.createElement('canvas');raw.width=160;raw.height=120;raw.getContext('2d').drawImage(c,0,0);
    await LoviaArtMosaic.restore({enabled:true,settings:{style:'moire',strength:100,visibility:0,opacity:100}});
    const expected=LoviaArtMosaic.renderEffect(raw,LoviaArtMosaic.get(),160,120).toDataURL();
    const spec={W:160,H:120,type:'seq',parts:[{weight:1,spec:{W:160,H:120,type:'draw',draw:paint}}],paletteSources:[raw]};
    LoviaMotion.frame(x,spec,.3);const exact=c.toDataURL()===expected;
    const gif=await LoviaMotion.encodeGif(spec,{fps:2,duration:1},()=>{}),bytes=new Uint8Array(await gif.arrayBuffer());
    return {exact,gif:String.fromCharCode(...bytes.slice(0,6)),length:bytes.length};
  });expect(result.exact).toBe(true);expect(result.gif).toBe('GIF89a');expect(result.length).toBeGreaterThan(100);
});

for(const daynight of [false,true])test(`${daynight?'Day Night':'Classic'} existing layouts and dragging work with full-poster artwork`,async({page})=>{
  const errors=await open(page,daynight?'/daynight.html':'/index.html');
  await page.evaluate(()=>document.fonts.ready);await frame(page);
  if(!daynight){await page.locator('#ed-tab-1').click();await page.locator('[data-group="night"]').click();await page.locator('#batchFileInput').setInputFiles(files);await expect(page.locator('#nightGroupCount')).toHaveText('3 张');await page.locator('[data-group="day"]').click();await page.locator('#ed-tab-3').click();}
  await page.locator('.am-heading').click();await page.locator('#am-enabled').check();await page.locator('[data-art-style="weave"]').click();await page.locator('.am-heading').click();
  const buttons=page.locator(daynight?'#layouts [data-layout]':'[data-layout]'),keys=await buttons.evaluateAll(bs=>bs.filter(b=>!b.hidden&&!b.disabled).map(b=>b.dataset.layout));
  expect(keys.length).toBeGreaterThan(8);
  for(const key of keys){
    const b=page.locator(`[data-layout="${key}"]`);if(!await b.isVisible())continue;await b.click();await frame(page);
    const id=daynight?'#cv':'#posterCanvas',active=await hash(page,id),saved=await page.evaluate(()=>LoviaArtMosaic.serialize());
    await page.evaluate(data=>LoviaArtMosaic.restore({...data,enabled:false}),saved);await frame(page);const original=await hash(page,id);
    expect(active,`${key} applies effects`).not.toBe(original);
    await page.evaluate(data=>LoviaArtMosaic.restore(data),saved);await frame(page);expect(await hash(page,id),key).toBe(active);
  }
  // Dragging a screenshot still changes its position with artwork enabled.
  const canvas=page.locator(daynight?'#cv':'#posterCanvas');await page.locator(`[data-layout="${daynight?'single-even':'even'}"]`).click();await frame(page);
  await canvas.scrollIntoViewIfNeeded();
  const rect=await canvas.boundingBox(),before=await hash(page,daynight?'#cv':'#posterCanvas');
  await page.mouse.move(rect.x+rect.width*.25,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.28,rect.y+rect.height*.53,{steps:5});await page.mouse.up();await frame(page);
  expect(await hash(page,daynight?'#cv':'#posterCanvas')).not.toBe(before);expect(errors).toEqual([]);
});
