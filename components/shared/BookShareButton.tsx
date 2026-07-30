"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BookShareButtonProps {
  title: string;
}

export function BookShareButton({ title }: BookShareButtonProps) {
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
    <div className="grid gap-2">
      <Button className="h-12 w-full gap-2 text-base" onClick={handleShare} type="button" variant="outline">
        {status === "copied" ? <Check className="h-5 w-5 text-[#176B62]" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
        {status === "copied" ? "Đã sao chép liên kết" : "Chia sẻ sách"}
      </Button>
      {status === "error" ? (
        <p className="text-center text-xs text-[#B84332]" role="alert">
          Không thể chia sẻ lúc này. Vui lòng thử lại.
        </p>
      ) : null}
    </div>
  );
}
