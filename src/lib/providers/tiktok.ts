import { form, json } from "../http";
import type { Provider } from "./types";

const API = "https://open.tiktokapis.com/v2";

export const tiktok: Provider = {
  id: "tiktok",
  label: "TikTok",
  limit: 2200,
  auth: "oauth",
  requiredEnv: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  supportsMedia: ["video"],
  requiresMedia: "video",

  authUrl(ctx, state) {
    return `https://www.tiktok.com/v2/auth/authorize/?${form({
      client_key: ctx.env.TIKTOK_CLIENT_KEY,
      scope: "user.info.basic,user.info.stats,video.publish,video.list",
      response_type: "code",
      redirect_uri: ctx.redirectUri,
      state,
    })}`;
  },

  async exchange(ctx, code) {
    const r = await json<{ access_token: string; refresh_token: string; expires_in: number; open_id: string }>(`${API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({
        client_key: ctx.env.TIKTOK_CLIENT_KEY,
        client_secret: ctx.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: ctx.redirectUri,
      }),
    });
    return { accessToken: r.access_token, refreshToken: r.refresh_token, expiresAt: Date.now() + r.expires_in * 1000, userId: r.open_id };
  },

  async refresh(ctx, cred) {
    const r = await json<{ access_token: string; refresh_token: string; expires_in: number }>(`${API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({
        client_key: ctx.env.TIKTOK_CLIENT_KEY,
        client_secret: ctx.env.TIKTOK_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: cred.refreshToken,
      }),
    });
    return { ...cred, accessToken: r.access_token, refreshToken: r.refresh_token, expiresAt: Date.now() + r.expires_in * 1000 };
  },

  async whoami(_ctx, cred) {
    const r = await json<{ data: { user: { open_id: string; display_name: string; avatar_url?: string } } }>(
      `${API}/user/info/?fields=open_id,display_name,avatar_url`,
      { headers: { Authorization: `Bearer ${cred.accessToken}` } },
    );
    return { id: r.data.user.open_id, username: r.data.user.display_name, picture: r.data.user.avatar_url };
  },

  // Media must be a public URL (R2): Workers cannot stream a local file. Unaudited TikTok
  // apps may only post SELF_ONLY; switch to PUBLIC_TO_EVERYONE after app review.
  async publish(_ctx, cred, { parts, media }) {
    const m = media.find((m) => m.type?.startsWith("video"));
    if (!m) throw new Error("TikTok needs a video");
    const body = {
      post_info: {
        title: parts.join("\n\n").slice(0, 2200),
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: { source: "PULL_FROM_URL", video_url: m.path },
    };
    const init = await json<{ data: { publish_id: string } }>(`${API}/post/publish/video/init/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
    });
    return { releaseId: init.data.publish_id };
  },

  async channelStats(_ctx, cred) {
    const r = await json<{ data: { user: { follower_count?: number; likes_count?: number; video_count?: number } } }>(
      `${API}/user/info/?fields=follower_count,likes_count,video_count`,
      { headers: { Authorization: `Bearer ${cred.accessToken}` } },
    );
    const u = r.data.user;
    return { followers: u.follower_count ?? 0, likes: u.likes_count ?? 0, posts: u.video_count ?? 0 };
  },
};
