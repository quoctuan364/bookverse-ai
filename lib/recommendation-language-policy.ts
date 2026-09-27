/**
 * Mặc định ưu tiên tiếng Việt. Chỉ chuyển sang danh sách đa ngôn ngữ khi người
 * dùng có ít nhất ba tương tác với sách ngoại văn và số đó nhiều hơn tiếng Việt.
 */
export function shouldPreferVietnameseRecommendations(
  languageCodes: Array<string | null | undefined>,
): boolean {
  const normalized = languageCodes
    .map((language) => language?.trim().toLowerCase())
    .filter((language): language is string => Boolean(language));
  const vietnameseCount = normalized.filter((language) => language === "vi").length;
  const foreignCount = normalized.filter((language) => language !== "vi").length;

  return !(foreignCount >= 3 && foreignCount > vietnameseCount);
}
