import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The Worker's bindings and vars for this request (wrangler serves them to `next dev` too). */
export async function env(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export class AppError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}
