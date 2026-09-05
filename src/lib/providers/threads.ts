import { form, json, until } from "../http";
import type { Provider } from "./types";

const API = "https://graph.threads.net/v1.0";

export const threads: Provider = {
  id: "threads",
  label: "Threads",
  limit: 500,
  auth: "oauth",
  requiredEnv: ["THREADS_APP_ID", "THREADS_APP_SECRET"],
  supportsMedia: ["image", "video"],
  supportsThread: true,

  authUrl(ctx, state) {
    return `https://threads.net/oauth/authorize?${form({
      client_id: ctx.env.THREADS_APP_ID,
      redirect_uri: ctx.redirectUri,
      scope: "threads_basic,threads_content_publish,threads_manage_insights",
      response_type: "code",
      state,
    })}`;
  },

  async exchange(ctx, code) {
    const short = await json<{ access_token: string; user_id: number }>(
      "https://graph.threads.net/oauth/access_token",
      {
        method: "POST",
        body: form({
          client_id: ctx.env.THREADS_APP_ID,
          client_secret: ctx.env.THREADS_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: ctx.redirectUri,
          code,
        }),
      },
    );
    const long = await json<{ access_token: string; expires_in: number }>(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${ctx.env.THREADS_APP_SECRET}&access_token=${short.access_token}`,
    );
    return { accessToken: long.access_token, expiresAt: Date.now() + long.expires_in * 1000, userId: String(short.user_id) };
  },

  async refresh(_ctx, cred) {
    const r = await json<{ access_token: string; expires_in: number }>(
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${cred.accessToken}`,
    );
    return { ...cred, accessToken: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 };
  },

  async whoami(_ctx, cred) {
    const r = await json<{ id: string; username: string; threads_profile_picture_url?: string }>(
      `${API}/me?fields=id,username,threads_profile_picture_url&access_token=${cred.accessToken}`,
    );
    return { id: r.id, username: r.username, picture: r.threads_profile_picture_url };
  },

  async publish(_ctx, cred, { parts, media }) {
    const token = cred.accessToken!;
    const ids: string[] = [];
    let replyTo: string | undefined;
    for (let i = 0; i < parts.length; i++) {
      const m = i === 0 ? media[0] : undefined;
      const isVideo = m?.type?.startsWith("video");
      const body: Record<string, string | undefined> = {
        media_type: m ? (isVideo ? "VIDEO" : "IMAGE") : "TEXT",
        text: parts[i],
        reply_to_id: replyTo,
        ...(m && isVideo ? { video_url: m.path } : {}),
        ...(m && !isVideo ? { image_url: m.path } : {}),
        access_token: token,
      };
      const c = await json<{ id: string }>(`${API}/${cred.userId}/threads`, { method: "POST", body: form(body) });
      if (m) {
        await until(
          async () => {
            const s = await json<{ status: string; error_message?: string }>(
              `${API}/${c.id}?fields=status,error_message&access_token=${token}`,
            );
            if (s.status === "ERROR") throw new Error(`Threads: ${s.error_message}`);
            return s.status === "FINISHED";
          },
          20,
          3000,
          "Threads media container",
        );
      }
      const p = await json<{ id: string }>(`${API}/${cred.userId}/threads_publish`, {
        method: "POST",
        body: form({ creation_id: c.id, access_token: token }),
      });
      ids.push(p.id);
      replyTo = p.id;
    }
    return { releaseId: ids[0], releaseUrl: cred.username ? `https://www.threads.net/@${cred.username}/post/${ids[0]}` : undefined };
  },

  async channelStats(_ctx, cred) {
    const r = await json<{ data: { name: string; total_value?: { value: number }; values?: { value: number }[] }[] }>(
      `${API}/me/threads_insights?metric=views,likes,replies,followers_count&access_token=${cred.accessToken}`,
    );
    const out: Record<string, number> = {};
    for (const m of r.data) out[m.name === "followers_count" ? "followers" : m.name] = m.total_value?.value ?? m.values?.at(-1)?.value ?? 0;
    return out;
  },

  async postStats(_ctx, cred, releaseId) {
    const r = await json<{ data: { name: string; values: { value: number }[] }[] }>(
      `${API}/${releaseId}/insights?metric=views,likes,replies,reposts&access_token=${cred.accessToken}`,
    );
    return Object.fromEntries(r.data.map((m) => [m.name, m.values?.[0]?.value ?? 0]));
  },
};
