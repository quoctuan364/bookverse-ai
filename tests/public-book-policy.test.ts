import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogBookQualityWhere,
  isDemoCatalogExperienceEnabled,
  publicBookQualityWhere,
  publicDemoBookWhere,
  publicExperienceBookWhere,
} from "@/lib/public-book-policy";

test("catalog thật không trộn lại sách tổng hợp đã ẩn", () => {
  assert.deepEqual(catalogBookQualityWhere(true), publicBookQualityWhere());
});

test("production không hạ cấp chỉ với cờ catalog demo", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.BOOKVERSE_ALLOW_DEMO_CATALOG;
  const previousPublicDemoFlag = process.env.BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT;
  Object.assign(process.env, {
    NODE_ENV: "production",
    BOOKVERSE_ALLOW_DEMO_CATALOG: "true",
  });
  delete process.env.BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT;
  try {
    assert.equal(isDemoCatalogExperienceEnabled(), false);
    assert.deepEqual(catalogBookQualityWhere(false), publicBookQualityWhere());
  } finally {
    Object.assign(process.env, {
      NODE_ENV: previousNodeEnv,
      BOOKVERSE_ALLOW_DEMO_CATALOG: previousFlag,
    });
    if (previousPublicDemoFlag === undefined) {
      delete process.env.BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT;
    } else {
      process.env.BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT = previousPublicDemoFlag;
    }
  }
});

test("production demo công khai cần hai cờ xác nhận rõ ràng", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.BOOKVERSE_ALLOW_DEMO_CATALOG;
  const previousPublicDemoFlag = process.env.BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT;
  Object.assign(process.env, {
    NODE_ENV: "production",
    BOOKVERSE_ALLOW_DEMO_CATALOG: "true",
    BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT: "true",
  });
  try {
    assert.equal(isDemoCatalogExperienceEnabled(), true);
    assert.deepEqual(catalogBookQualityWhere(false), publicDemoBookWhere());
  } finally {
    Object.assign(process.env, {
      NODE_ENV: previousNodeEnv,
      BOOKVERSE_ALLOW_DEMO_CATALOG: previousFlag,
    });
    if (previousPublicDemoFlag === undefined) {
      delete process.env.BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT;
    } else {
      process.env.BOOKVERSE_PUBLIC_DEMO_DEPLOYMENT = previousPublicDemoFlag;
    }
  }
});

test("demo local chỉ mở catalog tổng hợp khi có flag rõ ràng", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.BOOKVERSE_ALLOW_DEMO_CATALOG;
  Object.assign(process.env, {
    NODE_ENV: "development",
    BOOKVERSE_ALLOW_DEMO_CATALOG: "true",
  });
  try {
    assert.equal(isDemoCatalogExperienceEnabled(), true);
    assert.deepEqual(catalogBookQualityWhere(false), publicDemoBookWhere());
    assert.deepEqual(publicExperienceBookWhere(), {
      OR: [publicBookQualityWhere(), publicDemoBookWhere()],
    });
  } finally {
    Object.assign(process.env, {
      NODE_ENV: previousNodeEnv,
      BOOKVERSE_ALLOW_DEMO_CATALOG: previousFlag,
    });
  }
});
