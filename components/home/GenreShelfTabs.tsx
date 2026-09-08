"use client";

import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

interface GenrePanel {
  id: string;
  name: string;
  catalogKey: string;
  content: ReactNode;
}

interface GenreShelfTabsProps {
  panels: GenrePanel[];
  error?: string | null;
}

export function GenreShelfTabs({ panels, error }: GenreShelfTabsProps) {
  const [selectedId, setSelectedId] = useState(panels[0]?.id ?? "");
  const selected = useMemo(
    () => panels.find((panel) => panel.id === selectedId) ?? panels[0],
    [panels, selectedId],
  );

  if (error || !selected) {
    return (
      <section className="mx-auto mt-14 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-bv-border bg-white p-5 text-sm text-bv-text-subtle">
          {error ?? "Chưa có thể loại đủ dữ liệu để khám phá."}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="genre-shelf-heading" className="mt-14 border-y border-bv-ink/8 bg-white py-12 sm:py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-bv-accent">
            <Tags className="h-4 w-4" aria-hidden="true" />
            Chủ đề đang có trong catalog
          </p>
          <h2 className="bv-editorial mt-2 text-2xl font-black text-bv-ink sm:text-3xl" id="genre-shelf-heading">
            Khám phá theo thể loại
          </h2>
        </div>
        <Link
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-black text-bv-primary transition hover:bg-bv-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
          href={`/catalog?category=${encodeURIComponent(selected.catalogKey)}`}
        >
          Xem tất cả {selected.name}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div aria-label="Chọn thể loại" className="mt-5 flex gap-2 overflow-x-auto pb-2" role="tablist">
        {panels.map((panel) => {
          const active = panel.id === selected.id;
          return (
            <button
              aria-controls={`genre-panel-${panel.id}`}
              aria-selected={active}
              className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary ${
                active
                  ? "border-bv-primary bg-bv-primary text-white"
                  : "border-bv-border bg-white text-bv-ink hover:border-bv-primary hover:bg-bv-muted"
              }`}
              id={`genre-tab-${panel.id}`}
              key={panel.id}
              onClick={() => setSelectedId(panel.id)}
              role="tab"
              type="button"
            >
              {panel.name}
            </button>
          );
        })}
      </div>

      {panels.map((panel) => (
        <div
          aria-labelledby={`genre-tab-${panel.id}`}
          hidden={panel.id !== selected.id}
          id={`genre-panel-${panel.id}`}
          key={panel.id}
          role="tabpanel"
        >
          {panel.content}
        </div>
      ))}
      </div>
    </section>
  );
}
