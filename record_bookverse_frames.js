const { chromium } = require('playwright');
const fs = require('fs/promises');

const BASE = 'http://127.0.0.1:3000';
const FRAME_DIR = 'D:/Doantotnghiep/actual_demo_frames_run2';
const pause = (page, ms) => page.waitForTimeout(ms);

async function safe(action) {
  try { await action(); } catch (_) { /* Bỏ qua phần tử thay đổi theo trạng thái demo. */ }
}

(async () => {
  await fs.mkdir(FRAME_DIR, { recursive: true });
  let frame = 0;
  let lastTimestamp = -Infinity;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await context.newPage();
  page.setDefaultTimeout(4000);
  const cast = await page.screencast.start({
    size: { width: 960, height: 540 }, quality: 80,
    onFrame: async ({ data, timestamp }) => {
      if (timestamp - lastTimestamp < 500) return; // 2 khung hình/giây, video nhẹ hơn.
      lastTimestamp = timestamp;
      await fs.writeFile(`${FRAME_DIR}/${String(frame++).padStart(4, '0')}.jpg`, data);
    },
  });

  const chapter = async (title, description) => {
    await page.screencast.showChapter(title, { description, duration: 1250 });
  };
  const go = async (path, title, description) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'commit', timeout: 12000 });
    await pause(page, 650);
    await chapter(title, description);
    await pause(page, 250);
  };

  try {
    await go('/', 'BOOKVERSE AI', 'Demo hệ thống quản lý và đọc sách trực tuyến');
    await page.mouse.wheel(0, 650); await pause(page, 900);

    await go('/catalog', '1. TÌM SÁCH', 'Tìm sách “dam dai da qua” trong catalog');
    const search = page.getByRole('searchbox', { name: 'Tìm trong danh mục sách' });
    await search.pressSequentially('dam dai da qua', { delay: 55 });
    await search.press('Enter'); await pause(page, 500);
    await safe(() => page.getByRole('button', { name: 'Tìm sách' }).click()); await pause(page, 800);

    await chapter('2. CHI TIẾT SÁCH', 'Xem Dặm Dài Đã Qua và thêm vào giỏ');
    await safe(() => page.getByRole('link', { name: 'Xem chi tiết sách Dặm Dài Đã Qua' }).click());
    await pause(page, 900);
    await safe(() => page.getByRole('button', { name: 'Thêm vào giỏ' }).click()); await pause(page, 700);

    await go('/cart', '3. GIỎ HÀNG', 'Nhập và áp dụng mã BOOKVERSE50');
    await safe(async () => {
      const code = page.getByRole('textbox', { name: 'Mã ưu đãi / Voucher' });
      await code.pressSequentially('BOOKVERSE50', { delay: 55 });
      await page.getByRole('button', { name: 'Áp dụng' }).click();
    });
    await pause(page, 1000);

    await go('/login', '4. ĐĂNG NHẬP DEMO', 'Tài khoản độc giả BookVerse');
    await safe(async () => { await page.getByRole('button', { name: 'Độc giả' }).click(); await pause(page, 300); await page.getByRole('button', { name: 'Đăng nhập' }).click(); });
    await pause(page, 1000);

    await go('/membership', '5. HỘI VIÊN', 'Xem quyền lợi các gói thành viên');
    await page.mouse.wheel(0, 450); await pause(page, 900);

    await go('/read/RB00004', '6. TRÌNH ĐỌC', 'Bookmark và đổi theme đọc sách');
    await pause(page, 1200);
    await safe(() => page.getByRole('button', { name: 'Đánh dấu trang' }).click());
    await safe(() => page.getByRole('button', { name: 'Mở bảng tùy chỉnh' }).click());
    await pause(page, 400);
    await safe(() => page.getByRole('button', { name: 'Dark' }).click()); await pause(page, 800);

    await go('/reading/insights', '7. THỐNG KÊ ĐỌC', 'Theo dõi thời gian và tiến độ đọc');
    await page.mouse.wheel(0, 400); await pause(page, 700);

    await go('/assistant', '8. NOVA AI', 'Hỏi Nova hai câu hỏi');
    await safe(async () => {
      const input = page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý BookVerse' });
      await input.pressSequentially('Gợi ý sách trí tuệ nhân tạo cho người mới.', { delay: 45 });
      await page.getByRole('button', { name: 'Gửi câu hỏi' }).click(); await pause(page, 900);
      await input.pressSequentially('Gói hội viên mở được những gì?', { delay: 45 });
      await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
    });
    await pause(page, 1200);

    await go('/marketplace', '9. CHỢ SÁCH', 'Xem các tin sách đang mở');
    await page.mouse.wheel(0, 420); await pause(page, 700);

    await go('/login', '10. QUẢN TRỊ DEMO', 'Chuyển sang tài khoản quản trị');
    await safe(async () => { await page.getByRole('button', { name: 'Quản trị' }).click(); await page.getByRole('button', { name: 'Đăng nhập' }).click(); });
    await pause(page, 750);
    await go('/admin/analytics', '11. DASHBOARD ADMIN', 'Tổng quan doanh thu và hoạt động hệ thống');
    await page.mouse.wheel(0, 430); await pause(page, 700);

    await go('/community', '12. CỘNG ĐỒNG BOOKVERSE', 'Kết thúc video demo tại diễn đàn đọc sách');
    await page.mouse.wheel(0, 300); await pause(page, 1200);
  } finally {
    await cast.dispose();
    await browser.close();
  }
  console.log(`Đã ghi ${frame} khung hình.`);
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
