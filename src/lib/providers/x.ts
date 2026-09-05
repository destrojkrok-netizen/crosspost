import { sha256base64url } from "../crypto";
import { form, json } from "../http";
import type { Provider } from "./types";

const API = "https://api.x.com/2";

const basic = (env: CloudflareEnv) => "Basic " + btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`);

/** X's OAuth 2.0 PKCE needs the code challenge in the URL; the verifier is held in
 * oauth_states until the callback. `authUrl` is sync in the interface, so the challenge is
 * derived from the verifier with a synchronous fallback: the router passes a
 * pre-hashed challenge via `state` lookups — see connect route. */
export const x: Provider = {
  id: "x",
  label: "X (Twitter)",
  limit: 280,
  auth: "oauth",
  requiredEnv: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
  supportsMedia: ["image"],
  supportsThread: true,

  authUrl(ctx, state, challenge) {
    return `https://x.com/i/oauth2/authorize?${form({
      response_type: "code",
      client_id: ctx.env.X_CLIENT_ID,
      redirect_uri: ctx.redirectUri,
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    })}`;
  },

  async exchange(ctx, code, verifier) {
    const r = await json<{ access_token: string; refresh_token: string; expires_in: number }>(`${API}/oauth2/token`, {
      method: "POST",
      headers: { Authorization: basic(ctx.env), "Content-Type": "application/x-www-form-urlencoded" },
      body: form({
        grant_type: "authorization_code",
        code,
        redirect_uri: ctx.redirectUri,
        code_verifier: verifier,
        client_id: ctx.env.X_CLIENT_ID,
      }),
    });
    return { accessToken: r.access_token, refreshToken: r.refresh_token, expiresAt: Date.now() + r.expires_in * 1000 };
  },

  async refresh(ctx, cred) {
    const r = await json<{ access_token: string; refresh_token?: string; expires_in: number }>(`${API}/oauth2/token`, {
      method: "POST",
      headers: { Authorization: basic(ctx.env), "Content-Type": "application/x-www-form-urlencoded" },
      body: form({ grant_type: "refresh_token", refresh_token: cred.refreshToken, client_id: ctx.env.X_CLIENT_ID }),
    });
    return { ...cred, accessToken: r.access_token, refreshToken: r.refresh_token ?? cred.refreshToken, expiresAt: Date.now() + r.expires_in * 1000 };
  },

  async whoami(_ctx, cred) {
    const r = await json<{ data: { id: string; username: string; profile_image_url?: string } }>(
      `${API}/users/me?user.fields=profile_image_url`,
      { headers: { Authorization: `Bearer ${cred.accessToken}` } },
    );
    return { id: r.data.id, username: r.data.username, picture: r.data.profile_image_url };
  },

  async publish(_ctx, cred, { parts, media }) {
    const auth = { Authorization: `Bearer ${cred.accessToken}` };
    // v2 media upload (images): fetch the file, send it as multipart.
    const mediaIds: string[] = [];
    for (const m of media.filter((m) => !m.type?.startsWith("video")).slice(0, 4)) {
      const file = await fetch(m.path);
      if (!file.ok) throw new Error(`X: could not fetch media ${m.path}`);
      const blob = await file.blob();
      const fd = new FormData();
      fd.append("media", blob, "image");
      fd.append("media_category", "tweet_image");
      const up = await json<{ data?: { id: string }; id?: string; media_id_string?: string }>(`${API}/media/upload`, {
        method: "POST",
        headers: auth,
        body: fd,
      });
      const id = up.data?.id ?? up.id ?? up.media_id_string;
      if (id) mediaIds.push(String(id));
    }
    const ids: string[] = [];
    let replyTo: string | undefined;
    for (let i = 0; i < parts.length; i++) {
      const body = {
        text: parts[i],
        ...(replyTo ? { reply: { in_reply_to_tweet_id: replyTo } } : {}),
        ...(i === 0 && mediaIds.length ? { media: { media_ids: mediaIds } } : {}),
      };
      const r = await json<{ data: { id: string } }>(`${API}/tweets`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      ids.push(r.data.id);
      replyTo = r.data.id;
    }
    return { releaseId: ids[0], releaseUrl: cred.username ? `https://x.com/${cred.username}/status/${ids[0]}` : undefined };
  },

  async channelStats(_ctx, cred) {
    const r = await json<{ data: { public_metrics: { followers_count: number; tweet_count: number } } }>(
      `${API}/users/me?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${cred.accessToken}` } },
    );
    return { followers: r.data.public_metrics.followers_count, posts: r.data.public_metrics.tweet_count };
  },

  async postStats(_ctx, cred, releaseId) {
    const r = await json<{ data: { public_metrics: Record<string, number> } }>(
      `${API}/tweets/${releaseId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${cred.accessToken}` } },
    );
    const m = r.data.public_metrics;
    return { views: m.impression_count ?? 0, likes: m.like_count ?? 0, replies: m.reply_count ?? 0, reposts: (m.retweet_count ?? 0) + (m.quote_count ?? 0) };
  },
};

export const pkceChallenge = sha256base64url;
