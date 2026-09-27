"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Focus, Lightbulb, Loader2, Mountain, Sparkles } from "lucide-react";

interface DiscoverPreferencesFormProps {
  currentMood: string;
  currentLength: string;
  currentLanguage: string;
  currentCategory?: string;
  categories: Array<{ id: string; name: string }>;
}

const moods = [
  { value: "FOCUS", label: "Tập trung", description: "Kiến thức và kỹ năng", icon: Focus },
  { value: "RELAX", label: "Thư giãn", description: "Nhẹ nhàng, dễ đọc", icon: Sparkles },
  { value: "INSPIRE", label: "Cảm hứng", description: "Ý tưởng và phát triển", icon: Lightbulb },
  { value: "ADVENTURE", label: "Khám phá", description: "Thế giới và trải nghiệm", icon: Mountain },
];

const lengths = [
  { value: "MEDIUM", label: "Vừa phải · 251–499 trang" },
  { value: "SHORT", label: "Đọc nhanh · ≤250 trang" },
  { value: "LONG", label: "Đọc sâu · từ 500 trang" },
];

const languages = [
  { value: "ALL", label: "Mọi ngôn ngữ" },
  { value: "VI", label: "Tiếng Việt" },
  { value: "EN", label: "Tiếng Anh" },
  { value: "OTHER", label: "Ngôn ngữ khác" },
];

export function DiscoverPreferencesForm({
  currentMood,
  currentLength,
  currentLanguage,
  currentCategory,
  categories,
}: DiscoverPreferencesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedMood, setSelectedMood] = useState(currentMood);
  const [selectedLength, setSelectedLength] = useState(currentLength);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory ?? "");

  function applyFilters(overrideMood?: string) {
    const moodToUse = overrideMood ?? selectedMood;
    const params = new URLSearchParams();
    if (moodToUse) params.set("mood", moodToUse);
    if (selectedLength) params.set("length", selectedLength);
    if (selectedLanguage) params.set("language", selectedLanguage);
    if (selectedCategory) params.set("category", selectedCategory);

    startTransition(() => {
      router.push(`/discover?${params.toString()}`, { scroll: false });
    });
  }

  function handleMoodClick(moodValue: string) {
    setSelectedMood(moodValue);
    // Visual feedback is instant via state, and user can immediately submit or change options
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters();
  }

  return (
    <form
      className="rounded-2xl border border-bv-ink/10 bg-white p-5 shadow-[0_12px_32px_rgba(37,49,56,0.08)] sm:p-6"
      onSubmit={handleSubmit}
    >
      <fieldset>
        <div className="flex items-center justify-between">
          <legend className="font-black text-bv-heading">Tâm trạng đọc</legend>
          <span className="text-xs font-semibold text-bv-text-muted">Nhấn để chọn tâm trạng</span>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {moods.map(({ value, label, description, icon: Icon }) => {
            const isSelected = selectedMood === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => handleMoodClick(value)}
                className={`relative flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary ${
                  isSelected
                    ? "border-2 border-bv-primary bg-bv-mint/70 shadow-sm ring-1 ring-bv-primary"
                    : "border-bv-ink/12 bg-white hover:border-bv-primary/40 hover:bg-bv-surface/50"
                }`}
                aria-pressed={isSelected}
              >
                {/* Visual Checkmark Badge */}
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-bv-primary text-white shadow-xs">
                    <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden="true" />
                  </span>
                )}

                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors ${
                    isSelected
                      ? "bg-bv-primary text-white"
                      : "bg-bv-surface text-bv-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <span className="min-w-0 pr-3">
                  <span
                    className={`block text-sm font-black transition-colors ${
                      isSelected ? "text-bv-primary" : "text-bv-heading"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-bv-text-muted">{description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold text-bv-heading">
          Độ dài
          <select
            className="mt-2 min-h-12 w-full cursor-pointer rounded-xl border border-bv-ink/15 bg-white px-3 font-semibold text-bv-heading outline-none transition hover:border-bv-primary/40 focus-visible:border-bv-primary focus-visible:ring-2 focus-visible:ring-bv-primary/20"
            value={selectedLength}
            onChange={(e) => setSelectedLength(e.target.value)}
          >
            {lengths.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-bv-heading">
          Ngôn ngữ
          <select
            className="mt-2 min-h-12 w-full cursor-pointer rounded-xl border border-bv-ink/15 bg-white px-3 font-semibold text-bv-heading outline-none transition hover:border-bv-primary/40 focus-visible:border-bv-primary focus-visible:ring-2 focus-visible:ring-bv-primary/20"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            {languages.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-bv-heading">
          Thể loại
          <select
            className="mt-2 min-h-12 w-full cursor-pointer rounded-xl border border-bv-ink/15 bg-white px-3 font-semibold text-bv-heading outline-none transition hover:border-bv-primary/40 focus-visible:border-bv-primary focus-visible:ring-2 focus-visible:ring-bv-primary/20"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Mọi thể loại</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-bv-primary px-6 font-black text-white shadow-sm transition-all duration-200 hover:bg-bv-primary-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isPending}
          type="submit"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-bv-gold" aria-hidden="true" />
              Đang tìm sách cho bạn...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-bv-gold" aria-hidden="true" />
              Để Nova chọn lại
            </>
          )}
        </button>

        {isPending && (
          <span className="text-xs font-bold text-bv-primary animate-pulse">
            Đang cập nhật danh mục sách theo tiêu chí mới...
          </span>
        )}
      </div>
    </form>
  );
}
