import { NextResponse } from "next/server";
import { channelSettings } from "@/lib/postiz";
import { fail } from "../../_lib";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await channelSettings((await params).id));
  } catch (error) {
    return fail(error);
  }
}
