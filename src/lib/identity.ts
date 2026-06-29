// Anonymous identity helpers. No real identity is ever collected or stored.

const ADJECTIVES = [
  "ghostly", "sneaky", "spooky", "haunted", "phantom", "shadow",
  "chibi", "kawaii", "rogue", "feral", "cosmic", "glitchy",
  "moody", "drowsy", "grumpy", "derpy", "mythic", "cursed",
  "neon", "midnight", "frosty", "fluffy", "wicked", "silent",
];
const NOUNS = [
  // animals
  "panda", "axolotl", "raccoon", "otter", "narwhal", "octopus",
  "fox", "wolf", "tiger", "penguin", "sloth", "capybara",
  // spooky
  "ghost", "phantom", "wraith", "specter", "goblin", "gremlin",
  "reaper", "vampire", "skeleton", "banshee", "demon", "yokai",
  // anime / character vibes
  "senpai", "ninja", "samurai", "ronin", "otaku", "sensei",
  "waifu", "shogun", "kitsune", "onibi", "tanuki", "shinobi",
];

export const UID_KEY = "campusxpose_uid";
export const USERNAME_KEY = "campusxpose_username";

export function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}_${noun}_${num}`;
}

/** Generates `count` distinct random username candidates. */
export function generateUsernameCandidates(count: number): string[] {
  const out = new Set<string>();
  let guard = 0;
  while (out.size < count && guard < count * 20) {
    out.add(generateUsername());
    guard++;
  }
  return Array.from(out);
}

export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface Identity {
  hashedId: string;
  username: string;
}

/** Reads (or creates) the anonymous identity from localStorage. Browser only. */
export async function loadOrCreateIdentity(): Promise<Identity> {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(UID_KEY, uid);
  }
  let username = localStorage.getItem(USERNAME_KEY);
  if (!username) {
    username = generateUsername();
    localStorage.setItem(USERNAME_KEY, username);
  }
  const hashedId = await sha256(uid);
  return { hashedId, username };
}

/** Wipes the current identity and creates a brand new one. */
export async function forgetMe(): Promise<Identity> {
  localStorage.removeItem(UID_KEY);
  localStorage.removeItem(USERNAME_KEY);
  return loadOrCreateIdentity();
}

/** Wipes the current identity and creates a new one with a chosen username. */
export async function forgetMeWithUsername(username: string): Promise<Identity> {
  const uid = crypto.randomUUID();
  localStorage.setItem(UID_KEY, uid);
  localStorage.setItem(USERNAME_KEY, username);
  const hashedId = await sha256(uid);
  return { hashedId, username };
}
