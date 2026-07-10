export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "just now";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return "just now";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function ratingColor(rating: number): string {
  if (rating < 2.5) return "text-destructive";
  if (rating <= 3.5) return "text-warning";
  return "text-success";
}

export function ratingBarColor(rating: number): string {
  if (rating < 2) return "bg-destructive";
  if (rating <= 3.5) return "bg-warning";
  return "bg-success";
}

export function severityColor(severity: number): string {
  if (severity >= 4) return "bg-destructive/20 text-destructive border-destructive/40";
  if (severity === 3) return "bg-warning/20 text-warning border-warning/40";
  return "bg-success/20 text-success border-success/40";
}

export function statusColor(status: string): string {
  switch (status) {
    case "active": return "bg-destructive/20 text-destructive border-destructive/40";
    case "investigating": return "bg-warning/20 text-warning border-warning/40";
    case "resolved": return "bg-success/20 text-success border-success/40";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function inr(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
