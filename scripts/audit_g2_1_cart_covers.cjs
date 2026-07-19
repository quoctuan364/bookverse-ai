const fs = require("node:fs/promises");
const path = require("node:path");

const { ListingCondition, ListingStatus, OrderStatus, PrismaClient } = require("@prisma/client");
const { chromium } = require("playwright");

const PREFIX = "TEST_FIXTURE_G21_COVER_";
const baseUrl = process.env.BOOKVERSE_BASE_URL || "http://127.0.0.1:3100";
const outputDirectory = path.join(process.cwd(), "outputs", "g2-1-cart-cover-browser");
const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1366", width: 1366, height: 768 },
  { name: "1920", width: 1920, height: 1080 },
];

function assertSafeEnvironment() {
  if (process.env.BOOKVERSE_BROWSER_FIXTURE_ALLOWED !== "1") {
    throw new Error("BLOCKED_FIXTURE_FLAG: cần BOOKVERSE_BROWSER_FIXTURE_ALLOWED=1.");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("BLOCKED_MISSING_DATABASE_URL");
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//u, "").split("/")[0];
  if (databaseName !== "bookverse_ai_test") {
    throw new Error(`BLOCKED_DATABASE: fixture chỉ được chạy trên bookverse_ai_test, nhận ${databaseName}.`);
  }
  return databaseName;
}

async function login(page) {
  await page.goto(`${baseUrl}/login?callbackUrl=${encodeURIComponent("/cart")}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator('input[name="email"]').fill("user0001@bookverse.demo");
  await page.locator('input[name="password"]').fill("123456");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 }),
    page.getByRole("button", { name: "Đăng nhập" }).click(),
  ]);
}

async function snapshot(prisma) {
  const [orders, orderItems, listings, fixtureOrders, fixtureListings] = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.listing.count(),
    prisma.order.count({ where: { id: { startsWith: PREFIX } } }),
    prisma.listing.count({ where: { id: { startsWith: PREFIX } } }),
  ]);
  return { orders, orderItems, listings, fixtureOrders, fixtureListings };
}

async function cleanup(prisma) {
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { id: { startsWith: PREFIX } } }),
    prisma.listing.deleteMany({ where: { id: { startsWith: PREFIX } } }),
  ]);
}

async function createFixture(prisma) {
  await cleanup(prisma);
  const [buyer, seller, books] = await Promise.all([
    prisma.user.findUnique({ where: { email: "user0001@bookverse.demo" }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "user0003@bookverse.demo" }, select: { id: true } }),
    prisma.book.findMany({
      where: { id: { in: ["RB00001", "RB00002", "RB00003"] }, sourceMetadata: { isNot: null } },
      orderBy: { id: "asc" },
      select: { id: true, title: true, coverPath: true, price: true },
    }),
  ]);
  if (!buyer || !seller || books.length !== 3 || books.some((book) => !book.coverPath)) {
    throw new Error("FIXTURE_PREREQUISITE_NOT_AVAILABLE");
  }
  const labels = ["VALID", "HTTP_404", "TIMEOUT"];
  const listings = books.map((book, index) => ({
    id: `${PREFIX}LISTING_${labels[index]}`,
    sellerId: seller.id,
    bookId: book.id,
    title: `${PREFIX}${labels[index]}_${book.title}`,
    description: "TEST_FIXTURE; phải cleanup sau browser audit.",
    condition: ListingCondition.LIKE_NEW,
    price: Number(book.price),
    status: ListingStatus.APPROVED,
    stock: 2,
    hasCover: true,
  }));
  const orderId = `${PREFIX}ORDER`;
  await prisma.$transaction(async (transaction) => {
    for (const listing of listings) await transaction.listing.create({ data: listing });
    await transaction.order.create({
      data: {
        id: orderId,
        buyerId: buyer.id,
        status: OrderStatus.PENDING,
        paymentMethod: null,
        totalAmount: listings.reduce((sum, listing) => sum + listing.price, 0),
        items: {
          create: listings.map((listing, index) => ({
            id: `${PREFIX}ITEM_${labels[index]}`,
            bookId: books[index].id,
            listingId: listing.id,
            quantity: 1,
            unitPrice: listing.price,
            totalPrice: listing.price,
          })),
        },
      },
    });
  });
  return { orderId, books: books.map((book, index) => ({ ...book, scenario: labels[index] })) };
}

async function fetchLiveValidCover(coverPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(coverPath, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "BookVerse-Academic-Cover-Audit/2.1" },
    });
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !contentType.startsWith("image/") || body.length < 500) {
      throw new Error(`VALID_COVER_PREFLIGHT_FAILED:${response.status}:${contentType}:${body.length}`);
    }
    return {
      body,
      contentType,
      evidence: {
        status: response.status,
        finalUrl: response.url,
        contentType,
        bytes: body.length,
        checkedAt: new Date().toISOString(),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function auditViewport(browser, viewport, fixture, validCover) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const requests = { VALID: 0, HTTP_404: 0, TIMEOUT: 0 };
  let trackingRequests = false;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const byUrl = new Map(fixture.books.map((book) => [book.coverPath, book]));
  await page.route("https://covers.openlibrary.org/**", async (route) => {
    const book = byUrl.get(route.request().url());
    if (!book) return route.continue();
    if (trackingRequests) requests[book.scenario] += 1;
    if (book.scenario === "HTTP_404") return route.fulfill({ status: 404, contentType: "text/plain", body: "TEST_FIXTURE_404" });
    if (book.scenario === "TIMEOUT") {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      return route.abort("timedout").catch(() => undefined);
    }
    return route.fulfill({ status: 200, contentType: validCover.contentType, body: validCover.body });
  });
  try {
    await login(page);
    // Login redirect cũng đi qua /cart; hủy navigation trung gian trước khi đo mục tiêu.
    await page.goto("about:blank", { waitUntil: "domcontentloaded" });
    trackingRequests = true;
    const response = await page.goto(`${baseUrl}/cart`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const bookIds = fixture.books.map((book) => book.id);
    await page.waitForFunction(
      (ids) => ids.every((bookId) => document.querySelector(`[data-cover-book-id="${bookId}"]`)),
      bookIds,
      { timeout: 15_000 },
    );
    await page.waitForTimeout(10_500);
    const measurements = await page.evaluate((ids) => {
      const covers = ids.map((bookId) => document.querySelector(`[data-cover-book-id="${bookId}"]`));
      return {
        coverElementCount: document.querySelectorAll("[data-cover-book-id]").length,
        coverBookIds: [...document.querySelectorAll("[data-cover-book-id]")].map((element) => element.getAttribute("data-cover-book-id")),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
        overflowElements: [...document.querySelectorAll("body *")]
          .map((element) => {
            const rectangle = element.getBoundingClientRect();
            return {
              tag: element.tagName,
              className: typeof element.className === "string" ? element.className : "",
              text: element.textContent?.trim().slice(0, 100) ?? "",
              left: Math.round(rectangle.left),
              right: Math.round(rectangle.right),
              width: Math.round(rectangle.width),
            };
          })
          .filter((item) => item.right > window.innerWidth + 1 || item.left < -1)
          .slice(0, 12),
        covers: covers.map((cover, index) => {
          const rectangle = cover.getBoundingClientRect();
          const image = cover.querySelector("img");
          return {
            bookId: ids[index],
            status: cover.getAttribute("data-cover-status"),
            fallback: cover.getAttribute("data-cover-fallback") === "true",
            art: cover.getAttribute("data-cover-art"),
            layout: cover.getAttribute("data-cover-layout"),
            source: image?.currentSrc || image?.src || null,
            ratio: rectangle.height > 0 ? rectangle.width / rectangle.height : null,
          };
        }),
      };
    }, bookIds);
    const byId = new Map(measurements.covers.map((cover) => [cover.bookId, cover]));
    const ratioFailures = measurements.covers.filter((cover) => cover.ratio === null || Math.abs(cover.ratio - 2 / 3) > 0.035);
    const verified =
      response?.status() === 200 &&
      measurements.covers.length === 3 &&
      byId.get("RB00001")?.fallback === false &&
      byId.get("RB00002")?.fallback === true &&
      byId.get("RB00003")?.fallback === true &&
      requests.VALID === 1 &&
      requests.HTTP_404 === 1 &&
      requests.TIMEOUT === 1 &&
      measurements.brokenImages === 0 &&
      measurements.overflow <= 1 &&
      ratioFailures.length === 0 &&
      errors.length === 0;
    return { viewport: viewport.name, status: verified ? "VERIFIED" : "FAILED", responseStatus: response?.status() ?? null, requests, measurements, ratioFailures, pageErrors: errors };
  } finally {
    await context.close();
  }
}

async function main() {
  const database = assertSafeEnvironment();
  const prisma = new PrismaClient();
  const before = await snapshot(prisma);
  let fixture = null;
  let browser = null;
  const results = [];
  let runError = null;
  try {
    fixture = await createFixture(prisma);
    const during = await snapshot(prisma);
    if (during.fixtureOrders !== 1 || during.fixtureListings !== 3) throw new Error("FIXTURE_COUNT_MISMATCH");
    const validCover = await fetchLiveValidCover(fixture.books.find((book) => book.scenario === "VALID").coverPath);
    fixture.validCoverEvidence = validCover.evidence;
    browser = await chromium.launch({ headless: true });
    for (const viewport of viewports) results.push(await auditViewport(browser, viewport, fixture, validCover));
  } catch (error) {
    runError = error instanceof Error ? error.message : String(error);
  } finally {
    if (browser) await browser.close();
    await cleanup(prisma);
  }
  const after = await snapshot(prisma);
  await prisma.$disconnect();
  const countsRestored = JSON.stringify(before) === JSON.stringify(after);
  const report = {
    status: !runError && countsRestored && results.length === viewports.length && results.every((result) => result.status === "VERIFIED") ? "VERIFIED" : "FAILED",
    dataLabel: "TEST_FIXTURE",
    database,
    baseUrl,
    fixturePrefix: PREFIX,
    checkedAt: new Date().toISOString(),
    fixture: fixture
      ? {
          orderId: fixture.orderId,
          books: fixture.books.map(({ id, scenario, coverPath }) => ({ id, scenario, coverPath })),
          validCoverEvidence: fixture.validCoverEvidence,
        }
      : null,
    before,
    after,
    countsRestored,
    runError,
    results,
  };
  await fs.mkdir(outputDirectory, { recursive: true });
  const reportPath = path.join(outputDirectory, `cart-cover-${report.checkedAt.replace(/[:.]/gu, "-")}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({ status: report.status, database, checkedViewports: results.map((result) => result.viewport), countsRestored, before, after, runError, reportPath }, null, 2));
  if (report.status !== "VERIFIED") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
