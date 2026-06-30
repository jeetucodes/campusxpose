// Deterministic anonymous avatar: each username maps to a stable, colorful
// cartoon/anime-style avatar image (via DiceBear) plus a fallback emoji + color.
// Same username always renders the same avatar, so DMs feel personal while
// staying fully anonymous.

// A mix of cartoon / anime / playful illustrated styles. Each username is
// pinned to one style + seed, so the picture is stable and unique-feeling.
export const STYLES = [
  "adventurer",
  "avataaars",
  "big-smile",
  "lorelei",
  "micah",
  "open-peeps",
  "fun-emoji",
  "notionists",
  "personas",
  "miniavs",
  "bottts-neutral",
  "thumbs",
] as const;

export type AvatarStyle = (typeof STYLES)[number];

/** Build a DiceBear avatar URL for a specific style + seed. */
export function buildAvatarUrl(style: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&radius=20&backgroundType=gradientLinear`;
}

const SYMBOLS = [
  "🦊", "🐺", "🦅", "🐯", "🦉", "🐉", "🦁", "🐼", "🦝", "🐗",
  "🦈", "🐙", "🦄", "🐝", "🦋", "🐢", "🦎", "🐬", "🦇", "🐍",
  "🌵", "🍄", "⚡", "🔥", "🌙", "⭐", "🪐", "💀", "👾", "🎭",
  "🛸", "🗿", "🎲", "🧿", "🪲", "🦂", "🐊", "🦖", "🦕", "🐲",
];

/** Distinct, official-looking avatar options reserved for the admin account.
 * These use bold "bottts" robot styles so the admin clearly stands apart from
 * regular users' cartoon/anime avatars. */
export const ADMIN_AVATARS: string[] = [
  "https://api.dicebear.com/9.x/bottts/svg?seed=command&radius=20&backgroundColor=1e293b",
  "https://api.dicebear.com/9.x/bottts/svg?seed=sentinel&radius=20&backgroundColor=0f172a",
  "https://api.dicebear.com/9.x/bottts/svg?seed=warden&radius=20&backgroundColor=312e81",
  "https://api.dicebear.com/9.x/bottts/svg?seed=guardian&radius=20&backgroundColor=7c2d12",
  "https://api.dicebear.com/9.x/bottts/svg?seed=overseer&radius=20&backgroundColor=14532d",
  "https://api.dicebear.com/9.x/bottts/svg?seed=oracle&radius=20&backgroundColor=581c87",
];


const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e",
];

function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

export interface UserAvatar {
  /** Fallback emoji shown while the image loads or if it fails. */
  symbol: string;
  /** Accent color tied to the username. */
  color: string;
  /** Stable cartoon/anime avatar image URL. */
  url: string;
}

export function userAvatar(username: string | null | undefined): UserAvatar {
  const key = (username ?? "anonymous").toLowerCase();
  const h = hashString(key);
  const style = STYLES[h % STYLES.length];
  const seed = encodeURIComponent(key);
  return {
    symbol: SYMBOLS[h % SYMBOLS.length],
    color: COLORS[Math.floor(h / SYMBOLS.length) % COLORS.length],
    url: `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&radius=20&backgroundType=gradientLinear`,
  };
}

/** A fresh, random cartoon/anime avatar URL — used by admins to re-roll a
 * user's avatar. Each call returns a different style + seed. */
export function randomAvatarUrl(): string {
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];
  const seed = Math.random().toString(36).slice(2, 10);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&radius=20&backgroundType=gradientLinear`;
}
