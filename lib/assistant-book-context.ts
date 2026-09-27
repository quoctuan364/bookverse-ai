import { normalizeAssistantQuery, extractQuotedBookTitle } from "./assistant-knowledge";

/** Chỉ nối ngữ cảnh khi người dùng thật sự nhắc lại sách, không áp sang chủ đề mới. */
export function isBookContextFollowUp(message: string): boolean {
  if (extractQuotedBookTitle(message)) return false;
  const query = normalizeAssistantQuery(message);
  if (/^(no\b|gia bao nhieu$|bao nhieu tien$|ai viet$|viet boi ai$|noi dung$|tom tat( no| giup toi| giup minh)?$|co hay khong$|co de doc khong$|phu hop voi ai$|bao nhieu trang$|xuat ban nam nao$|ngon ngu gi$|the loai gi$|danh gia bao nhieu$)/u.test(query)) return true;
  return /\b(cuon sach nay|cuon nay|sach nay|cuon do|sach do|cuon dau|cuon thu|cuon so|cuon [1-5]|sach [1-5]|noi them|so sanh|re hon|dat hon|ngan hon|dai hon|moi hon|diem cao hon|de doc hon|hay hon|tac gia la ai|noi dung the nao|bao nhieu trang|xuat ban nam nao|ngon ngu gi|the loai gi|danh gia bao nhieu)\b/u.test(query);
}

export function isAlternativeBookRequest(message: string): boolean {
  const query = normalizeAssistantQuery(message);
  return /\b(con cuon nao khac|con sach nao khac|cuon khac|sach khac|goi y them|them cuon|them sach|khac di|loai khac|doi loai khac|khong hop|khong thich)\b/u.test(query);
}

export function selectContextBookIds(message: string, ids: string[]): string[] {
  if (!isBookContextFollowUp(message)) return [];
  const query = normalizeAssistantQuery(message);
  if (/\b(so sanh|re hon|gia thap hon|dat hon|gia cao hon|ngan hon|it trang hon|doc nhanh hon|dai hon|nhieu trang hon|moi hon|xuat ban gan day|diem cao hon|danh gia cao hon|hay hon|de doc hon)\b/u.test(query)) {
    return ids.slice(0, 5);
  }
  const ordinal = query.match(/\b(?:cuon|sach)(?: thu| so)? (1|2|3|4|5|mot|nhat|hai|ba|bon|tu|nam|dau tien|dau)\b/u)?.[1];
  const positions: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, mot: 0, nhat: 0, hai: 1, ba: 2, bon: 3, tu: 3, nam: 4, "dau tien": 0, dau: 0 };
  if (ordinal) return ids[positions[ordinal]] ? [ids[positions[ordinal]]] : [];
  return ids.slice(0, 5);
}
