import { NextResponse } from "next/server";

import { getCatalogData } from "@/actions/catalog.actions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await getCatalogData({
    query: url.searchParams.get("q")?.trim() || undefined,
    categoryId: url.searchParams.get("category")?.trim() || undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
  });

  return NextResponse.json(data);
}
