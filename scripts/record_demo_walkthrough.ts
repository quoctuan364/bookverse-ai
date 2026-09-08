import { chromium, type Locator, type Page } from "playwright";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "outputs", "demo-walkthrough");
const rawVideoDir = path.join(outputDir, "raw");
const baseUrl = process.env.BOOKVERSE_DEMO_URL ?? "http://127.0.0.1:3000";
const password = "123456";

const accounts = {
  reader: "reader.bookverse.demo@gmail.com",
  seller: "seller.bookverse.demo@gmail.com",
  admin: "admin.bookverse.demo@gmail.com",
} as const;

async function wait(ms = 1600) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDemoOverlay(page: Page) {
  await page.evaluate(() => {
    if (!document.querySelector("#bookverse-demo-cursor")) {
      const cursor = document.createElement("div");
      cursor.id = "bookverse-demo-cursor";
      Object.assign(cursor.style, {
        position: "fixed",
        left: "40px",
        top: "40px",
        width: "24px",
        height: "24px",
        borderRadius: "999px",
        border: "3px solid white",
        background: "#A94432",
        boxShadow: "0 4px 18px rgba(0,0,0,.35)",
        pointerEvents: "none",
        transform: "translate(-50%, -50%)",
        transition: "left .35s ease, top .35s ease, transform .15s ease",
        zIndex: "2147483647",
      });
      document.body.appendChild(cursor);
    }

    if (!document.querySelector("#bookverse-demo-label")) {
      const label = document.createElement("div");
      label.id = "bookverse-demo-label";
      Object.assign(label.style, {
        position: "fixed",
        left: "24px",
        bottom: "24px",
        maxWidth: "680px",
        padding: "14px 20px",
        borderRadius: "14px",
        color: "white",
        background: "rgba(10,70,64,.94)",
        border: "1px solid rgba(255,214,92,.7)",
        boxShadow: "0 12px 40px rgba(0,0,0,.28)",
        font: "700 20px/1.45 'Segoe UI', sans-serif",
        pointerEvents: "none",
        zIndex: "2147483646",
      });
      document.body.appendChild(label);
    }
  });
}

async function showLabel(page: Page, text: string) {
  await ensureDemoOverlay(page);
  await page.evaluate((value) => {
    const label = document.querySelector<HTMLElement>("#bookverse-demo-label");
    if (label) label.textContent = value;
  }, text);
}

async function moveAndClick(page: Page, locator: Locator) {
  const consentButton = page.locator("#consent-decline-btn");
  if (await consentButton.isVisible().catch(() => false)) {
    await consentButton.click();
    await page
      .locator('[role="dialog"][aria-labelledby="consent-title"]')
      .waitFor({ state: "hidden", timeout: 15_000 });
    await wait(500);
  }

  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) {
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + box.height / 2);
    await page.evaluate(({ x, y }) => {
      const cursor = document.querySelector<HTMLElement>("#bookverse-demo-cursor");
      if (cursor) {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
      }
    }, { x, y });
    await page.mouse.move(x, y, { steps: 12 });
    await wait(450);
  }

  // Modal có thể xuất hiện trong lúc con trỏ đang di chuyển (sau khi API
  // consent trả về). Kiểm tra lần cuối ngay trước thao tác chính.
  if (await consentButton.isVisible().catch(() => false)) {
    await consentButton.click();
    await page
      .locator('[role="dialog"][aria-labelledby="consent-title"]')
      .waitFor({ state: "hidden", timeout: 15_000 });
    await wait(500);
  }
  await locator.click();
}

async function dismissResearchConsent(page: Page, waitForModal = true) {
  const dialog = page.locator('[role="dialog"][aria-labelledby="consent-title"]');
  const declineButton = page.locator("#consent-decline-btn");
  // Trạng thái consent được tải bất đồng bộ sau khi phiên đăng nhập sẵn sàng.
  // Chờ ngắn để modal kịp xuất hiện, tránh che các thao tác tiếp theo trong video.
  if (waitForModal) {
    await declineButton.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
  }
  if (!(await declineButton.isVisible().catch(() => false))) return;

  await showLabel(page, "Quyền riêng tư: từ chối ghi nhận hành vi trong phiên quay demo");
  const box = await declineButton.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await wait(450);
  }
  await declineButton.click();
  await dialog.waitFor({ state: "hidden", timeout: 15_000 });
  await wait(700);
}

async function gotoScene(page: Page, route: string, label: string, hold = 1800) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await showLabel(page, label);
  await wait(hold);
  await dismissResearchConsent(page, false);
}

async function scrollPreview(page: Page, distance = 520) {
  await page.evaluate((value) => window.scrollBy({ top: value, behavior: "smooth" }), distance);
  await wait(1400);
}

async function login(page: Page, email: string, roleLabel: string, callbackUrl: string) {
  await gotoScene(page, `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, `Đăng nhập vai trò ${roleLabel}`, 1000);
  const emailInput = page.getByLabel("Email", { exact: true });
  const passwordInput = page.getByLabel("Mật khẩu", { exact: true });
  await emailInput.fill("");
  await emailInput.pressSequentially(email, { delay: 28 });
  await passwordInput.pressSequentially(password, { delay: 75 });
  await wait(600);
  await moveAndClick(page, page.getByRole("button", { name: "Đăng nhập", exact: true }));
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 25_000 });
  await dismissResearchConsent(page);
  await showLabel(page, `Đăng nhập ${roleLabel} thành công`);
  await wait(1500);
}

async function logout(page: Page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const logoutButton = page.getByRole("button", { name: "Đăng xuất", exact: true }).first();
  await showLabel(page, "Kết thúc phiên đăng nhập hiện tại");
  await moveAndClick(page, logoutButton);
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
  await wait(1000);
}

async function recordReaderFlow(page: Page) {
  await login(page, accounts.reader, "ĐỘC GIẢ", "/dashboard");
  await showLabel(page, "Dashboard độc giả: chỉ số đọc và tiến độ cá nhân");
  await scrollPreview(page, 430);

  await gotoScene(page, "/", "Trang chủ: tìm kiếm, sách nổi bật và số liệu thật");
  await scrollPreview(page, 520);

  await gotoScene(page, "/catalog?q=tri+tue+nhan+tao&sort=price-low", "Danh mục: tìm kiếm không dấu và sắp xếp theo giá");
  const firstBook = page.getByRole("link", { name: /^Xem chi tiết sách / }).first();
  await moveAndClick(page, firstBook);
  await page.waitForURL(/\/book\//, { timeout: 20_000 });
  await showLabel(page, "Chi tiết sách: bìa thật, thông tin, quyền đọc và mua sách");
  await wait(1800);
  await scrollPreview(page, 520);

  await gotoScene(page, "/read/RB03003", "Trình đọc Ebook: mục lục, tiến độ và công cụ đọc", 2300);
  await scrollPreview(page, 360);

  await gotoScene(page, "/assistant", "Trợ lý BookVerse: hỏi đáp từ dữ liệu đã kiểm chứng", 1600);
  const assistantInput = page.getByLabel("Câu hỏi cho trợ lý BookVerse");
  await assistantInput.fill("Gợi ý cho tôi sách về trí tuệ nhân tạo");
  await moveAndClick(page, page.getByRole("button", { name: "Gửi câu hỏi" }));
  await page.getByText(/dữ liệu BookVerse|gợi ý|sách/i).last().waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
  await wait(2600);

  await gotoScene(page, "/marketplace", "Chợ sách: tìm tin bán, tình trạng và người bán");
  await scrollPreview(page, 420);
  await gotoScene(page, "/community", "Cộng đồng: bài viết, thảo luận và chia sẻ trải nghiệm đọc");
  await scrollPreview(page, 420);
  await gotoScene(page, "/membership", "Hội viên: quyền đọc nội dung minh họa BookVerse");
  await scrollPreview(page, 420);
  await gotoScene(page, "/profile", "Hồ sơ độc giả và các liên kết quản lý tài khoản");
  await gotoScene(page, "/reading/goals", "Mục tiêu đọc: theo dõi kế hoạch cá nhân");
  await gotoScene(page, "/reading/calendar", "Lịch đọc: trực quan hóa thói quen theo ngày");
  await gotoScene(page, "/cart", "Giỏ hàng và quy trình thanh toán demo");
  await logout(page);
}

async function recordSellerFlow(page: Page) {
  await login(page, accounts.seller, "NGƯỜI BÁN", "/seller");
  await showLabel(page, "Kênh người bán: tổng quan vận hành gian hàng");
  await scrollPreview(page, 420);
  await gotoScene(page, "/seller/listings", "Người bán: quản lý các tin đăng");
  await gotoScene(page, "/seller/orders", "Người bán: tiếp nhận và theo dõi đơn hàng");
  await gotoScene(page, "/seller/revenue", "Người bán: doanh thu và chỉ số kinh doanh");
  await logout(page);
}

async function recordAdminFlow(page: Page) {
  await login(page, accounts.admin, "QUẢN TRỊ VIÊN", "/admin");
  await showLabel(page, "Admin Center: tổng quan vận hành và phân quyền");
  await scrollPreview(page, 480);
  await gotoScene(page, "/admin/analytics", "Quản trị: analytics và biểu đồ hệ thống");
  await gotoScene(page, "/admin/subscriptions", "Quản trị: theo dõi hội viên và đăng ký");
  await gotoScene(page, "/admin/data-quality", "Quản trị: kiểm tra chất lượng dữ liệu");
  await gotoScene(page, "/admin/integrations", "Quản trị: trạng thái database, AI và hạ tầng");
  await scrollPreview(page, 360);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await rm(rawVideoDir, { recursive: true, force: true });
  await mkdir(rawVideoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: rawVideoDir, size: { width: 1600, height: 900 } },
    viewport: { width: 1600, height: 900 },
    colorScheme: "light",
  });
  const page = await context.newPage();

  await recordReaderFlow(page);
  await recordSellerFlow(page);
  await recordAdminFlow(page);
  await showLabel(page, "BookVerse AI · Đồ án tốt nghiệp · Lương Nguyễn Quốc Tuấn");
  await wait(3000);

  await page.close();
  await context.close();
  await browser.close();

  const rawFiles = (await readdir(rawVideoDir)).filter((file) => file.endsWith(".webm"));
  if (rawFiles.length !== 1) {
    throw new Error(`Không tìm thấy đúng một video WebM, hiện có ${rawFiles.length} tệp.`);
  }

  const finalRawPath = path.join(outputDir, "BookVerse_AI_Demo_ThaoTacThat.webm");
  await rm(finalRawPath, { force: true });
  await rename(path.join(rawVideoDir, rawFiles[0]), finalRawPath);
  console.log(finalRawPath);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
