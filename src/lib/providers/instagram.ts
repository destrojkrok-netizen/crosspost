import { form, json, until } from "../http";
import type { Provider } from "./types";

const API = "https://graph.instagram.com/v21.0";

export const instagram: Provider = {
  id: "instagram",
  label: "Instagram",
  limit: 2200,
  auth: "oauth",
  requiredEnv: ["IG_APP_ID", "IG_APP_SECRET"],
  supportsMedia: ["image", "video"],
  requiresMedia: "any",

  authUrl(ctx, state) {
    return `https://www.instagram.com/oauth/authorize?${form({
      client_id: ctx.env.IG_APP_ID,
      redirect_uri: ctx.redirectUri,
      scope: "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights",
      response_type: "code",
      state,
    })}`;
  },

  async exchange(ctx, code) {
    const short = await json<{ access_token: string; user_id: number }>("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: form({
        client_id: ctx.env.IG_APP_ID,
        client_secret: ctx.env.IG_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: ctx.redirectUri,
        code,
      }),
    });
    const long = await json<{ access_token: string; expires_in: number }>(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${ctx.env.IG_APP_SECRET}&access_token=${short.access_token}`,
    );
    return { accessToken: long.access_token, expiresAt: Date.now() + long.expires_in * 1000, userId: String(short.user_id) };
  },

  async refresh(_ctx, cred) {
    const r = await json<{ access_token: string; expires_in: number }>(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${cred.accessToken}`,
    );
    return { ...cred, accessToken: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 };
  },

  async whoami(_ctx, cred) {
    const r = await json<{ id: string; username: string; profile_picture_url?: string }>(
      `${API}/me?fields=id,username,profile_picture_url&access_token=${cred.accessToken}`,
    );
    return { id: r.id, username: r.username, picture: r.profile_picture_url };
  },

  async publish(_ctx, cred, { parts, media }) {
    const m = media[0];
    if (!m) throw new Error("Instagram needs an image or a video");
    const token = cred.accessToken!;
    const caption = parts.join("\n\n");
    const isVideo = m.type?.startsWith("video");
    const body = isVideo ? { media_type: "REELS", video_url: m.path, caption, share_to_feed: "true" } : { image_url: m.path, caption };
    const c = await json<{ id: string }>(`${API}/${cred.userId}/media`, { method: "POST", body: form({ ...body, access_token: token }) });
    if (isVideo) {
      await until(
        async () => {
          const s = await json<{ status_code: string }>(`${API}/${c.id}?fields=status_code&access_token=${token}`);
          if (s.status_code === "ERROR") throw new Error("Instagram container ERROR");
          return s.status_code === "FINISHED";
        },
        40,
        5000,
        "Instagram video container",
      );
    }
    const p = await json<{ id: string }>(`${API}/${cred.userId}/media_publish`, {
      method: "POST",
      body: form({ creation_id: c.id, access_token: token }),
    });
    const link = await json<{ permalink?: string }>(`${API}/${p.id}?fields=permalink&access_token=${token}`).catch(() => ({}) as { permalink?: string });
    return { releaseId: p.id, releaseUrl: link.permalink };
  },

  async channelStats(_ctx, cred) {
    const r = await json<{ followers_count?: number; media_count?: number }>(
      `${API}/me?fields=followers_count,media_count&access_token=${cred.accessToken}`,
    );
    return { followers: r.followers_count ?? 0, posts: r.media_count ?? 0 };
  },

  async postStats(_ctx, cred, releaseId) {
    const r = await json<{ data: { name: string; values: { value: number }[] }[] }>(
      `${API}/${releaseId}/insights?metric=views,likes,comments,shares,saved&access_token=${cred.accessToken}`,
    );
    const out: Record<string, number> = {};
    for (const m of r.data) out[m.name === "comments" ? "replies" : m.name] = m.values?.[0]?.value ?? 0;
    return out;
  },
};
