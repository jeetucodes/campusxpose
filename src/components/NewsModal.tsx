import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Heart, Share2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toggleLikeNewsItem } from "@/lib/home.functions";
import { type HomeData } from "@/lib/home.functions";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

export function NewsModal({ news }: { news: HomeData["news"] }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

  const upvote = useMutation({
    mutationFn: (id: string) => toggleLikeNewsItem({ data: { id, action: "like" } }),
    onMutate: async (id) => {
      // Optimistic update
      setLikedItems((prev) => new Set(prev).add(id));
      queryClient.setQueryData(["home"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          news: old.news.map((n: any) => n.id === id ? { ...n, upvotes: (n.upvotes || 0) + 1 } : n)
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
      // If user cancelled the share, don't fallback to clipboard
      if (err.name === 'AbortError') return;

      // Silent fallback: copy to clipboard without showing any notification
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        // ignore — clipboard not available either
      }
    }
  };

  if (!news || news.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full mt-4 h-12 border-2 border-border bg-white hover:bg-muted shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-primary font-bold flex items-center justify-center gap-2"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <Megaphone className="w-5 h-5 animate-pulse" /> 
          CampusXpose Updates / News
          <div className="bg-destructive text-white text-[10px] px-2 py-0.5 rounded-full ml-2">New</div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto border-2 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2 border-b-2 border-border pb-4">
            <Megaphone className="w-6 h-6 text-primary" /> Latest Updates
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {news.map((item, i) => (
            <div 
              key={item.id} 
              className={`flex flex-col border-2 border-border bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${i % 2 ? "rotate-1" : "-rotate-1"}`}
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground bg-accent/10 px-2 py-1 border-border border">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              {item.image_url && (
                <img src={item.image_url} alt="News thumbnail" className="w-full h-auto max-h-[400px] object-contain bg-muted/20 rounded-md border-2 border-border mb-3" />
              )}
              {item.text && item.text.trim() !== "" && (
                <p className="font-bold text-foreground text-sm flex-1">{item.text}</p>
              )}
              {item.link_url && (
                <a href={item.link_url} target="_blank" rel="noreferrer" className="text-primary text-xs font-bold mt-3 underline flex items-center gap-1 hover:text-accent">
                  Read more <ArrowRight className="w-4 h-4" />
                </a>
              )}
              
              <div className="flex items-center gap-4 mt-4 pt-3 border-t-2 border-border/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (!likedItems.has(item.id)) upvote.mutate(item.id);
                  }}
                  className={`flex items-center gap-1.5 px-2 ${likedItems.has(item.id) ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Heart className={`w-5 h-5 ${likedItems.has(item.id) ? 'fill-current' : ''}`} />
                  <span className="font-bold">{item.upvotes || 0}</span>
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
