import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { collectMetrics } from "@/lib/metrics";
import { fail } from "../../_lib";
import { cronAllowed, forbidden } from "../_auth";

export async function POST(request: Request) {
  try {
    const e = await env();
    if (!cronAllowed(request, e)) return forbidden();
    return NextResponse.json({ collected: await collectMetrics(e) });
  } catch (error) {
    return fail(error);
  }
}
