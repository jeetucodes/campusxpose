import { create } from "zustand";

const KEY = "campusxpose_admin";
const MAX_AGE = 24 * 60 * 60 * 1000;

interface Stored { token: string; at: number }

function read(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (Date.now() - s.at > MAX_AGE) { sessionStorage.removeItem(KEY); return null; }
    return s.token;
  } catch { return null; }
}

interface AdminState {
  token: string | null;
  setToken: (t: string) => void;
  logout: () => void;
}

export const useAdmin = create<AdminState>((set) => ({
  token: read(),
  setToken: (t) => {
    sessionStorage.setItem(KEY, JSON.stringify({ token: t, at: Date.now() } satisfies Stored));
    set({ token: t });
  },
  logout: () => {
    sessionStorage.removeItem(KEY);
    set({ token: null });
  },
}));
