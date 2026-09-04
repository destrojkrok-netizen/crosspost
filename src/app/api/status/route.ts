import { NextResponse } from "next/server";
import { status } from "@/lib/postiz";

export function GET() {
  return NextResponse.json(status());
}
