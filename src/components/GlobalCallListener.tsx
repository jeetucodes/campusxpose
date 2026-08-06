import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/stores/identity";
import { useCallStore } from "@/stores/call";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { AudioCallUI } from "@/components/AudioCallUI";
import { toast } from "sonner";
import { submitDirectMessage } from "@/lib/content.functions";

export function GlobalCallListener() {
  const { username, hashedId } = useIdentity();
  const { incomingCall, activeCall, setIncomingCall, endCall } = useCallStore();

  useEffect(() => {
    if (!username) return;

    const callCh = supabase
      .channel(`calls-${username}`)
      .on("broadcast", { event: "incoming_call" }, async (payload) => {
        const caller = payload.payload.caller;
        const currentActive = useCallStore.getState().activeCall;
        const currentIncoming = useCallStore.getState().incomingCall;

        // NOTE: For privacy, normally we'd check if `caller` is in accepted users list.
        // But for global scope, let's allow it to ring and they can decline,
        // or you can implement the blocked/accepted logic from messages.tsx.
        // To keep it simple, we ring if we aren't busy.

        if (!currentActive && !currentIncoming) {
          setIncomingCall({
            roomID: payload.payload.roomID,
            callerUsername: caller,
          });
        } else {
          // Send busy signal back to the caller
          const callerCh = supabase.channel(`calls-${caller}`);
          callerCh.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await callerCh.send({
                type: "broadcast",
                event: "call_rejected",
                payload: { roomID: payload.payload.roomID, reason: "busy" },
              });
              supabase.removeChannel(callerCh);
            }
          });
        }
      })
      .on("broadcast", { event: "call_rejected" }, (payload) => {
        const active = useCallStore.getState().activeCall;
        if (active?.roomID === payload.payload.roomID) {
          endCall();
          toast(payload.payload.reason === "busy" ? "User is busy on another call" : "Call was rejected");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callCh);
    };
  }, [username, setIncomingCall, endCall]);

  const handleLeaveRoom = async (log?: { missed: boolean; duration: number }) => {
    // If it's a caller, log it in DMs
    if (log && activeCall && activeCall.isCaller && hashedId && username) {
      const content = log.missed ? "CALL_LOG|MISSED" : `CALL_LOG|ANSWERED|${log.duration}`;
      try {
        await submitDirectMessage({
          data: {
            hashedId,
            username,
            recipientUsername: activeCall.remoteUsername,
            content,
          },
        });
      } catch (e) {
        console.error("Failed to log call", e);
      }
    }
    endCall();
  };

  return (
    <>
      {incomingCall && (
        <IncomingCallModal
          callerUsername={incomingCall.callerUsername}
        />
      )}
      {activeCall && (
        <AudioCallUI
          roomID={activeCall.roomID}
          isCaller={activeCall.isCaller}
          remoteUsername={activeCall.remoteUsername}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </>
  );
}
