"use client";

import type { ReactNode } from "react";

interface ConfirmSubmitButtonProps {
  children: ReactNode;
  confirmMessage: string;
  className: string;
}

export function ConfirmSubmitButton({ children, confirmMessage, className }: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
