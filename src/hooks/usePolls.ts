import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Poll = {
  id: string;
  scope: "global" | "college";
  college_id: string | null;
  anonymous_user_hash: string;
  username: string;
  question: string;
  options: string[];
  created_at: string;
  expires_at: string;
};

export type PollVote = {
  id: string;
  poll_id: string;
  option_index: number;
  anonymous_user_hash: string;
};

/**
 * Live polls for a chat room. `collegeId` is required for college scope and
 * ignored for global scope. Only returns polls that have not yet expired.
 */
export function usePolls(scope: "global" | "college", collegeId?: string) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);

  const load = useCallback(async () => {
    let q = supabase
      .from("polls" as any)
      .select("*")
      .eq("scope", scope)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(30);
    if (scope === "college" && collegeId) q = q.eq("college_id", collegeId);
    const { data } = await q;
    const list = (data ?? []) as unknown as Poll[];
    setPolls(list);
    const ids = list.map((p) => p.id);
    if (ids.length) {
      const { data: v } = await supabase
        .from("poll_votes" as any)
        .select("*")
        .in("poll_id", ids);
      setVotes((v ?? []) as unknown as PollVote[]);
    } else {
      setVotes([]);
    }
  }, [scope, collegeId]);

  useEffect(() => {
    if (scope === "college" && !collegeId) return;
    load();
    const tag = scope === "college" ? `polls-${collegeId}` : "polls-global";
    const ch = supabase
      .channel(tag)
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => load())
      .subscribe();
    // Drop polls locally the moment they expire.
    const timer = setInterval(() => {
      setPolls((prev) => prev.filter((p) => new Date(p.expires_at).getTime() > Date.now()));
    }, 30_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(timer);
    };
  }, [scope, collegeId, load]);

  return { polls, votes, reload: load };
}
