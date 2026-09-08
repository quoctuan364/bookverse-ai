import { expect, test } from "@playwright/test";

test.describe("Trang chủ BookVerse AI phong phú", () => {
  test("hiển thị đủ các khu vực khám phá và chuyển truy vấn tìm kiếm", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Một thế giới sách, được chọn cho riêng bạn." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Hôm nay bạn muốn đọc điều gì?" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Phổ biến trên BookVerse" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Mới được thêm vào catalog" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Có thể đọc ngay trên BookVerse" }),
    ).toBeVisible();

    const search = page.getByPlaceholder("Tên sách, tác giả, ISBN...");
    await search.fill("trí tuệ nhân tạo");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/catalog\?q=tr%C3%AD\+tu%E1%BB%87\+nh%C3%A2n\+t%E1%BA%A1o$/);
  });

  test("không tràn ngang và giữ điều hướng phù hợp với màn hình", async ({ page }) => {
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const viewportWidth = page.viewportSize()?.width ?? 1280;
    const chatbot = page.getByRole("button", { name: "Mở chatbot" });
    const mobileNavigation = page.getByRole("navigation", {
      name: "Điều hướng nhanh trên điện thoại",
    });

    if (viewportWidth < 1024) {
      await expect(chatbot).toHaveCount(0);
      await expect(mobileNavigation).toBeVisible();
    } else {
      await expect(chatbot).toBeVisible();
      await expect(mobileNavigation).toBeHidden();
    }
  });
});
