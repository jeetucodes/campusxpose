import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { useRingTone } from "@/hooks/useRingTone";
import { useCallStore } from "@/stores/call";
import { cn } from "@/lib/utils";
import { UserSymbol } from "@/components/UserSymbol";

interface IncomingCallModalProps {
  callerUsername: string;
  callerNickname?: string;
}

export function IncomingCallModal({ callerUsername, callerNickname }: IncomingCallModalProps) {
  useRingTone("incoming");
  const { acceptCall, rejectCall } = useCallStore();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm animate-in slide-in-from-top-10 fade-in duration-300">
      <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden rounded-3xl p-4 flex flex-col gap-4">
        
        {/* Background glow & Noise overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.accent.DEFAULT)_0%,transparent_70%)] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>

        <div className="relative z-10 flex items-center gap-4">
          
          {/* Avatar with subtle ring animation */}
          <div className="relative shrink-0">
             <div className="absolute inset-0 rounded-full border border-accent animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50 scale-150"></div>
             <div className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center relative z-10 overflow-hidden shadow-xl">
               <UserSymbol username={callerUsername} size="sm" />
             </div>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h1 className="text-lg font-display font-bold text-white truncate drop-shadow-md">
              {callerNickname || callerUsername}
            </h1>
            <h2 className="text-sm font-medium text-zinc-400">Incoming call...</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="icon"
              className="h-10 w-10 rounded-full border-none bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 shrink-0"
              onClick={rejectCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all duration-300 border-none shrink-0"
              onClick={acceptCall}
            >
              <Phone className="h-5 w-5 fill-current" />
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
