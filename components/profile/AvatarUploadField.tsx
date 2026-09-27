"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, UserRound } from "lucide-react";
import { AVATAR_ACCEPT, MAX_AVATAR_SIZE_BYTES } from "@/lib/avatar-upload-policy";

interface AvatarUploadFieldProps {
  currentAvatarUrl: string | null;
  displayName: string;
}

const ALLOWED_IMAGE_TYPES = new Set(AVATAR_ACCEPT.split(","));

export function AvatarUploadField({ currentAvatarUrl, displayName }: AvatarUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
  }, []);

  function clearObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      event.target.value = "";
      setError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      event.target.value = "";
      setError("Ảnh không được lớn hơn 2 MB.");
      return;
    }

    clearObjectUrl();
    const nextPreviewUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setRemoveAvatar(false);
  }

  function handleRemove() {
    clearObjectUrl();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setPreviewUrl(null);
    setRemoveAvatar(true);
    setError(null);
  }

  return (
    <fieldset className="rounded-2xl border border-bv-ink/10 bg-bv-surface p-4 sm:p-5">
      <legend className="px-2 text-sm font-bold text-bv-heading">Ảnh đại diện</legend>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {previewUrl ? (
          <div
            aria-label={`Ảnh đại diện của ${displayName}`}
            className="h-24 w-24 shrink-0 rounded-2xl border-2 border-bv-ink/15 bg-cover bg-center shadow-sm"
            role="img"
            style={{ backgroundImage: `url(${JSON.stringify(previewUrl).slice(1, -1)})` }}
          />
        ) : (
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-bv-ink/20 bg-white text-bv-text-muted">
            <UserRound className="h-10 w-10" aria-hidden="true" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-bv-heading">Chọn ảnh từ thiết bị</p>
          <p className="mt-1 text-xs leading-5 text-bv-text-muted">JPG, PNG hoặc WebP · tối đa 2 MB.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-bv-primary px-4 text-sm font-bold text-white transition hover:bg-bv-primary-dark focus-within:ring-2 focus-within:ring-bv-primary focus-within:ring-offset-2">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Chọn ảnh từ máy
              <input
                ref={inputRef}
                accept={AVATAR_ACCEPT}
                className="absolute inset-0 cursor-pointer opacity-0"
                name="avatarFile"
                onChange={handleFileChange}
                type="file"
              />
            </label>
            {previewUrl ? (
              <button
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                onClick={handleRemove}
                type="button"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Xóa ảnh
              </button>
            ) : null}
          </div>
          <input name="removeAvatar" type="hidden" value={removeAvatar ? "true" : "false"} />
          <p aria-live="polite" className="mt-2 min-h-5 text-xs font-semibold text-red-700">
            {error}
          </p>
        </div>
      </div>
    </fieldset>
  );
}
