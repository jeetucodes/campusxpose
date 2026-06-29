import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PresenceMeta = { username: string; hash: string };

/**
 * Shared realtime presence + typing indicator for any chat room.
 * - `online`: number of distinct users currently in the room.
 * - `typing`: usernames (excluding self) currently typing.
 * - `notifyTyping`: call on every keystroke; auto-clears after a pause.
 */
export function usePresence(room: string, username?: string, hash?: string) {
  const [online, setOnline] = useState(0);
  const [typing, setTyping] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const stopSelfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!room || !username || !hash) return;
    const ch = supabase.channel(`presence:${room}`, {
      config: { presence: { key: hash } },
    });
    channelRef.current = ch;

    const recount = () => {
      const state = ch.presenceState() as Record<string, unknown[]>;
      setOnline(Object.keys(state).length);
    };

    ch.on("presence", { event: "sync" }, recount)
      .on("presence", { event: "join" }, recount)
      .on("presence", { event: "leave" }, recount)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as PresenceMeta;
        if (!p || p.hash === hash) return;
        setTyping((prev) => (prev.includes(p.username) ? prev : [...prev, p.username]));
        const timers = typingTimers.current;
        const existing = timers.get(p.username);
        if (existing) clearTimeout(existing);
        timers.set(
          p.username,
          setTimeout(() => {
            setTyping((prev) => prev.filter((u) => u !== p.username));
            timers.delete(p.username);
          }, 3000),
        );
      });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.track({ username, hash } satisfies PresenceMeta);
      }
    });

    return () => {
      typingTimers.current.forEach((t) => clearTimeout(t));
      typingTimers.current.clear();
      if (stopSelfTimer.current) clearTimeout(stopSelfTimer.current);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [room, username, hash]);

  const notifyTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || !username || !hash) return;
    ch.send({ type: "broadcast", event: "typing", payload: { username, hash } });
  }, [username, hash]);

  return { online, typing, notifyTyping };
}
