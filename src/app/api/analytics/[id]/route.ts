import { NextResponse } from "next/server";
import { channelAnalytics } from "@/lib/postiz";
import { fail } from "../../_lib";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
  try {
    return NextResponse.json(await channelAnalytics((await params).id, days));
  } catch (error) {
    return fail(error);
  }
}
