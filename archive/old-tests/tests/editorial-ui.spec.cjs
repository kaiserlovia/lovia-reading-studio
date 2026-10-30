const {test,expect}=require('@playwright/test');

async function open(page,route){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|fontsapi\.zeoseven\.com)\//,r=>r.fulfill({contentType:'text/css',body:''}));
  await page.route('**/shared/cloud.v1.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto(route);await expect(page.locator('.ed-headline,.ed-intro')).toHaveCount(0);
  await expect(page.locator('.ed-presets')).toBeVisible();return errors;
}

for(const daynight of [false,true])for(const mobile of [false,true]){
  test(`${daynight?'Day Night':'Classic'} editorial ${mobile?'mobile':'desktop'} navigation and original preset controls`,async({page})=>{
    await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
    const errors=await open(page,daynight?'/daynight.html':'/index.html');
    await expect(page.locator('.am-heading')).toHaveAttribute('aria-expanded','false');
    expect(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(249, 248, 246)');
    if(!daynight)await expect(page.locator('.editor-top')).toHaveCount(0);
    const styles=await page.locator('.art-mosaic').evaluate(e=>{const s=getComputedStyle(e);return [s.borderRadius,s.borderLeftWidth,s.getPropertyValue('--am-accent').trim()];});
    expect(styles).toEqual(['0px','0px','#1c1c1c']);
    // Actual inspector navigation changes the reachable controls, not the poster or settings.
    if(!daynight){
      await page.locator('#ed-tab-0').focus();await page.keyboard.press('ArrowRight');
      await expect(page.locator('#ed-tab-1')).toBeFocused();await expect(page.locator('#ed-section-0')).toBeHidden();
      await expect(page.locator('#batchUploadButton')).toBeVisible();
      await page.locator('#ed-tab-0').click();await page.locator('#themeName').fill('中文画报测试');await page.locator('#themeName').dispatchEvent('input');
      await page.locator('.text-card[data-field=title] summary').click();await page.locator('.text-card[data-field=title] .text-chip').nth(1).click();
      await expect(page.locator('#titleFontSize')).toBeVisible();
      await page.locator('#titleFontSize').fill('70');await page.locator('#titleFontSize').dispatchEvent('input');
    }
    // The same preset element moves into a native modal and returns to its original location.
    await page.locator('.ed-presets').click();await expect(page.locator('.ed-preset-dialog')).toBeVisible();
    await page.locator('.ed-preset-dialog>.ed-export').click();await expect(page.locator('.ed-preset-dialog .sp-apply')).toHaveCount(1);
    await page.keyboard.press('Escape');await expect(page.locator('.ed-preset-dialog')).toBeHidden();
    expect(await page.locator('#presetBar').count()).toBe(1);
    await expect.poll(()=>page.locator('#presetBar').evaluate(e=>e.closest('main')!==null)).toBe(true);
    await page.locator('.ed-presets').click();await expect(page.locator('.ed-preset-dialog .sp-apply')).toHaveCount(1);
    await page.locator('.ed-dialog-head button').click();
    expect(errors).toEqual([]);
  });
}

for(const daynight of [false,true])test(`${daynight?'Day Night retains original preview and tabs':'Classic retains pinned canvas and all settings'} across responsive sizes`,async({page})=>{
  const errors=await open(page,daynight?'/daynight.html':'/index.html');
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  for(const width of [360,390,768,900,959,960,1024,1440,390]){
    await page.setViewportSize({width,height:1000});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const geometry=await page.evaluate(daynight=>{
      const art=document.querySelector('.art-mosaic'),next=art.nextElementSibling;
      const target=document.querySelector(daynight?'.panel>.editor-top':'.editor-footer');
      return {next:next===target,gap:target.getBoundingClientRect().top-art.getBoundingClientRect().bottom,expanded:art.querySelector('button').getAttribute('aria-expanded'),tabsTogether:!daynight||document.querySelector('.tabs').parentElement===document.querySelector('.stage').parentElement};
    },daynight);
    expect(geometry.next).toBe(true);if(daynight){expect(geometry.gap).toBeGreaterThanOrEqual(16);expect(geometry.gap).toBeLessThanOrEqual(24);}expect(geometry.expanded).toBe('false');
    expect(geometry.tabsTogether).toBe(true);
  }
  expect(await page.locator('.am-collapse').evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
  expect(errors).toEqual([]);
});

for(const mobile of [false,true])test(`Classic ${mobile?'mobile':'desktop'} preview stays visible while editing and scrolling`,async({page})=>{
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
  const errors=await open(page,'/index.html');
  await expect(page.locator('#posterCanvas')).toBeVisible();
  expect(await page.locator('.preview-column').evaluate(e=>getComputedStyle(e).position)).toBe('sticky');
  expect(await page.locator('.ed-topbar').evaluate(e=>getComputedStyle(e).position)).toBe('sticky');
  await page.evaluate(()=>scrollTo(0,450));
  const box=await page.locator('#posterCanvas').boundingBox(),head=await page.locator('.ed-topbar').boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(head.y+head.height-1);expect(box.y+box.height).toBeLessThan(1000);
  await page.locator('#ed-tab-2').click();await expect(page.locator('#ed-section-2')).toBeVisible();
  await page.locator('#ed-tab-0').click();
  const before=await page.locator('#posterCanvas').evaluate(c=>c.toDataURL());
  await page.locator('#themeName').fill('置顶预览测试');await page.locator('#themeName').dispatchEvent('input');
  await expect.poll(()=>page.locator('#posterCanvas').evaluate(c=>c.toDataURL())).not.toBe(before);
  await expect(page.locator('#themeName')).toHaveValue('置顶预览测试');
  await page.locator('#ed-tab-1').click();await page.locator('[data-ratio="1:1"]').click();
  await expect.poll(()=>page.locator('#posterCanvas').evaluate(c=>c.width/c.height)).toBe(1);
  expect(await page.locator('#posterCanvas').evaluate(c=>Math.abs(c.getBoundingClientRect().width/c.getBoundingClientRect().height-c.width/c.height)<.01)).toBe(true);
  expect(errors).toEqual([]);
});
