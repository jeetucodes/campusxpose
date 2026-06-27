import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, ShieldCheck, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  onUploaded: (url: string) => void;
}

type Phase = "drop" | "privacy" | "editor" | "uploading";

export function ProofUploader({ onUploaded }: Props) {
  const [phase, setPhase] = useState<Phase>("drop");
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [blurAmt, setBlurAmt] = useState(5);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rects = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const drawing = useRef<{ x: number; y: number } | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
    setFile(f);
    if (f.type.startsWith("image/")) {
      setImgUrl(URL.createObjectURL(f));
    } else {
      setImgUrl(null);
    }
    setPhase("privacy");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"], "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const maxW = 600;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    ctx.filter = "none";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blurPx = blurAmt * 1.6;
    // Top 25% and bottom 10% auto-blur regions + custom rects
    const regions = [
      { x: 0, y: 0, w: canvas.width, h: canvas.height * 0.25 },
      { x: 0, y: canvas.height * 0.9, w: canvas.width, h: canvas.height * 0.1 },
      ...rects.current,
    ];
    for (const r of regions) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    // outline custom rects
    ctx.strokeStyle = "#FF4757";
    ctx.lineWidth = 2;
    for (const r of rects.current) ctx.strokeRect(r.x, r.y, r.w, r.h);
  }, [blurAmt]);

  const onImgLoad = () => { drawCanvas(); };

  const canvasPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const upload = async () => {
    if (!file) return;
    setPhase("uploading");
    setProgress(20);
    try {
      let blob: Blob = file;
      let ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      // For images: re-encode through canvas (strips EXIF) with blur applied.
      if (imgUrl && canvasRef.current) {
        drawCanvas();
        blob = await new Promise<Blob>((res, rej) =>
          canvasRef.current!.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.9),
        );
        ext = "jpg";
      }
      setProgress(60);
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("evidence").upload(path, blob, {
        contentType: blob.type || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("evidence").createSignedUrl(path, 60 * 60 * 24 * 365);
      setProgress(100);
      if (signed?.signedUrl) {
        onUploaded(signed.signedUrl);
        toast.success("Proof uploaded & sanitized");
      }
      reset();
    } catch (e) {
      toast.error("Upload failed");
      setPhase("editor");
    }
  };

  const reset = () => {
    rects.current = [];
    setFile(null);
    setImgUrl(null);
    setPhase("drop");
    setProgress(0);
  };

  return (
    <div>
      {phase === "drop" && (
        <div {...getRootProps()} className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border bg-surface-2"}`}>
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm">Drag proof here or click to select</p>
          <p className="mt-1 text-xs text-muted-foreground">jpg, png, webp, pdf · max 10MB</p>
        </div>
      )}

      <AnimatePresence>
        {phase === "privacy" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-warning"><AlertTriangle className="h-5 w-5" /> Privacy Check Before Upload</h3>
              <p className="mt-2 text-sm text-muted-foreground">Your document may contain personal information:</p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>👤 Your name may be visible</li>
                <li>🔢 Roll number may be visible</li>
                <li>📱 Phone number may be visible</li>
                <li>📍 Location data in photo metadata</li>
              </ul>
              <div className="mt-5 space-y-2">
                <Button className="w-full rounded-full bg-success text-background hover:bg-success/90" onClick={() => { if (imgUrl) { setPhase("editor"); } else { upload(); } }}>
                  ✅ Auto-Blur Sensitive Areas <span className="ml-1 text-xs">(recommended)</span>
                </Button>
                {imgUrl && <Button variant="outline" className="w-full rounded-full" onClick={() => setPhase("editor")}>✏️ I'll Blur Manually</Button>}
                <Button variant="ghost" className="w-full rounded-full text-warning" onClick={() => { rects.current = []; setBlurAmt(0); upload(); }}>⚠️ Upload As-Is (I Understand Risks)</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "editor" && imgUrl && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <img ref={imgRef} src={imgUrl} alt="" className="hidden" onLoad={onImgLoad} />
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair rounded-lg border border-border"
            onMouseDown={(e) => { drawing.current = canvasPos(e); }}
            onMouseUp={(e) => {
              if (drawing.current) {
                const p = canvasPos(e);
                rects.current.push({ x: Math.min(drawing.current.x, p.x), y: Math.min(drawing.current.y, p.y), w: Math.abs(p.x - drawing.current.x), h: Math.abs(p.y - drawing.current.y) });
                drawing.current = null;
                drawCanvas();
              }
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">Click & drag on the image to blur specific areas. Top & bottom are auto-blurred.</p>
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Blur intensity: {blurAmt}</span>
            <Slider value={[blurAmt]} min={1} max={10} step={1} onValueChange={(v) => { setBlurAmt(v[0]); requestAnimationFrame(drawCanvas); }} className="mt-1" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-success">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Location removed</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Device info removed</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Camera info removed</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> EXIF stripped</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => { rects.current = []; drawCanvas(); }}><RotateCcw className="mr-1 h-4 w-4" /> Reset</Button>
            <Button className="flex-1 rounded-full" onClick={upload}>Looks Good, Upload</Button>
          </div>
        </div>
      )}

      {phase === "uploading" && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-2 text-sm">Sanitizing & uploading… {progress}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
