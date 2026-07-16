const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.BOOKVERSE_COVER_AUDIT_BASE_URL || "http://127.0.0.1:3100";
const outputDirectory = path.resolve(process.cwd(), "outputs", "p0-cover-audit");

async function forceRemoteCoverFailure(page) {
  await page.route("https://picsum.photos/**", async (route) => {
    await route.abort("failed");
  });
}

async function auditSurface(page, name, route, minimumCovers = 1) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("picsum.photos")) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_200);

  const covers = page.locator("img[data-cover-fallback]");
  const coverCount = await covers.count();
  await page.waitForFunction(
    () => {
      const images = [...document.querySelectorAll("img[data-cover-fallback]")];
      return images.length > 0 && images.every((image) => image.getAttribute("data-cover-ready") === "true");
    },
    undefined,
    { timeout: 10_000 },
  );
  const sourceCover = page.locator('img[data-cover-fallback="false"]').first();
  if ((await sourceCover.count()) > 0) {
    await sourceCover.evaluate((image) => {
      image.src = "/__p0_forced_missing_cover__.jpg";
    });
    await page.waitForTimeout(500);
  }
  const fallbackCount = await covers.evaluateAll((images) =>
    images.filter((image) => image.getAttribute("data-cover-fallback") === "true").length,
  );
  const brokenCount = await covers.evaluateAll((images) =>
    images.filter((image) => image.complete && image.naturalWidth === 0).length,
  );
  const screenshot = path.join(outputDirectory, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  return {
    name,
    route,
    status: response?.status() ?? null,
    finalUrl: page.url(),
    coverCount,
    fallbackCount,
    brokenCount,
    minimumCovers,
    consoleErrors,
    pageErrors,
    screenshot: path.relative(process.cwd(), screenshot),
    verified:
      response?.status() === 200 &&
      coverCount >= minimumCovers &&
      fallbackCount >= 1 &&
      brokenCount === 0 &&
      pageErrors.length === 0,
  };
}

async function login(page, email, callbackUrl) {
  await page.goto(`${baseUrl}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("123456");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15_000 }),
    page.getByRole("button", { name: "Đăng nhập" }).click(),
  ]);
}

async function main() {
  await fs.mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const publicPage = await publicContext.newPage();
    await forceRemoteCoverFailure(publicPage);
    results.push(await auditSurface(publicPage, "home-recommendation", "/", 5));
    results.push(await auditSurface(publicPage, "catalog", "/catalog", 1));
    results.push(await auditSurface(publicPage, "book-detail", "/book/B0001", 1));
    results.push(await auditSurface(publicPage, "marketplace", "/marketplace", 1));
    await publicContext.close();

    const buyerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const buyerPage = await buyerContext.newPage();
    await forceRemoteCoverFailure(buyerPage);
    await login(buyerPage, "user0001@bookverse.demo", "/cart");
    results.push(await auditSurface(buyerPage, "cart", "/cart", 1));
    await buyerContext.close();

    const sellerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const sellerPage = await sellerContext.newPage();
    await forceRemoteCoverFailure(sellerPage);
    await login(sellerPage, "user0003@bookverse.demo", "/seller/listings");
    results.push(await auditSurface(sellerPage, "seller-listings", "/seller/listings", 1));
    await sellerContext.close();
  } finally {
    await browser.close();
  }

  const failed = results.filter((result) => !result.verified);
  console.log(
    JSON.stringify(
      {
        status: failed.length === 0 ? "VERIFIED" : "FAILED",
        dataLabel: "TEST_FIXTURE",
        forcedFailure: "Mọi request https://picsum.photos/** bị abort để kiểm tra onError fallback.",
        results,
      },
      null,
      2,
    ),
  );
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
