import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Heart, Share2, ArrowRight, ArrowLeft, MessageSquare, Send, Trash2 } from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getHomeData, toggleLikeNewsItem, getNewsComments, addNewsComment, deleteNewsComment } from "@/lib/home.functions";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIdentity } from "@/stores/identity";
import { UserSymbol } from "@/components/UserSymbol";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "CampusXpose Updates / News" },
      { name: "description", content: "Latest updates and news from CampusXpose." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { data } = useQuery({
    queryKey: ["home"],
    queryFn: () => getHomeData(),
    staleTime: 15000,
  });
  
  const news = data?.news || [];
  const queryClient = useQueryClient();
  const [likedItems, setLikedItems] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("liked_news");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleLike = useMutation({
    mutationFn: ({ id, action }: { id: string, action: "like" | "unlike" }) => toggleLikeNewsItem({ data: { id, action } }),
    onMutate: async ({ id, action }) => {
      setLikedItems((prev) => {
        const next = new Set(prev);
        if (action === "like") next.add(id);
        else next.delete(id);
        try { localStorage.setItem("liked_news", JSON.stringify(Array.from(next))); } catch {}
        return next;
      });
      queryClient.setQueryData(["home"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          news: old.news.map((n: any) => n.id === id ? { ...n, upvotes: Math.max(0, (n.upvotes || 0) + (action === "like" ? 1 : -1)) } : n)
        };
      });
    }
  });

  const handleShare = async (item: any) => {
    const text = `📢 ${item.text || "CampusXpose Update"}\n${item.link_url || ""}\nRead more on CampusXpose!`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'CampusXpose News',
          text: text,
          url: window.location.href,
        });
      } else {
        throw new Error("Share not supported");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
      } catch (e) {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <SiteShell hideFooter>
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-8 flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="h-10 w-10 border-2 border-border bg-white hover:bg-accent/10 transition-colors" style={{ borderRadius: WOBBLY_MD }}>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Megaphone className="h-8 w-8 md:h-10 md:w-10 text-primary" /> Updates
          </h1>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
          {news.length === 0 ? (
            <div className="break-inside-avoid mb-6 text-center py-12 text-muted-foreground border-2 border-border bg-white" style={{ borderRadius: WOBBLY_MD }}>
              Abhi koi latest updates nahi hain!
            </div>
          ) : (
            news.map((item, i) => (
              <div key={item.id} className="break-inside-avoid mb-6">
                <NewsCard item={item} i={i} toggleLike={toggleLike} likedItems={likedItems} handleShare={handleShare} />
              </div>
            ))
          )}
        </div>
      </div>
    </SiteShell>
  );
}

function NewsCard({ item, i, toggleLike, likedItems, handleShare }: any) {
  const [showComments, setShowComments] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (i % 5) * 0.1 }}
      className="flex flex-col border-2 border-border bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
      style={{ borderRadius: WOBBLY_MD }}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-muted-foreground bg-accent/10 px-2.5 py-1 border-border border rounded-full">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>

        {item.image_url && (
          <div className="w-full mb-4 rounded-xl overflow-hidden border-2 border-border bg-muted/10">
            <img src={item.image_url} alt="News thumbnail" className="w-full h-auto max-h-[400px] object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        {item.text && item.text.trim() !== "" && (
          <p className="font-medium text-foreground text-base leading-relaxed flex-1 mb-2">{item.text}</p>
        )}
        {item.link_url && (
          <a href={item.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary text-sm font-bold mt-2 underline-offset-4 hover:underline hover:text-accent w-fit">
            Read more <ArrowRight className="w-4 h-4" />
          </a>
        )}
        
        <div className="flex items-center gap-3 mt-5 pt-4 border-t-2 border-border/20">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (likedItems.has(item.id)) {
                toggleLike.mutate({ id: item.id, action: "unlike" });
              } else {
                toggleLike.mutate({ id: item.id, action: "like" });
              }
            }}
            className={`flex items-center gap-1.5 px-2 ${likedItems.has(item.id) ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Heart className={`w-5 h-5 ${likedItems.has(item.id) ? 'fill-current' : ''}`} />
            <span className="font-bold">{item.upvotes || 0}</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-bold">{item.comment_count || 0}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleShare(item)}
            className="flex items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-bold text-xs uppercase">Share</span>
          </Button>
        </div>
      </div>
      
      <AnimatePresence>
        {showComments && <NewsComments newsId={item.id} />}
      </AnimatePresence>
    </motion.div>
  );
}

function NewsComments({ newsId }: { newsId: string }) {
  const [content, setContent] = useState("");
  const identity = useIdentity();
  const queryClient = useQueryClient();
  
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["news-comments", newsId],
    queryFn: () => getNewsComments({ data: { newsId } }),
  });

  const postComment = useMutation({
    mutationFn: () => addNewsComment({ data: { newsId, username: identity.username, content, hashedId: identity.hashedId || undefined } }),
    onSuccess: (newComment) => {
      setContent("");
      queryClient.setQueryData(["news-comments", newsId], (old: any) => [...(old || []), newComment]);
      // Update count optimistically on home query
      queryClient.setQueryData(["home"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          news: old.news.map((n: any) => n.id === newsId ? { ...n, comment_count: (n.comment_count || 0) + 1 } : n)
        };
      });
      toast.success("Comment posted!");
    },
    onError: () => {
      toast.error("Failed to post comment.");
    }
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) => deleteNewsComment({ data: { commentId, newsId, hashedId: identity.hashedId! } }),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData(["news-comments", newsId], (old: any) => (old || []).filter((c: any) => c.id !== commentId));
      queryClient.setQueryData(["home"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          news: old.news.map((n: any) => n.id === newsId ? { ...n, comment_count: Math.max(0, (n.comment_count || 0) - 1) } : n)
        };
      });
      toast.success("Comment deleted");
    },
    onError: () => {
      toast.error("Failed to delete comment");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    postComment.mutate();
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-t-2 border-border/50 bg-muted/10 overflow-hidden"
    >
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground animate-pulse py-2">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-2">Be the first to comment!</div>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {comments.map((c: any) => (
              <div key={c.id} className="bg-white border-2 border-border p-3 group relative" style={{ borderRadius: WOBBLY_MD }}>
                <div className="flex items-center gap-2 mb-1">
                  <UserSymbol username={c.username} size="sm" />
                  <span className="font-bold text-xs text-foreground">{c.username}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium">{c.content}</p>
                {identity.hashedId && c.anonymous_user_hash === identity.hashedId && (
                  <button 
                    onClick={() => deleteComment.mutate(c.id)}
                    disabled={deleteComment.isPending}
                    className="absolute right-3 top-3 text-muted-foreground/60 hover:text-destructive transition-colors bg-white/80 rounded p-1"
                    title="Delete comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder="Write an anonymous comment..."
            className="flex-1 bg-white border-2 border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ borderRadius: WOBBLY_MD }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={postComment.isPending}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!content.trim() || postComment.isPending}
            className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-accent hover:bg-accent/90 shrink-0"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
