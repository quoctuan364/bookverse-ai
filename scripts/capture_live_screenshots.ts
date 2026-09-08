import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const assetsDir = path.resolve(__dirname, "..", "outputs", "report-assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const baseUrl = "http://127.0.0.1:3000";

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Trang chu
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(assetsDir, "hinh_3_55_giao_dien_trang_chu.png") });
  console.log("Captured: Trang chu");

  // 2. De xuat / Catalog
  await page.goto(`${baseUrl}/catalog?q=tri+tue+nhan+tao`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(assetsDir, "hinh_3_56_giao_dien_de_xuat.png") });
  console.log("Captured: De xuat / Catalog");

  // 3. Chatbot
  await page.goto(`${baseUrl}/assistant`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(assetsDir, "hinh_3_57_giao_dien_chatbot.png") });
  console.log("Captured: Chatbot");

  // 4. Trinh doc Ebook
  await page.goto(`${baseUrl}/read/RB00906`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(assetsDir, "hinh_phu_luc_read.png") });
  console.log("Captured: Trinh doc Ebook");

  // 5. Marketplace
  await page.goto(`${baseUrl}/marketplace`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(assetsDir, "hinh_phu_luc_marketplace.png") });
  console.log("Captured: Marketplace");

  // 6. Admin
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email", { exact: true }).fill("admin.bookverse.demo@gmail.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForTimeout(2500);

  await page.goto(`${baseUrl}/admin/analytics`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(assetsDir, "hinh_phu_luc_admin.png") });
  console.log("Captured: Admin Analytics");

  await page.goto(`${baseUrl}/seller/listings`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(assetsDir, "hinh_3_58_giao_dien_them_san_pham.png") });
  console.log("Captured: Seller listings");

  await browser.close();
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
