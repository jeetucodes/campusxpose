import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageSquareHeart, Send, CheckCircle2 } from "lucide-react";
import { submitFeedback } from "@/lib/content.functions";
import { useIdentity } from "@/stores/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const WOBBLY = "25px 8px 22px 8px / 8px 22px 8px 25px";

export function FeedbackForm({ compact = false }: { compact?: boolean }) {
  const send = useServerFn(submitFeedback);
  const { username, hashedId } = useIdentity();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = message.trim();
    if (msg.length < 2) {
      toast.error("Thoda zyada likho 🙂");
      return;
    }
    setBusy(true);
    try {
      await send({
        data: {
          message: msg,
          name: name.trim() || undefined,
          username: username ?? undefined,
          hashedId: hashedId ?? undefined,
        },
      });
      setDone(true);
      setName("");
      setMessage("");
      toast.success("Shukriya! Tumhara honest review mil gaya 💚");
    } catch {
      toast.error("Feedback nahi gaya, dobara try karo.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div
        className={`sketch-card flex flex-col items-center gap-3 p-6 text-center ${compact ? "" : "-rotate-1"}`}
        style={{ borderRadius: WOBBLY }}
      >
        <CheckCircle2 className="h-10 w-10 text-success" />
        <h3 className="font-display text-xl font-bold">Shukriya! 🙌</h3>
        <p className="text-sm text-muted-foreground">
          Tumhara honest review mil gaya. App ko aur behtar banane me yahi
          sabse zyada help karta hai.
        </p>
        <Button variant="outline" size="sm" onClick={() => setDone(false)}>
          Aur feedback do
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`sketch-card p-6 ${compact ? "" : "-rotate-1"}`}
      style={{ borderRadius: WOBBLY }}
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className="grid h-10 w-10 place-items-center border-2 border-border bg-postit"
          style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}
        >
          <MessageSquareHeart className="h-5 w-5 text-accent" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold">Honest review do</h3>
          <p className="text-xs text-muted-foreground">Kya pasand aaya, kya sudhar sakta hai?</p>
        </div>
      </div>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Naam (optional)"
        maxLength={60}
        className="mb-3"
      />
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Honest review likho — app kaisa laga, kya add karein, kya sudhar sakta hai…"
        maxLength={2000}
        rows={compact ? 3 : 4}
        required
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{message.length}/2000</span>
        <Button type="submit" disabled={busy}>
          {busy ? "Bhej rahe…" : <>Bhejo <Send className="ml-1 h-4 w-4" /></>}
        </Button>
      </div>
    </form>
  );
}
