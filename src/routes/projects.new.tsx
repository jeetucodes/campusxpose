import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Github,
  Globe,
  ImagePlus,
  Loader2,
  Tag,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Link, Navigate } from "@tanstack/react-router";
import { useFeatures } from "@/hooks/useFeatures";
import { createProject } from "@/lib/projects.functions";
import { useIdentity } from "@/stores/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteShell } from "@/components/Footer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/new")({
  head: () => ({
    meta: [
      { title: "Add Project — CampusXpose" },
      { name: "description", content: "Share your student project with the CampusXpose community." },
    ],
  }),
  component: NewProjectPage,
});

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY as string;

const ALL_TAGS = ["Web Dev", "Android", "iOS", "AI/ML", "Design", "Hardware", "Other"];

async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!data?.data?.url) throw new Error("ImgBB upload failed");
  return data.data.url as string;
}

function NewProjectPage() {
  const navigate = useNavigate();
  const { hashedId, username, isReady, init } = useIdentity();
  const { projectsEnabled } = useFeatures();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [lookingForCollaborators, setLookingForCollaborators] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const submit = useServerFn(createProject);

  useEffect(() => {
    init();
  }, [init]);

  if (!projectsEnabled) return <Navigate to="/" />;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 6 ? [...prev, tag] : prev,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashedId || !username) return toast.error("Please ensure you're logged in with an anonymous identity.");
    if (!title.trim()) return toast.error("Project title is required.");

    setSubmitting(true);
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        setUploading(true);
        try {
          imageUrl = await uploadToImgBB(imageFile);
        } catch {
          toast.error("Image upload failed. Please try again or submit without an image.");
          setUploading(false);
          setSubmitting(false);
          return;
        }
        setUploading(false);
      }

      const result = await submit({
        data: {
          hashedId,
          username,
          title: title.trim(),
          description: description.trim() || undefined,
          imageUrl,
          tags,
          githubUrl: githubUrl.trim() || undefined,
          liveUrl: liveUrl.trim() || undefined,
          lookingForCollaborators,
        },
      });

      toast.success("Project published successfully! 🎉");
      navigate({ to: "/projects/$id", params: { id: result.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to publish project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell hideFooter>
      <div className="mx-auto max-w-3xl px-4 py-8 relative">
        <Link
          to="/projects/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div
          className="sketch-card border-2 border-ink bg-white shadow-ink overflow-hidden"
          style={{ borderRadius: "20px 8px 18px 8px / 8px 18px 8px 20px" }}
        >
          <div className="border-b-2 border-ink bg-postit/20 px-8 py-6">
            <h1 className="flex items-center gap-3 font-display text-2xl font-black text-foreground">
              <Sparkles className="h-6 w-6 text-accent" strokeWidth={2.5} />
              Publish New Project
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-sans font-medium">Share what you've been working on with the community.</p>
          </div>

          <div className="p-8 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
            <form onSubmit={handleSubmit} className="space-y-8 bg-white/90 p-2 rounded-xl backdrop-blur-sm">
              {/* Image Upload */}
              <div>
                <label className="mb-2 block text-sm font-bold text-foreground font-display tracking-wide">
                  Cover Image <span className="font-sans font-normal text-muted-foreground">(Optional)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative flex h-56 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed transition-all wobbly-sm",
                    imagePreview 
                      ? "border-ink bg-accent/5" 
                      : "border-ink/40 bg-accent/5 hover:border-ink hover:bg-accent/10"
                  )}
                  style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition-opacity hover:opacity-100">
                        <span className="flex items-center gap-2 text-sm font-bold text-white">
                          <ImagePlus className="h-4 w-4" /> Change Image
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute right-3 top-3 rounded-full border-2 border-ink bg-white p-1.5 text-foreground shadow-ink-soft transition-transform hover:scale-110"
                      >
                        <X className="h-4 w-4 stroke-[3]" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <ImagePlus className="h-10 w-10 text-ink/40" strokeWidth={1.5} />
                      <div className="text-center font-sans">
                        <p className="text-sm font-bold text-foreground">Click to upload image</p>
                        <p className="mt-1 text-xs">PNG, JPG, GIF up to 10 MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {uploading && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-accent">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading image...
                  </p>
                )}
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                {/* Title */}
                <div className="sm:col-span-2 space-y-2">
                  <label htmlFor="proj-title" className="block text-sm font-bold text-foreground font-display tracking-wide">
                    Project Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="proj-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Campus Connect, AI Study Buddy..."
                    maxLength={120}
                    className="h-12 border-2 border-ink bg-white px-4 text-base font-sans focus-visible:border-accent focus-visible:ring-0 shadow-ink-soft wobbly-sm"
                    style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }}
                    required
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="proj-desc" className="block text-sm font-bold text-foreground font-display tracking-wide">
                      Description <span className="font-sans font-normal text-muted-foreground">(Optional)</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-muted-foreground">{description.length}/5000</span>
                  </div>
                  <textarea
                    id="proj-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does your project do? What technologies did you use? What problem does it solve?"
                    maxLength={5000}
                    rows={6}
                    className="w-full resize-none border-2 border-ink bg-white p-4 text-base font-sans placeholder:text-muted-foreground focus:border-accent focus:outline-none shadow-ink-soft wobbly-sm"
                    style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }}
                  />
                </div>

                {/* Tags */}
                <div className="sm:col-span-2 space-y-3">
                  <label className="flex items-center gap-1.5 text-sm font-bold text-foreground font-display tracking-wide">
                    <Tag className="h-4 w-4 text-ink" /> Categories
                    <span className="ml-1 font-sans font-normal text-muted-foreground">(Select up to 6)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "border-2 border-ink px-4 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5 wobbly-sm",
                          tags.includes(tag)
                            ? "bg-accent text-accent-foreground shadow-ink"
                            : "bg-white text-muted-foreground hover:text-foreground shadow-ink-soft",
                        )}
                        style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GitHub URL */}
                <div className="space-y-2">
                  <label htmlFor="proj-github" className="flex items-center gap-1.5 text-sm font-bold text-foreground font-display tracking-wide">
                    <Github className="h-4 w-4 text-ink" /> Repository URL
                  </label>
                  <Input
                    id="proj-github"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="h-11 border-2 border-ink bg-white shadow-ink-soft wobbly-sm font-sans"
                    style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }}
                  />
                </div>

                {/* Live URL */}
                <div className="space-y-2">
                  <label htmlFor="proj-live" className="flex items-center gap-1.5 text-sm font-bold text-foreground font-display tracking-wide">
                    <Globe className="h-4 w-4 text-ink" /> Live Demo URL
                  </label>
                  <Input
                    id="proj-live"
                    type="url"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 border-2 border-ink bg-white shadow-ink-soft wobbly-sm font-sans"
                    style={{ borderRadius: "8px 12px 6px 14px / 12px 8px 14px 6px" }}
                  />
                </div>

                {/* Collaborators toggle */}
                <div className="sm:col-span-2 pt-2">
                  <div
                    className={cn(
                      "flex cursor-pointer items-center justify-between border-2 p-5 transition-all wobbly-sm",
                      lookingForCollaborators
                        ? "border-ink bg-accent/10 shadow-ink"
                        : "border-dashed border-ink/40 bg-white hover:border-ink/70",
                    )}
                    style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
                    onClick={() => setLookingForCollaborators((v) => !v)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("rounded-full border-2 border-ink p-2.5 transition-colors", lookingForCollaborators ? "bg-accent text-accent-foreground shadow-ink-soft" : "bg-muted text-muted-foreground")}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-foreground font-display">Looking for Collaborators</p>
                        <p className="text-sm font-medium text-muted-foreground font-sans">
                          Allow others to send requests to join this project
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "relative h-7 w-12 shrink-0 rounded-full border-2 border-ink transition-colors",
                        lookingForCollaborators ? "bg-accent" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-white transition-transform",
                          lookingForCollaborators ? "translate-x-5" : "translate-x-0.5",
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t-2 border-dashed border-ink/20">
                <Button
                  type="submit"
                  className="w-full h-14 border-2 border-ink bg-accent text-accent-foreground text-lg font-black font-display shadow-ink hover:shadow-ink-lg transition-transform hover:-translate-y-1 wobbly-md"
                  disabled={submitting || !hashedId}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {uploading ? "Uploading image..." : "Publishing..."}
                    </>
                  ) : (
                    "🚀 Publish Project"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
