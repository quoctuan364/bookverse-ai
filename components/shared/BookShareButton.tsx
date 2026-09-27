"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookShareButtonProps {
  title: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
  showLabel?: boolean;
}

export function BookShareButton({
  title,
  className,
  variant = "outline",
  size = "default",
  label = "Chia sẻ sách",
  showLabel = true,
}: BookShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2_500);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2_500);
    }
  }

  return (
    <div className="relative inline-block w-full">
      <Button
        className={cn("w-full gap-2 transition-all duration-200", className)}
        onClick={handleShare}
        size={size}
        type="button"
        variant={variant}
      >
        {status === "copied" ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4 shrink-0 text-bv-text-muted" aria-hidden="true" />
        )}
        {showLabel ? (status === "copied" ? "Đã sao chép liên kết" : label) : null}
      </Button>
      {status === "error" ? (
        <p className="mt-1 text-center text-xs text-[#B84332]" role="alert">
          Không thể chia sẻ lúc này. Vui lòng thử lại.
        </p>
      ) : null}
    </div>
  );
}
