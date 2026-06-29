import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Shield, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserSymbol } from "@/components/UserSymbol";
import { useIdentity } from "@/stores/identity";
import { generateUsernameCandidates } from "@/lib/identity";
import { filterTakenUsernames } from "@/lib/content.functions";
import { cn } from "@/lib/utils";

export function ForgetMeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { resetWith } = useIdentity();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const shuffle = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      // Over-generate, then keep only names not already used by anyone.
      const candidates = generateUsernameCandidates(18);
      const { available } = await filterTakenUsernames({ data: { names: candidates } });
      const picks = available.slice(0, 6);
      setSuggestions(picks);
      setSelected(picks[0] ?? null);
    } catch {
      toast.error("Could not load usernames, try again");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      shuffle();
    }
  }, [open, shuffle]);

  const apply = async () => {
    if (!selected) return toast.error("Pick a username first");

    setApplying(true);
    try {
      await resetWith(selected);
      toast.success(`You are now ${selected}`);
      onOpenChange(false);
    } catch {
      toast.error("Could not switch identity");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-ink bg-white shadow-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Pick a new identity</DialogTitle>
          <DialogDescription>
            Choose an available anonymous username. Taken names are never shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Suggestions</span>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={shuffle} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Shuffle
            </Button>
          </div>

          <div className="grid gap-2">
            {loading && suggestions.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Finding free usernames…</p>
            )}
            {suggestions.map((name) => {
              const active = selected === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelected(name)}
                  className={cn(
                    "flex items-center gap-2 border-2 px-3 py-2 text-left text-sm transition-colors",
                    active ? "border-accent bg-accent/10" : "border-border bg-white hover:bg-surface-2",
                  )}
                  style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                >
                  <UserSymbol username={name} size="sm" />
                  <span className="flex-1 font-medium">{name}</span>
                  {active && <Check className="h-4 w-4 text-accent" />}
                </button>
              );
            })}
          </div>


          <div className="flex items-center gap-2 border border-dashed border-success bg-success/10 px-3 py-2 text-xs text-success">
            <Shield className="h-4 w-4 shrink-0" />
            Your old identity is wiped. Nothing personal is ever stored.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={applying || loading}>
            {applying ? "Switching…" : "Use this identity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
