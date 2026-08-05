import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface IncomingCallModalProps {
  callerUsername: string;
  callerNickname?: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ callerUsername, callerNickname, onAccept, onReject }: IncomingCallModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play a generic ringing sound from a public URL
    const audio = new Audio("https://actions.google.com/sounds/v1/alarms/phone_ringing.ogg");
    audio.loop = true;
    audio.play().catch((e) => {
      console.warn("Autoplay blocked for ringing sound", e);
    });
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md text-center p-6 bg-white border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] [&>button]:hidden" style={{ borderRadius: "25px 8px 22px 8px / 8px 22px 8px 25px" }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">Incoming Audio Call</DialogTitle>
          <DialogDescription className="text-base text-ink font-medium">
            <span className="font-bold text-accent px-1 bg-marker/20 wobbly-sm border border-ink inline-block mx-1">
              {callerNickname || callerUsername}
            </span> 
            is calling you...
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center my-6">
          <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
            <Phone className="w-12 h-12 text-accent animate-bounce" />
          </div>
        </div>

        <div className="flex gap-4 w-full">
          <Button
            variant="destructive"
            className="flex-1 h-12 text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            onClick={onReject}
            style={{ borderRadius: "25px 8px 22px 8px / 8px 22px 8px 25px" }}
          >
            <PhoneOff className="mr-2 h-5 w-5" /> Decline
          </Button>
          <Button
            className="flex-1 h-12 text-lg bg-green-500 hover:bg-green-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            onClick={onAccept}
            style={{ borderRadius: "25px 8px 22px 8px / 8px 22px 8px 25px" }}
          >
            <Phone className="mr-2 h-5 w-5" /> Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
