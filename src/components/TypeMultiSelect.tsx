import { Check } from "lucide-react";
import { COLLEGE_TYPES } from "@/lib/categories";
import { cn } from "@/lib/utils";

/** Toggleable pill group for picking one or more college course types. */
export function TypeMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (t: string) => {
    if (value.includes(t)) {
      // Keep at least one selected.
      if (value.length === 1) return;
      onChange(value.filter((x) => x !== t));
    } else {
      onChange([...value, t]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {COLLEGE_TYPES.map((t) => {
        const active = value.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={cn(
              "inline-flex items-center gap-1 border-2 px-3 py-1 text-sm transition-transform duration-100 hover:-rotate-2",
              active
                ? "border-border bg-accent text-accent-foreground shadow-ink-soft"
                : "border-border bg-white text-muted-foreground hover:text-foreground",
            )}
            style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {t}
          </button>
        );
      })}
    </div>
  );
}
