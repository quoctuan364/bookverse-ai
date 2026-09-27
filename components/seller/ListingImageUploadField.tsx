"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, BookOpen, AlertCircle } from "lucide-react";
import {
  LISTING_IMAGE_ACCEPT,
  MAX_LISTING_IMAGE_SIZE_BYTES,
  MAX_LISTING_IMAGES,
} from "@/lib/listing-upload-policy";
import { createClientId } from "@/lib/client-id";

interface ListingImageItem {
  id: string;
  type: "existing" | "new";
  url: string;
  file?: File;
}

interface ListingImageUploadFieldProps {
  initialImages?: string[];
}

const ALLOWED_TYPES = new Set(LISTING_IMAGE_ACCEPT.split(","));

export function ListingImageUploadField({ initialImages = [] }: ListingImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenFormInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ListingImageItem[]>(() =>
    initialImages.map((url, idx) => ({
      id: `existing-${idx}-${url}`,
      type: "existing",
      url,
    })),
  );

  const [error, setError] = useState<string | null>(null);

  // Sync new File items into hidden file input so native form submission carries all File objects
  useEffect(() => {
    if (!hiddenFormInputRef.current) return;

    try {
      const dt = new DataTransfer();
      for (const item of items) {
        if (item.type === "new" && item.file) {
          dt.items.add(item.file);
        }
      }
      hiddenFormInputRef.current.files = dt.files;
    } catch {
      // Fallback for environments where DataTransfer is not fully supported
    }
  }, [items]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      for (const item of items) {
        if (item.type === "new" && item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
      }
    };
  }, [items]);

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = ""; // Reset file input so re-selecting same file triggers change
    setError(null);

    if (selectedFiles.length === 0) return;

    const availableSlots = MAX_LISTING_IMAGES - items.length;
    if (availableSlots <= 0) {
      setError(`Chỉ được tải lên tối đa ${MAX_LISTING_IMAGES} ảnh cho mỗi tin bán.`);
      return;
    }

    const filesToProcess = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > availableSlots) {
      setError(
        `Đã chọn ${selectedFiles.length} ảnh nhưng chỉ còn ${availableSlots} vị trí trống. Chỉ tải ${availableSlots} ảnh đầu tiên.`,
      );
    }

    const newItems: ListingImageItem[] = [];

    for (const file of filesToProcess) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(`Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.`);
        return;
      }

      if (file.size <= 0) {
        setError(`Tệp "${file.name}" đang trống. Vui lòng chọn tệp khác.`);
        return;
      }

      if (file.size > MAX_LISTING_IMAGE_SIZE_BYTES) {
        setError(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5 MB.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: createClientId("listing-image"),
        type: "new",
        url: previewUrl,
        file,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  }

  function handleRemoveItem(indexToRemove: number) {
    setError(null);
    setItems((prev) => {
      const target = prev[indexToRemove];
      if (target && target.type === "new" && target.url.startsWith("blob:")) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-bold text-bv-heading" htmlFor="imageUploadInput">
          Ảnh sách & tình trạng thực tế ({items.length}/{MAX_LISTING_IMAGES})
        </label>
        <span className="text-xs font-medium text-bv-text-muted">Tối đa {MAX_LISTING_IMAGES} ảnh · JPG, PNG, WebP ≤ 5 MB</span>
      </div>

      {/* Hidden inputs to send existing URLs and File objects */}
      {items
        .filter((item) => item.type === "existing")
        .map((item) => (
          <input key={item.id} name="existingImageUrls" type="hidden" value={item.url} />
        ))}
      <input ref={hiddenFormInputRef} className="hidden" multiple name="imageFiles" type="file" />

      {/* Grid of uploaded images */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-bv-ink/15 bg-white shadow-xs transition hover:border-bv-primary/60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`Ảnh ${index + 1}`}
              className="h-full w-full object-cover"
              src={item.url}
            />

            {/* Badge for Primary / Order */}
            <div className="absolute left-2 top-2">
              {index === 0 ? (
                <span className="rounded-md bg-bv-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                  Ảnh bìa
                </span>
              ) : (
                <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  #{index + 1}
                </span>
              )}
            </div>

            {/* Delete button */}
            <button
              aria-label={`Xóa ảnh ${index + 1}`}
              className="absolute right-1.5 top-1.5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-red-600 text-white shadow-sm transition hover:bg-red-700 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              onClick={() => handleRemoveItem(index)}
              title="Xóa ảnh này"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}

        {/* Add photo card button */}
        {items.length < MAX_LISTING_IMAGES && (
          <label
            className="group flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-bv-primary/40 bg-bv-surface p-3 text-center transition-all duration-200 hover:border-bv-primary hover:bg-emerald-50/50 active:scale-[0.98] focus-within:border-bv-primary focus-within:ring-2 focus-within:ring-bv-primary/20"
            htmlFor="imageUploadInput"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-bv-primary/10 text-bv-primary transition-transform duration-200 group-hover:scale-110 group-hover:bg-bv-primary group-hover:text-white">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-bv-heading transition-colors group-hover:text-bv-primary">Chọn ảnh từ máy</span>
              <p className="mt-0.5 text-[11px] text-bv-text-muted">Nhấn để tải ảnh</p>
            </div>
            <input
              ref={fileInputRef}
              accept={LISTING_IMAGE_ACCEPT}
              className="sr-only"
              id="imageUploadInput"
              multiple
              onChange={handleFilesSelected}
              type="file"
            />
          </label>
        )}
      </div>

      {items.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
          <BookOpen className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            Khuyên dùng: Tải ít nhất 1 ảnh bìa trước và 1-2 ảnh trang sách/mép sách để người mua dễ đánh giá tình trạng thực tế.
          </span>
        </div>
      )}

      {error && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
