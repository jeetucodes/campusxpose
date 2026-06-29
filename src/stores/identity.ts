import { create } from "zustand";
import { forgetMe, forgetMeWithUsername, loadOrCreateIdentity } from "@/lib/identity";
import { purgeMyActivity } from "@/lib/content.functions";

interface IdentityState {
  hashedId: string | null;
  username: string | null;
  isReady: boolean;
  init: () => Promise<void>;
  reset: () => Promise<void>;
  resetWith: (username: string) => Promise<void>;
}

/** Best-effort server wipe of the current identity's activity. */
async function purge(hashedId: string | null) {
  if (!hashedId) return;
  try {
    await purgeMyActivity({ data: { hashedId } });
  } catch {
    // Non-fatal: local identity is still rotated even if the wipe fails.
  }
}

export const useIdentity = create<IdentityState>((set, get) => ({
  hashedId: null,
  username: null,
  isReady: false,
  init: async () => {
    if (get().isReady || typeof window === "undefined") return;
    const { hashedId, username } = await loadOrCreateIdentity();
    set({ hashedId, username, isReady: true });
  },
  reset: async () => {
    await purge(get().hashedId);
    const { hashedId, username } = await forgetMe();
    set({ hashedId, username, isReady: true });
  },
  resetWith: async (chosen: string) => {
    await purge(get().hashedId);
    const { hashedId, username } = await forgetMeWithUsername(chosen);
    set({ hashedId, username, isReady: true });
  },
}));
