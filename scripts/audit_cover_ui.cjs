const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.BOOKVERSE_COVER_AUDIT_BASE_URL || "http://127.0.0.1:3100";
const outputDirectory = path.resolve(process.cwd(), "outputs", "p0-cover-audit");
const orderId = process.env.BOOKVERSE_COVER_AUDIT_ORDER_ID || "PH4-ORDER-U0003-PENDING";
const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1366", width: 1366, height: 768 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
];
const requestedViewportNames = new Set(
  (process.env.BOOKVERSE_COVER_AUDIT_VIEWPORTS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const selectedViewports =
  requestedViewportNames.size === 0
    ? viewports
    : viewports.filter((viewport) => requestedViewportNames.has(viewport.name));

const publicSurfaces = [
  { name: "home-recommendation", route: "/", minimumCovers: 5 },
  { name: "catalog", route: "/catalog", minimumCovers: 1 },
  { name: "book-detail", route: "/book/B0001", minimumCovers: 1 },
  { name: "marketplace", route: "/marketplace", minimumCovers: 1 },
  { name: "community", route: "/community", minimumCovers: 1 },
  { name: "cover-system", route: "/design/cover-system", minimumCovers: 1 },
];

const buyerSurfaces = [
  // Audit tổng quát vẫn đo layout khi giỏ trống nhưng trạng thái tổng phải giữ PARTIAL.
  // G2.1 dùng audit_g2_1_cart_covers.cjs để tạo Cart TEST_FIXTURE và bắt buộc có cover.
  { name: "cart", route: "/cart", minimumCovers: 0 },
  { name: "library", route: "/library", minimumCovers: 1 },
  { name: "profile", route: "/profile", minimumCovers: 1 },
  { name: "order-detail", route: `/orders/${orderId}`, minimumCovers: 1 },
];

function createConsoleCollectors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (message) => {
    if (message.type() === "error" && !message.text().includes("picsum.photos")) {
      consoleErrors.push(message.text());
    }
  };
  const onPageError = (error) => pageErrors.push(error.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  return {
    consoleErrors,
    pageErrors,
    detach: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

async function forceLegacyRemoteCoverFailure(page) {
  await page.route("https://picsum.photos/**", async (route) => {
    await route.abort("failed");
  });
}

async function auditSurface(page, viewport, surface) {
  console.log(`[cover-audit] ${viewport.name}px ${surface.name} ${surface.route}`);
  const collectors = createConsoleCollectors(page);
  const expectedUrl = new URL(surface.route, baseUrl);
  const response = await page.goto(expectedUrl.href, { waitUntil: "domcontentloaded", timeout: 60_000 });

  try {
    // Một số bìa hero được ẩn ở viewport nhỏ nhưng vẫn phải kiểm tra DOM và tính deterministic.
    await page
      .waitForSelector("[data-cover-book-id]", { state: "attached", timeout: 15_000 })
      .catch(() => undefined);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("[data-cover-book-id]")].every((cover) => {
          const status = cover.getAttribute("data-cover-status");
          return Boolean(status);
        }),
      undefined,
      { timeout: 10_000 },
    ).catch(() => undefined);
    await page.waitForTimeout(350);

    const measurements = await page.locator("[data-cover-book-id]").evaluateAll((covers) => {
      const forbiddenPattern = /(?:\bEBOOK\s+EDITION\b|Sách trong danh mục|Còn hàng|Hết hàng|[₫$€£]|\bVND\b|#\d{3,})/iu;
      const bodyOverflow = document.documentElement.scrollWidth - window.innerWidth;
      const overflowElements = [...document.querySelectorAll("body *")]
        .map((element) => ({ element, rectangle: element.getBoundingClientRect() }))
        .filter(({ rectangle }) => rectangle.width > 0 && (rectangle.right > window.innerWidth + 1 || rectangle.left < -1))
        .slice(0, 12)
        .map(({ element, rectangle }) => ({
          tag: element.tagName,
          className: typeof element.className === "string" ? element.className.slice(0, 180) : "",
          text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
          left: Math.round(rectangle.left),
          right: Math.round(rectangle.right),
          width: Math.round(rectangle.width),
        }));
      const coverItems = covers.map((cover) => {
        const rectangle = cover.getBoundingClientRect();
        const fallback = cover.getAttribute("data-cover-fallback") === "true";
        const paragraphs = [...cover.querySelectorAll("p")];
        const images = [...cover.querySelectorAll("img")];
        return {
          art: cover.getAttribute("data-cover-art"),
          aspectRatio: rectangle.height > 0 ? rectangle.width / rectangle.height : null,
          authorClamp: fallback && paragraphs[1] ? getComputedStyle(paragraphs[1]).webkitLineClamp : null,
          bookId: cover.getAttribute("data-cover-book-id"),
          brokenImages: images.filter((image) => image.complete && image.naturalWidth === 0).length,
          fallback,
          forbiddenText: fallback && forbiddenPattern.test(cover.textContent || ""),
          layout: cover.getAttribute("data-cover-layout"),
          source: fallback ? null : images[0]?.currentSrc || images[0]?.src || null,
          status: cover.getAttribute("data-cover-status"),
          titleClamp: fallback && paragraphs[0] ? getComputedStyle(paragraphs[0]).webkitLineClamp : null,
          visible: rectangle.width > 0 && rectangle.height > 0,
        };
      });

      return { bodyOverflow, coverItems, overflowElements };
    });

    const coverCount = measurements.coverItems.length;
    const fallbackCount = measurements.coverItems.filter((item) => item.fallback).length;
    const brokenCount = measurements.coverItems.reduce((sum, item) => sum + item.brokenImages, 0);
    const forbiddenTextCount = measurements.coverItems.filter((item) => item.forbiddenText).length;
    const aspectFailures = measurements.coverItems.filter(
      (item) => item.visible && (item.aspectRatio === null || Math.abs(item.aspectRatio - 2 / 3) > 0.035),
    ).length;
    const clampFailures = measurements.coverItems.filter(
      (item) => item.fallback && (item.titleClamp !== "3" || item.authorClamp !== "2"),
    ).length;
    const statusCounts = Object.fromEntries(
      [...new Set(measurements.coverItems.map((item) => item.status))].map((status) => [
        status,
        measurements.coverItems.filter((item) => item.status === status).length,
      ]),
    );
    const finalUrl = new URL(page.url());
    const routeMatched = finalUrl.pathname === expectedUrl.pathname;

    let screenshot = null;
    if (viewport.name === "1366") {
      screenshot = path.join(outputDirectory, `${viewport.name}-${surface.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
    }

    const verified =
      response?.status() === 200 &&
      routeMatched &&
      coverCount >= surface.minimumCovers &&
      brokenCount === 0 &&
      forbiddenTextCount === 0 &&
      aspectFailures === 0 &&
      clampFailures === 0 &&
      measurements.bodyOverflow <= 1 &&
      collectors.pageErrors.length === 0;

    return {
      name: surface.name,
      viewport: viewport.name,
      route: surface.route,
      status: response?.status() ?? null,
      finalUrl: finalUrl.href,
      routeMatched,
      coverCount,
      fallbackCount,
      realValidCount: statusCounts.REAL_VALID ?? 0,
      notVerifiedCount: statusCounts.NOT_VERIFIED ?? 0,
      statusCounts,
      brokenCount,
      forbiddenTextCount,
      aspectFailures,
      clampFailures,
      horizontalOverflowPixels: measurements.bodyOverflow,
      overflowElements: measurements.overflowElements,
      minimumCovers: surface.minimumCovers,
      consoleErrors: collectors.consoleErrors,
      pageErrors: collectors.pageErrors,
      screenshot: screenshot ? path.relative(process.cwd(), screenshot) : null,
      coverItems: measurements.coverItems,
      verified,
    };
  } finally {
    collectors.detach();
  }
}

async function login(page, email, callbackUrl) {
  await page.goto(`${baseUrl}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("123456");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 }),
    page.getByRole("button", { name: "Đăng nhập" }).click(),
  ]);
}

function verifyDeterministicFallbacks(results) {
  const seen = new Map();
  const conflicts = [];

  for (const result of results) {
    for (const cover of result.coverItems) {
      if (!cover.fallback || !cover.bookId) continue;
      const signature = `${cover.art}|${cover.layout}`;
      const previous = seen.get(cover.bookId);
      if (previous && previous !== signature) {
        conflicts.push({ bookId: cover.bookId, previous, current: signature });
      } else {
        seen.set(cover.bookId, signature);
      }
    }
  }

  return { checkedBooks: seen.size, conflicts };
}

async function auditRoleSurfaces(browser, viewport, roleName, email, surfaces, results) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await forceLegacyRemoteCoverFailure(page);

  try {
    await login(page, email, surfaces[0].route);
    for (const surface of surfaces) {
      results.push(await auditSurface(page, viewport, { ...surface, name: `${roleName}-${surface.name}` }));
    }
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of selectedViewports) {
      const publicContext = await browser.newContext({ viewport });
      const publicPage = await publicContext.newPage();
      await forceLegacyRemoteCoverFailure(publicPage);
      try {
        for (const surface of publicSurfaces) {
          results.push(await auditSurface(publicPage, viewport, surface));
        }
      } finally {
        await publicContext.close();
      }

      await auditRoleSurfaces(
        browser,
        viewport,
        "buyer",
        "user0001@bookverse.demo",
        buyerSurfaces,
        results,
      );
      await auditRoleSurfaces(
        browser,
        viewport,
        "seller",
        "user0003@bookverse.demo",
        [{ name: "listings", route: "/seller/listings", minimumCovers: 1 }],
        results,
      );
      await auditRoleSurfaces(
        browser,
        viewport,
        "moderator",
        "user0004@bookverse.demo",
        [{ name: "admin", route: "/admin", minimumCovers: 1 }],
        results,
      );
    }
  } finally {
    await browser.close();
  }

  const deterministic = verifyDeterministicFallbacks(results);
  const failed = results.filter((result) => !result.verified);
  const realValidCount = Math.max(...results.map((result) => result.realValidCount), 0);
  const cartCoverUnavailable = results.some((result) => result.name === "cart" && result.coverCount === 0);
  const report = {
    status:
      failed.length > 0 || deterministic.conflicts.length > 0
        ? "FAILED"
        : cartCoverUnavailable
          ? "PARTIAL"
          : "VERIFIED",
    dataLabel: "TEST_FIXTURE",
    sourcePolicy: "URL dataset gốc không bị sửa; picsum legacy bị chặn để xác nhận fallback.",
    licensedRealCoverCountObserved: realValidCount,
    deterministic,
    checkedViewports: selectedViewports,
    checkedSurfaceCount: results.length,
    failedSurfaceCount: failed.length,
    cartCoverStatus: cartCoverUnavailable ? "NOT_AVAILABLE" : "VERIFIED",
    failed: failed.map((result) => ({ name: result.name, viewport: result.viewport })),
    results,
  };
  const reportPath = path.join(outputDirectory, "cover-browser-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.status,
        dataLabel: report.dataLabel,
        licensedRealCoverCountObserved: realValidCount,
        deterministic,
        checkedViewports: selectedViewports.map((viewport) => viewport.name),
        checkedSurfaceCount: results.length,
        failedSurfaceCount: failed.length,
        cartCoverStatus: report.cartCoverStatus,
        failed: report.failed,
        report: path.relative(process.cwd(), reportPath),
      },
      null,
      2,
    ),
  );
  process.exitCode = report.status === "FAILED" ? 1 : 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
