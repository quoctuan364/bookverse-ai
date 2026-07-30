"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

interface DataQualitySubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
}

export function DataQualitySubmitButton({
  children,
  className = "",
  pendingLabel = "Đang lưu...",
  disabled = false,
}: DataQualitySubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
