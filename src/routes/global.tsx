import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Globe, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { submitGlobalMessage } from "@/lib/content.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/global")({
  head: () => ({
    meta: [
      { title: "Global Chat — CampusXpose" },
      {
        name: "description",
        content:
          "One anonymous platform-wide room where students from every campus talk freely.",
      },
    ],
  }),
  component: GlobalChat,
});

type Msg = {
  id: string;
  username: string;
  content: string;
  anonymous_user_hash: string;
  created_at: string;
};

function GlobalChat() {
  const { hashedId, username, init } = useIdentity();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    supabase
      .from("global_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150)
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
    const ch = supabase
      .channel("global-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_messages" },
        (p) => {
          setMessages((prev) => [
            p.new as Msg,
            ...prev.filter((m) => m.id !== (p.new as Msg).id),
          ]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    if (!text.trim() || cooldown > 0 || !hashedId || !username) return;
    const content = text.trim();
    setText("");
    setCooldown(5);
    try {
      await submitGlobalMessage({ data: { hashedId, username, content } });
    } catch {
      toast.error("Message failed");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <header className="flex items-center gap-3 border-b-2 border-dashed border-border bg-background px-4 py-3">
        <div
          className="flex h-10 w-10 items-center justify-center border-2 border-border bg-accent/15 text-accent"
          style={{ borderRadius: "18px 7px 20px 7px / 7px 20px 7px 18px" }}
        >
          <Globe className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg font-bold">Global Chat</div>
          <div className="text-xs text-muted-foreground">
            Everyone on CampusXpose, one anonymous room
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/messages">
            <MessageCircle className="h-4 w-4" /> DMs
          </Link>
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col-reverse gap-2 overflow-y-auto px-4 py-4">
        {messages.map((m) => {
          const own = m.anonymous_user_hash === hashedId;
          return (
            <div
              key={m.id}
              className={cn("flex", own ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] border-2 border-border px-3 py-2 text-sm shadow-ink-soft",
                  own ? "bg-accent/15" : "bg-white",
                )}
                style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
              >
                {!own && (
                  <Link
                    to="/messages"
                    search={{ to: m.username }}
                    className="mb-0.5 block text-xs font-bold text-accent hover:wavy-underline"
                  >
                    {m.username}
                  </Link>
                )}
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {timeAgo(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="my-auto text-center text-sm text-muted-foreground">
            No messages yet. Say something to the whole campus universe.
          </p>
        )}
      </div>

      <div className="border-t-2 border-dashed border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={cooldown > 0 ? `${cooldown}s...` : "Message everyone..."}
            disabled={cooldown > 0}
            maxLength={1000}
          />
          <Button
            onClick={send}
            disabled={cooldown > 0 || !text.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
