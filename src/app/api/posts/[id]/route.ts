import { NextResponse } from "next/server";
import { deletePost } from "@/lib/postiz";
import { fail } from "../../_lib";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(await deletePost((await params).id));
  } catch (error) {
    return fail(error);
  }
}
