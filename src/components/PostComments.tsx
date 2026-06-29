import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, CornerDownRight, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserSymbol } from "@/components/UserSymbol";
import { useIdentity } from "@/stores/identity";
import { submitComment } from "@/lib/content.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  username: string;
  content: string;
  created_at: string;
};

type Node = Comment & { children: Node[] };

function buildTree(comments: Comment[]): Node[] {
  const map = new Map<string, Node>();
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sort = (arr: Node[]) => {
    arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export function PostComments({ postId, onCount }: { postId: string; onCount?: (n: number) => void }) {
  const { hashedId, username } = useIdentity();
  const addComment = useServerFn(submitComment);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (active) setComments((data ?? []) as Comment[]); });

    const ch = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        (p) => {
          const incoming = p.new as Comment;
          setComments((prev) => (prev.some((c) => c.id === incoming.id) ? prev : [...prev, incoming]));
        },
      )
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [postId]);

  useEffect(() => { onCount?.(comments.length); }, [comments.length, onCount]);

  const tree = useMemo(() => buildTree(comments), [comments]);


  const send = async () => {
    if (!text.trim() || !hashedId || !username) return;
    const content = text.trim();
    const parentId = replyTo?.id;
    setText("");
    setReplyTo(null);
    setBusy(true);
    try {
      const res = await addComment({ data: { postId, parentId, hashedId, username, content } });
      if (res && "comment" in res && res.comment) {
        const c = res.comment as Comment;
        setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
      }
    } catch {
      toast.error("Comment nahi bhej paaye");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {tree.length > 0 && (
        <div className="space-y-3">
          {tree.map((node) => (
            <CommentNode key={node.id} node={node} depth={0} onReply={setReplyTo} />
          ))}
        </div>
      )}

      <div className="mt-3">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-xs">
            <CornerDownRight className="h-3.5 w-3.5 text-primary" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-primary">{replyTo.username}</span> ko reply: {replyTo.content}
            </span>
            <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground">✕</button>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2 py-1 transition-colors focus-within:border-primary/50">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={replyTo ? "Apna reply likho..." : "Mere sath bhi aisa hua... comment karo"}
            disabled={!hashedId || busy}
            className="h-8 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
          />
          <Button onClick={send} disabled={!text.trim() || busy} size="icon" className="h-8 w-8 shrink-0 rounded-full">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentNode({ node, depth, onReply }: { node: Node; depth: number; onReply: (c: Comment) => void }) {
  const isReply = depth > 0;
  const replyBg = depth === 1 ? "bg-primary/[0.04]" : depth === 2 ? "bg-primary/[0.03]" : "";
  return (
    <div className={cn("relative rounded-xl", isReply && "ml-5", replyBg)}>
      {isReply && (
        <div className="absolute -left-[13px] top-5 flex h-[calc(100%-20px)] flex-col items-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-primary/60 bg-background" />
          <div
            className="mt-1 flex-1 w-[2px] rounded-full"
            style={{
              backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMiIgaGVpZ2h0PSIxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZSB4MT0iMSIgeTE9IjAiIHgyPSIxIiB5Mj0iMTAiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjMgMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+")`,
              backgroundRepeat: "repeat-y",
              backgroundPosition: "center top",
              color: "hsl(var(--primary) / 0.35)",
            }}
          />
        </div>
      )}
      <div className={cn("flex items-start gap-2.5", isReply && "px-3 py-2.5")}>
        <div className="relative mt-0.5">
          <UserSymbol username={node.username} size="sm" />
          {node.children.length > 0 && (
            <div className="absolute -bottom-2.5 left-1/2 h-2.5 w-[2px] -translate-x-1/2 rounded-full bg-primary/50" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{node.username}</span>
            <span>· {timeAgo(node.created_at)}</span>
          </div>
          <div className="relative mt-1">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{node.content}</p>
          </div>
          <button
            onClick={() => onReply(node)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <CornerDownRight className="h-3 w-3" /> Reply
          </button>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="relative mt-1 space-y-2">
          {node.children.map((child) => (
            <CommentNode key={child.id} node={child} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}
