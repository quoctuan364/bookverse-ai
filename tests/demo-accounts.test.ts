import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_ACCOUNT_EMAILS,
  DEMO_ACCOUNT_PASSWORD,
  DEMO_LOGIN_ACCOUNTS,
} from "@/lib/demo-accounts";

test("bốn tài khoản demo dùng địa chỉ Gmail riêng biệt", () => {
  const emails = Object.values(DEMO_ACCOUNT_EMAILS);

  assert.equal(emails.length, 4);
  assert.equal(new Set(emails).size, emails.length);
  assert.ok(emails.every((email) => email.endsWith("@gmail.com")));
  assert.deepEqual(
    DEMO_LOGIN_ACCOUNTS.map((account) => account.email),
    emails,
  );
});

test("mật khẩu demo đủ dài cho luồng đăng nhập thử", () => {
  assert.ok(DEMO_ACCOUNT_PASSWORD.length >= 6);
});
