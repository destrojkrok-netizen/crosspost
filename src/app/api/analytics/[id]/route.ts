import { NextResponse } from "next/server";
import { channels } from "@/lib/db";
import { AppError, env, requireUser } from "@/lib/env";
import { refreshSubject, seriesFor } from "@/lib/metrics";
import { fail } from "../../_lib";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
  try {
    const e = await env();
    const user = await requireUser(request, e);
    const id = (await params).id;
    if (!(await channels.get(e.DB, id, user.uid))) throw new AppError("Unknown channel", 404);
    const subject = `channel:${id}`;
    let series = await seriesFor(e, subject, days);
    if (series.length === 0) {
      await refreshSubject(e, subject).catch((err) => console.warn(String(err)));
      series = await seriesFor(e, subject, days);
    }
    return NextResponse.json(series);
  } catch (error) {
    return fail(error);
  }
}
