"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MarketplaceFiltersProps {
  condition: string;
  language: string;
  query: string;
  conditionOptions: Array<{ value: string; label: string }>;
}

export function MarketplaceFilters({
  condition,
  language,
  query,
  conditionOptions,
}: MarketplaceFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(Boolean(condition || language));

  return (
    <form className="bv-panel rounded-lg p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bv-text-muted"
          />
          <Input
            aria-label="Tìm trong chợ sách"
            className="h-11 pl-10"
            defaultValue={query}
            name="q"
            placeholder="Tìm tên sách, người bán, mô tả..."
            type="search"
          />
        </div>

        <button
          aria-controls="marketplace-advanced-filters"
          aria-expanded={showAdvanced}
          className="inline-flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-bv-border bg-bv-ivory px-3 text-sm font-bold text-bv-heading transition hover:bg-bv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus/30 md:hidden"
          onClick={() => setShowAdvanced((current) => !current)}
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Bộ lọc nâng cao
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", showAdvanced && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        <div
          className={cn(
            "grid gap-3 md:contents",
            showAdvanced ? "grid" : "hidden md:contents",
          )}
          id="marketplace-advanced-filters"
        >
          <label className="sr-only" htmlFor="condition">
            Tình trạng sách
          </label>
          <select
            className="h-11 rounded-lg border border-bv-border bg-bv-ivory px-3 text-sm font-medium text-bv-heading outline-none focus-visible:ring-2 focus-visible:ring-bv-focus/30"
            defaultValue={condition}
            id="condition"
            name="condition"
          >
            {conditionOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="language">
            Ngôn ngữ sách
          </label>
          <select
            className="h-11 rounded-lg border border-bv-border bg-bv-ivory px-3 text-sm font-medium text-bv-heading outline-none focus-visible:ring-2 focus-visible:ring-bv-focus/30"
            defaultValue={language}
            id="language"
            name="language"
          >
            <option value="">Tất cả ngôn ngữ</option>
            <option value="vi">Tiếng Việt</option>
            <option value="en">Tiếng Anh</option>
          </select>
        </div>

        <Button className="h-11 gap-2" type="submit">
          <Search className="h-4 w-4" aria-hidden="true" />
          Tìm tin bán
        </Button>
      </div>
    </form>
  );
}
