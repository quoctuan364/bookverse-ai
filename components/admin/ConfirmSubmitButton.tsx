"use client";

import type { ReactNode } from "react";

interface ConfirmSubmitButtonProps {
  children: ReactNode;
  confirmMessage: string;
  className: string;
  title?: string;
}

export function ConfirmSubmitButton({ children, confirmMessage, className, title }: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      title={title}
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
