import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { notifyIncomingCall } from "@/lib/push.functions";

export interface IncomingCallData {
  roomID: string;
  callerUsername: string;
}

export interface ActiveCallData {
  roomID: string;
  isCaller: boolean;
  remoteUsername: string;
}

interface CallState {
  incomingCall: IncomingCallData | null;
  activeCall: ActiveCallData | null;
  isMinimized: boolean;

  setIncomingCall: (call: IncomingCallData | null) => void;
  setActiveCall: (call: ActiveCallData | null) => void;
  setIsMinimized: (minimized: boolean) => void;

  startCall: (targetUsername: string, myUsername: string) => Promise<void>;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  incomingCall: null,
  activeCall: null,
  isMinimized: false,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  setIsMinimized: (minimized) => set({ isMinimized: minimized }),

  startCall: async (targetUsername: string, myUsername: string) => {
    const roomID = `room_${crypto.randomUUID()}`;

    // First set local state
    set({
      activeCall: {
        roomID,
        isCaller: true,
        remoteUsername: targetUsername,
      },
      isMinimized: false,
    });

    // Then broadcast to target
    const callCh = supabase.channel(`calls-${targetUsername}`);
    callCh.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await callCh.send({
          type: "broadcast",
          event: "incoming_call",
          payload: { roomID, caller: myUsername },
        });
        supabase.removeChannel(callCh);

        // Notify them via Push Notification
        notifyIncomingCall({ data: { targetUsername, callerUsername: myUsername } }).catch(() => { });
      }
    });
  },

  acceptCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      set({
        activeCall: {
          roomID: incomingCall.roomID,
          isCaller: false,
          remoteUsername: incomingCall.callerUsername,
        },
        incomingCall: null,
        isMinimized: false,
      });
    }
  },

  rejectCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      const callCh = supabase.channel(`calls-${incomingCall.callerUsername}`);
      callCh.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await callCh.send({
            type: "broadcast",
            event: "call_rejected",
            payload: { roomID: incomingCall.roomID, reason: "declined" },
          });
          supabase.removeChannel(callCh);
        }
      });
      set({ incomingCall: null });
    }
  },

  endCall: () => {
    set({ activeCall: null, isMinimized: false });
  },
}));
