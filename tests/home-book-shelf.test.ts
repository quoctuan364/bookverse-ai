import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeBookShelf } from "@/components/home/HomeBookShelf";

test("một kệ lỗi vẫn hiển thị thông báo độc lập", () => {
  const html = renderToStaticMarkup(
    createElement(HomeBookShelf, {
      id: "popular",
      eyebrow: "Dữ liệu thật",
      title: "Phổ biến trên BookVerse",
      description: "Mô tả",
      books: [],
      error: "Không thể tải dữ liệu phổ biến.",
      href: "/catalog",
    }),
  );

  assert.match(html, /Không thể tải dữ liệu phổ biến/);
  assert.match(html, /Các khu vực khác vẫn có thể sử dụng bình thường/);
  assert.match(html, /Phổ biến trên BookVerse/);
});

