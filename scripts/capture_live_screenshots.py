import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ASSETS_DIR = Path("outputs/report-assets")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
BASE_URL = "http://127.0.0.1:3000"

async def capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        # 1. Trang chu
        await page.goto(f"{BASE_URL}/", wait_until="networkidle")
        await page.screenshot(path=str(ASSETS_DIR / "hinh_3_55_giao_dien_trang_chu.png"))
        print("Captured: Trang chu")

        # 2. De xuat sach / Catalog
        await page.goto(f"{BASE_URL}/catalog?q=tri+tue+nhan+tao", wait_until="networkidle")
        await page.screenshot(path=str(ASSETS_DIR / "hinh_3_56_giao_dien_de_xuat.png"))
        print("Captured: De xuat / Catalog")

        # 3. Chatbot AI Assistant
        await page.goto(f"{BASE_URL}/assistant", wait_until="networkidle")
        await page.screenshot(path=str(ASSETS_DIR / "hinh_3_57_giao_dien_chatbot.png"))
        print("Captured: Chatbot")

        # 4. Trinh doc Ebook
        await page.goto(f"{BASE_URL}/read/RB00906", wait_until="networkidle")
        await page.screenshot(path=str(ASSETS_DIR / "hinh_phu_luc_read.png"))
        print("Captured: Trinh doc Ebook")

        # 5. Cho sach cu
        await page.goto(f"{BASE_URL}/marketplace", wait_until="networkidle")
        await page.screenshot(path=str(ASSETS_DIR / "hinh_phu_luc_marketplace.png"))
        print("Captured: Marketplace")

        # 6. Admin Analytics
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        await page.get_by_label("Email", exact=True).fill("admin.bookverse.demo@gmail.com")
        await page.get_by_label("Mật khẩu", exact=True).fill("123456")
        await page.get_by_role("button", name="Đăng nhập", exact=True).click()
        await page.wait_for_timeout(2500)

        await page.goto(f"{BASE_URL}/admin/analytics", wait_until="networkidle")
        await page.screenshot(path=str(ASSETS_DIR / "hinh_phu_luc_admin.png"))
        print("Captured: Admin Analytics")

        await page.goto(f"{BASE_URL}/seller/listings", wait_until="networkidle")
        await page.screenshot(path=str(ASSETS_DIR / "hinh_3_58_giao_dien_them_san_pham.png"))
        print("Captured: Seller listings")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture())
