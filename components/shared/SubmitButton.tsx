"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  children: ReactNode;
  pendingLabel?: string;
}

export function SubmitButton({ children, pendingLabel = "Đang xử lý...", disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} type="submit" {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
