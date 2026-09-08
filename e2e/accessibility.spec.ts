import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/catalog",
  "/discover",
  "/membership",
  "/assistant",
  "/marketplace",
  "/community",
  "/book/B-TEST-FIXTURE-AI",
  "/login",
  "/register",
  "/forgot-password",
  "/help",
  "/privacy",
];
const demoPassword = "123456";

async function scanPage(page: Page) {
  await expect(page.locator("body")).toBeVisible();

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return result.violations
    .filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    )
    .flatMap((violation) =>
      violation.nodes.map((node) => ({
        rule: violation.id,
        target: node.target.join(" "),
        summary: node.failureSummary,
      })),
    );
}

async function login(page: Page, email: string, callbackUrl: string) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(demoPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${callbackUrl.replaceAll("/", "\\/")}$`));
}

for (const route of publicRoutes) {
  test(`không có lỗi accessibility nghiêm trọng tại ${route}`, async ({ page }) => {
    await page.goto(route);
    const issueSummary = await scanPage(page);

    expect(issueSummary, JSON.stringify(issueSummary, null, 2)).toEqual([]);
  });
}

for (const route of [
  "/read",
  "/read/B-TEST-FIXTURE-AI",
  "/dashboard",
  "/profile",
  "/profile/settings",
  "/profile/security",
  "/profile/addresses",
  "/onboarding/preferences",
  "/cart",
  "/notifications",
  "/community/new",
  "/reading/goals",
  "/reading/calendar",
]) {
  test(`độc giả không gặp lỗi accessibility nghiêm trọng tại ${route}`, async ({ page }) => {
    await login(page, "reader.bookverse.demo@gmail.com", route);
    const issueSummary = await scanPage(page);
    expect(issueSummary, JSON.stringify(issueSummary, null, 2)).toEqual([]);
  });
}

for (const route of ["/admin", "/admin/analytics"]) {
  test(`quản trị viên không gặp lỗi accessibility nghiêm trọng tại ${route}`, async ({ page }) => {
    await login(page, "admin.bookverse.demo@gmail.com", route);
    const issueSummary = await scanPage(page);
    expect(issueSummary, JSON.stringify(issueSummary, null, 2)).toEqual([]);
  });
}
