import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { publishDue } from "@/lib/publisher";
import { fail } from "../../_lib";
import { cronAllowed, forbidden } from "../_auth";

export async function POST(request: Request) {
  try {
    const e = await env();
    if (!cronAllowed(request, e)) return forbidden();
    return NextResponse.json({ published: await publishDue(e) });
  } catch (error) {
    return fail(error);
  }
}
