import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, CornerDownRight, Send, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserSymbol } from "@/components/UserSymbol";
import { useIdentity } from "@/stores/identity";
import { submitComment, deleteComment } from "@/lib/content.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  username: string;
  content: string;
  created_at: string;
  anonymous_user_hash?: string | null;
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
  const removeComment = useServerFn(deleteComment);
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

  const handleDelete = async (c: Comment) => {
    if (!hashedId) return;
    if (!window.confirm("Ye comment delete karein?")) return;
    const prev = comments;
    try {
      const res = await removeComment({ data: { commentId: c.id, hashedId } });
      if (res?.ok && res.ids) {
        const removed = new Set(res.ids);
        setComments((cur) => cur.filter((x) => !removed.has(x.id)));
        toast.success("Comment delete ho gaya");
      } else {
        toast.error("Ye comment delete nahi kar sakte");
      }
    } catch {
      setComments(prev);
      toast.error("Delete nahi ho paaya");
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {tree.length > 0 && (
        <div className="space-y-3">
          {tree.map((node) => (
            <CommentNode key={node.id} node={node} depth={0} onReply={setReplyTo} onDelete={handleDelete} myHash={hashedId} />
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

function CommentNode({ node, depth, onReply, onDelete, myHash }: { node: Node; depth: number; onReply: (c: Comment) => void; onDelete: (c: Comment) => void; myHash: string | null }) {
  const isReply = depth > 0;
  const hasChildren = node.children.length > 0;
  const verified = useVerifiedUsernames();
  const isMine = !!myHash && node.anonymous_user_hash === myHash;


  return (
    <div className={cn("animate-fade-in", isReply && "relative")}>
      {/* Content row */}
      <div className="flex items-start gap-3">
        {/* Connector: horizontal line + dot for replies */}
        {isReply && (
          <div className="absolute -left-5 top-5 flex items-center">
            <div className="h-px w-4 bg-primary/25" />
            <div className="h-2 w-2 -ml-1 rounded-full bg-primary/50" />
          </div>
        )}

        <div className="relative mt-0.5 shrink-0">
          <UserSymbol username={node.username} size="sm" />
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">{node.username}{node.username && verified.has(node.username) && <VerifiedBadge className="h-3.5 w-3.5" />}</span>
              <span>· {timeAgo(node.created_at)}</span>
            </div>
            {isMine && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Comment options">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(node)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{node.content}</p>

          <button
            onClick={() => onReply(node)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <CornerDownRight className="h-3 w-3" /> Reply
          </button>
        </div>
      </div>

      {/* Children: vertical thread line + replies */}
      {hasChildren && (
        <div className="relative mt-2 space-y-3 pl-5">
          {/* Animated vertical thread line */}
          <div
            className="absolute left-0 top-0 h-full w-px origin-top bg-primary/15"
            style={{ animation: "thread-draw 0.5s ease-out forwards" }}
          />
          {node.children.map((child) => (
            <CommentNode key={child.id} node={child} depth={depth + 1} onReply={onReply} onDelete={onDelete} myHash={myHash} />
          ))}
        </div>
      )}
    </div>
  );
}
