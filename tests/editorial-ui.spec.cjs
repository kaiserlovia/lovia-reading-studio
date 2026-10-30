const {test,expect}=require('@playwright/test');

async function open(page,route){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|fontsapi\.zeoseven\.com)\//,r=>r.fulfill({contentType:'text/css',body:''}));
  await page.route('**/shared/cloud.v1.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto(route);await expect(page.locator('.ed-headline')).toContainText('把阅读，排成一页。');
  await expect(page.locator('.ed-presets')).toBeVisible();return errors;
}

for(const daynight of [false,true])for(const mobile of [false,true]){
  test(`${daynight?'Day Night':'Classic'} editorial ${mobile?'mobile':'desktop'} navigation and original preset controls`,async({page})=>{
    await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
    const errors=await open(page,daynight?'/daynight.html':'/index.html');
    await expect(page.locator('.am-heading')).toHaveAttribute('aria-expanded','false');
    expect(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(249, 248, 246)');
    expect(await page.locator('.ed-headline').evaluate(e=>getComputedStyle(e).fontWeight)).toBe('400');
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

for(const daynight of [false,true])test(`${daynight?'Day Night':'Classic'} responsive resizing keeps the artwork directly before the final preview`,async({page})=>{
  const errors=await open(page,daynight?'/daynight.html':'/index.html');
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  for(const width of [360,390,768,900,959,960,1024,1440,390]){
    await page.setViewportSize({width,height:1000});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const geometry=await page.evaluate(daynight=>{
      const art=document.querySelector('.art-mosaic'),next=art.nextElementSibling;
      const target=document.querySelector(daynight?'.ed-stage-toolbar':'.preview-card');
      return {next:next===target,gap:target.getBoundingClientRect().top-art.getBoundingClientRect().bottom,expanded:art.querySelector('button').getAttribute('aria-expanded')};
    },daynight);
    expect(geometry.next).toBe(true);expect(geometry.gap).toBeGreaterThanOrEqual(16);expect(geometry.gap).toBeLessThanOrEqual(24);expect(geometry.expanded).toBe('false');
  }
  expect(await page.locator('.am-collapse').evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
  expect(errors).toEqual([]);
});
