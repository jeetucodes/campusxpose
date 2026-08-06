import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Minimize2, Maximize2 } from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { cn } from "@/lib/utils";
import { useRingTone } from "@/hooks/useRingTone";
import { useCallStore } from "@/stores/call";

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
  const [duration, setDuration] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const connectedAtRef = useRef<number | null>(null);
  const { isMinimized, setIsMinimized } = useCallStore();

  const ringType = isCaller && (callStatus === "Waiting for answer..." || callStatus === "Ringing...") ? "outgoing" : "none";
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

  // Duration timer
  useEffect(() => {
    if (callStatus === "Connected") {
      const interval = setInterval(() => {
        if (connectedAtRef.current) {
          setDuration(Math.floor((Date.now() - connectedAtRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 30-second ringing/connecting timeout
  useEffect(() => {
    if (callStatus === "Connected" || callStatus.includes("Disconnected") || callStatus.includes("Ended")) return;
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

  const handleUserLeave = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
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

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed top-[max(env(safe-area-inset-top),1rem)] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full px-4 py-2 cursor-pointer hover:-translate-y-0.5 transition-all wobbly-sm animate-in slide-in-from-top-10"
      >
        <audio ref={remoteAudioRef} autoPlay />
        <div className="flex flex-col">
          <span className="font-display font-bold text-sm tracking-tight truncate max-w-[120px]">
            {remoteNickname || remoteUsername}
          </span>
          <span className="text-xs font-bold text-accent">
            {callStatus === "Connected" ? formatDuration(duration) : callStatus}
          </span>
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className={cn(
              "h-8 w-8 rounded-full border-2",
              isMuted 
                ? "border-destructive text-destructive bg-destructive/10" 
                : "border-transparent text-ink hover:bg-muted"
            )}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
          <Button
            size="icon"
            onClick={handleUserLeave}
            className="h-8 w-8 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-none"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 text-white flex flex-col items-center justify-between p-8 text-center animate-in fade-in duration-300 overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay />
      
      {/* Background ambient glow based on call status */}
      <div className={cn(
        "absolute inset-0 opacity-40 transition-colors duration-1000",
        callStatus === "Connected" ? "bg-[radial-gradient(circle_at_center,theme(colors.accent.DEFAULT)_0%,transparent_60%)]" : "bg-[radial-gradient(circle_at_center,theme(colors.zinc.700)_0%,transparent_60%)]"
      )}></div>

      {/* Noise overlay for cinematic texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>

      {/* Top Header */}
      <div className="relative z-10 w-full flex justify-between items-start">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(true)}
          className="bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all h-12 w-12 border border-white/10"
        >
          <Minimize2 className="h-6 w-6" />
        </Button>
        <div className="flex bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 items-center gap-2 shadow-lg">
           <span className="relative flex h-3 w-3">
             <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", callStatus === "Connected" ? "bg-green-400" : "bg-amber-400")}></span>
             <span className={cn("relative inline-flex rounded-full h-3 w-3", callStatus === "Connected" ? "bg-green-500" : "bg-amber-500")}></span>
           </span>
           <span className="text-sm font-semibold tracking-wider text-white/90 uppercase">{callStatus === "Connected" ? "In Call" : "Calling"}</span>
        </div>
        <div className="w-12 h-12"></div> {/* Spacer for alignment */}
      </div>

      {/* Center Content: Avatar & Status */}
      <div className="relative z-10 flex flex-col items-center flex-1 justify-center w-full">
        <div className="relative mb-10">
          {callStatus === "Connected" && (
             <>
               <div className="absolute inset-0 rounded-full border border-accent animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50 scale-150"></div>
               <div className="absolute inset-0 rounded-full border border-accent animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s] opacity-30 scale-[2]"></div>
             </>
          )}
          
          <div className="relative bg-zinc-900 border-4 border-white/10 p-2 rounded-full shadow-2xl backdrop-blur-md">
            <div className="scale-[2] origin-center transform m-8">
              <UserSymbol username={remoteUsername} size="lg" />
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white drop-shadow-lg">
            {remoteNickname || remoteUsername}
          </h2>
          <div className="flex flex-col items-center gap-1 h-12">
            <p className={cn("font-medium text-xl md:text-2xl", callStatus !== "Connected" ? "animate-pulse text-zinc-400" : "text-zinc-200")}>
              {callStatus === "Connected" ? formatDuration(duration) : callStatus}
            </p>
          </div>
        </div>
      </div>
      
      {/* Bottom Controls */}
      <div className="relative z-10 flex flex-col items-center w-full pb-8">
        <div className="flex items-center gap-8 bg-zinc-900/60 p-6 rounded-[3rem] backdrop-blur-xl border border-white/10 shadow-2xl">
          <Button
            size="icon"
            variant="outline"
            onClick={toggleMute}
            className={cn(
              "h-16 w-16 rounded-full border-none transition-all duration-300",
              isMuted 
                ? "bg-white text-zinc-950 hover:bg-white/90 scale-105" 
                : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
          </Button>
          
          <Button
            size="icon"
            onClick={handleUserLeave}
            className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-95 transition-all text-white border-none"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
