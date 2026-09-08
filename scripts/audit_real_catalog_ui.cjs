const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.BOOKVERSE_REAL_CATALOG_BASE_URL || "http://127.0.0.1:3100";
const outputDirectory = path.resolve("outputs", "g2-real-catalog-browser");
const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1366", width: 1366, height: 768 },
  { name: "1920", width: 1920, height: 1080 },
];

async function login(page, email, callbackUrl) {
  await page.goto(`${baseUrl}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("123456");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 }),
    page.getByRole("button", { name: "Đăng nhập" }).click(),
  ]);
}

async function inspectPage(page, route, requiredText = []) {
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
  const result = await page.evaluate((texts) => {
    const covers = [...document.querySelectorAll("[data-cover-book-id]")];
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    // textContent vẫn kiểm tra nội dung SSR/DOM ở các section nằm ngoài viewport dọc.
    const bodyText = document.body.textContent || "";
    const aspectFailures = covers.filter((cover) => {
      const rect = cover.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && Math.abs(rect.width / rect.height - 2 / 3) > 0.035;
    }).length;
    return {
      aspectFailures,
      coverCount: covers.length,
      fallbackCount: covers.filter((cover) => cover.dataset.coverFallback === "true").length,
      lazyImageCount: document.querySelectorAll('img[loading="lazy"]').length,
      metadataBadgeCount: [...document.querySelectorAll("body *")].filter(
        (element) => element.textContent?.trim() === "Metadata tuyển chọn",
      ).length,
      overflow,
      requiredText: Object.fromEntries(texts.map((text) => [text, bodyText.includes(text)])),
    };
  }, requiredText);
  return { route, status: response?.status() ?? null, ...result };
}

async function inspectRecommendationApi(page) {
  const response = await page.request.get(`${baseUrl}/api/recommendations?limit=5`);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const items = Array.isArray(body?.data) ? body.data : [];
  const evidenceStatuses = items.flatMap((item) => [
    ...(Array.isArray(item.evidence) ? item.evidence.map((evidence) => evidence.status) : []),
  ]);
  return {
    status: response.status(),
    itemCount: items.length,
    neutralEvidence: evidenceStatuses.every((status) => status !== "VERIFIED_REAL_USER"),
    evidenceStatuses,
  };
}

async function main() {
  await fs.mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  let catalogRemoteCoverRequests = 0;

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const requestCounter = (request) => {
        if (request.url().startsWith("https://covers.openlibrary.org/")) catalogRemoteCoverRequests += 1;
      };
      page.on("request", requestCounter);

      const home = await inspectPage(page, "/", ["Sách tuyển chọn", "Giá demo", "Metadata tuyển chọn"]);
      const beforeCatalogRequests = catalogRemoteCoverRequests;
      const catalog = await inspectPage(page, "/catalog?source=real", [
        "Catalog thật",
        "Metadata tuyển chọn",
        "Giá demo",
      ]);
      const catalogRequestCount = catalogRemoteCoverRequests - beforeCatalogRequests;
      const detail = await inspectPage(page, "/book/RB00001", [
        "Metadata tuyển chọn",
        "Giá demo",
        "ISBN",
        "Nhà xuất bản",
        "Nguồn Open Library",
      ]);
      const marketplace = await inspectPage(page, "/marketplace");

      await login(page, "user0001@bookverse.demo", "/cart");
      const cart = await inspectPage(page, "/cart");
      const library = await inspectPage(page, "/library");
      const recommendation = await inspectRecommendationApi(page);
      await context.close();

      const sellerContext = await browser.newContext({ viewport });
      const sellerPage = await sellerContext.newPage();
      await login(sellerPage, "user0003@bookverse.demo", "/seller/listings");
      const seller = await inspectPage(sellerPage, "/seller/listings");
      await sellerContext.close();

      const checks = { home, catalog, detail, marketplace, cart, library, seller, recommendation };
      const failedRoutes = Object.entries(checks)
        .filter(([, item]) => item.status !== 200 || item.overflow > 1 || item.aspectFailures > 0)
        .map(([name]) => name);
      const textFailures = [home, catalog, detail].flatMap((item) =>
        Object.entries(item.requiredText)
          .filter(([, found]) => !found)
          .map(([text]) => `${item.route}:${text}`),
      );
      const verified =
        failedRoutes.length === 0 &&
        textFailures.length === 0 &&
        catalog.coverCount === 24 &&
        catalog.metadataBadgeCount >= 24 &&
        catalog.lazyImageCount >= 24 &&
        catalogRequestCount <= 24 &&
        recommendation.status === 200 &&
        recommendation.neutralEvidence &&
        pageErrors.length === 0;
      const viewportResult = {
        viewport: viewport.name,
        verified,
        catalogRequestCount,
        failedRoutes,
        textFailures,
        pageErrors,
        checks,
      };
      results.push(viewportResult);

      if (viewport.name === "1366") {
        const evidenceContext = await browser.newContext({ viewport });
        const evidencePage = await evidenceContext.newPage();
        await evidencePage.goto(`${baseUrl}/catalog?source=real`, { waitUntil: "networkidle" });
        await evidencePage.screenshot({
          path: path.join(outputDirectory, "1366-catalog-real.png"),
          fullPage: true,
        });
        await evidencePage.goto(`${baseUrl}/book/RB00001`, { waitUntil: "domcontentloaded" });
        await evidencePage.screenshot({
          path: path.join(outputDirectory, "1366-detail-real.png"),
          fullPage: true,
        });
        await evidenceContext.close();
      }
    }

    const failureContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const failurePage = await failureContext.newPage();
    let intercepted = 0;
    await failurePage.route("https://covers.openlibrary.org/**", async (route) => {
      intercepted += 1;
      await route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
    });
    await failurePage.goto(`${baseUrl}/catalog?source=real`, { waitUntil: "domcontentloaded" });
    await failurePage.waitForFunction(
      () =>
        document.querySelectorAll('[data-cover-fallback="true"]').length ===
        document.querySelectorAll("[data-cover-book-id]").length,
      undefined,
      { timeout: 15_000 },
    );
    const fallback = await failurePage.evaluate(() => ({
      covers: document.querySelectorAll("[data-cover-book-id]").length,
      fallbacks: document.querySelectorAll('[data-cover-fallback="true"]').length,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
    }));
    await failureContext.close();

    const report = {
      status:
        results.every((item) => item.verified) &&
        intercepted === 24 &&
        fallback.covers === 24 &&
        fallback.fallbacks === 24 &&
        fallback.brokenImages === 0
          ? "VERIFIED"
          : "FAILED",
      dataLabel: "TEST_FIXTURE",
      rightsStatus: "NOT_VERIFIED",
      viewports: results,
      remote404Fallback: { intercepted, ...fallback },
      timeoutFallback: "VERIFIED_BY_UNIT_TEST_ONLY",
    };
    const reportPath = path.join(outputDirectory, "real-catalog-browser-report.json");
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(
      JSON.stringify(
        {
          status: report.status,
          checkedViewports: viewports.map((item) => item.name),
          checkedSurfacesPerViewport: 8,
          failedViewports: results.filter((item) => !item.verified).map((item) => item.viewport),
          catalogRemoteRequestsMaximum: Math.max(...results.map((item) => item.catalogRequestCount)),
          remote404Fallback: report.remote404Fallback,
          timeoutFallback: report.timeoutFallback,
          report: path.relative(process.cwd(), reportPath),
        },
        null,
        2,
      ),
    );
    if (report.status !== "VERIFIED") process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
