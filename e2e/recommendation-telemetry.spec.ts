import { expect, test, type Page } from "@playwright/test";

interface CapturedEvent {
  requestId: string;
  bookId: string;
  eventType: "IMPRESSION" | "CLICK";
}

async function captureTelemetry(page: Page): Promise<CapturedEvent[]> {
  const events: CapturedEvent[] = [];
  await page.route("**/api/recommendations/events", async (route) => {
    events.push(route.request().postDataJSON() as CapturedEvent);
    await route.fulfill({ status: 202, contentType: "application/json", body: "{}" });
  });
  return events;
}

test.describe("Recommendation impression lifecycle", () => {
  test("hiển thị dưới 50% không tạo impression", async ({ page }) => {
    const events = await captureTelemetry(page);
    await page.goto("/e2e/telemetry?case=partial");
    await page.waitForTimeout(1_200);
    expect(events).toEqual([]);
  });

  test("hiển thị đủ 50% nhưng dưới một giây không tạo impression", async ({
    page,
  }) => {
    const events = await captureTelemetry(page);
    await page.goto("/e2e/telemetry?case=qualified");
    await page.waitForTimeout(500);
    expect(events).toEqual([]);
  });

  test("đủ điều kiện chỉ tạo đúng một impression", async ({ page }) => {
    const events = await captureTelemetry(page);
    await page.goto("/e2e/telemetry?case=qualified");
    await expect.poll(() => events.length).toBe(1);
    await page.waitForTimeout(1_100);
    expect(events).toEqual([
      {
        requestId: "TEST-FIXTURE-REQUEST",
        bookId: "B-TEST-FIXTURE-AI",
        eventType: "IMPRESSION",
      },
    ]);
  });

  test("rời viewport trước một giây phải hủy timer", async ({ page }) => {
    const events = await captureTelemetry(page);
    await page.goto("/e2e/telemetry?case=qualified");
    await page.waitForTimeout(300);
    await page.locator("body").evaluate((body) => {
      body.innerHTML += '<div style="height:200vh"></div>';
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1_100);
    expect(events).toEqual([]);
  });

  test("ẩn tab trước một giây phải hủy timer", async ({ page }) => {
    const events = await captureTelemetry(page);
    await page.goto("/e2e/telemetry?case=qualified");
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(1_100);
    expect(events).toEqual([]);
  });

  test("click giữ đúng request và book của impression", async ({ page }) => {
    const events = await captureTelemetry(page);
    await page.goto("/e2e/telemetry?case=qualified");
    await expect.poll(() => events.length).toBe(1);
    await page.getByTestId("tracked-recommendation").click();
    await expect.poll(() => events.length).toBe(2);
    expect(events.map((event) => event.eventType)).toEqual(["IMPRESSION", "CLICK"]);
    expect(new Set(events.map((event) => event.requestId))).toEqual(
      new Set(["TEST-FIXTURE-REQUEST"]),
    );
    expect(new Set(events.map((event) => event.bookId))).toEqual(
      new Set(["B-TEST-FIXTURE-AI"]),
    );
  });

  test("thiếu consent phải fail-closed và không gửi telemetry", async ({ page }) => {
    const events = await captureTelemetry(page);
    await page.goto("/e2e/telemetry?case=no-consent");
    await expect(page.locator("main")).toHaveAttribute(
      "data-collection-context",
      "STANDARD_APP",
    );
    await page.waitForTimeout(1_200);
    await page.getByTestId("tracked-recommendation").click();
    expect(events).toEqual([]);
  });
});
