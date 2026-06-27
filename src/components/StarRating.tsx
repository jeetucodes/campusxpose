import { Star } from "lucide-react";
import { ratingColor } from "@/lib/format";

export function StarRating({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i <= Math.round(value) ? `fill-current ${ratingColor(value)}` : "text-border"}`}
          />
        ))}
      </div>
      <span className={`text-sm font-semibold ${ratingColor(value)}`}>{value.toFixed(1)}</span>
    </div>
  );
}
