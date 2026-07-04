import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetNews, adminCreateNews, adminToggleNewsStatus, adminDeleteNews, getSiteSettings, toggleNewsEnabled } from "@/lib/admin.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Megaphone, Plus, Link as LinkIcon, Image as ImageIcon, Upload, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { uploadToImgbb } from "@/lib/upload";
import { useAdmin } from "@/stores/admin";

export const Route = createFileRoute("/admin/news")({
  component: AdminNews,
});

function AdminNews() {
  const queryClient = useQueryClient();
  const token = useAdmin(s => s.token) || "";
  
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["admin", "news"],
    queryFn: () => adminGetNews({ data: { token } }),
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings"],
    enabled: !!token,
    queryFn: () => getSiteSettings({ data: { token } }),
  });

  const toggleMaster = useMutation({
    mutationFn: (enabled: boolean) => toggleNewsEnabled({ data: { token, enabled } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Master setting updated");
    },
  });

  const createNews = useMutation({
    mutationFn: (data: { text: string; link_url?: string; image_url?: string }) =>
      adminCreateNews({ data: { token, ...data } }),
    onSuccess: () => {
      toast.success("News published!");
      setText("");
      setLinkUrl("");
      setImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setIsSubmitting(false),
  });

  const toggleStatus = useMutation({
    mutationFn: (data: { id: string; is_active: boolean }) =>
      adminToggleNewsStatus({ data: { token, ...data } }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
    },
  });

  const deleteNews = useMutation({
    mutationFn: (id: string) => adminDeleteNews({ data: { token, id } }),
    onSuccess: () => {
      toast.success("News deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageUrl.trim()) return toast.error("Either text or an image is required");
    setIsSubmitting(true);
    createNews.mutate({ text: text || "", link_url: linkUrl, image_url: imageUrl });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const loadingToast = toast.loading("Uploading image...");
    try {
      const url = await uploadToImgbb(file);
      setImageUrl(url);
      toast.success("Image uploaded successfully!", { id: loadingToast });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image", { id: loadingToast });
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Megaphone className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">News & Updates</h1>
        </div>
        <div className="flex items-center gap-3 bg-card p-3 rounded-xl border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="font-bold text-sm">Master Switch:</span>
          <Button
            variant={siteSettings?.news_enabled ? "default" : "secondary"}
            size="sm"
            onClick={() => toggleMaster.mutate(!siteSettings?.news_enabled)}
            disabled={toggleMaster.isPending}
          >
            {siteSettings?.news_enabled ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="p-6 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Announcement
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Announcement Text (Optional if uploading Poster)</Label>
                <Input 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder="e.g., CampusXpose App is now live!" 
                  className="border-2 border-border shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Link URL (Optional)</Label>
                <Input 
                  value={linkUrl} 
                  onChange={(e) => setLinkUrl(e.target.value)} 
                  placeholder="https://..." 
                  className="border-2 border-border shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Image URL or Upload</Label>
                <div className="flex gap-2">
                  <Input 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)} 
                    placeholder="https://... or click upload ->" 
                    className="border-2 border-border shadow-sm flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-2 border-border shrink-0 px-3 relative cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                </div>
                {imageUrl && (
                  <img src={imageUrl} alt="Preview" className="mt-2 h-20 w-auto object-cover rounded-md border-2 border-border" />
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Publishing..." : "Publish News"}
              </Button>
            </form>
          </Card>
        </div>

        {/* List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">Manage Active News</h2>
          
          {isLoading ? (
            <p>Loading news...</p>
          ) : news.length === 0 ? (
            <p className="text-muted-foreground border-2 border-dashed border-border p-8 text-center rounded-xl">No news items found.</p>
          ) : (
            news.map((item: any) => (
              <Card key={item.id} className={`p-4 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex flex-col sm:flex-row gap-4 ${!item.is_active ? 'opacity-50' : ''}`}>
                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-24 h-24 object-cover rounded-lg border-2 border-border" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-lg">{item.text}</p>
                  {item.link_url && (
                    <a href={item.link_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline mt-1 block">
                      {item.link_url}
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-4 sm:border-l-2 sm:border-border sm:pl-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={item.is_active}
                      onCheckedChange={(checked) => toggleStatus.mutate({ id: item.id, is_active: checked })}
                    />
                    <span className="text-sm font-bold">{item.is_active ? "Active" : "Hidden"}</span>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    onClick={() => {
                      if (confirm("Are you sure?")) deleteNews.mutate(item.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
