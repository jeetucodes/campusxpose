import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, MessageSquare, MessagesSquare, FileText, Megaphone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIdentity } from "@/stores/identity";
import { getNotifications, markNotificationsRead } from "@/lib/notifications.functions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = {
  dm: MessageSquare,
  reply: MessagesSquare,
  comment: FileText,
  broadcast: Megaphone,
};

export function NotificationBell() {
  const { hashedId } = useIdentity();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const list = useServerFn(getNotifications);
  const markRead = useServerFn(markNotificationsRead);

  const q = useQuery({
    queryKey: ["notifications", hashedId],
    enabled: !!hashedId,
    refetchInterval: 25000,
    refetchOnWindowFocus: true,
    queryFn: () => list({ data: { hashedId: hashedId!, limit: 30 } }),
  });

  const unread = q.data?.unread ?? 0;
  const items = q.data?.items ?? [];

  async function handleOpen(next: boolean) {
    setOpen(next);
    if (next && unread > 0 && hashedId) {
      await markRead({ data: { hashedId } });
      qc.invalidateQueries({ queryKey: ["notifications", hashedId] });
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center border-2 border-ink bg-white shadow-ink transition-transform duration-100 hover:-rotate-3"
          style={{ borderRadius: "18px 7px 20px 7px / 7px 20px 7px 18px" }}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 border-2 border-ink bg-white p-0 shadow-ink"
        style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}
      >
        <div className="border-b-2 border-dashed border-ink px-4 py-2.5 font-display font-bold">
          Notifications
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => {
                  setOpen(false);
                  if (n.link) navigate({ to: n.link });
                }}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-dashed border-ink/20 px-4 py-3 text-left transition-colors hover:bg-paper",
                  !n.read && "bg-accent/5",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="flex-1">
                  <span className="block text-sm leading-snug">{n.message}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </span>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
