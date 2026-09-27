import { normalizeVietnameseSearchText, rankCatalogSearchCandidates, type CatalogSearchCandidate } from "./catalog-search";
import { extractQuotedBookTitle } from "./assistant-knowledge";

export interface AssistantBookFilters {
  maxPrice: number | null;
  maxPages: number | null;
  minPublishYear: number | null;
  preferLowPrice: boolean;
  preferShort: boolean;
}

export function extractAssistantBookFilters(message: string): AssistantBookFilters {
  const query = normalizeVietnameseSearchText(
    message.replace(/(?<=\d)[.,](?=\d)/g, ""),
  );
  const moneyMatch = query.match(
    /\b(?:duoi|khong qua|toi da|tam|khoang)\s+(\d{2,7})\s*(k|nghin|ngan|000)?\b/,
  );
  const rawMoney = moneyMatch ? Number(moneyMatch[1]) : NaN;
  const maxPrice = Number.isFinite(rawMoney)
    ? rawMoney * (moneyMatch?.[2] && moneyMatch[2] !== "000" ? 1_000 : 1)
    : null;
  const pageMatch = query.match(
    /\b(?:duoi|khong qua|toi da|tam|khoang)\s+(\d{2,4})\s+trang\b/,
  );
  const yearMatch = query.match(
    /\b(?:sau|tu)\s+(19\d{2}|20\d{2})\b/,
  );

  return {
    maxPrice: maxPrice && maxPrice >= 10_000 && maxPrice <= 100_000_000 ? maxPrice : null,
    maxPages: pageMatch ? Number(pageMatch[1]) : null,
    minPublishYear: yearMatch ? Number(yearMatch[1]) : null,
    preferLowPrice: /\b(gia re|re nhat|tiet kiem|binh dan)\b/.test(query),
    preferShort: /\b(sach ngan|cuon ngan|doc nhanh|mong|it trang)\b/.test(query),
  };
}

export function assistantBookSearchQuery(message: string): string {
  const title = extractQuotedBookTitle(message);
  if (title) return normalizeVietnameseSearchText(title);
  return normalizeVietnameseSearchText(message)
    .replace(/\b(goi y|gioi thieu|tom tat|tim giup|tim cho|cho toi|cho minh|toi muon|minh muon|toi thich|minh thich|dang tim|can sach|muon doc|doc gi|cho nguoi moi|nguoi moi bat dau|de doc|nen doc|co hay khong|the nao|ve noi dung|cuon sach|sach nao hay|sach hay|sach nao|cam on|bang tieng viet|bang tieng anh|tieng viet|tieng anh|gia re|re nhat|tiet kiem|binh dan|sach ngan|cuon ngan|doc nhanh|it trang|khong qua|toi da|thuc te|de ap dung|gia duoi|co gia|dong|de tiep can|tu so 0|so 0|nhap mon|thu gian|cuoi tuan|nhieu bat ngo|kho dat xuong|nhe nhang|de hoc)\b/g, " ")
    .replace(/\b(duoi|tam|khoang|sau|tu|sach|cuon|tim|hay|nhe|nha|voi|ve|di|ban|toi|minh|mot|vai|doc|duoc|khong|co|va)\b/g, " ")
    .replace(/\b\d+\s*(k|nghin|ngan|000|trang)?\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function rankAssistantBooks(candidates: CatalogSearchCandidate[], message: string) {
  const query = assistantBookSearchQuery(message);
  const scores = new Map<string, number>();

  if (query) {
    const queries = /\bai\b/.test(query) ? [query.replace(/\bai\b/g, "tri tue nhan tao"), query.replace(/\bai\b/g, "artificial intelligence"), query.replace(/\bai\b/g, "machine learning"), query] : [query];
    for (const variant of queries) {
      for (const item of rankCatalogSearchCandidates(candidates, variant)) {
        scores.set(item.id, Math.max(scores.get(item.id) ?? 0, item.score));
      }
    }
  }

  // Fallback theo từ khóa chủ đề khi câu hỏi hội thoại dài không khớp nguyên văn
  if (scores.size === 0) {
    const rawLower = normalizeVietnameseSearchText(message);
    const topicKeywords: string[] = [];
    if (/\b(ai|tri tue nhan tao|machine learning|deep learning|hoc may)\b/.test(rawLower)) topicKeywords.push("tri tue nhan tao", "cong nghe thong tin");
    if (/\b(kinh doanh|kinh te|khoi nghiep|quan tri|marketing|tai chinh|dau tu)\b/.test(rawLower)) topicKeywords.push("kinh doanh");
    if (/\b(lap trinh|cong nghe|phan mem|devops|cntt|khoa hoc du lieu)\b/.test(rawLower)) topicKeywords.push("lap trinh", "cong nghe thong tin");
    if (/\b(tam ly|ky nang|giao tiep|phat trien ban than|ky nang song|ky nang mem|tu duy)\b/.test(rawLower)) topicKeywords.push("ky nang mem", "tam ly hoc");
    if (/\b(trinh tham|ky ao|vien tuong|tieu thuyet|van hoc)\b/.test(rawLower)) topicKeywords.push("trinh tham", "van hoc");
    if (/\b(suc khoe|y hoc|dinh duong)\b/.test(rawLower)) topicKeywords.push("suc khoe");
    if (/\b(thiet ke|ux|ui|do hoa)\b/.test(rawLower)) topicKeywords.push("thiet ke");

    for (const topic of topicKeywords) {
      for (const item of rankCatalogSearchCandidates(candidates, topic)) {
        scores.set(item.id, Math.max(scores.get(item.id) ?? 0, item.score));
      }
    }
  }

  if (scores.size === 0 && !query) {
    return candidates.map((book) => ({ id: book.id, score: 1 }));
  }

  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
}
