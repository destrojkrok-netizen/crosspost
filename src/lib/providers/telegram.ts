import { json } from "../http";
import type { Provider } from "./types";

const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

/** A bot posting into a channel or group it administers. No OAuth: bot token + chat id. */
export const telegram: Provider = {
  id: "telegram",
  label: "Telegram",
  limit: 4096,
  auth: "token",
  requiredEnv: [],
  fields: [
    { name: "botToken", label: "Bot token (from @BotFather)", placeholder: "123456:ABC…", secret: true },
    { name: "chatId", label: "Channel @username or chat id", placeholder: "@levelup_channel or -1001234567890" },
  ],
  supportsMedia: ["image", "video"],

  async fromFields(_ctx, f) {
    if (!f.botToken || !f.chatId) throw new Error("Bot token and chat id are required");
    const chat = await json<{ result: { id: number; title?: string; username?: string } }>(
      `${api(f.botToken, "getChat")}?chat_id=${encodeURIComponent(f.chatId)}`,
    );
    return { botToken: f.botToken, chatId: String(chat.result.id), username: chat.result.username ?? chat.result.title ?? f.chatId };
  },

  async whoami(_ctx, cred) {
    const chat = await json<{ result: { id: number; title?: string; username?: string } }>(
      `${api(cred.botToken!, "getChat")}?chat_id=${encodeURIComponent(cred.chatId!)}`,
    );
    return { id: String(chat.result.id), username: chat.result.title ?? chat.result.username };
  },

  async publish(_ctx, cred, { parts, media }) {
    const text = parts.join("\n\n");
    const m = media[0];
    const method = !m ? "sendMessage" : m.type?.startsWith("video") ? "sendVideo" : "sendPhoto";
    const body: Record<string, unknown> = { chat_id: cred.chatId };
    if (!m) body.text = text;
    else {
      body[m.type?.startsWith("video") ? "video" : "photo"] = m.path;
      body.caption = text.slice(0, 1024);
    }
    const r = await json<{ result: { message_id: number; chat: { username?: string } } }>(api(cred.botToken!, method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const id = String(r.result.message_id);
    const user = r.result.chat.username ?? cred.username;
    return { releaseId: id, releaseUrl: user && !user.startsWith("-") ? `https://t.me/${user.replace(/^@/, "")}/${id}` : undefined };
  },

  async channelStats(_ctx, cred) {
    const r = await json<{ result: number }>(`${api(cred.botToken!, "getChatMemberCount")}?chat_id=${encodeURIComponent(cred.chatId!)}`);
    return { followers: r.result };
  },
};
