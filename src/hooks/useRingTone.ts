import { useEffect, useRef } from "react";

export function useRingTone(type: "incoming" | "outgoing" | "none") {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillator1Ref = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopTone = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (gainNodeRef.current && audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        const now = audioCtxRef.current.currentTime;
        gainNodeRef.current.gain.cancelScheduledValues(now);
        gainNodeRef.current.gain.setTargetAtTime(0, now, 0.015);
      } catch {}
    }
    if (oscillator1Ref.current) {
      try { oscillator1Ref.current.stop(); } catch {}
      try { oscillator1Ref.current.disconnect(); } catch {}
      oscillator1Ref.current = null;
    }
    if (oscillator2Ref.current) {
      try { oscillator2Ref.current.stop(); } catch {}
      try { oscillator2Ref.current.disconnect(); } catch {}
      oscillator2Ref.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (type === "none") {
      stopTone();
      return;
    }

    // Stop any existing tones first before starting a new one
    stopTone();

    const startTone = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const g = ctx.createGain();
        g.connect(ctx.destination);
        g.gain.value = 0;
        gainNodeRef.current = g;

        const o1 = ctx.createOscillator();
        o1.type = "sine";
        
        const o2 = ctx.createOscillator();
        o2.type = "sine";

        if (type === "incoming") {
          // Energetic ringtone
          o1.frequency.value = 440; // A4
          o2.frequency.value = 480;
        } else {
          // Standard outgoing dial/ring tone (US style: 440 + 480 Hz)
          o1.frequency.value = 440;
          o2.frequency.value = 480;
        }

        o1.connect(g);
        o2.connect(g);
        o1.start();
        o2.start();
        oscillator1Ref.current = o1;
        oscillator2Ref.current = o2;

        const playPattern = () => {
          if (!audioCtxRef.current || audioCtxRef.current.state === "closed") return;
          const now = audioCtxRef.current.currentTime;
          if (type === "incoming") {
            // Fast double ring pattern
            g.gain.setValueAtTime(0.2, now);
            g.gain.setValueAtTime(0, now + 0.4);
            g.gain.setValueAtTime(0.2, now + 0.6);
            g.gain.setValueAtTime(0, now + 1.0);
          } else {
            // Outgoing: 2s on, 4s off
            g.gain.setValueAtTime(0.1, now);
            g.gain.setValueAtTime(0, now + 2);
          }
        };

        playPattern();
        const interval = type === "incoming" ? 3000 : 6000;
        intervalRef.current = setInterval(playPattern, interval);

      } catch (e) {
        console.warn("Audio Context failed to play ringtone", e);
      }
    };

    // Browsers require interaction to play audio. Try immediately:
    startTone();

    // If it was blocked, we could attach a one-time click listener
    const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });

    return () => {
      stopTone();
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, [type]);
}
