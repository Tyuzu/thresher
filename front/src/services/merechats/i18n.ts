/* ───────────────────────────────────────── */
/* Dictionary Definition                   */
/* ───────────────────────────────────────── */

const dict = {
  /* -------------------------
     Auth / state
  --------------------------*/
  "chat.login_prompt": "🔒 Please log in to use chat.",
  "chat.online": "Online",
  "chat.offline": "Offline",

  /* -------------------------
     Chat list / navigation
  --------------------------*/
  "chat.new_chat": "➕ New Chat",
  "chat.start": "Start",
  "chat.no_chats": "No chats found",
  "chat.load_error": "Failed to load chats",
  "chat.search": "Search…",

  /* -------------------------
     Chat view / messages
  --------------------------*/
  "chat.type_message": "Type a message…",
  "chat.send": "Send",
  "chat.typing": "typing…",
  "chat.message_failed": "Message failed to send",
  "chat.message_deleted": "Message deleted",
  "chat.message_edited": "Edited",

  /* -------------------------
     Participants
  --------------------------*/
  "chat.placeholder_ids": "Comma-separated user IDs",
  "chat.with": "Chat with",
  "chat.you": "You",
  "chat.unknown": "Unknown user",

  /* -------------------------
     Uploads / media
  --------------------------*/
  "chat.upload": "📎",
  "chat.uploading": "Uploading…",
  "chat.upload_failed": "Upload failed",
  "chat.unsupported_file": "Unsupported file type",

  /* -------------------------
     Presence / system
  --------------------------*/
  "chat.system": "System",
  "chat.joined": "joined the chat",
  "chat.left": "left the chat",

  /* -------------------------
     Accessibility
  --------------------------*/
  "chat.back": "Back",
  "chat.loading": "Loading…"
} as const;

/* ───────────────────────────────────────── */
/* Types                                    */
/* ───────────────────────────────────────── */

/** Union type of all valid translation keys */
export type TranslationKey = keyof typeof dict;

/** Parameters object for string interpolation e.g., { name: "Alice" } */
export type TranslationParams = Record<string, string | number>;

/* ───────────────────────────────────────── */
/* Translation Function                      */
/* ───────────────────────────────────────── */

/**
 * Translates a key using the dictionary.
 * Supports string interpolation for placeholders like `{param}`.
 * 
 * @param key - The key from the translation dictionary
 * @param params - Optional parameters to interpolate into the string
 * @returns The translated string or the key itself if not found
 */
export function t(key: TranslationKey | string, params?: TranslationParams): string {
  let message: string = (dict as Record<string, string>)[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      message = message.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
    });
  }

  return message;
}

export default t;