"use client";

import { Eye, EyeOff, Loader2, LockKeyhole, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEMO_ACCOUNT_PASSWORD,
  DEMO_LOGIN_ACCOUNTS,
} from "@/lib/demo-accounts";

interface CredentialsLoginFieldsProps {
  showDemoAccounts: boolean;
}

export function CredentialsLoginFields({
  showDemoAccounts,
}: CredentialsLoginFieldsProps) {
  const { pending } = useFormStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function selectDemoAccount(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_ACCOUNT_PASSWORD);
  }

  return (
    <>
      {showDemoAccounts ? (
        <fieldset className="rounded-2xl border border-[#176B62]/15 bg-[#EDF8F5] p-4">
          <legend className="px-1 text-sm font-black text-[#176B62]">
            Đăng nhập demo nhanh
          </legend>
          <p className="mb-3 text-xs leading-5 text-[#66706B]">
            Chỉ hiển thị trong môi trường phát triển. Chọn vai trò để điền thông tin.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_LOGIN_ACCOUNTS.map((account) => (
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#176B62]/15 bg-white px-3 py-2 text-xs font-black text-[#176B62] transition hover:border-[#176B62]/35 hover:bg-[#E6F3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
                key={account.email}
                onClick={() => selectDemoAccount(account.email)}
                type="button"
              >
                <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
                {account.role}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-bold text-[#17202A]" htmlFor="email">
          Email
        </label>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          className="h-12"
          id="email"
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="reader.bookverse.demo@gmail.com"
          required
          spellCheck={false}
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-bold text-[#17202A]" htmlFor="password">
            Mật khẩu
          </label>
          <Link
            className="inline-flex min-h-11 items-center text-xs font-black text-[#0F766E] hover:underline"
            href="/forgot-password"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div className="relative">
          <Input
            autoComplete="current-password"
            className="h-12 pr-12"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#66706B] transition hover:bg-[#EAF2EF] hover:text-[#176B62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <Button className="h-12 w-full gap-2" disabled={pending} type="submit">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </>
  );
}
