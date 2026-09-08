"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Sparkles } from "lucide-react";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { cn } from "@/lib/utils";

interface GenreOption {
  name: string;
  description: string | null;
  bookCount: number;
}

interface GenrePreferenceFormProps {
  action: (formData: FormData) => Promise<void>;
  categories: GenreOption[];
  initialSelected: string[];
}

export function GenrePreferenceForm({
  action,
  categories,
  initialSelected,
}: GenrePreferenceFormProps) {
  const [selectedGenres, setSelectedGenres] = useState(() => initialSelected.slice(0, 5));
  const selectedCount = selectedGenres.length;

  function toggleGenre(genre: string) {
    setSelectedGenres((currentGenres) => {
      if (currentGenres.includes(genre)) {
        return currentGenres.filter((item) => item !== genre);
      }

      if (currentGenres.length >= 5) {
        return currentGenres;
      }

      return [...currentGenres, genre];
    });
  }

  return (
    <form action={action} className="mt-7">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-bv-primary/15 bg-bv-mint px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-bv-primary shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-black text-bv-heading">Chọn từ 3 đến 5 thể loại</p>
            <p className="mt-0.5 text-sm text-bv-text-muted">
              Bạn có thể thay đổi lại trong hồ sơ bất cứ lúc nào.
            </p>
          </div>
        </div>
        <span
          aria-live="polite"
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black",
            selectedCount >= 3
              ? "bg-bv-primary text-white"
              : "border border-bv-primary/20 bg-white text-bv-primary",
          )}
        >
          Đã chọn {selectedCount}/5
        </span>
      </div>

      <fieldset>
        <legend className="sr-only">Thể loại sách yêu thích</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const isSelected = selectedGenres.includes(category.name);
            const isDisabled = !isSelected && selectedCount >= 5;
            const hasUsefulDescription =
              category.description &&
              !category.description.startsWith("Phân loại sách phục vụ");

            return (
              <label
                className={cn(
                  "relative flex min-h-28 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition duration-200 focus-within:ring-2 focus-within:ring-bv-primary focus-within:ring-offset-2",
                  isSelected
                    ? "border-bv-primary bg-bv-primary text-white shadow-[0_12px_28px_rgba(23,107,98,0.2)]"
                    : "border-bv-ink/10 bg-white text-bv-heading hover:border-bv-primary/35 hover:bg-[#F7FBF9]",
                  isDisabled && "cursor-not-allowed opacity-55",
                )}
                key={category.name}
              >
                <input
                  checked={isSelected}
                  className="sr-only"
                  disabled={isDisabled}
                  name="preferredGenres"
                  onChange={() => toggleGenre(category.name)}
                  type="checkbox"
                  value={category.name}
                />
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    isSelected ? "bg-white/15 text-white" : "bg-bv-mint text-bv-primary",
                  )}
                >
                  {isSelected ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-black">{category.name}</span>
                  <span
                    className={cn(
                      "mt-1 line-clamp-2 block text-xs leading-5",
                      isSelected ? "text-white/80" : "text-bv-text-muted",
                    )}
                  >
                    {hasUsefulDescription
                      ? category.description
                      : `${category.bookCount.toLocaleString("vi-VN")} đầu sách đang hoạt động`}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-bv-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-black text-bv-text-muted transition hover:bg-bv-muted hover:text-bv-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
          href="/"
        >
          Bỏ qua, chọn sau
        </Link>
        <SubmitButton
          className="min-h-12 gap-2 px-6"
          disabled={selectedCount < 3 || selectedCount > 5}
          pendingLabel="Đang lưu sở thích..."
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Hoàn tất cá nhân hóa
        </SubmitButton>
      </div>
    </form>
  );
}
