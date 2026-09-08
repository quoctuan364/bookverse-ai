export const DEMO_ACCOUNT_PASSWORD = "123456";

export const DEMO_ACCOUNT_EMAILS = {
  U001: "reader.bookverse.demo@gmail.com",
  U008: "seller.bookverse.demo@gmail.com",
  U009: "admin.bookverse.demo@gmail.com",
  U010: "moderator.bookverse.demo@gmail.com",
} as const;

export const DEMO_LOGIN_ACCOUNTS = [
  { role: "Độc giả", email: DEMO_ACCOUNT_EMAILS.U001 },
  { role: "Người bán", email: DEMO_ACCOUNT_EMAILS.U008 },
  { role: "Quản trị", email: DEMO_ACCOUNT_EMAILS.U009 },
  { role: "Kiểm duyệt", email: DEMO_ACCOUNT_EMAILS.U010 },
] as const;
