import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, MoreVertical, Ban, Trash2, Edit, ImagePlus, Shield, UserX, UserCheck, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [search, setSearch] = useState("");

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-display font-bold tracking-tight text-ink flex items-center gap-3">
          Users
          <span className="inline-block h-1 w-12 rounded-full bg-marker wavy-underline"></span>
        </h1>
        <div className="flex flex-wrap gap-3">
          <div className="sketch-card wobbly-sm bg-postit px-4 py-2 text-sm flex items-center gap-2 font-bold">
            <span className="text-lg text-ink">{total}</span> <span className="text-muted-foreground uppercase tracking-wider text-xs">Total</span>
          </div>
          <div className="sketch-card wobbly-sm bg-surface px-4 py-2 text-sm flex items-center gap-2 font-bold">
            <span className="text-lg text-success">{realCount}</span> <span className="text-muted-foreground uppercase tracking-wider text-xs">Real</span>
          </div>
          <div className="sketch-card wobbly-sm bg-surface px-4 py-2 text-sm flex items-center gap-2 font-bold">
            <span className="text-lg text-warning">{forgotCount}</span> <span className="text-muted-foreground uppercase tracking-wider text-xs">Forgot Me</span>
          </div>
          <div className="sketch-card wobbly-sm bg-surface px-4 py-2 text-sm flex items-center gap-2 font-bold">
            <span className="text-lg text-accent">{verifiedCount}</span> <span className="text-muted-foreground uppercase tracking-wider text-xs">Verified</span>
          </div>
        </div>
      </div>

      <div className="mt-8 mb-6">
        <input 
          type="text" 
          placeholder="Search by username or hash..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border-2 border-ink bg-surface px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/20 wobbly-sm font-sans placeholder:text-muted-foreground shadow-ink-soft transition-all"
        />
      </div>

      {/* Mobile card list */}
      <div className="mt-4 space-y-4 md:hidden">
        {(q.data ?? [])
          .filter((u: any) => 
            u.username?.toLowerCase().includes(search.toLowerCase()) || 
            u.hash?.toLowerCase().includes(search.toLowerCase())
          )
          .map((u) => {
          const r = risk(u);
          return (
            <div key={u.hash} className="sketch-card wobbly-md p-4 relative">
              <div className="flex items-center justify-between gap-2 pr-8">
                <span className="flex items-center gap-2 font-bold text-lg font-display text-ink">
                  <UserSymbol username={u.username} size="sm" />
                  {u.username || <span className="text-muted-foreground italic">(no name)</span>}
                  {u.verified && <BadgeCheck className="h-5 w-5 fill-accent text-white" />}
                  {u.forgotten && <span className="border-2 border-warning shadow-ink-soft rounded px-1.5 py-0.5 text-[10px] font-bold text-warning uppercase">Forgot</span>}
                </span>
                <span className={cn("text-xs font-bold uppercase tracking-wider", r.cls)}>{r.label}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground bg-surface-2 p-1.5 inline-block border-2 border-border wobbly-sm">{u.hash.slice(0, 8)}</div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">Active {timeAgo(u.lastActive)}</div>
              
              <div className="mt-4 flex gap-4 text-sm font-bold text-ink">
                <span>{u.posts} <span className="text-muted-foreground font-normal">posts</span></span>
                <span>{u.messages} <span className="text-muted-foreground font-normal">msgs</span></span>
                <span>{u.incidents} <span className="text-muted-foreground font-normal">inc.</span></span>
              </div>

              <div className="absolute top-4 right-4">
                <UserActionsMenu
                  u={u}
                  onBan={() => doBan(u)}
                  onUnban={() => doUnban(u)}
                  onWipe={() => doWipe(u)}
                  onVerify={() => doVerify(u)}
                  onRename={() => doRename(u)}
                  onNewAvatar={() => doNewAvatar(u)}
                  onResetAvatar={() => doResetAvatar(u)}
                />
              </div>
            </div>
          );
        })}
        {q.isLoading && <p className="text-sm font-medium font-display animate-pulse text-muted-foreground">Loading users…</p>}
        {q.isError && <p className="text-sm font-medium font-display text-destructive">Couldn't load users: {(q.error as Error)?.message ?? "Unknown error"}. <button className="underline font-bold" onClick={() => q.refetch()}>Retry</button></p>}
        {!q.isLoading && !q.isError && (q.data ?? []).length === 0 && <p className="text-sm font-medium font-display text-muted-foreground">No users found.</p>}

      </div>

      {/* Desktop list */}
      <div className="mt-4 hidden md:flex flex-col gap-3">
        {/* Header Row */}
        <div className="grid grid-cols-[1.5fr_1fr_0.5fr_0.5fr_0.5fr_1fr_0.5fr_auto] items-center gap-4 px-6 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b-2 border-ink border-dashed mb-2">
          <div>Username</div>
          <div>Hash</div>
          <div>Posts</div>
          <div>Msgs</div>
          <div>Inc.</div>
          <div>Last Active</div>
          <div>Risk</div>
          <div className="w-10"></div>
        </div>
        
        {/* Rows */}
        {(q.data ?? [])
          .filter((u: any) => 
            u.username?.toLowerCase().includes(search.toLowerCase()) || 
            u.hash?.toLowerCase().includes(search.toLowerCase())
          )
          .map((u) => {
          const r = risk(u);
          return (
            <div key={u.hash} className="sketch-card wobbly-sm grid grid-cols-[1.5fr_1fr_0.5fr_0.5fr_0.5fr_1fr_0.5fr_auto] items-center gap-4 px-6 py-4 hover:bg-surface-2 transition-colors">
              <div className="flex items-center gap-2 font-display text-lg font-bold text-ink truncate">
                <UserSymbol username={u.username} size="sm" />
                {u.username || <span className="text-muted-foreground italic">(no name)</span>}
                {u.verified && <BadgeCheck className="h-5 w-5 fill-accent text-white shrink-0" />}
                {u.forgotten && <span className="border-2 border-warning shadow-ink-soft rounded px-1.5 py-0.5 text-[10px] font-bold text-warning uppercase shrink-0">Forgot</span>}
              </div>
              <div className="font-mono text-xs text-muted-foreground bg-surface-2 p-1 border-2 border-border wobbly-sm truncate">{u.hash.slice(0, 12)}</div>
              <div className="font-bold text-ink">{u.posts}</div>
              <div className="font-bold text-ink">{u.messages}</div>
              <div className="font-bold text-ink">{u.incidents}</div>
              <div className="text-sm font-medium text-muted-foreground truncate">{timeAgo(u.lastActive)}</div>
              <div className={cn("text-xs font-bold uppercase tracking-wider", r.cls)}>{r.label}</div>
              <div>
                <UserActionsMenu
                  u={u}
                  onBan={() => doBan(u)}
                  onUnban={() => doUnban(u)}
                  onWipe={() => doWipe(u)}
                  onVerify={() => doVerify(u)}
                  onRename={() => doRename(u)}
                  onNewAvatar={() => doNewAvatar(u)}
                  onResetAvatar={() => doResetAvatar(u)}
                />
              </div>
            </div>
          );
        })}
        {q.isError && <p className="p-3 text-sm font-medium font-display text-destructive">Couldn't load users: {(q.error as Error)?.message ?? "Unknown error"}. <button className="underline font-bold" onClick={() => q.refetch()}>Retry</button></p>}
        {!q.isLoading && !q.isError && (q.data ?? []).length === 0 && <p className="p-3 text-sm font-medium font-display text-muted-foreground">No users found.</p>}

      </div>
    </div>
  );
}

function UserActionsMenu({ u, onBan, onUnban, onWipe, onVerify, onRename, onNewAvatar, onResetAvatar }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-transparent transition-colors hover:border-ink hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary">
          <MoreVertical className="h-5 w-5 text-ink" />
          <span className="sr-only">Open menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 sketch-card wobbly-sm font-sans">
        {u.banned ? (
          <DropdownMenuItem onClick={onUnban} className="text-success font-medium cursor-pointer">
            <UserCheck className="mr-2 h-4 w-4" /> Unban User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onBan} className="text-warning font-medium cursor-pointer">
            <UserX className="mr-2 h-4 w-4" /> Shadow Ban
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={onVerify} className={u.verified ? "text-muted-foreground font-medium cursor-pointer" : "text-accent font-medium cursor-pointer"}>
          <Shield className="mr-2 h-4 w-4" /> {u.verified ? "Remove Verification" : "Verify User"}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onRename} className="font-medium cursor-pointer">
          <Edit className="mr-2 h-4 w-4" /> Rename User
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-ink/10" />
        
        <DropdownMenuItem onClick={onNewAvatar} className="font-medium cursor-pointer">
          <ImagePlus className="mr-2 h-4 w-4" /> Set Random Avatar
        </DropdownMenuItem>
        {u.avatarUrl && (
          <DropdownMenuItem onClick={onResetAvatar} className="text-muted-foreground font-medium cursor-pointer">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Avatar
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator className="bg-ink/10" />
        
        <DropdownMenuItem onClick={onWipe} className="text-destructive font-bold cursor-pointer hover:bg-destructive hover:text-white">
          <Trash2 className="mr-2 h-4 w-4" /> Wipe All Activity
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
