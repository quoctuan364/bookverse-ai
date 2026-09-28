"use client";

import Link from "next/link";
import { Clock3, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Suggestion { id: string; title: string; author: string }
interface Props { defaultValue: string }

const STORAGE_KEY = "bookverse-recent-searches";
const SUGGESTION_TIMEOUT_MS = 6_000;

function readRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]").filter((value: unknown) => typeof value === "string").slice(0, 5);
  } catch { return []; }
}

function saveRecentSearch(value: string) {
  const clean = value.trim();
  if (!clean) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([clean, ...readRecentSearches().filter((item) => item !== clean)].slice(0, 5)));
}

export function CatalogSmartSearchInput({ defaultValue }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setRecent(readRecentSearches());
    const form = wrapperRef.current?.closest("form");
    const handleSubmit = () => saveRecentSearch(value);
    form?.addEventListener("submit", handleSubmit);
    return () => form?.removeEventListener("submit", handleSubmit);
  }, [value]);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      setFeedback(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    let didTimeout = false;
    let requestTimeout: number | null = null;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFeedback(null);
      requestTimeout = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, SUGGESTION_TIMEOUT_MS);

      try {
        const response = await fetch(`/api/catalog/suggestions?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json() as { suggestions?: Suggestion[] };
        if (active) setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch (error) {
        if (!active) return;

        setSuggestions([]);
        if (didTimeout) {
          setFeedback("Gợi ý đang phản hồi chậm. Bạn vẫn có thể nhấn Enter để tìm.");
        } else if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFeedback("Chưa tải được gợi ý. Bạn vẫn có thể nhấn Enter để tìm.");
        }
      } finally {
        if (requestTimeout !== null) window.clearTimeout(requestTimeout);
        if (active) setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
      if (requestTimeout !== null) window.clearTimeout(requestTimeout);
      controller.abort();
    };
  }, [value]);

  const showRecent = value.trim().length === 0 && recent.length > 0;
  return (
    <div className="relative min-w-0 flex-1" ref={wrapperRef}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-7 z-10 h-5 w-5 -translate-y-1/2 text-bv-primary" />
      <input
        aria-label="Tìm sách"
        autoComplete="off"
        className="h-14 w-full rounded-2xl border border-bv-primary/20 bg-[#FFFEFB] pl-14 pr-12 text-base font-medium shadow-[0_8px_24px_rgba(39,44,51,0.06)] outline-none transition placeholder:font-normal focus:border-bv-primary/50 focus:ring-4 focus:ring-bv-primary/10"
        id="catalog-search"
        name="q"
        onChange={(event) => { setValue(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Nhập tên sách, tác giả hoặc nhà xuất bản..."
        type="search"
        value={value}
      />
      {value ? <button aria-label="Xóa từ khóa" className="absolute right-4 top-7 -translate-y-1/2 rounded-full p-1 text-bv-text-muted hover:bg-bv-muted" onClick={() => { setValue(""); setSuggestions([]); }} type="button"><X className="h-4 w-4" /></button> : null}
      {open && (showRecent || suggestions.length > 0 || loading || feedback) ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-bv-primary/15 bg-white p-2 shadow-[0_22px_60px_rgba(27,71,64,0.18)]">
          {showRecent ? <><div className="flex items-center justify-between px-3 py-2"><p className="text-xs font-black uppercase tracking-wider text-bv-text-muted">Tìm kiếm gần đây</p><button className="text-xs font-bold text-bv-focus" onClick={() => { localStorage.removeItem(STORAGE_KEY); setRecent([]); }} type="button">Xóa</button></div>{recent.map((item) => <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-bv-heading hover:bg-bv-muted" key={item} onClick={() => { setValue(item); setOpen(false); }} type="button"><Clock3 className="h-4 w-4 text-bv-text-muted" />{item}</button>)}</> : null}
          {loading ? (
            <p className="px-3 py-3 text-sm text-bv-text-muted">Đang tìm sách phù hợp...</p>
          ) : feedback ? (
            <p className="px-3 py-3 text-sm font-medium text-bv-text-subtle" role="status">{feedback}</p>
          ) : suggestions.map((book) => <Link className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-bv-muted" href={`/book/${book.id}`} key={book.id} onClick={() => saveRecentSearch(book.title)}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bv-primary/10 text-bv-primary"><Search className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-sm text-bv-heading">{book.title}</strong><span className="block truncate text-xs text-bv-text-muted">{book.author}</span></span></Link>)}
        </div>
      ) : null}
      {open ? <button aria-label="Đóng gợi ý tìm kiếm" className="fixed inset-0 -z-10 cursor-default" onClick={() => setOpen(false)} type="button" /> : null}
    </div>
  );
}
