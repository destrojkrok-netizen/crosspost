import { NextResponse } from "next/server";
import { AppError } from "@/lib/env";
import { HttpError } from "@/lib/http";

export function fail(error: unknown) {
  const status = error instanceof AppError ? error.status : error instanceof HttpError ? 502 : 500;
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  return NextResponse.json({ error: message }, { status });
}

export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
