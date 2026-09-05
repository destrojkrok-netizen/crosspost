import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { storeMedia } from "@/lib/media";
import { bad, fail } from "../_lib";

const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return bad("No file");
  if (file.size > MAX_BYTES) return bad("File over 100 MB", 413);
  try {
    return NextResponse.json(await storeMedia(await env(), file));
  } catch (error) {
    return fail(error);
  }
}
