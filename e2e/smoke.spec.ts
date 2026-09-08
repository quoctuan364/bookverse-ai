import { expect, type Page, test } from "@playwright/test";

const demoPassword = "123456";
const readerEmail = "reader.bookverse.demo@gmail.com";
const adminEmail = "admin.bookverse.demo@gmail.com";

async function login(page: Page, email: string, callbackUrl: string) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(demoPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${callbackUrl.replace("/", "\\/")}$`));
}

test.describe("BookVerse smoke không sửa dữ liệu nghiệp vụ", () => {
  test("các bề mặt công khai hiển thị nội dung cốt lõi", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Một thế giới sách, được chọn cho riêng bạn.",
      }),
    ).toBeVisible();

    await page.goto("/membership");
    await expect(
      page.getByRole("heading", { level: 1, name: "Đọc nhiều hơn, học sâu hơn" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: "Kiểm tra ở server" }),
    ).toBeVisible();

    await page.goto("/assistant");
    await expect(page.getByRole("heading", { level: 2, name: "Hỏi trợ lý" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hồ sơ & avatar" })).toBeVisible();
  });

  test("catalog tìm được thể loại tiếng Việt bằng truy vấn không dấu", async ({ page }) => {
    await page.goto("/catalog?q=tri+tue+nhan+tao&sort=price-low");

    // Không ghim tên một sách cụ thể vì clean-clone có thể dùng catalog demo
    // hoặc catalog tuyển chọn. Điều cần chứng minh là truy vấn không dấu vẫn
    // trả sách thuộc đúng thể loại và có đường dẫn chi tiết hợp lệ.
    const firstResult = page.locator("main article").first();
    await expect(firstResult).toBeVisible();
    await expect(
      firstResult.getByText("Trí tuệ nhân tạo", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      firstResult.getByRole("link", { name: /^Xem chi tiết sách / }),
    ).toHaveAttribute("href", /^\/book\/[^/]+$/);
    await expect(page.getByLabel("Sắp xếp")).toHaveValue("price-low");
    await expect(
      page.getByRole("link", { name: "Xóa bộ lọc Tìm: tri tue nhan tao" }),
    ).toBeVisible();
  });

  test("điều hướng thích ứng theo desktop và mobile", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize();
    const desktopNavigation = page.getByRole("navigation", { name: "Điều hướng chính" });
    const mobileNavigation = page.getByRole("navigation", {
      name: "Điều hướng nhanh trên điện thoại",
    });

    if ((viewport?.width ?? 1280) < 1024) {
      await expect(mobileNavigation).toBeVisible();
      await expect(
        mobileNavigation.getByRole("link", { name: "Danh mục sách", exact: true }),
      ).toBeVisible();
      await expect(desktopNavigation).toBeHidden();
    } else {
      await expect(desktopNavigation).toBeVisible();
      await expect(mobileNavigation).toBeHidden();
    }
  });

  test("bong bóng hỗ trợ hoạt động trên desktop và mobile", async ({ page }) => {
    await page.goto("/");

    const openButton = page.getByRole("button", { name: "Mở chatbot" });
    await expect(openButton).toBeVisible();
    await openButton.click();

    const dialog = page.getByRole("dialog", { name: "Trợ lý BookVerse" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Hồ sơ & avatar" }).click();

    await expect(dialog.getByText(/tải ảnh đại diện từ thiết bị/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.getByRole("link", { name: "Cập nhật hồ sơ" })).toHaveAttribute(
      "href",
      "/profile/settings",
    );

    await dialog.getByRole("button", { name: "Bắt đầu cuộc trò chuyện mới" }).click();
    await expect(dialog.getByRole("button", { name: "Hồ sơ & avatar" })).toBeVisible();
    await dialog.getByRole("button", { name: "Thu nhỏ chatbot" }).click();
    await expect(dialog).toBeHidden();
  });

  test("route bảo vệ chuyển khách về đăng nhập và chặn file Ebook trực tiếp", async ({
    page,
  }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flibrary/);

    const response = await page.goto("/ebooks/khong-duoc-doc-truc-tiep.html");
    expect(response?.status()).toBe(403);
    await expect(page.getByText("Không được phép truy cập trực tiếp file Ebook.")).toBeVisible();
  });

  test("đăng nhập sai hiển thị lỗi an toàn", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(readerEmail);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Email hoặc mật khẩu không đúng.",
    );
  });

  test("độc giả đăng nhập được nhưng không vào Admin Center", async ({ page }) => {
    await login(page, readerEmail, "/membership");
    await expect(
      page.getByRole("heading", { level: 1, name: "Đọc nhiều hơn, học sâu hơn" }),
    ).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Một thế giới sách, được chọn cho riêng bạn.",
      }),
    ).toBeVisible();
  });

  test("admin mở được dashboard và trang kiểm tra tích hợp", async ({ page }) => {
    await login(page, adminEmail, "/admin");
    await expect(
      page.getByRole("heading", { level: 1, name: "Trung tâm quản trị hệ thống" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Tổng quan vận hành" }),
    ).toBeVisible();

    await page.goto("/admin/integrations");
    await expect(
      page.getByRole("heading", { level: 1, name: "Trạng thái tích hợp" }),
    ).toBeVisible();
    await expect(page.getByText("BOOKVERSE_LLM_PROVIDER", { exact: true })).toBeVisible();
  });

  test("các lỗi UX quan trọng không tái xuất hiện", async ({ page }) => {
    await login(page, readerEmail, "/dashboard");
    await expect(page.getByText("Doanh thu chợ sách", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Uy tín người bán", { exact: true })).toHaveCount(0);

    const viewport = page.viewportSize();
    if ((viewport?.width ?? 1280) < 1024) {
      const dashboardWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dashboardWidth.scroll).toBeLessThanOrEqual(dashboardWidth.client);
    }

    await page.goto("/book/B-TEST-FIXTURE-AI");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Mở chatbot" })).toHaveCount(0);

    await page.goto("/marketplace");
    await expect(page.getByRole("button", { name: "Mở chatbot" })).toHaveCount(0);
    const advancedFilter = page.getByRole("button", { name: "Bộ lọc nâng cao" });
    if ((viewport?.width ?? 1280) < 1024) {
      await expect(advancedFilter).toBeVisible();
      await expect(page.getByLabel("Tình trạng sách")).toBeHidden();
      await advancedFilter.click();
      await expect(page.getByLabel("Tình trạng sách")).toBeVisible();
    } else {
      await expect(advancedFilter).toBeHidden();
      await expect(page.getByLabel("Tình trạng sách")).toBeVisible();
    }

    await page.goto("/assistant");
    await expect(page.getByText("Local Grounded RAG", { exact: false })).toHaveCount(0);
    if ((viewport?.width ?? 1280) < 1024) {
      const questionInput = page.getByLabel("Câu hỏi cho trợ lý BookVerse");
      await expect(questionInput).toBeVisible();
      const box = await questionInput.boundingBox();
      expect(box?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(viewport?.height ?? 720);
    }

    await page.goto("/cart");
    await expect(page.getByRole("button", { name: "Mở chatbot" })).toHaveCount(0);
  });
});
