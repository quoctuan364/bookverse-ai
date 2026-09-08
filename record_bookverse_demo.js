const { chromium } = require('playwright');

const OUTPUT = 'D:/Doantotnghiep/BookVerse_AI_Demo_ThaoTac_That_KhongAmThanh.webm';
const BASE = 'http://127.0.0.1:3000';

const pause = (page, ms = 1200) => page.waitForTimeout(ms);

async function chapter(page, title, description) {
  await page.screencast.showChapter(title, { description, duration: 1700 });
  await pause(page, 400);
}

async function go(page, path, title, description) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await pause(page, 900);
  await chapter(page, title, description);
}

async function clickIfVisible(locator) {
  if (await locator.count() && await locator.first().isVisible()) {
    await locator.first().click();
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const recording = await page.screencast.start({ path: OUTPUT, size: { width: 1280, height: 720 }, quality: 85 });
  const actions = await page.screencast.showActions({ cursor: 'pointer', duration: 800, position: 'bottom-right' });

  try {
    await go(page, '/', 'BOOKVERSE AI', 'Demo các chức năng chính của hệ thống');
    await page.mouse.wheel(0, 560);
    await pause(page, 1300);
    await page.mouse.wheel(0, 620);
    await pause(page, 900);

    await go(page, '/catalog', '1. TÌM KIẾM SÁCH', 'Tìm “dam dai da qua” trong catalog');
    const search = page.getByRole('searchbox', { name: 'Tìm trong danh mục sách' });
    await search.fill('');
    await search.pressSequentially('dam dai da qua', { delay: 70 });
    await search.press('Enter');
    await pause(page, 900);
    await clickIfVisible(page.getByRole('button', { name: 'Tìm sách' }));
    await pause(page, 1200);

    await chapter(page, '2. CHI TIẾT SÁCH', 'Xem thông tin và thêm sách vào giỏ hàng');
    await page.getByRole('link', { name: 'Xem chi tiết sách Dặm Dài Đã Qua' }).click();
    await pause(page, 1200);
    await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();
    await pause(page, 900);

    await go(page, '/cart', '3. MÃ ƯU ĐÃI', 'Áp dụng mã giảm giá BOOKVERSE50');
    const coupon = page.getByRole('textbox', { name: 'Mã ưu đãi / Voucher' });
    await coupon.pressSequentially('BOOKVERSE50', { delay: 75 });
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await pause(page, 1400);

    await go(page, '/login', '4. ĐĂNG NHẬP DEMO', 'Độc giả: reader.bookverse.demo@gmail.com');
    await page.getByRole('button', { name: 'Độc giả' }).click();
    await pause(page, 700);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await pause(page, 1600);

    await go(page, '/membership', '5. GÓI HỘI VIÊN', 'So sánh các quyền lợi đọc sách');
    await page.mouse.wheel(0, 500);
    await pause(page, 1200);

    await go(page, '/read/RB00004', '6. TRÌNH ĐỌC SÁCH', 'Đọc sách, bookmark và đổi giao diện');
    await pause(page, 1800);
    await clickIfVisible(page.getByRole('button', { name: 'Đánh dấu trang' }));
    await pause(page, 500);
    await page.getByRole('button', { name: 'Mở bảng tùy chỉnh' }).click();
    await pause(page, 700);
    await page.getByRole('button', { name: 'Dark' }).click();
    await pause(page, 1200);

    await go(page, '/reading/insights', '7. THỐNG KÊ ĐỌC', 'Theo dõi thời gian, streak và chủ đề yêu thích');
    await page.mouse.wheel(0, 420);
    await pause(page, 1200);

    await go(page, '/assistant', '8. NOVA AI', 'Hỏi trợ lý đọc sách hai câu hỏi');
    const ai = page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý BookVerse' });
    await ai.pressSequentially('Gợi ý cho tôi sách về trí tuệ nhân tạo.', { delay: 55 });
    await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
    await pause(page, 1900);
    await ai.pressSequentially('Gói hội viên mở được những gì?', { delay: 55 });
    await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
    await pause(page, 1900);

    await go(page, '/marketplace', '9. CHỢ SÁCH', 'Khám phá tin bán sách đang mở');
    await page.mouse.wheel(0, 500);
    await pause(page, 1100);

    await go(page, '/login', '10. QUẢN TRỊ DEMO', 'Chuyển sang tài khoản quản trị');
    await page.getByRole('button', { name: 'Quản trị' }).click();
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await pause(page, 1400);
    await go(page, '/admin/analytics', '11. DASHBOARD ADMIN', 'Theo dõi doanh thu, hội viên và hoạt động AI');
    await page.mouse.wheel(0, 500);
    await pause(page, 1200);

    await go(page, '/community', '12. BOOKVERSE COMMUNITY', 'Kết thúc demo tại diễn đàn đọc sách');
    await page.mouse.wheel(0, 380);
    await pause(page, 1600);
  } finally {
    await actions.dispose();
    await recording.stop();
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
