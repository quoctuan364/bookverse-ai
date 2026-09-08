import assert from "node:assert/strict";
import test from "node:test";

import { diversifyRecommendationCandidates } from "../lib/recommendation-diversity";

const candidate = (id: string, categoryId: string, author: string) => ({
  id,
  categoryId,
  author,
});

test("đưa thể loại và tác giả mới lên trước mà vẫn giữ relevance trong từng nhóm", () => {
  const result = diversifyRecommendationCandidates(
    [
      candidate("B1", "C1", "Tác giả A"),
      candidate("B2", "C1", "Tác giả A"),
      candidate("B3", "C1", "Tác giả B"),
      candidate("B4", "C2", "Tác giả C"),
      candidate("B5", "C3", "Tác giả D"),
    ],
    { limit: 4, maxPerCategory: 2, maxPerAuthor: 1 },
  );

  assert.deepEqual(result.map((item) => item.id), ["B1", "B3", "B4", "B5"]);
});

test("bù ứng viên relevance cao khi catalog không đủ đa dạng", () => {
  const result = diversifyRecommendationCandidates(
    [
      candidate("B1", "C1", "Tác giả A"),
      candidate("B2", "C1", "Tác giả A"),
      candidate("B3", "C1", "Tác giả A"),
    ],
    { limit: 3 },
  );

  assert.deepEqual(result.map((item) => item.id), ["B1", "B2", "B3"]);
});

test("loại ID trùng và xử lý limit an toàn", () => {
  const result = diversifyRecommendationCandidates(
    [
      candidate("B1", "C1", "Tác giả A"),
      candidate("B1", "C2", "Tác giả B"),
      candidate("B2", "C2", "Tác giả B"),
    ],
    { limit: 2 },
  );

  assert.deepEqual(result.map((item) => item.id), ["B1", "B2"]);
  assert.deepEqual(diversifyRecommendationCandidates(result, { limit: 0 }), []);
});
