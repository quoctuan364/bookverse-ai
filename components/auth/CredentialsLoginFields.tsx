"use client";

import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEMO_ACCOUNT_EMAILS,
  DEMO_ACCOUNT_PASSWORD,
} from "@/lib/demo-accounts";

interface CredentialsLoginFieldsProps {
  showDemoAccounts: boolean;
}

const QUICK_ACCOUNTS = [
  {
    label: "Độc giả",
    detail: "Đọc · Mua · Bán",
    email: DEMO_ACCOUNT_EMAILS.U001,
    icon: UserCheck,
  },
  {
    label: "Quản trị viên",
    detail: "Toàn quyền hệ thống",
    email: DEMO_ACCOUNT_EMAILS.U009,
    icon: ShieldCheck,
  },
] as const;

export function CredentialsLoginFields({
  showDemoAccounts,
}: CredentialsLoginFieldsProps) {
  const { pending } = useFormStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDemoEmail, setSelectedDemoEmail] = useState<string | null>(null);

  function selectDemoAccount(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_ACCOUNT_PASSWORD);
    setSelectedDemoEmail(accountEmail);
  }

  return (
    <div className="space-y-4">
      {showDemoAccounts ? (
        <div className="rounded-2xl border border-bv-primary/15 bg-bv-primary/[0.04] p-3">
          <div className="flex items-center justify-between gap-2 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-bv-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Điền nhanh tài khoản thử nghiệm:
            </span>
            <span className="text-[11px] text-bv-text-muted">
              Mật khẩu: <strong className="font-bold text-bv-ink">{DEMO_ACCOUNT_PASSWORD}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isSelected = selectedDemoEmail === acc.email;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary ${
                    isSelected
                      ? "border-bv-primary bg-white text-bv-primary shadow-xs ring-1 ring-bv-primary/20"
                      : "border-bv-ink/10 bg-white/80 text-bv-ink hover:border-bv-primary/30 hover:bg-white"
                  }`}
                  disabled={pending}
                  key={acc.email}
                  onClick={() => selectDemoAccount(acc.email)}
                  type="button"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                      isSelected
                        ? "bg-bv-primary text-white"
                        : "bg-bv-primary/10 text-bv-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black leading-tight text-bv-ink">
                      {acc.label}
                    </p>
                    <p className="truncate text-[10.5px] font-medium text-bv-text-muted">
                      {acc.detail}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <p aria-live="polite" className="sr-only">
            {selectedDemoEmail ? `Đã điền tài khoản ${selectedDemoEmail}.` : ""}
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-bv-heading" htmlFor="email">
          Email
        </label>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          className="h-11 rounded-xl text-sm"
          id="email"
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            setSelectedDemoEmail(null);
          }}
          placeholder="Nhập địa chỉ email của bạn"
          required
          spellCheck={false}
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-bold text-bv-heading" htmlFor="password">
            Mật khẩu
          </label>
          <Link
            className="inline-flex items-center text-xs font-black text-bv-primary hover:underline"
            href="/forgot-password"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div className="relative">
          <Input
            autoComplete="current-password"
            className="h-11 rounded-xl pr-11 text-sm"
            id="password"
            name="password"
            onChange={(event) => {
              setPassword(event.target.value);
              setSelectedDemoEmail(null);
            }}
            placeholder="Nhập mật khẩu"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-bv-text-muted transition hover:bg-bv-muted hover:text-bv-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <Button
        className="h-11 w-full gap-2 rounded-xl text-sm font-black shadow-sm transition hover:shadow-md"
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </div>
  );
}
