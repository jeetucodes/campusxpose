import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageCircle, Globe, ArrowLeft, Ghost, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { submitDirectMessage, fetchDirectMessages } from "@/lib/content.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = { to?: string };

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Direct Messages — CampusXpose" },
      {
        name: "description",
        content: "Anonymous one-to-one conversations between CampusXpose users.",
      },
    ],
  }),
  component: Messages,
});

type DM = {
  id: string;
  sender_username: string;
  recipient_username: string;
  sender_hash: string;
  content: string;
  created_at: string;
};

function Messages() {
  const { to } = Route.useSearch();
  const navigate = useNavigate();
  const { hashedId, username, init } = useIdentity();
  const [all, setAll] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  const load = useMemo(
    () => async () => {
      if (!hashedId || !username) return;
      try {
        const r = await fetchDirectMessages({ data: { hashedId, username } });
        setAll((r.messages ?? []) as DM[]);
      } catch {
        /* ignore transient errors */
      }
    },
    [hashedId, username],
  );

  useEffect(() => {
    if (!username) return;
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [username, load]);


  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Build conversation list: the "other party" for every message I'm part of.
  const conversations = useMemo(() => {
    const map = new Map<string, DM>();
    for (const m of all) {
      const other =
        m.sender_username === username ? m.recipient_username : m.sender_username;
      const existing = map.get(other);
      if (!existing || existing.created_at < m.created_at) map.set(other, m);
    }
    return Array.from(map.entries())
      .map(([name, last]) => ({ name, last }))
      .sort((a, b) => (a.last.created_at < b.last.created_at ? 1 : -1));
  }, [all, username]);

  const active = to;
  const thread = useMemo(
    () =>
      active
        ? all.filter(
            (m) =>
              (m.sender_username === username &&
                m.recipient_username === active) ||
              (m.sender_username === active &&
                m.recipient_username === username),
          )
        : [],
    [all, active, username],
  );

  const send = async () => {
    if (!text.trim() || cooldown > 0 || !hashedId || !username || !active) return;
    const content = text.trim();
    setText("");
    setCooldown(3);
    try {
      await submitDirectMessage({
        data: { hashedId, username, recipientUsername: active, content },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message failed");
    }
  };

  const startNew = () => {
    const name = newName.trim();
    if (name.length < 3) return toast.error("Enter a valid username");
    if (name === username) return toast.error("You cannot message yourself");
    setNewName("");
    navigate({ to: "/messages", search: { to: name } });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full flex-col border-r-2 border-dashed border-border md:flex md:w-72",
          active ? "hidden md:flex" : "flex",
        )}
      >
        <header className="flex items-center gap-2 border-b-2 border-dashed border-border px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <MessageCircle className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="font-display text-lg font-bold">Direct Messages</span>
          <Button asChild variant="ghost" size="icon" className="ml-auto">
            <Link to="/global">
              <Globe className="h-4 w-4" />
            </Link>
          </Button>
        </header>

        <div className="border-b-2 border-dashed border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startNew()}
              placeholder="username to message..."
            />
            <Button onClick={startNew} size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <Link
              key={c.name}
              to="/messages"
              search={{ to: c.name }}
              className={cn(
                "flex items-center gap-3 border-b border-dashed border-border px-4 py-3 transition-colors hover:bg-accent/10",
                active === c.name && "bg-accent/15",
              )}
            >
              <Ghost className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.last.sender_username === username ? "You: " : ""}
                  {c.last.content}
                </div>
              </div>
              <div className="shrink-0 text-[10px] text-muted-foreground">
                {timeAgo(c.last.created_at)}
              </div>
            </Link>
          ))}
          {conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Start one above, or tap a username in Global
              Chat.
            </p>
          )}
        </div>
      </aside>

      {/* Active thread */}
      <section
        className={cn("flex-1 flex-col", active ? "flex" : "hidden md:flex")}
      >
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b-2 border-dashed border-border px-4 py-3">
              <Button
                asChild
                variant="ghost"
                size="icon"
              >
                <Link to="/messages" search={{}}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div
                className="flex h-10 w-10 -rotate-2 items-center justify-center border-2 border-border bg-accent/15 text-accent shadow-ink-soft"
                style={{ borderRadius: "18px 7px 20px 7px / 7px 20px 7px 18px" }}
              >
                <Ghost className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-display font-bold">{active}</div>
                <div className="text-xs text-muted-foreground">
                  Anonymous direct message
                </div>
              </div>
            </header>

            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
              {thread.map((m) => {
                const own = m.sender_username === username;
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
                      style={{
                        borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px",
                      }}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {m.content}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {timeAgo(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {thread.length === 0 && (
                <p className="my-auto text-center text-sm text-muted-foreground">
                  No messages yet. Say hi to {active}.
                </p>
              )}
            </div>

            <div className="border-t-2 border-dashed border-border px-4 py-3">
              <div className="mx-auto flex max-w-2xl items-center gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={cooldown > 0 ? `${cooldown}s...` : "Message..."}
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
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 text-accent" strokeWidth={2} />
            <p>Pick a conversation or start a new one.</p>
          </div>
        )}
      </section>
    </div>
  );
}
