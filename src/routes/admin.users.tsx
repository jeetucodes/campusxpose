import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import {
  adminListUsers,
  adminBanUser,
  adminUnbanUser,
  adminDeleteUserActivity,
  adminSetVerified,
  adminRenameUser,
  adminSetAvatar,
} from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { UserSymbol } from "@/components/UserSymbol";
import { randomAvatarUrl } from "@/lib/avatar";
import { useQueryClient } from "@tanstack/react-query";
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
  const setVerified = useServerFn(adminSetVerified);
  const rename = useServerFn(adminRenameUser);
  const setAvatar = useServerFn(adminSetAvatar);
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["admin-users"], enabled: !!token, queryFn: () => list({ data: { token: token! } }) });

  const doBan = async (u: any) => {
    await ban({ data: { token: token!, userHash: u.hash, username: u.username, reason: "Admin action" } });
    toast.success("Shadow banned"); q.refetch();
  };
  const doUnban = async (u: any) => {
    await unban({ data: { token: token!, userHash: u.hash } });
    toast.success("Unbanned"); q.refetch();
  };
  const doWipe = async (u: any) => {
    if (!window.confirm("Delete ALL activity from this user?")) return;
    await wipe({ data: { token: token!, userHash: u.hash } });
    toast.success("Wiped"); q.refetch();
  };
  const doVerify = async (u: any) => {
    await setVerified({ data: { token: token!, userHash: u.hash, username: u.username, verified: !u.verified } });
    toast.success(u.verified ? "Verification removed" : "User verified");
    q.refetch();
  };
  const doRename = async (u: any) => {
    const next = window.prompt(`New username for ${u.username} (letters, numbers, _ only):`, u.username);
    if (!next || next === u.username) return;
    const res = await rename({ data: { token: token!, userHash: u.hash, oldUsername: u.username, newUsername: next.trim() } });
    if (!res.ok) { toast.error("That username is already taken"); return; }
    toast.success(`Renamed to ${next.trim()}`); q.refetch();
  };
  const doNewAvatar = async (u: any) => {
    await setAvatar({ data: { token: token!, userHash: u.hash, username: u.username || undefined, url: randomAvatarUrl() } });
    toast.success("New avatar set");
    queryClient.invalidateQueries({ queryKey: ["avatar-overrides"] });
    q.refetch();
  };
  const doResetAvatar = async (u: any) => {
    await setAvatar({ data: { token: token!, userHash: u.hash, username: u.username || undefined, url: null } });
    toast.success("Avatar reset to default");
    queryClient.invalidateQueries({ queryKey: ["avatar-overrides"] });
    q.refetch();
  };

  const total = (q.data ?? []).length;
  const verifiedCount = (q.data ?? []).filter((u: any) => u.verified).length;
  const forgotCount = (q.data ?? []).filter((u: any) => u.forgotten).length;
  const realCount = (q.data ?? []).filter((u: any) => u.real).length;


  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
            <span className="font-semibold">{total}</span> <span className="text-muted-foreground">total</span>
          </div>
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
            <span className="font-semibold text-success">{realCount}</span> <span className="text-muted-foreground">real users</span>
          </div>
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
            <span className="font-semibold text-warning">{forgotCount}</span> <span className="text-muted-foreground">forgot me</span>
          </div>
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
            <span className="font-semibold">{verifiedCount}</span> <span className="text-muted-foreground">verified</span>
          </div>
        </div>
      </div>


      {/* Mobile card list */}
      <div className="mt-4 space-y-3 md:hidden">
        {(q.data ?? []).map((u) => {
          const r = risk(u);
          return (
            <div key={u.hash} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <UserSymbol username={u.username} size="sm" />
                  {u.username || <span className="text-muted-foreground">(no name)</span>}
                  {u.verified && <BadgeCheck className="h-4 w-4 fill-accent text-white" />}
                  {u.forgotten && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">FORGOT</span>}
                </span>
                <span className={cn("text-xs font-medium", r.cls)}>{r.label}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{u.hash.slice(0, 8)} · {timeAgo(u.lastActive)}</div>
              <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                <span>{u.posts} posts</span><span>{u.messages} msgs</span><span>{u.incidents} inc.</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {u.banned
                  ? <Button size="sm" variant="outline" className="text-success" onClick={() => doUnban(u)}>Unban</Button>
                  : <Button size="sm" variant="outline" className="text-warning" onClick={() => doBan(u)}>Ban</Button>}
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => doWipe(u)}>Wipe</Button>
                <Button size="sm" variant="outline" className={u.verified ? "text-muted-foreground" : "text-accent"} onClick={() => doVerify(u)}>
                  {u.verified ? "Unverify" : "Verify"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => doRename(u)}>Rename</Button>
                <Button size="sm" variant="outline" onClick={() => doNewAvatar(u)}>New avatar</Button>
                {u.avatarUrl && <Button size="sm" variant="outline" className="text-muted-foreground" onClick={() => doResetAvatar(u)}>Reset avatar</Button>}
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
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-2">
                      <UserSymbol username={u.username} size="sm" />
                      {u.username || <span className="text-muted-foreground">(no name)</span>}
                      {u.verified && <BadgeCheck className="h-4 w-4 fill-accent text-white" />}
                      {u.forgotten && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">FORGOT</span>}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{u.hash.slice(0, 8)}</td>
                  <td className="p-3">{u.posts}</td>
                  <td className="p-3">{u.messages}</td>
                  <td className="p-3">{u.incidents}</td>
                  <td className="p-3 text-xs text-muted-foreground">{timeAgo(u.lastActive)}</td>
                  <td className={cn("p-3 font-medium", r.cls)}>{r.label}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.banned
                        ? <Button size="sm" variant="ghost" className="text-success" onClick={() => doUnban(u)}>Unban</Button>
                        : <Button size="sm" variant="ghost" className="text-warning" onClick={() => doBan(u)}>Ban</Button>}
                      <Button size="sm" variant="ghost" className={u.verified ? "text-muted-foreground" : "text-accent"} onClick={() => doVerify(u)}>
                        {u.verified ? "Unverify" : "Verify"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => doRename(u)}>Rename</Button>
                      <Button size="sm" variant="ghost" onClick={() => doNewAvatar(u)}>New avatar</Button>
                      {u.avatarUrl && <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => doResetAvatar(u)}>Reset avatar</Button>}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => doWipe(u)}>Wipe</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {q.isError && <p className="p-3 text-sm text-destructive">Couldn't load users: {(q.error as Error)?.message ?? "Unknown error"}. <button className="underline" onClick={() => q.refetch()}>Retry</button></p>}
        {!q.isLoading && !q.isError && (q.data ?? []).length === 0 && <p className="p-3 text-sm text-muted-foreground">No users yet.</p>}

      </div>
    </div>
  );
}
