"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpDown,
  BookOpenText,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CatalogSmartSearchInput } from "@/components/catalog/CatalogSmartSearchInput";

interface CatalogSearchPanelProps {
  activeFilterCount: number;
  categories: Array<{ id: string; name: string }>;
  initialValues: {
    categoryId: string;
    inStock: boolean;
    language: string;
    maxPrice?: number;
    minPrice?: number;
    minRating?: number;
    publishYear?: number;
    query: string;
    sort: string;
  };
}

const quickSearches = [
  { label: "Trí tuệ nhân tạo", query: "trí tuệ nhân tạo" },
  { label: "Tài chính cá nhân", query: "tài chính cá nhân" },
  { label: "Tâm lý học", query: "tâm lý học" },
  { label: "Văn học Việt Nam", query: "văn học Việt Nam" },
];

const selectClass =
  "h-11 w-full rounded-xl border border-bv-border bg-white px-3 text-sm text-bv-ink outline-none transition focus:border-bv-primary/50 focus-visible:ring-2 focus-visible:ring-bv-primary/20";

export function CatalogSearchPanel({
  activeFilterCount,
  categories,
  initialValues,
}: CatalogSearchPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(activeFilterCount > 0);

  return (
    <form
      action="/catalog"
      className="relative overflow-hidden rounded-3xl border border-bv-primary/15 bg-white shadow-[0_24px_70px_rgba(27,71,64,0.12)]"
      role="search"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-bv-mint/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-[#F7E9CC]/70 blur-3xl" />

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-bv-primary/15 bg-[#EDF8F5] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-bv-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Tìm sách
            </span>
            <h2 className="mt-3 text-xl font-black tracking-tight text-bv-heading sm:text-2xl">
              Bạn muốn đọc gì hôm nay?
            </h2>
            <p className="mt-1 text-sm leading-6 text-bv-text-subtle">
              Tìm sách theo tên, tác giả hoặc nhà xuất bản.
            </p>
          </div>
          <div className="hidden items-center gap-3 rounded-2xl border border-bv-border/80 bg-[#FAF8F2]/80 px-4 py-3 text-sm text-bv-text-subtle lg:flex">
            <BookOpenText className="h-5 w-5 text-bv-accent" aria-hidden="true" />
            <span><strong className="block text-bv-heading">Cách tìm</strong>Có thể gõ tiếng Việt không dấu</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <CatalogSmartSearchInput defaultValue={initialValues.query} />
          <Button className="h-14 gap-2 rounded-2xl bg-bv-primary px-7 text-base font-black shadow-[0_14px_30px_rgba(23,107,98,0.24)] hover:bg-bv-primary-dark sm:min-w-40" type="submit">
            <Search className="h-5 w-5" aria-hidden="true" /> Tìm sách
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-bv-text-subtle">Từ khóa phổ biến:</span>
            {quickSearches.map((item) => (
              <Link
                className="inline-flex min-h-9 items-center rounded-full border border-bv-border bg-[#FAF8F2] px-3 py-1.5 text-xs font-bold text-[#42524D] transition duration-200 hover:border-bv-primary/30 hover:bg-[#EDF8F5] hover:text-bv-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                href={`/catalog?q=${encodeURIComponent(item.query)}`}
                key={item.query}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            aria-controls="catalog-advanced-filters"
            aria-expanded={showAdvanced}
            className="inline-flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-bv-primary/15 bg-[#EDF8F5] px-4 text-sm font-black text-bv-primary transition duration-200 hover:border-bv-primary/35 hover:bg-[#DFF2ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary sm:self-start xl:self-auto"
            onClick={() => setShowAdvanced((current) => !current)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Bộ lọc nâng cao
              {activeFilterCount > 0 ? <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-bv-primary px-1.5 text-xs text-white">{activeFilterCount}</span> : null}
            </span>
            <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform duration-200", showAdvanced && "rotate-180")} />
          </button>
        </div>
      </div>

      <div className={cn("relative border-t border-bv-primary/10 bg-[#F8F6F0]/88 p-5 sm:p-7", showAdvanced ? "block" : "hidden")} id="catalog-advanced-filters">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bv-primary text-white"><Filter className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <h3 className="text-sm font-black text-bv-heading">Bộ lọc chi tiết</h3>
            <p className="text-xs text-bv-text-subtle">Chọn thêm thể loại, ngôn ngữ, giá hoặc năm xuất bản.</p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5 text-xs font-bold text-[#42524D]">
            Thể loại
            <select className={selectClass} defaultValue={initialValues.categoryId} name="category">
              <option value="">Tất cả thể loại</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-[#42524D]">
            Ngôn ngữ
            <select className={selectClass} defaultValue={initialValues.language} name="language">
              <option value="">Tất cả ngôn ngữ</option><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-xs font-bold text-[#42524D]">
            Đánh giá
            <span className="relative min-w-0">
              <Star aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B17700]" />
              <select className={cn(selectClass, "pl-9")} defaultValue={initialValues.minRating?.toString() ?? ""} name="minRating">
                <option value="">Mọi mức đánh giá</option><option value="4.5">Từ 4,5 sao</option><option value="4">Từ 4 sao</option><option value="3">Từ 3 sao</option>
              </select>
            </span>
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-[#42524D]">
            Sắp xếp
            <span className="relative">
              <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bv-text-subtle" />
              <select className={cn(selectClass, "pl-9")} defaultValue={initialValues.sort} name="sort">
                <option value="relevance">Độ liên quan</option><option value="title">Tên A–Z</option><option value="rating">Đánh giá cao</option><option value="newest">Năm mới nhất</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option>
              </select>
            </span>
          </label>
          <fieldset className="grid min-w-0 grid-cols-2 gap-2 md:col-span-2">
            <legend className="mb-1.5 text-xs font-bold text-[#42524D]">Khoảng giá</legend>
            <Input className="min-w-0 rounded-xl bg-white" defaultValue={initialValues.minPrice?.toString() ?? ""} inputMode="numeric" min="0" name="minPrice" placeholder="Giá từ" type="number" />
            <Input className="min-w-0 rounded-xl bg-white" defaultValue={initialValues.maxPrice?.toString() ?? ""} inputMode="numeric" min="0" name="maxPrice" placeholder="Giá đến" type="number" />
          </fieldset>
          <label className="grid gap-1.5 text-xs font-bold text-[#42524D]">
            Năm xuất bản
            <Input className="rounded-xl bg-white" defaultValue={initialValues.publishYear?.toString() ?? ""} max="2100" min="1000" name="year" placeholder="Ví dụ: 2020" type="number" />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl border border-bv-border bg-white px-3 text-sm font-bold text-bv-ink transition hover:border-bv-primary/30 hover:bg-[#EDF8F5]">
            <input className="h-5 w-5 accent-bv-primary" defaultChecked={initialValues.inStock} name="inStock" type="checkbox" value="1" /> Chỉ sách đang còn hàng
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-bv-border/70 pt-5 sm:flex-row sm:justify-end">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold text-bv-text-subtle transition hover:bg-white hover:text-bv-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" href="/catalog">Đặt lại bộ lọc</Link>
          <Button className="gap-2 rounded-xl px-6 font-black" type="submit"><Filter className="h-4 w-4" aria-hidden="true" /> Áp dụng bộ lọc</Button>
        </div>
      </div>
    </form>
  );
}
