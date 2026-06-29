import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toggleReaction } from "@/lib/content.functions";
import type { MessageType, ReactionEmoji } from "@/lib/reactions";

type ReactionRow = {
  id: string;
  message_id: string;
  emoji: string;
  anonymous_user_hash: string;
};

export type ReactionSummary = { emoji: string; count: number; mine: boolean };

/**
 * Live reaction store for one chat surface. Fetches every reaction for the
 * given message_type once, then keeps it fresh through a single realtime
 * channel. Toggles are optimistic for instant feedback.
 */
export function useReactions(messageType: MessageType, hashedId: string | null) {
  const [rows, setRows] = useState<ReactionRow[]>([]);

  useEffect(() => {
    let active = true;
    supabase
      .from("message_reactions")
      .select("id,message_id,emoji,anonymous_user_hash")
      .eq("message_type", messageType)
      .then(({ data }) => {
        if (active) setRows((data ?? []) as ReactionRow[]);
      });

    const ch = supabase
      .channel(`reactions-${messageType}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions", filter: `message_type=eq.${messageType}` },
        (p) => {
          const r = p.new as ReactionRow;
          setRows((prev) => {
            // Drop any optimistic placeholder for this user+message so the
            // confirmed row never double-counts (the "1 reaction shows 2" bug).
            const cleaned = prev.filter(
              (x) =>
                !(
                  x.id.startsWith("optimistic-") &&
                  x.message_id === r.message_id &&
                  x.anonymous_user_hash === r.anonymous_user_hash
                ),
            );
            return cleaned.some((x) => x.id === r.id) ? cleaned : [...cleaned, r];
          });
        },

      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (p) => {
          const id = (p.old as { id?: string }).id;
          if (id) setRows((prev) => prev.filter((x) => x.id !== id));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [messageType]);

  const byMessage = useMemo(() => {
    const map = new Map<string, ReactionSummary[]>();
    const grouped = new Map<string, Map<string, { count: number; mine: boolean }>>();
    for (const r of rows) {
      if (!grouped.has(r.message_id)) grouped.set(r.message_id, new Map());
      const inner = grouped.get(r.message_id)!;
      const cur = inner.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (hashedId && r.anonymous_user_hash === hashedId) cur.mine = true;
      inner.set(r.emoji, cur);
    }
    for (const [mid, inner] of grouped) {
      map.set(
        mid,
        Array.from(inner.entries()).map(([emoji, v]) => ({ emoji, ...v })),
      );
    }
    return map;
  }, [rows, hashedId]);

  const toggle = useCallback(
    async (messageId: string, emoji: ReactionEmoji) => {
      if (!hashedId) return;
      // Optimistic update
      setRows((prev) => {
        const mine = prev.find(
          (r) => r.message_id === messageId && r.emoji === emoji && r.anonymous_user_hash === hashedId,
        );
        if (mine) return prev.filter((r) => r.id !== mine.id);
        return [
          ...prev,
          {
            id: `optimistic-${messageId}-${emoji}-${hashedId}`,
            message_id: messageId,
            emoji,
            anonymous_user_hash: hashedId,
          },
        ];
      });
      try {
        await toggleReaction({ data: { hashedId, messageId, messageType, emoji } });
      } catch {
        /* realtime resync will correct any divergence */
      }
    },
    [hashedId, messageType],
  );

  return { byMessage, toggle };
}
