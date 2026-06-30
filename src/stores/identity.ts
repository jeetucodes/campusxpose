import { create } from "zustand";
import { forgetMe, forgetMeWithUsername, loadOrCreateIdentity, USERNAME_KEY } from "@/lib/identity";
import { markForgotten, purgeMyActivity, registerIdentity, syncIdentity } from "@/lib/content.functions";

interface IdentityState {
  hashedId: string | null;
  username: string | null;
  verified: boolean;
  isReady: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
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

/** Pull any admin-assigned username / verified tick from the server. */
async function syncFromServer(
  hashedId: string | null,
  set: (partial: Partial<IdentityState>) => void,
) {
  if (!hashedId) return;
  try {
    const res = await syncIdentity({ data: { hashedId } });
    const patch: Partial<IdentityState> = { verified: !!res.verified };
    if (res.username) {
      patch.username = res.username;
      if (typeof window !== "undefined") localStorage.setItem(USERNAME_KEY, res.username);
    }
    set(patch);
  } catch {
    // Non-fatal: keep the locally known identity.
  }
}

export const useIdentity = create<IdentityState>((set, get) => ({
  hashedId: null,
  username: null,
  verified: false,
  isReady: false,
  init: async () => {
    if (get().isReady || typeof window === "undefined") return;
    const { hashedId, username } = await loadOrCreateIdentity();
    set({ hashedId, username, isReady: true });
    void syncFromServer(hashedId, set);
  },
  refresh: async () => {
    await syncFromServer(get().hashedId, set);
  },
  reset: async () => {
    await purge(get().hashedId);
    const { hashedId, username } = await forgetMe();
    set({ hashedId, username, verified: false, isReady: true });
  },
  resetWith: async (chosen: string) => {
    await purge(get().hashedId);
    const { hashedId, username } = await forgetMeWithUsername(chosen);
    set({ hashedId, username, verified: false, isReady: true });
  },
}));
