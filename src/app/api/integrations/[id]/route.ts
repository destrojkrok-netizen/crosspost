import { NextResponse } from "next/server";
import { removeChannel } from "@/lib/postiz";
import { fail } from "../../_lib";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await removeChannel((await params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
