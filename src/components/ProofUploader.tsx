import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadToImgbb } from "@/lib/upload";

interface Props {
  onUploaded: (url: string) => void;
}

export function ProofUploader({ onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }

    setUploading(true);
    try {
      const url = await uploadToImgbb(f);
      if (url) {
        onUploaded(url);
        toast.success("Proof uploaded");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Upload failed: ${e.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div>
      {uploading ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-2 text-sm">Uploading…</p>
        </div>
      ) : (
        <div {...getRootProps()} className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border bg-surface-2"}`}>
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm">Drag image here or click to select</p>
          <p className="mt-1 text-xs text-muted-foreground">jpg, png, webp · max 10MB</p>
        </div>
      )}
    </div>
  );
}
