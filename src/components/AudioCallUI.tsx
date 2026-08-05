import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { cn } from "@/lib/utils";
import { useRingTone } from "@/hooks/useRingTone";

export interface CallLogData {
  missed: boolean;
  duration: number; // in seconds
}

interface AudioCallUIProps {
  roomID: string;
  isCaller: boolean;
  remoteUsername: string;
  remoteNickname?: string;
  onLeaveRoom: (log?: CallLogData) => void;
}

export function AudioCallUI({ roomID, isCaller, remoteUsername, remoteNickname, onLeaveRoom }: AudioCallUIProps) {
  const [callStatus, setCallStatus] = useState<string>("Connecting...");
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const connectedAtRef = useRef<number | null>(null);

  const ringType = isCaller && callStatus !== "Connected" && callStatus !== "Call Ended" ? "outgoing" : "none";
  useRingTone(ringType);

  useEffect(() => {
    let isCleanup = false;

    const initCall = async () => {
      try {
        // 1. Get Local Audio
        setCallStatus("Requesting Microphone...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (isCleanup) return;
        localStreamRef.current = stream;

        // 2. Setup RTCPeerConnection
        const configuration: RTCConfiguration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun.cloudflare.com:3478" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject"
            },
            {
              urls: "turn:openrelay.metered.ca:443?transport=tcp",
              username: "openrelayproject",
              credential: "openrelayproject"
            }
          ],
        };
        const pc = new RTCPeerConnection(configuration);
        peerConnectionRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        let iceCandidateQueue: RTCIceCandidateInit[] = [];

        // Handle incoming tracks
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(e => console.error("Audio play failed:", e));
            setCallStatus("Connected");
            if (!connectedAtRef.current) connectedAtRef.current = Date.now();
          }
        };

        // 3. Setup Signaling via Supabase
        const channel = supabase.channel(`call-signal-${roomID}`);
        channelRef.current = channel;

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: { candidate: event.candidate },
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            setCallStatus("Disconnected (Network Error)");
            setTimeout(() => emitLeave(), 1500);
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setCallStatus("Connected");
            if (!connectedAtRef.current) connectedAtRef.current = Date.now();
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setCallStatus("Disconnected");
            setTimeout(() => emitLeave(), 1500);
          }
        };

        channel
          .on("broadcast", { event: "ice-candidate" }, async (payload) => {
            if (payload.payload.candidate) {
              if (pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
                } catch (e) {
                  console.error("Error adding ice candidate", e);
                }
              } else {
                iceCandidateQueue.push(payload.payload.candidate);
              }
            }
          })
          .on("broadcast", { event: "caller-joined" }, () => {
            if (!isCaller && channelRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "callee-joined",
                payload: {},
              });
            }
          })
          .on("broadcast", { event: "callee-joined" }, async () => {
            if (isCaller && channelRef.current) {
              setCallStatus("Ringing...");
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channelRef.current.send({
                  type: "broadcast",
                  event: "sdp-offer",
                  payload: { offer },
                });
              } catch (e) {
                console.error("Error creating offer", e);
              }
            }
          })
          .on("broadcast", { event: "sdp-offer" }, async (payload) => {
            if (!isCaller && channelRef.current) {
              try {
                setCallStatus("Answering...");
                await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                channelRef.current.send({
                  type: "broadcast",
                  event: "sdp-answer",
                  payload: { answer },
                });
                for (const candidate of iceCandidateQueue) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
                }
                iceCandidateQueue = [];
              } catch (e) {
                console.error("Error handling offer", e);
              }
            }
          })
          .on("broadcast", { event: "sdp-answer" }, async (payload) => {
            if (isCaller) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
                for (const candidate of iceCandidateQueue) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
                }
                iceCandidateQueue = [];
              } catch (e) {
                console.error("Error handling answer", e);
              }
            }
          })
          .on("broadcast", { event: "call-ended" }, () => {
            setCallStatus("Call Ended by Remote");
            setTimeout(() => emitLeave(), 1000);
          });

        channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED" && channelRef.current) {
            if (!isCaller) {
              setCallStatus("Connecting to Caller...");
              channelRef.current.send({
                type: "broadcast",
                event: "callee-joined",
                payload: {},
              });
            } else {
              setCallStatus("Waiting for answer...");
              channelRef.current.send({
                type: "broadcast",
                event: "caller-joined",
                payload: {},
              });
            }
          }
        });
      } catch (err) {
        console.error("Call Setup Error:", err);
        setCallStatus("Microphone access denied or error occurred.");
      }
    };

    initCall();

    return () => {
      isCleanup = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      // do not call emitLeave here to avoid infinite loops, the caller should trigger it on explicitly leaving.
    };
  }, [roomID, isCaller]);

  // 30-second ringing/connecting timeout
  useEffect(() => {
    if (callStatus === "Connected" || callStatus.includes("Disconnected")) return;
    const timeout = setTimeout(() => {
      setCallStatus("Call Timeout");
      setTimeout(() => onLeaveRoom({ missed: true, duration: 0 }), 1500);
    }, 30000);
    return () => clearTimeout(timeout);
  }, [callStatus, onLeaveRoom]);

  const emitLeave = () => {
    let log: CallLogData | undefined = undefined;
    if (isCaller) {
      if (connectedAtRef.current) {
        log = { missed: false, duration: Math.floor((Date.now() - connectedAtRef.current) / 1000) };
      } else {
        log = { missed: true, duration: 0 };
      }
    }
    onLeaveRoom(log);
  };

  const handleUserLeave = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-ended",
        payload: {},
      });
    }
    setCallStatus("Call Ended");
    setTimeout(() => {
      emitLeave();
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-paper text-ink flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <audio ref={remoteAudioRef} autoPlay />

      <div className="flex flex-col items-center space-y-6 relative z-10 w-full max-w-sm">
        <div className="wobbly-md bg-white border-4 border-ink p-8 shadow-ink flex flex-col items-center gap-6 w-full relative">
          {/* Decorative pins */}
          <div className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-marker border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-accent border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>

          <UserSymbol username={remoteUsername} size="lg" />
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-black tracking-wide inline-block bg-marker/20 px-3 py-1 wobbly-sm border-2 border-ink shadow-ink-sm">
              {remoteNickname || remoteUsername}
            </h2>
            <p className="text-ink/80 font-bold text-lg animate-pulse mt-2">{callStatus}</p>
          </div>
          
          <div className="flex items-center gap-6 mt-4 pt-6 border-t-4 border-ink border-dashed w-full justify-center">
            <Button
              size="icon"
              variant="outline"
              onClick={toggleMute}
              className={cn(
                "h-16 w-16 rounded-full border-4 wobbly-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all",
                isMuted 
                  ? "border-destructive text-destructive bg-destructive/10" 
                  : "border-ink text-ink bg-white hover:bg-muted"
              )}
            >
              {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
            </Button>
            
            <Button
              size="icon"
              onClick={handleUserLeave}
              className="h-16 w-16 rounded-full border-4 border-ink wobbly-sm bg-destructive hover:bg-destructive/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all text-white"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
