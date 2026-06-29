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

      {/* Mobile card list */}
      <div className="mt-4 space-y-3 md:hidden">
        {(q.data ?? []).map((u) => {
          const r = risk(u);
          return (
            <div key={u.hash} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{u.username}</span>
                <span className={cn("text-xs font-medium", r.cls)}>{r.label}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{u.hash.slice(0, 8)} · {timeAgo(u.lastActive)}</div>
              <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                <span>{u.posts} posts</span><span>{u.messages} msgs</span><span>{u.incidents} inc.</span>
              </div>
              <div className="mt-3 flex gap-2">
                {u.banned
                  ? <Button size="sm" variant="outline" className="flex-1 text-success" onClick={async () => { await unban({ data: { token: token!, userHash: u.hash } }); toast.success("Unbanned"); q.refetch(); }}>Unban</Button>
                  : <Button size="sm" variant="outline" className="flex-1 text-warning" onClick={async () => { await ban({ data: { token: token!, userHash: u.hash, username: u.username, reason: "Admin action" } }); toast.success("Shadow banned"); q.refetch(); }}>Ban</Button>}
                <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={async () => { if (!window.confirm("Delete ALL activity from this user?")) return; await wipe({ data: { token: token!, userHash: u.hash } }); toast.success("Wiped"); q.refetch(); }}>Wipe</Button>
              </div>
            </div>
          );
        })}
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading users…</p>}
        {q.isError && <p className="text-sm text-destructive">Couldn't load users: {(q.error as Error)?.message ?? "Unknown error"}. <button className="underline" onClick={() => q.refetch()}>Retry</button></p>}
        {!q.isLoading && !q.isError && (q.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}

      </div>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border md:block">
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
