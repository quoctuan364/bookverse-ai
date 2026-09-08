const { chromium } = require('playwright');
const fs = require('fs/promises');
(async () => {
  await fs.mkdir('D:/Doantotnghiep/live_frames', { recursive: true });
  let n = 0;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const cast = await page.screencast.start({ onFrame: async ({ data }) => { if (n < 10) await fs.writeFile(`D:/Doantotnghiep/live_frames/${String(n++).padStart(3,'0')}.jpg`, data); }, size: { width: 960, height: 540 } });
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForTimeout(3000);
  await cast.dispose();
  await browser.close();
  console.log(n);
})().catch(e => { console.error(e); process.exitCode = 1; });
