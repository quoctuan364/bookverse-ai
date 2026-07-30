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
        name: /Một thư viện cho mọi nhịp đọc của bạn/,
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
    await expect(page.getByRole("button", { name: "Thanh toán Sandbox" })).toBeVisible();
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
      await expect(page.getByRole("link", { name: "Khám phá sách", exact: true })).toBeVisible();
      await expect(desktopNavigation).toBeHidden();
    } else {
      await expect(desktopNavigation).toBeVisible();
      await expect(mobileNavigation).toBeHidden();
    }
  });

  test("route bảo vệ chuyển khách về đăng nhập và chặn file Ebook trực tiếp", async ({
    page,
  }) => {
    await page.goto("/read");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fread/);

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
        name: /Một thư viện cho mọi nhịp đọc của bạn/,
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
    await expect(page.getByText("AUTH_GOOGLE_SECRET", { exact: true })).toBeVisible();
  });
});
