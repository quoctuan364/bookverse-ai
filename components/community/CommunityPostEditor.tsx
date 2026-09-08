"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, Send, Star } from "lucide-react";

import type { CommunityBookOption } from "@/actions/community.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CommunityPostEditorProps {
  action: (formData: FormData) => void;
  books: CommunityBookOption[];
  errorMessage?: string;
}

export function CommunityPostEditor({ action, books, errorMessage }: CommunityPostEditorProps) {
  const [query, setQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [postType, setPostType] = useState("DISCUSSION");
  const selectedBook = books.find((book) => book.id === selectedBookId);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return books.slice(0, 8);
    return books
      .filter((book) => `${book.title} ${book.author} ${book.category}`.toLocaleLowerCase("vi").includes(normalized))
      .slice(0, 8);
  }, [books, query]);

  return (
    <form action={action} className="bv-card rounded-2xl p-5 sm:p-7">
      {errorMessage ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}
      <input name="bookId" type="hidden" value={selectedBookId} />

      <fieldset>
        <legend className="text-sm font-black text-bv-heading">1. Bạn muốn đăng gì?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["DISCUSSION", "Thảo luận", "Chia sẻ một góc nhìn"],
            ["QUESTION", "Hỏi đáp", "Xin ý kiến cộng đồng"],
            ["REVIEW", "Đánh giá", "Chấm sao và nhận xét"],
          ].map(([value, label, note]) => (
            <label className={`cursor-pointer rounded-xl border p-3 transition ${postType === value ? "border-bv-primary bg-bv-mint" : "border-bv-border bg-white hover:border-bv-primary/35"}`} key={value}>
              <input className="sr-only" checked={postType === value} name="type" onChange={() => setPostType(value)} type="radio" value={value} />
              <span className="block font-black text-bv-heading">{label}</span>
              <span className="mt-1 block text-xs text-bv-text-muted">{note}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <label className="text-sm font-black text-bv-heading" htmlFor="community-book-search">2. Chọn đúng cuốn sách</label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bv-primary" aria-hidden="true" />
          <Input id="community-book-search" className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên sách, tác giả hoặc thể loại..." value={query} />
        </div>
        {selectedBook ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-bv-primary/25 bg-bv-mint p-3">
            <span><span className="block font-black text-bv-heading">{selectedBook.title}</span><span className="text-sm text-bv-text-muted">{selectedBook.author} · {selectedBook.category}</span></span>
            <button className="min-h-11 rounded-lg px-3 text-sm font-black text-bv-primary hover:bg-white" onClick={() => setSelectedBookId("")} type="button">Đổi sách</button>
          </div>
        ) : (
          <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-bv-border bg-[#F8F6F0] p-2">
            {results.map((book) => (
              <button className="flex min-h-14 items-center gap-3 rounded-lg bg-white px-3 py-2 text-left transition hover:bg-bv-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" key={book.id} onClick={() => { setSelectedBookId(book.id); setQuery(book.title); }} type="button">
                <BookOpen className="h-5 w-5 shrink-0 text-bv-primary" aria-hidden="true" />
                <span className="min-w-0"><span className="line-clamp-1 block font-black text-bv-heading">{book.title}</span><span className="line-clamp-1 block text-xs text-bv-text-muted">{book.author} · {book.category}</span></span>
              </button>
            ))}
            {results.length === 0 ? <p className="p-4 text-center text-sm text-bv-text-muted">Không tìm thấy sách phù hợp.</p> : null}
          </div>
        )}
      </div>

      {postType === "REVIEW" ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-black text-bv-heading">3. Chấm điểm cuốn sách</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <label className="cursor-pointer" key={rating}><input className="peer sr-only" defaultChecked={rating === 5} name="rating" type="radio" value={rating} /><span className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-bv-border bg-white px-3 font-black text-[#8A5C00] peer-checked:border-bv-gold peer-checked:bg-[#FFF4D6]"><Star className="h-4 w-4 fill-bv-gold text-bv-gold" aria-hidden="true" />{rating}</span></label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2 text-sm font-black text-bv-heading">Tiêu đề
          <Input maxLength={160} name="title" placeholder="Ví dụ: Ba điều mình thích nhất ở cuốn sách này" required />
        </label>
        <label className="grid gap-2 text-sm font-black text-bv-heading">Nội dung
          <textarea className="min-h-56 w-full resize-y rounded-xl border border-bv-border bg-bv-ivory px-4 py-3 text-sm font-medium leading-7 text-bv-heading outline-none transition placeholder:text-[#7C8581] focus-visible:ring-2 focus-visible:ring-bv-focus/30" maxLength={4000} name="content" placeholder="Viết cảm nhận hoặc câu hỏi của bạn..." required />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-900">
          <input className="h-5 w-5 accent-amber-600" name="hasSpoiler" type="checkbox" value="1" /> Nội dung có tiết lộ tình tiết (spoiler)
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <Button className="gap-2 px-6" disabled={!selectedBookId} type="submit"><Send className="h-4 w-4" aria-hidden="true" /> Đăng bài</Button>
      </div>
    </form>
  );
}
