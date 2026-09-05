// The deployed Worker: OpenNext's Next.js handler plus the cron entry point. A cron tick
// calls the app's own /api/cron/* routes, so publishing and metrics share the route code
// and the request-scoped bindings.
import type { ExecutionContext, ExportedHandler, ScheduledController } from "@cloudflare/workers-types";
import handler from "./.open-next/worker.js";

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

export default {
  fetch: handler.fetch,
  async scheduled(controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    const path = controller.cron === "* * * * *" ? "/api/cron/publish" : "/api/cron/metrics";
    const request = new Request(`${env.APP_URL}${path}`, {
      method: "POST",
      headers: { "x-cron-secret": env.CRON_SECRET ?? "" },
    });
    // @ts-expect-error OpenNext types its handler with the global Request/Response shapes.
    ctx.waitUntil(handler.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<CloudflareEnv>;
