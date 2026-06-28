// Deterministic anonymous avatar: each username maps to a stable emoji + color.
// Same username always renders the same symbol, so DMs feel personal while
// staying fully anonymous.

const SYMBOLS = [
  "🦊", "🐺", "🦅", "🐯", "🦉", "🐉", "🦁", "🐼", "🦝", "🐗",
  "🦈", "🐙", "🦄", "🐝", "🦋", "🐢", "🦎", "🐬", "🦇", "🐍",
  "🌵", "🍄", "⚡", "🔥", "🌙", "⭐", "🪐", "💀", "👾", "🎭",
  "🛸", "🗿", "🎲", "🧿", "🪲", "🦂", "🐊", "🦖", "🦕", "🐲",
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
  symbol: string;
  color: string;
}

export function userAvatar(username: string | null | undefined): UserAvatar {
  const key = (username ?? "anonymous").toLowerCase();
  const h = hashString(key);
  return {
    symbol: SYMBOLS[h % SYMBOLS.length],
    color: COLORS[(Math.floor(h / SYMBOLS.length)) % COLORS.length],
  };
}
