import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminListUsers, adminBanUser, adminUnbanUser, adminDeleteUserActivity } from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><UsersAdmin /></AdminShell>,
});

function risk(u: any): { label: string; cls: string } {
  if (u.banned) return { label: "Banned", cls: "text-destructive" };
  if (u.posts > 20) return { label: "High", cls: "text-destructive" };
  if (u.posts > 8) return { label: "Medium", cls: "text-warning" };
  return { label: "Low", cls: "text-success" };
}

function UsersAdmin() {
  const { token } = useAdmin();
  const list = useServerFn(adminListUsers);
  const ban = useServerFn(adminBanUser);
  const unban = useServerFn(adminUnbanUser);
  const wipe = useServerFn(adminDeleteUserActivity);
  const q = useQuery({ queryKey: ["admin-users"], enabled: !!token, queryFn: () => list({ data: { token: token! } }) });

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-muted-foreground"><tr><th className="p-3">Username</th><th className="p-3">Hash</th><th className="p-3">Posts</th><th className="p-3">Messages</th><th className="p-3">Incidents</th><th className="p-3">Last Active</th><th className="p-3">Risk</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {(q.data ?? []).map((u) => {
              const r = risk(u);
              return (
                <tr key={u.hash} className="border-t border-border">
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{u.hash.slice(0, 8)}</td>
                  <td className="p-3">{u.posts}</td>
                  <td className="p-3">{u.messages}</td>
                  <td className="p-3">{u.incidents}</td>
                  <td className="p-3 text-xs text-muted-foreground">{timeAgo(u.lastActive)}</td>
                  <td className={cn("p-3 font-medium", r.cls)}>{r.label}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {u.banned
                        ? <Button size="sm" variant="ghost" className="text-success" onClick={async () => { await unban({ data: { token: token!, userHash: u.hash } }); toast.success("Unbanned"); q.refetch(); }}>Unban</Button>
                        : <Button size="sm" variant="ghost" className="text-warning" onClick={async () => { await ban({ data: { token: token!, userHash: u.hash, username: u.username, reason: "Admin action" } }); toast.success("Shadow banned"); q.refetch(); }}>Ban</Button>}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { if (!window.confirm("Delete ALL activity from this user?")) return; await wipe({ data: { token: token!, userHash: u.hash } }); toast.success("Wiped"); q.refetch(); }}>Wipe</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
