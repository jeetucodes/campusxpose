import { create } from "zustand";
import { forgetMe, forgetMeWithUsername, loadOrCreateIdentity } from "@/lib/identity";

interface IdentityState {
  hashedId: string | null;
  username: string | null;
  isReady: boolean;
  init: () => Promise<void>;
  reset: () => Promise<void>;
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
    const { hashedId, username } = await forgetMe();
    set({ hashedId, username, isReady: true });
  },
}));
