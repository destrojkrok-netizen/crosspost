import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { connectable } from "@/lib/providers";
import { fail } from "../_lib";

export async function GET() {
  try {
    const e = await env();
    return NextResponse.json({ configured: true, demo: false, appUrl: e.APP_URL, connectable: connectable(e) });
  } catch (error) {
    return fail(error);
  }
}
