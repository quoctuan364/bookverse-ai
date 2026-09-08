import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOKVERSE_KNOWLEDGE_BASE,
  classifyBookVerseIntent,
  formatStoreFacts,
  normalizeAssistantQuery,
  retrieveBookVerseKnowledge,
  queryWantsAccountData,
  shouldRetrieveBooks,
} from "../lib/assistant-knowledge";
import { buildGroundedLocalAnswer } from "../lib/assistant-runtime";

test("chuẩn hóa câu hỏi tiếng Việt để so khớp ổn định", () => {
  assert.equal(
    normalizeAssistantQuery("  Gói HỘI VIÊN đọc full? "),
    "goi hoi vien doc full",
  );
});

test("phân loại đúng các ý định nghiệp vụ chính", () => {
  assert.equal(classifyBookVerseIntent("Gói hội viên của tôi còn hạn không?"), "MEMBERSHIP");
  assert.equal(classifyBookVerseIntent("Đơn hàng đang giao tới đâu?"), "ORDERS");
  assert.equal(classifyBookVerseIntent("Tôi muốn đăng bán sách cũ"), "MARKETPLACE");
  assert.equal(classifyBookVerseIntent("Gợi ý sách AI cho người mới"), "DISCOVERY");
  assert.equal(classifyBookVerseIntent("Tôi đã đọc bao nhiêu sách?"), "READING");
  assert.equal(
    classifyBookVerseIntent("Thanh toán Sandbox hoạt động thế nào?"),
    "MEMBERSHIP",
  );
  assert.equal(classifyBookVerseIntent("Tôi muốn chia sẻ bài viết ở cộng đồng"), "COMMUNITY");
  assert.equal(classifyBookVerseIntent("Admin kiểm tra audit log ở đâu?"), "ADMIN");
});

test("trợ lý bao phủ các bề mặt quan trọng của nền tảng", () => {
  const benchmark = [
    ["AI trong Reader có bịa nội dung không?", "reader-ai-grounding"],
    ["Tôi muốn xuất ghi chú và xem highlight", "reading-notes-export"],
    ["Đây có phải nội dung nguyên tác của sách không?", "reading-original-content"],
    ["Seller xem doanh thu và đơn nhận được ở đâu?", "seller-operations"],
    ["Làm sao đăng bài chia sẻ cảm nhận?", "community-create-post"],
    ["Hybrid recommender đã chứng minh hiệu quả chưa?", "recommendation-evidence"],
    ["Không consent thì có gửi telemetry không?", "privacy-telemetry"],
    ["Admin Center kiểm tra chất lượng dữ liệu thế nào?", "admin-governance"],
    ["BookVerse có những tính năng gì?", "platform-navigation"],
    ["Tôi tải ảnh đại diện và đổi sở thích đọc ở đâu?", "account-profile-preferences"],
    ["Thêm địa chỉ giao hàng mặc định như thế nào?", "account-addresses"],
    ["Catalog có tìm không dấu và lọc ISBN không?", "catalog-search-filters"],
    ["Tôi muốn đặt mục tiêu đọc và xem streak", "reading-goals-calendar"],
    ["Đăng ký người bán rồi tạo tin ở đâu?", "seller-registration-listing"],
    ["Làm sao tạo bài viết chia sẻ sách?", "community-create-post"],
    ["Xem gói hiện tại và lịch sử thanh toán ở đâu?", "membership-management"],
    ["Thông báo chưa đọc nằm ở đâu?", "notifications-center"],
  ] as const;

  for (const [query, expectedArticleId] of benchmark) {
    assert.equal(
      retrieveBookVerseKnowledge(query, 1)[0]?.id,
      expectedArticleId,
      query,
    );
  }
});

test("mọi bài tri thức có mã, route và từ khóa hợp lệ", () => {
  const ids = new Set<string>();
  for (const article of BOOKVERSE_KNOWLEDGE_BASE) {
    assert.ok(!ids.has(article.id), `Trùng mã bài tri thức: ${article.id}`);
    ids.add(article.id);
    assert.match(article.href, /^\/[a-z0-9/-]*$/);
    assert.ok(article.summary.length >= 40, article.id);
    assert.ok(article.details.length >= 2, article.id);
    assert.ok(article.keywords.length >= 3, article.id);
  }
});

test("truy xuất bài tri thức hội viên có route nguồn", () => {
  const articles = retrieveBookVerseKnowledge("Đọc full có phải mua hội viên không?");
  assert.equal(articles[0]?.id, "membership-access");
  assert.equal(articles[0]?.href, "/membership/benefits");
});

test("truy xuất đúng quy trình thanh toán hội viên sandbox", () => {
  const articles = retrieveBookVerseKnowledge(
    "Thanh toán hội viên bằng ví sandbox có trừ tiền thật không?",
  );

  assert.equal(articles[0]?.id, "membership-payment-sandbox");
  assert.equal(articles[0]?.href, "/membership");
  assert.match(articles[0]?.summary ?? "", /PENDING/);

  const shortQuestion = retrieveBookVerseKnowledge(
    "Thanh toán Sandbox hoạt động thế nào?",
  );
  assert.equal(shortQuestion[0]?.id, "membership-payment-sandbox");
});

test("chỉ truy xuất catalog sách khi câu hỏi thật sự cần sách", () => {
  assert.equal(shouldRetrieveBooks("Đơn hàng của tôi ở đâu?", "ORDERS"), false);
  assert.equal(shouldRetrieveBooks("Gợi ý sách khoa học dễ đọc", "DISCOVERY"), true);
  assert.equal(shouldRetrieveBooks("Hội viên có cuốn sách AI nào?", "MEMBERSHIP"), true);
  assert.equal(shouldRetrieveBooks("Nhà sách có bao nhiêu thể loại?", "CATALOG"), false);
  assert.equal(
    shouldRetrieveBooks(
      "Làm sao cập nhật hồ sơ, tải ảnh đại diện và chọn thể loại yêu thích?",
      "ACCOUNT",
    ),
    false,
  );
});

test("chỉ dùng ngữ cảnh tài khoản khi câu hỏi có tín hiệu sở hữu", () => {
  assert.equal(queryWantsAccountData("Gói hội viên có quyền lợi gì?"), false);
  assert.equal(queryWantsAccountData("Gói hội viên của tôi còn hạn không?"), true);
  assert.equal(queryWantsAccountData("Tôi đã đọc bao nhiêu sách?"), true);
});

test("formatStoreFacts chỉ dùng số liệu được truyền vào", () => {
  const text = formatStoreFacts({
    activeBooks: 1200,
    readableBooks: 15,
    categories: 24,
    activePlans: 3,
    approvedListings: 1037,
  });
  assert.match(text, /1200 sách đang hoạt động/);
  assert.match(text, /15 sách có nội dung đọc/);
});

test("fallback hội viên trả trạng thái tài khoản và route nguồn", () => {
  const knowledge = retrieveBookVerseKnowledge("Gói hội viên của tôi còn hạn không?");
  const answer = buildGroundedLocalAnswer(
    "Gói hội viên của tôi còn hạn không?",
    [],
    {
      intent: "MEMBERSHIP",
      knowledge,
      store: {
        activeBooks: 1200,
        readableBooks: 15,
        categories: 24,
        activePlans: 3,
        approvedListings: 1037,
      },
      account: {
        authenticated: true,
        displayName: "Linh",
        role: "BUYER",
        membership: { active: false, planName: null, endsAt: null },
        cartItemCount: 0,
        orderCount: 2,
        readingBooks: 4,
        completedBooks: 1,
      },
    },
  );

  assert.match(answer, /chưa có gói hội viên còn hiệu lực/i);
  assert.match(answer, /\/membership\/benefits/);
  assert.doesNotMatch(answer, /Sách phù hợp trong catalog/);
});

test("fallback không tiết lộ dữ liệu cá nhân khi chưa đăng nhập", () => {
  const answer = buildGroundedLocalAnswer("Đơn hàng của tôi ở đâu?", [], {
    intent: "ORDERS",
    knowledge: retrieveBookVerseKnowledge("Đơn hàng của tôi ở đâu?"),
    account: {
      authenticated: false,
      displayName: null,
      role: null,
      membership: null,
      cartItemCount: 0,
      orderCount: 0,
      readingBooks: 0,
      completedBooks: 0,
    },
  });

  assert.match(answer, /chưa đăng nhập/i);
  assert.doesNotMatch(answer, /có 0 sản phẩm/);
});
