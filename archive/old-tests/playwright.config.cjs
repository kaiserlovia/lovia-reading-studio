const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'./tests',timeout:90000,workers:1,
  use:{baseURL:'http://127.0.0.1:4173',headless:true,
    launchOptions:{args:['--disable-accelerated-2d-canvas'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})}},
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
  reporter:'list',
});
