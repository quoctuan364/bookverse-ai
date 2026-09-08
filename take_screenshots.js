const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const OUT_DIR = 'D:\\Doantotnghiep\\thesis_screenshots';

// Detect which port responds
async function detectPort() {
  const ports = [3000, 3001];
  for (const port of ports) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}`, { timeout: 8000 }, (res) => {
          resolve(res.statusCode);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      console.log(`App found on port ${port}`);
      return `http://127.0.0.1:${port}`;
    } catch (e) {
      console.log(`Port ${port} not responding: ${e.message}`);
    }
  }
  return null;
}

async function goto(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  } catch(e) {
    console.log(`  Warning navigating to ${url}: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 3000));
}

async function shot(page, filename) {
  const fp = path.join(OUT_DIR, filename);
  await page.screenshot({ path: fp, fullPage: false });
  console.log('  Saved:', filename);
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Detecting app port...');
  let BASE = await detectPort();
  if (!BASE) {
    console.error('ERROR: App not responding on port 3000 or 3001. Please ensure npm run dev is running.');
    process.exit(1);
  }

  console.log(`Using: ${BASE}`);
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await ctx.newPage();

  // 1. Homepage
  console.log('1. Homepage...');
  await goto(page, BASE + '/');
  await shot(page, '01_homepage.png');

  // 2. Catalog
  console.log('2. Catalog...');
  await goto(page, BASE + '/catalog');
  await shot(page, '02_catalog.png');

  // 3. Login page
  console.log('3. Login page...');
  await goto(page, BASE + '/login');
  await shot(page, '04_login.png');

  // Login as reader
  console.log('4. Logging in as reader...');
  try {
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passInput = await page.$('input[type="password"], input[name="password"]');
    if (emailInput && passInput) {
      await emailInput.fill('reader.bookverse.demo@gmail.com');
      await passInput.fill('123456');
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 5000));
      await shot(page, '05_logged_in.png');
    }
  } catch(e) { console.log('  Login failed:', e.message); }

  // 5. Marketplace
  console.log('5. Marketplace...');
  await goto(page, BASE + '/marketplace');
  await shot(page, '05_marketplace.png');

  // 6. Discover / recommendations
  console.log('6. Discover...');
  await goto(page, BASE + '/discover');
  await shot(page, '06_recommendations.png');

  // 7. Catalog again (with filters visible)
  console.log('7. Catalog filtered...');
  await goto(page, BASE + '/catalog');
  await shot(page, '07_catalog.png');

  // 8. Book detail (click first book)
  console.log('8. Book detail...');
  await goto(page, BASE + '/catalog');
  try {
    const bookLink = await page.$('a[href*="/book/"]');
    if (bookLink) {
      const href = await bookLink.getAttribute('href');
      await goto(page, BASE + href);
      await shot(page, '08_book_detail.png');
    } else {
      await shot(page, '08_book_detail.png');
    }
  } catch(e) { console.log('  Book detail error:', e.message); await shot(page, '08_book_detail.png'); }

  // 9. Membership
  console.log('9. Membership...');
  await goto(page, BASE + '/membership');
  await shot(page, '09_membership.png');

  // 10. Read / Reader
  console.log('10. Reader...');
  await goto(page, BASE + '/read');
  await shot(page, '10_reader.png');

  // 11. Assistant
  console.log('11. Assistant...');
  await goto(page, BASE + '/assistant');
  await shot(page, '11_assistant.png');

  // 12. Library
  console.log('12. Library...');
  await goto(page, BASE + '/library');
  await shot(page, '12_library.png');

  // 12b. Reading insights
  console.log('12b. Reading insights...');
  await goto(page, BASE + '/reading/insights');
  await shot(page, '12b_reading_insights.png');

  // Login as admin
  console.log('13. Login as admin...');
  await goto(page, BASE + '/login');
  try {
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passInput = await page.$('input[type="password"], input[name="password"]');
    if (emailInput && passInput) {
      await emailInput.fill('admin.bookverse.demo@gmail.com');
      await passInput.fill('123456');
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 5000));
    }
  } catch(e) { console.log('  Admin login failed:', e.message); }

  // 13. Admin analytics
  console.log('14. Admin analytics...');
  await goto(page, BASE + '/admin/analytics');
  await shot(page, '13_admin.png');

  // 14. Admin membership
  console.log('15. Admin membership plans...');
  await goto(page, BASE + '/admin/membership-plans');
  await shot(page, '14_admin_membership.png');

  // 15. Seller
  console.log('16. Seller dashboard...');
  await goto(page, BASE + '/seller');
  await shot(page, '15_seller.png');

  // 16. Register
  console.log('17. Register...');
  await goto(page, BASE + '/register');
  await shot(page, '03_register.png');

  await browser.close();
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\nDone! ${files.length} screenshots saved to: ${OUT_DIR}`);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
