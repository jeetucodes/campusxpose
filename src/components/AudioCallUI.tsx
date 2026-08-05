import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";

export interface CallLogData {
  missed: boolean;
  duration: number; // in seconds
}

interface AudioCallUIProps {
  roomID: string;
  isCaller: boolean;
  remoteUsername: string;
  onLeaveRoom: (log?: CallLogData) => void;
}

export function AudioCallUI({ roomID, isCaller, remoteUsername, onLeaveRoom }: AudioCallUIProps) {
  const [callStatus, setCallStatus] = useState<string>("Connecting...");
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const connectedAtRef = useRef<number | null>(null);

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
        const configuration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
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

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setCallStatus("Connected");
            if (!connectedAtRef.current) connectedAtRef.current = Date.now();
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setCallStatus("Disconnected");
            setTimeout(() => emitLeave(), 1000);
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
    };
  }, [roomID, isCaller]);

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
    <div className="fixed inset-0 z-[9999] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <audio ref={remoteAudioRef} autoPlay />

      <div className="flex flex-col items-center space-y-6">
        <UserSymbol username={remoteUsername} size="lg" />
        <h2 className="text-3xl font-display font-bold">@{remoteUsername}</h2>
        <p className="text-zinc-400 text-lg animate-pulse">{callStatus}</p>

        <div className="flex items-center gap-6 mt-12">
          <Button
            size="icon"
            variant="outline"
            onClick={toggleMute}
            className={`h-16 w-16 rounded-full border-2 ${isMuted ? "border-red-500 text-red-500 bg-red-500/10 hover:bg-red-500/20" : "border-zinc-700 text-white bg-zinc-800 hover:bg-zinc-700 hover:text-white"}`}
          >
            {isMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </Button>
          
          <Button
            size="icon"
            onClick={handleUserLeave}
            className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg text-white"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
