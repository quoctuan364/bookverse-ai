const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  vie: "vi",
  vi: "vi",
  eng: "en",
  en: "en",
  spa: "es",
  es: "es",
  fre: "fr",
  fra: "fr",
  fr: "fr",
  ger: "de",
  deu: "de",
  de: "de",
  ind: "id",
  id: "id",
  ita: "it",
  it: "it",
  por: "pt",
  pt: "pt",
  jpn: "ja",
  ja: "ja",
  chi: "zh",
  zho: "zh",
  zh: "zh",
};

// Các từ này giúp nhận diện cả tiêu đề tiếng Việt bị mất dấu trong metadata nguồn.
const VIETNAMESE_TITLE_WORDS = new Set([
  "ai",
  "anh",
  "an",
  "ba",
  "ban",
  "bao",
  "bay",
  "biet",
  "ca",
  "cai",
  "canh",
  "chet",
  "cho",
  "chuyen",
  "con",
  "cong",
  "cuoc",
  "cua",
  "dai",
  "day",
  "dem",
  "den",
  "doi",
  "duoc",
  "giao",
  "giua",
  "hai",
  "hay",
  "hon",
  "khong",
  "la",
  "lai",
  "lang",
  "loi",
  "luu",
  "mat",
  "mau",
  "me",
  "mien",
  "minh",
  "mot",
  "nam",
  "nha",
  "nhung",
  "nguoi",
  "phap",
  "sach",
  "sinh",
  "song",
  "su",
  "tam",
  "than",
  "thiet",
  "thoi",
  "tieng",
  "trong",
  "truyen",
  "tu",
  "toi",
  "van",
  "vang",
  "viet",
  "voi",
]);

const ENGLISH_TITLE_WORDS = new Set([
  "a",
  "and",
  "at",
  "book",
  "dark",
  "game",
  "goodnight",
  "happy",
  "home",
  "life",
  "little",
  "mind",
  "miracle",
  "moon",
  "my",
  "of",
  "on",
  "tale",
  "the",
  "to",
  "wizard",
  "wonderful",
  "you",
]);

const DISTINCTIVE_VIETNAMESE_WORDS = new Set([
  "chuyen",
  "cua",
  "duoc",
  "khong",
  "luu",
  "mien",
  "nguoi",
  "nhung",
  "tieng",
  "thoi",
  "voi",
]);

function tokenizeTitle(title: string): string[] {
  return title
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .match(/[a-z]+/gu) ?? [];
}

export function hasVietnameseTitleEvidence(title: string): boolean {
  if (/[À-ỹĐđ]/u.test(title)) {
    return true;
  }

  if (/vietnamese edition|tieng viet/iu.test(title)) {
    return true;
  }

  const tokens = tokenizeTitle(title);
  const vietnameseTokens = tokens.filter((token) => VIETNAMESE_TITLE_WORDS.has(token));
  return (
    vietnameseTokens.length >= 2 ||
    vietnameseTokens.some((token) => DISTINCTIVE_VIETNAMESE_WORDS.has(token))
  );
}

export function hasEnglishTitleEvidence(title: string): boolean {
  // Sách có ký tự tiếng Việt có dấu rõ ràng không phải là sách tiếng Anh
  if (/[À-ỹĐđ]/u.test(title)) {
    return false;
  }
  const tokens = tokenizeTitle(title);
  return tokens.some((token) => ENGLISH_TITLE_WORDS.has(token));
}

export function normalizeLanguageAlias(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "und" || normalized === "not_available") {
    return null;
  }
  return LANGUAGE_ALIASES[normalized] ?? normalized.slice(0, 2);
}

export function deriveBookLanguageCode(input: {
  title: string;
  languages: readonly string[];
  isVietnameseEdition?: boolean;
}): string | null {
  const normalizedLanguages = input.languages
    .map(normalizeLanguageAlias)
    .filter((value): value is string => Boolean(value));
  const hasVietnameseSource =
    input.isVietnameseEdition === true || normalizedLanguages.includes("vi");
  const hasExplicitVietnameseTitle =
    /[À-ỹĐđ]/u.test(input.title) ||
    /vietnamese edition|tieng viet/iu.test(input.title);

  // Nhãn nguồn "Vietnamese edition" chưa đủ tin cậy: tiêu đề cũng phải có dấu hiệu tiếng Việt.
  if (hasVietnameseSource && hasExplicitVietnameseTitle) {
    return "vi";
  }

  if (normalizedLanguages.includes("en") || hasEnglishTitleEvidence(input.title)) {
    return "en";
  }

  if (hasVietnameseSource && hasVietnameseTitleEvidence(input.title)) {
    return "vi";
  }

  return normalizedLanguages.find((language) => language !== "vi") ?? null;
}

export function normalizeCatalogLanguageFilter(value?: string | null): string | null {
  if (!value) return null;
  if (value === "NOT_AVAILABLE") return null;
  return normalizeLanguageAlias(value);
}
