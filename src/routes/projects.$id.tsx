import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  ImagePlus,
  Loader2,
  Pencil,
  Star,
  Tag,
  Trash2,
  Users,
  X,
  Share2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Bug,
  Zap,
  Layout,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteProject,
  getProject,
  rateProject,
  requestCollaborate,
  updateProject,
  listProjectCollabRequests,
  updateProjectCollabRequest,
} from "@/lib/projects.functions";
import { useIdentity } from "@/stores/identity";
import { useFeatures } from "@/hooks/useFeatures";
import { Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteShell } from "@/components/Footer";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project — CampusXpose" },
      { name: "description", content: "View student project details, rate it and request to collaborate." },
    ],
  }),
  component: ProjectDetailPage,
});

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY as string;
const ALL_TAGS = ["Web Dev", "Android", "iOS", "AI/ML", "Design", "Hardware", "Other"];

import { uploadToImgbb } from "@/lib/upload";

type Project = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[] | null;
  github_url: string | null;
  live_url: string | null;
  looking_for_collaborators: boolean;
  owner_ghost_id: string;
  owner_username: string;
  created_at: string;
};

type Rating = {
  id: string;
  rater_username: string;
  rater_ghost_id: string;
  rating: number;
  rating_ui: number | null;
  rating_functionality: number | null;
  rating_concept: number | null;
  rating_bugs: number | null;
  comment: string | null;
  created_at: string;
};

type ProjectData = {
  project: Project;
  ratings: Rating[];
  avgRating: number;
  avgRatingUi: number;
  avgRatingFunc: number;
  avgRatingConcept: number;
  avgRatingBugs: number;
  ratingCount: number;
};

function StarRatingPicker({ value, onChange, label, icon: Icon, layout = "horizontal" }: { value: number; onChange: (v: number) => void; label: string; icon?: any; layout?: "horizontal" | "vertical" | "auto" }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={cn(
      "flex", 
      layout === "vertical" ? "flex-col items-start gap-1.5" : 
      layout === "auto" ? "flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4" :
      "items-center justify-between gap-4"
    )}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-bold text-foreground font-display">{label}</span>
      </div>
      <span className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(s)}
            className="transition-transform hover:scale-110 active:scale-95"
            aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                s <= (hovered || value)
                  ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                  : "fill-none text-ink/20 hover:text-ink/40",
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </span>
    </div>
  );
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-6 w-6" : "h-3.5 w-3.5";
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${sz} ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-none text-ink/20"}`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function MiniScore({ val, label, icon: Icon }: { val: number, label: string, icon: any }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 border border-dashed border-ink/20 rounded-lg bg-surface-1 wobbly-sm">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-bold text-foreground">{val > 0 ? val.toFixed(1) : "-"}</span>
      </div>
      <span className="text-[10px] uppercase font-bold text-muted-foreground">{label}</span>
    </div>
  );
}

function CollabModal({
  open, onClose, onSubmit, submitting,
}: {
  open: boolean; onClose: () => void;
  onSubmit: (msg: string, skills: string) => void; submitting: boolean;
}) {
  const [msg, setMsg] = useState("");
  const [skills, setSkills] = useState("");
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden border-2 border-ink bg-white shadow-ink sketch-card"
        style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-ink bg-postit/20 px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            🤝 Request to Collaborate
          </h2>
          <button onClick={onClose} className="rounded-full border-2 border-transparent p-1.5 hover:border-ink hover:bg-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="collab-msg" className="mb-2 block text-sm font-bold font-display text-foreground">
              Why do you want to collaborate? <span className="font-normal text-muted-foreground font-sans">({msg.length}/200)</span>
            </label>
            <textarea id="collab-msg" value={msg} onChange={(e) => setMsg(e.target.value.slice(0, 200))} rows={3}
              placeholder="Tell the project owner about your interest..."
              className="w-full resize-none border-2 border-ink bg-white px-3.5 py-2.5 text-sm font-sans placeholder:text-muted-foreground focus:border-accent focus:outline-none wobbly-sm"
              style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }} />
          </div>
          <div>
            <label htmlFor="collab-skills" className="mb-2 block text-sm font-bold font-display text-foreground">
              What skills do you bring? <span className="font-normal text-muted-foreground font-sans">({skills.length}/100)</span>
            </label>
            <Input id="collab-skills" value={skills} onChange={(e) => setSkills(e.target.value.slice(0, 100))} placeholder="e.g. React, Python, UI Design..." 
              className="border-2 border-ink font-sans wobbly-sm" style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }} />
          </div>
          <div className="pt-2">
            <Button className="w-full gap-2 border-2 border-ink bg-accent text-accent-foreground font-bold font-display shadow-ink wobbly-sm hover:shadow-ink-lg hover:-translate-y-0.5 py-5" disabled={submitting} onClick={() => onSubmit(msg, skills)}>
              {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Sending Request…</> : "Send Request 🚀"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  open, onClose, project, onSaved,
}: {
  open: boolean; onClose: () => void;
  project: Project; onSaved: () => void;
}) {
  const { hashedId } = useIdentity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(project.image_url);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>(project.tags ?? []);
  const [githubUrl, setGithubUrl] = useState(project.github_url ?? "");
  const [liveUrl, setLiveUrl] = useState(project.live_url ?? "");
  const [lookingForCollaborators, setLookingForCollaborators] = useState(
    project.looking_for_collaborators,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = useServerFn(updateProject);

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 6 ? [...prev, tag] : prev,
    );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!hashedId) return toast.error("Identity not ready");
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      let imageUrl: string | undefined = imagePreview ?? undefined;
      if (imageFile) {
        setUploading(true);
        try { imageUrl = await uploadToImgbb(imageFile); }
        catch { toast.error("Image upload failed"); setUploading(false); setSaving(false); return; }
        setUploading(false);
      }
      await save({
        data: {
          id: project.id, hashedId,
          title: title.trim(),
          description: description.trim() || undefined,
          imageUrl: imageUrl || undefined,
          tags, githubUrl: githubUrl.trim() || undefined,
          liveUrl: liveUrl.trim() || undefined,
          lookingForCollaborators,
        },
      });
      toast.success("Project updated successfully!");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div
        className="my-auto w-full max-w-lg border-2 border-ink bg-white shadow-ink sketch-card overflow-hidden"
        style={{ borderRadius: "20px 8px 18px 8px / 8px 18px 8px 20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-ink bg-postit/20 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            ✏️ Edit Project
          </h2>
          <button onClick={onClose} className="rounded-full border-2 border-transparent p-1.5 hover:border-ink hover:bg-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 bg-white">
          {/* Image */}
          <div>
            <label className="mb-2 block text-sm font-bold font-display tracking-wide">Cover Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex h-48 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed transition-all wobbly-sm",
                imagePreview ? "border-transparent bg-muted" : "border-ink/40 bg-accent/5 hover:border-ink hover:bg-accent/10",
              )}
              style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-ink/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-bold flex items-center gap-2"><Pencil className="h-4 w-4"/> Change</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                    className="absolute right-3 top-3 rounded-full border-2 border-ink bg-white p-1.5 text-foreground shadow-ink-soft transition-transform hover:scale-110"
                  >
                    <X className="h-4 w-4 stroke-[3]" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <ImagePlus className="h-8 w-8 text-ink/40" />
                  <span className="text-sm font-bold font-sans">Click to upload image</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-bold font-display tracking-wide">Project Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="border-2 border-ink font-sans wobbly-sm shadow-ink-soft" style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }} />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-bold font-display tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000} rows={5}
              className="w-full resize-none border-2 border-ink bg-white px-3.5 py-2.5 text-sm font-sans placeholder:text-muted-foreground focus:border-accent focus:outline-none wobbly-sm shadow-ink-soft"
              style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-bold font-display tracking-wide">
              <Tag className="h-4 w-4" /> Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={cn(
                    "border-2 border-ink px-3.5 py-1.5 text-sm font-bold transition-all wobbly-sm",
                    tags.includes(tag)
                      ? "bg-accent text-accent-foreground shadow-ink"
                      : "bg-white text-muted-foreground hover:text-foreground shadow-ink-soft",
                  )}
                  style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                >{tag}</button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold font-display tracking-wide">
                <Github className="h-4 w-4" /> Repo URL
              </label>
              <Input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="border-2 border-ink font-sans wobbly-sm" style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }} />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold font-display tracking-wide">
                <ExternalLink className="h-4 w-4" /> Live URL
              </label>
              <Input type="url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} className="border-2 border-ink font-sans wobbly-sm" style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }} />
            </div>
          </div>

          {/* Collab toggle */}
          <div
            className={cn(
              "flex cursor-pointer items-center justify-between border-2 p-4 transition-all wobbly-sm",
              lookingForCollaborators ? "border-ink bg-accent/10 shadow-ink" : "border-dashed border-ink/40 bg-white hover:border-ink/70",
            )}
            style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
            onClick={() => setLookingForCollaborators((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <div className={cn("rounded-full border-2 border-ink p-2 transition-colors", lookingForCollaborators ? "bg-accent text-white" : "bg-muted text-muted-foreground")}>
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold font-display">Looking for Collaborators</span>
              </div>
            </div>
            <div className={cn("relative h-6 w-11 rounded-full border-2 border-ink transition-colors", lookingForCollaborators ? "bg-accent" : "bg-muted")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-white transition-transform", lookingForCollaborators ? "translate-x-5" : "translate-x-0.5")} />
            </div>
          </div>

        </div>
        <div className="border-t-2 border-ink bg-white px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" className="border-2 border-ink font-bold wobbly-sm shadow-ink-soft hover:-translate-y-0.5" onClick={onClose} disabled={saving} style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}>Cancel</Button>
          <Button className="gap-2 border-2 border-ink bg-accent text-accent-foreground font-bold wobbly-sm shadow-ink hover:shadow-ink-lg hover:-translate-y-0.5" onClick={handleSave} disabled={saving} style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />{uploading ? "Uploading…" : "Saving…"}</> : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { hashedId, username, isReady, init } = useIdentity();
  const { projectsEnabled, featuresLoading } = useFeatures();

  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Specific Ratings state
  const [myRating, setMyRating] = useState(0);
  const [myRatingUi, setMyRatingUi] = useState(0);
  const [myRatingFunc, setMyRatingFunc] = useState(0);
  const [myRatingConcept, setMyRatingConcept] = useState(0);
  const [myRatingBugs, setMyRatingBugs] = useState(0);
  
  const [myComment, setMyComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabSubmitting, setCollabSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [collabRequests, setCollabRequests] = useState<any[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [updatingCollabId, setUpdatingCollabId] = useState<string | null>(null);

  const fetchProject = useServerFn(getProject);
  const submitRating = useServerFn(rateProject);
  const sendCollabRequest = useServerFn(requestCollaborate);
  const del = useServerFn(deleteProject);
  const fetchCollabs = useServerFn(listProjectCollabRequests);
  const updateCollabRequest = useServerFn(updateProjectCollabRequest);

  useEffect(() => { init(); }, [init]);

  const load = async () => {
    setLoading(true);
    try {
      const res = (await fetchProject({ data: { id } })) as unknown as ProjectData;
      setData(res);
      if (hashedId && res.ratings) {
        const mine = (res.ratings as any[]).find((r: any) => r.rater_ghost_id === hashedId);
        if (mine) { 
          setMyRating(mine.rating || 0); 
          setMyRatingUi(mine.rating_ui || 0);
          setMyRatingFunc(mine.rating_functionality || 0);
          setMyRatingConcept(mine.rating_concept || 0);
          setMyRatingBugs(mine.rating_bugs || 0);
          setMyComment(mine.comment ?? ""); 
          setRatingDone(true); 
        }
      }

      if (hashedId && res.project.owner_ghost_id === hashedId) {
        setLoadingCollabs(true);
        try {
          const reqs = await fetchCollabs({ data: { projectId: id, ownerGhostId: hashedId } });
          setCollabRequests(reqs);
        } catch (err) {
          console.error("Failed to load collaborate requests:", err);
        } finally {
          setLoadingCollabs(false);
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id, hashedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRatingSubmit = async () => {
    if (!hashedId || !username) return toast.error("Identity not ready");
    if (myRating === 0) return toast.error("Please provide an overall rating at least");
    
    setRatingSubmitting(true);
    try {
      await submitRating({ 
        data: { 
          projectId: id, 
          hashedId, 
          username, 
          rating: myRating, 
          ratingUi: myRatingUi > 0 ? myRatingUi : undefined,
          ratingFunc: myRatingFunc > 0 ? myRatingFunc : undefined,
          ratingConcept: myRatingConcept > 0 ? myRatingConcept : undefined,
          ratingBugs: myRatingBugs > 0 ? myRatingBugs : undefined,
          comment: myComment.trim() || undefined 
        } 
      });
      toast.success(ratingDone ? "Review updated!" : "Review submitted! 🎉");
      setRatingDone(true);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleCollabSubmit = async (msg: string, skills: string) => {
    if (!hashedId || !username || !data?.project) return;
    setCollabSubmitting(true);
    try {
      await sendCollabRequest({
        data: {
          projectId: id, projectTitle: data.project.title,
          ownerGhostId: data.project.owner_ghost_id, ownerUsername: data.project.owner_username,
          senderGhostId: hashedId, senderUsername: username,
          message: msg || undefined, skills: skills || undefined,
        },
      });
      toast.success("Collaboration request sent! 🤝");
      setCollabOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send request");
    } finally {
      setCollabSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!hashedId) return;
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    setDeleting(true);
    try {
      await del({ data: { id, hashedId } });
      toast.success("Project deleted.");
      navigate({ to: "/projects" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!data?.project) return;
    const text = `🛠️ Check out this project on CampusXpose: ${data.project.title}\nBy @${data.project.owner_username}\n\nRead more & collaborate!`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: data.project.title,
          text: text,
          url: window.location.href,
        });
      } else {
        throw new Error("Share not supported");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      // Silent fallback: copy to clipboard without showing any notification
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch (_) {
        // ignore — clipboard not available either
      }
    }
  };

  if (loading) {
    return (
      <SiteShell hideFooter>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </SiteShell>
    );
  }

  if (!data?.project) {
    return (
      <SiteShell hideFooter>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
          <p className="font-display text-2xl font-bold text-foreground">Project Not Found</p>
          <Button asChild className="border-2 border-ink bg-white font-bold text-foreground shadow-ink-soft wobbly-sm"><Link to="/projects"><ArrowLeft className="h-4 w-4 mr-2"/> Back to Projects</Link></Button>
        </div>
      </SiteShell>
    );
  }

  const { project, ratings, avgRating, avgRatingUi, avgRatingFunc, avgRatingConcept, avgRatingBugs, ratingCount } = data;
  const isOwner = hashedId === project.owner_ghost_id;

  return (
    <SiteShell hideFooter>
      <div className="min-h-screen pb-20 pt-8 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* Modals */}
        <CollabModal open={collabOpen} onClose={() => setCollabOpen(false)} onSubmit={handleCollabSubmit} submitting={collabSubmitting} />
        <EditModal open={editOpen} onClose={() => setEditOpen(false)} project={project} onSaved={load} />

        <div className="mx-auto max-w-4xl px-4">
          {/* Top Nav */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm" variant="outline"
                className="gap-2 border-2 border-ink bg-white font-bold text-foreground shadow-ink-soft hover:-translate-y-0.5 wobbly-sm"
                onClick={handleShare}
                style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
              >
                <Share2 className="h-4 w-4" /> Share
              </Button>
              {isOwner && (
                <>
                  <Button
                    size="sm" variant="outline"
                    className="gap-2 border-2 border-ink bg-white font-bold text-foreground shadow-ink-soft hover:-translate-y-0.5 wobbly-sm"
                    onClick={() => setEditOpen(true)}
                    style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="gap-2 border-2 border-destructive bg-white font-bold text-destructive shadow-ink-soft hover:-translate-y-0.5 hover:bg-destructive/10 wobbly-sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Main Project Card */}
          <div className="sketch-card overflow-hidden bg-white shadow-ink border-2 border-ink mb-8"
            style={{ borderRadius: "25px 8px 22px 8px / 8px 22px 8px 25px" }}
          >
            {project.image_url && (
              <div className="relative aspect-video w-full overflow-hidden border-b-2 border-ink bg-accent/5">
                <img src={project.image_url} alt={project.title} className="h-full w-full object-cover" />
              </div>
            )}

            <div className="p-6 sm:p-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  {project.tags && project.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span key={tag} className="rounded-md border border-dashed border-ink/40 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">{tag}</span>
                      ))}
                    </div>
                  )}

                  <h1 className="font-display text-4xl font-black text-foreground sm:text-5xl mb-4 leading-tight">{project.title}</h1>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-muted-foreground font-sans">
                    <span className="bg-surface-2 px-2.5 py-1 rounded border border-ink/20 font-mono text-foreground">@{project.owner_username}</span>
                    <span>•</span>
                    <span>{timeAgo(project.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-4 shrink-0">
                  <div className="flex flex-col items-center justify-center border-2 border-ink bg-postit/20 px-6 py-4 shadow-ink-soft wobbly-md min-w-[140px]" style={{ borderRadius: "12px 14px 8px 16px / 16px 8px 14px 12px" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star className="h-7 w-7 fill-amber-400 text-amber-400 drop-shadow-sm" strokeWidth={1.5} />
                      <span className="font-display text-4xl font-black text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {ratingCount > 0 ? `${ratingCount} Review${ratingCount !== 1 ? "s" : ""}` : "No reviews"}
                    </span>
                    {ratingCount > 0 && (
                      <div className="mt-3 flex gap-2">
                         <MiniScore val={avgRatingUi} label="UI" icon={Layout} />
                         <MiniScore val={avgRatingFunc} label="Func" icon={Zap} />
                         <MiniScore val={avgRatingConcept} label="Idea" icon={Lightbulb} />
                         <MiniScore val={avgRatingBugs} label="Bugs" icon={Bug} />
                      </div>
                    )}
                  </div>

                  {project.looking_for_collaborators && !isOwner && (
                    <Button 
                      onClick={() => { if (!hashedId || !username) return toast.error("Please login to collaborate."); setCollabOpen(true); }} 
                      className="w-full gap-2 border-2 border-ink bg-accent text-accent-foreground font-bold shadow-ink wobbly-sm hover:shadow-ink-lg hover:-translate-y-1"
                      style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                    >
                      <Users className="h-4 w-4" /> Request Collab
                    </Button>
                  )}
                  {project.looking_for_collaborators && isOwner && (
                    <div className="w-full text-center border-2 border-ink border-dashed bg-postit/30 px-4 py-2 text-sm font-bold text-ink wobbly-sm" style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}>
                      🤝 Open for Collab
                    </div>
                  )}
                </div>
              </div>

              {project.description && (
                <div className="mt-8 pt-8 border-t-2 border-dashed border-ink/20">
                  <p className="whitespace-pre-wrap text-base font-medium leading-loose text-foreground font-sans">{project.description}</p>
                </div>
              )}

              {(project.github_url || project.live_url) && (
                <div className="mt-8 flex flex-wrap gap-4 pt-8 border-t-2 border-dashed border-ink/20">
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 border-2 border-ink bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-ink hover:shadow-ink-lg transition-transform hover:-translate-y-1 wobbly-sm"
                      style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}>
                      <Github className="h-5 w-5" /> View Code
                    </a>
                  )}
                  {project.live_url && (
                    <a href={project.live_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 border-2 border-ink bg-white px-5 py-2.5 text-sm font-bold text-foreground shadow-ink-soft hover:shadow-ink hover:-translate-y-1 wobbly-sm"
                      style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}>
                      <ExternalLink className="h-5 w-5" /> Live Demo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Collaboration Requests (Owner Only) */}
          {isOwner && (
            <div className="mb-8 border-2 border-ink bg-white shadow-ink sketch-card p-6 sm:p-8" style={{ borderRadius: "20px 6px 22px 6px / 6px 22px 6px 20px" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-black text-foreground flex items-center gap-3">
                  🤝 Collab Requests
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-accent text-sm text-accent-foreground shadow-ink-soft">
                    {collabRequests.filter((r) => r.status === "pending").length}
                  </span>
                </h2>
              </div>

              {loadingCollabs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
              ) : collabRequests.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-ink/20 rounded-xl bg-surface-1">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-bold text-muted-foreground font-sans">No requests yet.</p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {collabRequests.map((req, idx) => {
                    const isPending = req.status === "pending";
                    const tilt = idx % 2 === 0 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]";
                    return (
                      <div key={req.id} className={cn("flex flex-col sm:flex-row sm:items-start justify-between gap-5 border-2 border-ink bg-white p-5 shadow-ink-soft transition-transform hover:-translate-y-0.5", tilt)} style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}>
                        <div className="space-y-3 flex-1 font-sans">
                          <div className="flex items-center gap-3">
                            <span className="font-display text-lg font-black text-foreground">@{req.sender_username}</span>
                            <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase border-2", req.status === "accepted" ? "border-green-400 bg-green-100 text-green-800" : req.status === "rejected" ? "border-red-400 bg-red-100 text-red-800" : "border-amber-400 bg-amber-100 text-amber-800")}>
                              {req.status}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground ml-auto">{timeAgo(req.created_at)}</span>
                          </div>
                          
                          {req.message && (
                            <div className="rounded-lg bg-surface-1 p-3 text-sm font-medium text-foreground border border-dashed border-ink/20 relative">
                              <MessageSquare className="absolute top-3 right-3 h-4 w-4 text-ink/20" />
                              {req.message}
                            </div>
                          )}
                          {req.skills && (
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-bold text-foreground">Skills:</span>
                              {req.skills.split(',').map((skill: string, i: number) => (
                                <span key={i} className="rounded border-2 border-ink/20 bg-muted/40 px-2 py-0.5 text-xs font-bold text-muted-foreground wobbly-sm" style={{ borderRadius: "8px 4px 6px 4px / 4px 6px 4px 8px" }}>
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <div className="flex sm:flex-col gap-3 shrink-0">
                            <Button size="sm" disabled={updatingCollabId === req.id}
                              onClick={async () => {
                                setUpdatingCollabId(req.id);
                                try { await updateCollabRequest({ data: { requestId: req.id, ownerGhostId: hashedId!, action: "accepted" } }); toast.success("Request accepted! 💬"); load(); } 
                                catch (e: any) { toast.error(e?.message ?? "Failed to accept"); } finally { setUpdatingCollabId(null); }
                              }}
                              className="flex-1 border-2 border-ink bg-green-400 hover:bg-green-500 text-black font-black shadow-ink-soft wobbly-sm" style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}>
                              {updatingCollabId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
                            </Button>
                            <Button size="sm" variant="outline" disabled={updatingCollabId === req.id}
                              onClick={async () => {
                                setUpdatingCollabId(req.id);
                                try { await updateCollabRequest({ data: { requestId: req.id, ownerGhostId: hashedId!, action: "rejected" } }); toast.success("Request rejected."); load(); } 
                                catch (e: any) { toast.error(e?.message ?? "Failed to reject"); } finally { setUpdatingCollabId(null); }
                              }}
                              className="flex-1 border-2 border-ink bg-white text-destructive font-black shadow-ink-soft hover:bg-destructive/10 wobbly-sm" style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}>
                              {updatingCollabId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reviews Section Container */}
          <div className="space-y-8 pb-12">
            
            {/* Rate Form */}
            {!ratingDone && (
              <div className="border-2 border-ink bg-white shadow-ink sketch-card p-6 sm:p-8" style={{ borderRadius: "20px 8px 18px 8px / 8px 18px 8px 20px" }}>
                <div className="mb-6 pb-4 border-b-2 border-dashed border-ink/20">
                  <h2 className="font-display text-2xl font-black text-foreground">
                    ⭐ Review Project
                  </h2>
                </div>
                
                {!isOwner ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6 rounded-xl bg-surface-1 p-5 sm:p-6 border-2 border-ink shadow-ink-soft wobbly-sm" style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}>
                      <StarRatingPicker value={myRating} onChange={setMyRating} label="Overall Rating" layout="auto" />
                      <div className="h-px w-full bg-ink/10" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <StarRatingPicker value={myRatingUi} onChange={setMyRatingUi} label="UI / Design" icon={Layout} layout="vertical" />
                        <StarRatingPicker value={myRatingFunc} onChange={setMyRatingFunc} label="Functionality" icon={Zap} layout="vertical" />
                        <StarRatingPicker value={myRatingConcept} onChange={setMyRatingConcept} label="Concept" icon={Lightbulb} layout="vertical" />
                        <StarRatingPicker value={myRatingBugs} onChange={setMyRatingBugs} label="Stability" icon={Bug} layout="vertical" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col h-full">
                      <label className="mb-2 block text-sm font-bold font-display">Your Thoughts</label>
                      <textarea
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                        placeholder="What did you like? What could be improved?"
                        maxLength={1000}
                        className="flex-1 w-full resize-none border-2 border-ink bg-white px-3.5 py-2.5 text-sm font-sans placeholder:text-muted-foreground focus:border-accent focus:outline-none wobbly-sm shadow-ink-soft min-h-[120px]"
                        style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }}
                      />
                      
                      <Button 
                        onClick={handleRatingSubmit} 
                        disabled={ratingSubmitting || myRating === 0} 
                        className="mt-5 w-full border-2 border-ink bg-foreground text-background font-black font-display text-lg py-6 shadow-ink hover:shadow-ink-lg hover:-translate-y-1 wobbly-md"
                        style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                      >
                        {ratingSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Submit Review"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm font-bold font-sans border-2 border-dashed border-ink/20 rounded-xl bg-surface-1">
                    <Star className="mx-auto h-8 w-8 text-ink/30 mb-3" />
                    You cannot review your own project.
                  </div>
                )}
              </div>
            )}

            {/* Reviews List */}
            <div>
              <h2 className="font-display text-3xl font-black text-foreground mb-6">
                Community Reviews <span className="text-muted-foreground font-sans text-xl font-bold ml-2">({ratingCount})</span>
              </h2>
              
              {ratings.length === 0 ? (
                <div className="border-2 border-dashed border-ink/20 bg-surface-1 p-12 text-center rounded-2xl wobbly-md">
                  <div className="mx-auto h-16 w-16 rounded-full border-2 border-ink bg-white flex items-center justify-center mb-4 shadow-ink-soft">
                    <Star className="h-8 w-8 text-ink/40" />
                  </div>
                  <h3 className="text-xl font-display font-black text-foreground">No reviews yet</h3>
                  <p className="mt-2 text-sm font-medium text-muted-foreground font-sans">Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {ratings.map((r, idx) => {
                    const tilt = idx % 2 === 0 ? "rotate-[0.5deg] bg-white" : "-rotate-[0.5deg] bg-postit/10";
                    return (
                      <div key={r.id} className={cn("border-2 border-ink p-6 sm:p-8 shadow-ink-soft sketch-card", tilt)} style={{ borderRadius: "20px 8px 18px 8px / 8px 18px 8px 20px" }}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b-2 border-dashed border-ink/10">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display text-xl font-black text-foreground">@{r.rater_username}</span>
                                {r.rater_ghost_id === project.owner_ghost_id && (
                                  <span className="inline-flex items-center rounded border-2 border-accent bg-accent/20 px-2 py-0.5 text-[10px] font-black uppercase text-accent wobbly-sm">Owner</span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-muted-foreground font-sans">{timeAgo(r.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 rounded-full border-2 border-ink bg-white px-3 py-1.5 shadow-ink-soft">
                            <StarDisplay rating={r.rating} size="lg" />
                            <span className="ml-1 font-display font-black">{r.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        
                        {(r.rating_ui || r.rating_functionality || r.rating_concept || r.rating_bugs) && (
                           <div className="mb-4 flex flex-wrap gap-2">
                             {r.rating_ui && <MiniScore val={r.rating_ui} label="UI" icon={Layout} />}
                             {r.rating_functionality && <MiniScore val={r.rating_functionality} label="Func" icon={Zap} />}
                             {r.rating_concept && <MiniScore val={r.rating_concept} label="Idea" icon={Lightbulb} />}
                             {r.rating_bugs && <MiniScore val={r.rating_bugs} label="Bugs" icon={Bug} />}
                           </div>
                        )}
                        
                        {r.comment && (
                          <p className="text-base font-medium leading-relaxed text-foreground font-sans">{r.comment}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </SiteShell>
  );
}
