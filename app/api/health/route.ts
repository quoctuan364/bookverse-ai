import { NextResponse } from "next/server";

/** Endpoint nhẹ để Render kiểm tra tiến trình web vẫn đang hoạt động. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "bookverse-web" });
}
