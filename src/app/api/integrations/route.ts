import { NextResponse } from "next/server";
import { addChannel, listChannels } from "@/lib/postiz";
import { PROVIDERS } from "@/lib/providers";
import type { NewChannel } from "@/lib/types";
import { fail } from "../_lib";

export async function GET() {
  try {
    return NextResponse.json(await listChannels());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  let body: NewChannel;
  try {
    body = (await request.json()) as NewChannel;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name || name.length > 80) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!PROVIDERS.some((p) => p.id === body.identifier))
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  const picture = body.picture?.trim();
  if (picture && !/^https:\/\//.test(picture))
    return NextResponse.json({ error: "Avatar must be an https URL" }, { status: 400 });
  try {
    return NextResponse.json(await addChannel({ name, identifier: body.identifier, picture }));
  } catch (error) {
    return fail(error);
  }
}
