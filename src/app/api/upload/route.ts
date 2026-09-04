import { NextResponse } from "next/server";
import { upload } from "@/lib/postiz";
import { fail } from "../_lib";

const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File over 100 MB" }, { status: 413 });
  try {
    return NextResponse.json(await upload(file));
  } catch (error) {
    return fail(error);
  }
}
