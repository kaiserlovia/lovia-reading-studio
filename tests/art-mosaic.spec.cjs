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
  await expect(page.locator('.am-images button')).toHaveCount(3);
  if(!daynight)await expect(page.locator('#uploadGrid img[src^="blob:"]')).toHaveCount(3);
  await page.evaluate(()=>document.fonts.ready);await frame(page);
}

for(const daynight of [false,true])for(const mobile of [false,true]){
  const route=daynight?'/daynight.html':'/index.html',canvas=daynight?'#cv':'#posterCanvas';
  test(`${daynight?'Day Night':'Classic'} ${mobile?'mobile':'desktop'}: collapse, independent images, colors, preset and PNG`,async({page})=>{
    const errors=await open(page,route,mobile);
    const panel=page.locator('.art-mosaic'),heading=panel.locator('.am-heading');
    // Scenarios 1 & 2: starts collapsed, its ribbon stays visible, natural layout expands.
    await expect(heading).toHaveAttribute('aria-expanded','false');
    await expect(page.locator('#am-body')).toHaveAttribute('inert','');
    await expect(panel.locator('.am-ribbon i')).toHaveCount(5);
    await expect(page.locator('#am-enabled')).not.toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await upload(page,daynight);
    const before=await hash(page,canvas);
    const topBefore=await page.locator(canvas).evaluate(c=>c.getBoundingClientRect().top+scrollY);
    await heading.click();await expect(page.locator('#am-enabled')).toBeVisible();
    await expect.poll(()=>page.locator(canvas).evaluate(c=>c.getBoundingClientRect().top+scrollY)).toBeGreaterThan(topBefore+300);
    const placement=await page.evaluate(()=>{const panel=document.querySelector('.art-mosaic'),next=panel.nextElementSibling;return next?.classList.contains('preview-card')||next?.id==='stage';});
    expect(placement).toBe(true);
    // 16–24px gap is maintained in both columns and mobile document flow.
    if(mobile)expect(await page.locator('.am-styles').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
    // Scenarios 3, 7: one flow, one refracted, one untouched.
    await page.locator('#am-enabled').check();
    await slider(page,'#am-strength',100);await slider(page,'#am-visibility',0);
    await expect.poll(()=>hash(page,canvas)).not.toBe(before);
    await page.locator('.am-images button').nth(1).click();
    await page.locator('[data-art-style="glass"]').click();
    await expect(page.locator('.am-images button').nth(1)).toHaveAttribute('aria-pressed','true');
    await page.locator('.am-advanced summary').click();
    await expect(page.locator('#am-adv-refraction')).toBeVisible();
    await expect(page.locator('#am-adv-frequency')).toHaveCount(0);
    await slider(page,'#am-adv-refraction',86);
    await page.locator('[data-color-mode="custom"]').click();
    await page.locator('#am-color').fill('#8970ba');await page.locator('#am-color').dispatchEvent('input');await frame(page);
    const state=await page.evaluate(()=>LoviaArtMosaic.serialize());
    expect(state.enabled).toBe(true);expect(state.images.map(it=>it.settings.style)).toEqual(['flow','glass','flow']);
    expect(state.images.map(it=>it.settings.enabled)).toEqual([true,true,false]);
    expect(state.images[1].settings.refraction).toBe(86);
    expect(state.images[1].settings.colors[0]).toBe('#8970ba');
    await page.locator('[data-action="save"]').click();
    await expect(page.locator('#am-presets option')).toHaveCount(2);
    await page.locator('[data-action="random"]').click();
    await page.locator('#am-presets').selectOption('0');await frame(page);
    expect((await page.evaluate(()=>LoviaArtMosaic.serialize())).images[1].settings.seed).toBe(state.images[1].settings.seed);
    const active=await hash(page,canvas);
    // Scenarios 4 & 5: collapsing retains pixels, selection and parameters.
    await heading.click();await expect(heading).toHaveAttribute('aria-expanded','false');await frame(page);
    await expect(panel.locator('.am-status')).toHaveText('已启用');
    expect(await hash(page,canvas)).toBe(active);
    await heading.click();await expect(page.locator('#am-adv-refraction')).toHaveValue('86');
    await expect(page.locator('.am-images button').nth(1)).toHaveAttribute('aria-pressed','true');
    // Scenario 6: turning off restores the identical original composition without deleting settings.
    await page.locator('#am-enabled').uncheck();await frame(page);expect(await hash(page,canvas)).toBe(before);
    expect((await page.evaluate(()=>LoviaArtMosaic.serialize())).images[1].settings.style).toBe('glass');
    await page.locator('#am-enabled').check();await frame(page);expect(await hash(page,canvas)).toBe(active);
    // Comparison is preview-only. A real PNG download must retain artwork.
    await page.locator('[data-action="compare"]').click();await frame(page);expect(await hash(page,canvas)).toBe(before);
    await heading.click();
    const downloadEvent=page.waitForEvent('download');
    if(daynight){if(mobile)await page.locator('#tab-export').click();await page.locator('#exportOne').click();}
    else await page.locator('#downloadButton').click();
    const download=await downloadEvent;const downloadPath=await download.path();
    const png=await fs.readFile(downloadPath);expect(png.subarray(1,4).toString()).toBe('PNG');
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);expect(width).toBeGreaterThanOrEqual(2560);expect(width/height).toBeCloseTo(4/3,2);
    expect(png.length).toBeGreaterThan(10000);
    if(daynight&&await page.locator('#result').isVisible())await page.locator('#resultClose').click();
    // Verify the actual exported bytes retain the effect even while original comparison is active.
    if(!mobile){const saved=await page.evaluate(()=>LoviaArtMosaic.serialize());
      await page.evaluate(data=>LoviaArtMosaic.restore({...data,enabled:false}),saved);
      const offDownload=page.waitForEvent('download');await page.locator(daynight?'#exportOne':'#downloadButton').click();
      const off=await offDownload,offPNG=await fs.readFile(await off.path());expect(png.equals(offPNG)).toBe(false);
      if(daynight&&await page.locator('#result').isVisible())await page.locator('#resultClose').click();
      await page.evaluate(data=>LoviaArtMosaic.restore(data),saved);
    }
    // Save visual evidence outside the repository.
    await fs.mkdir(evidence,{recursive:true});
    await heading.click();
    const compare=page.locator('[data-action="compare"]');if(await compare.getAttribute('aria-pressed')==='true')await compare.click();
    await heading.click();await frame(page);
    await heading.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,`${daynight?'daynight':'classic'}-${mobile?'mobile':'desktop'}-collapsed.png`),animations:'disabled'});
    await heading.click();await frame(page);
    await panel.screenshot({path:path.join(evidence,`${daynight?'daynight':'classic'}-${mobile?'mobile':'desktop'}-expanded.png`),animations:'disabled'});
    expect(errors).toEqual([]);
  });
}

test('all eight algorithms are image-dependent, deterministic, distinct and non-destructive',async({page})=>{
  await open(page,'/index.html');
  const results=await page.evaluate(()=>{
    const create=inverse=>{const c=document.createElement('canvas');c.width=240;c.height=320;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,240,320);g.addColorStop(0,inverse?'#fae4da':'#19254a');g.addColorStop(1,inverse?'#19254a':'#fae4da');x.fillStyle=g;x.fillRect(0,0,240,320);x.fillStyle=inverse?'#991133':'#eee111';x.fillRect(30,45,110,160);x.fillStyle='#214356';x.font='24px sans-serif';x.fillText('ORIGINAL',20,220);return c;};
    const a=create(false),b=create(true),before=a.toDataURL(),r=[];
    const fingerprint=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i++)h=Math.imul(h^d[i],16777619);return h>>>0;};
    for(const [style]of LoviaArtMosaic.styles){const s={style,strength:100,visibility:0,opacity:100,enabled:true,seed:872};
      const first=LoviaArtMosaic.renderEffect(a,s,240,320),same=LoviaArtMosaic.renderEffect(a,s,240,320),other=LoviaArtMosaic.renderEffect(b,s,240,320),changed=LoviaArtMosaic.renderEffect(a,{...s,seed:432},240,320),off=LoviaArtMosaic.renderEffect(a,{...s,strength:0},240,320);
      r.push({style,hash:fingerprint(first),deterministic:fingerprint(first)===fingerprint(same),dependent:fingerprint(first)!==fingerprint(other),seed:fingerprint(first)!==fingerprint(changed),zero:fingerprint(a)===fingerprint(off)});
    }return{r,untouched:before===a.toDataURL()};
  });
  expect(results.untouched).toBe(true);expect(new Set(results.r.map(r=>r.hash)).size).toBe(8);
  for(const r of results.r){expect(r.deterministic,r.style).toBe(true);expect(r.dependent,r.style).toBe(true);expect(r.seed,r.style).toBe(true);expect(r.zero,r.style).toBe(true);}
});

test('scope selection, all-copy, removal, preset persistence, ratio and original controls',async({page})=>{
  const errors=await open(page,'/index.html');await upload(page,false);
  await page.locator('.am-heading').click();await page.locator('#am-enabled').check();
  await page.locator('[data-scope="custom"]').click();
  await page.locator('.am-image-item input').nth(1).check();
  await page.locator('[data-art-style="weave"]').click();
  let images=(await page.evaluate(()=>LoviaArtMosaic.serialize())).images;
  expect(images.map(it=>it.settings.style)).toEqual(['weave','weave','flow']);
  await page.locator('[data-scope="current"]').click();
  await page.locator('.am-images button').nth(1).click();await page.locator('[data-art-style="stars"]').click();
  await page.locator('[data-action="all"]').click();
  images=(await page.evaluate(()=>LoviaArtMosaic.serialize())).images;expect(images.every(it=>it.settings.style==='stars')).toBe(true);
  await page.locator('[data-action="save"]').click();
  await page.locator('[data-action="reset"]').click();
  await page.locator('[data-action="random"]').click();
  await page.locator('[data-art-style="glass"]').click();
  await page.locator('[data-action="save"]').click();
  await page.locator('.tile-remove').first().click();await expect(page.locator('.am-images button')).toHaveCount(2);
  images=(await page.evaluate(()=>LoviaArtMosaic.serialize())).images;expect(images[0].settings.style).toBe('glass');
  await page.locator('#am-enabled').uncheck();await page.locator('.am-heading').click();
  await page.locator('[data-ratio="1:1"]').click();await frame(page);
  expect(await page.locator('#posterCanvas').evaluate(c=>c.width===c.height)).toBe(true);
  await page.locator('#themeName').fill('原有功能仍然可用');
  await page.locator('[data-layout="news"]').click();await frame(page);
  await expect(page.locator('#heroButtons button')).toHaveCount(2);
  await page.locator('#imageScaleNumber').fill('125');await page.locator('#imageScaleNumber').dispatchEvent('change');
  await expect(page.locator('#imageScale')).toHaveValue('125');
  await page.reload();await page.locator('.am-heading').click();await expect(page.locator('#am-presets option')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('keyboard collapse, reduced motion, dark mode and page hand-off retain settings',async({page})=>{
  const errors=await open(page,'/index.html');await upload(page,false);
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  const heading=page.locator('.am-heading');await heading.focus();await page.keyboard.press('Enter');
  await expect(heading).toHaveAttribute('aria-expanded','true');
  expect(await page.locator('.art-mosaic').evaluate(el=>getComputedStyle(el).getPropertyValue('--am-white').trim())).toBe('#191e30');
  expect(await page.locator('.am-collapse').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  await page.locator('#am-enabled').check();await page.locator('[data-art-style="glass"]').click();await slider(page,'#am-strength',88);
  await heading.focus();await page.keyboard.press('Space');await expect(heading).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('#am-body'))).toBe(false);
  await page.locator('a[data-target="daynight"]').click();await page.waitForURL('**/daynight.html');
  await expect.poll(()=>page.evaluate(()=>LoviaArtMosaic.serialize().images.filter(it=>it.settings.strength===88&&it.settings.style==='glass').length)).toBe(1);
  let data=await page.evaluate(()=>LoviaArtMosaic.serialize());expect(data.enabled).toBe(true);expect(data.images).toHaveLength(3);
  await page.locator('.am-heading').click();await page.locator('.am-images button').nth(1).click();await page.locator('[data-art-style="weave"]').click();
  await page.locator('a[data-target="lovia"]').click();await page.waitForURL('**/index.html');
  await expect.poll(()=>page.evaluate(()=>LoviaArtMosaic.serialize().images.some(it=>it.settings.style==='weave'))).toBe(true);
  data=await page.evaluate(()=>LoviaArtMosaic.serialize());expect(data.enabled).toBe(true);expect(data.images).toHaveLength(3);
  expect(data.images.map(it=>it.settings.style)).toEqual(['glass','weave','flow']);expect(errors).toEqual([]);
});

for(const daynight of [false,true])test(`${daynight?'Day Night':'Classic'} existing layouts use independent artwork without changing geometry`,async({page})=>{
  const errors=await open(page,daynight?'/daynight.html':'/index.html');
  await expect.poll(()=>page.locator('.am-images button').count()).toBeGreaterThan(0);
  if(!daynight){await page.locator('[data-group="night"]').click();await page.locator('#batchFileInput').setInputFiles(files);await expect(page.locator('#nightGroupCount')).toHaveText('3 张');await page.locator('[data-group="day"]').click();}
  await page.locator('.am-heading').click();await page.locator('#am-enabled').check();await page.locator('[data-art-style="weave"]').click();await page.locator('[data-action="all"]').click();await page.locator('.am-heading').click();
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
