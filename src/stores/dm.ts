import { useEffect } from "react";
import { create } from "zustand";
import { fetchDirectMessages } from "@/lib/content.functions";
import { useIdentity } from "@/stores/identity";

const LS_KEY = "dm_last_read_v1";

type DM = {
  id: string;
  sender_username: string;
  recipient_hash: string | null;
  created_at: string;
};

function loadRead(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveRead(m: Record<string, string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function computeUnread(received: DM[], lastRead: Record<string, string>) {
  const by: Record<string, number> = {};
  for (const m of received) {
    const seen = lastRead[m.sender_username];
    if (!seen || seen < m.created_at) {
      by[m.sender_username] = (by[m.sender_username] ?? 0) + 1;
    }
  }
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  return { by, total };
}

interface DmState {
  unreadCount: number;
  unreadBy: Record<string, number>;
  received: DM[];
  lastRead: Record<string, string>;
  refresh: (hashedId: string) => Promise<void>;
  markRead: (other: string) => void;
}

export const useDmStore = create<DmState>((set, get) => ({
  unreadCount: 0,
  unreadBy: {},
  received: [],
  lastRead: loadRead(),
  refresh: async (hashedId) => {
    try {
      const r = await fetchDirectMessages({ data: { hashedId } });
      const received = ((r.messages ?? []) as DM[]).filter((m) => m.recipient_hash === hashedId);
      const { by, total } = computeUnread(received, get().lastRead);
      set({ received, unreadBy: by, unreadCount: total });
    } catch {
      /* transient */
    }
  },
  markRead: (other) => {
    const lastRead = { ...get().lastRead, [other]: new Date().toISOString() };
    saveRead(lastRead);
    const { by, total } = computeUnread(get().received, lastRead);
    set({ lastRead, unreadBy: by, unreadCount: total });
  },
}));

// Singleton poll shared across every component that needs the badge.
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

/** Returns the live unread DM count and runs exactly one shared 15s poll. */
export function useDmUnread(): number {
  const unreadCount = useDmStore((s) => s.unreadCount);
  const refresh = useDmStore((s) => s.refresh);
  const { hashedId, init } = useIdentity();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!hashedId) return;
    refresh(hashedId);
    subscribers += 1;
    if (!timer) {
      timer = setInterval(() => {
        const id = useIdentity.getState().hashedId;
        if (id) useDmStore.getState().refresh(id);
      }, 15000);
    }
    return () => {
      subscribers -= 1;
      if (subscribers <= 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [hashedId, refresh]);

  return unreadCount;
}
