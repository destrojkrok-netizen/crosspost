import { NextResponse } from "next/server";
import { PostizError } from "@/lib/postiz";

export function fail(error: unknown) {
  const status = error instanceof PostizError ? error.status : 500;
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status });
}
