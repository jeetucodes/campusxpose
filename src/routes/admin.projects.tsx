import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminListProjects, adminDeleteProjects } from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/projects")({
  head: () => ({ meta: [{ title: "Admin · Projects" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><ProjectsAdmin /></AdminShell>,
});

function ProjectsAdmin() {
  const { token } = useAdmin();
  const del = useServerFn(adminDeleteProjects);
  const list = useServerFn(adminListProjects);
  const q = useQuery({ queryKey: ["admin-projects"], queryFn: async () => await list({ data: { token: token! } }) });
  
  const rows = q.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Title</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Collab</th>
              <th className="p-3">When</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">@{p.owner_username}</td>
                <td className="p-3 max-w-xs truncate">{p.title}</td>
                <td className="p-3">{p.rating_count ? (p.total_rating / p.rating_count).toFixed(1) : "—"} ({p.rating_count} votes)</td>
                <td className="p-3">{p.looking_for_collaborators ? "Yes" : "No"}</td>
                <td className="p-3 text-xs text-muted-foreground">{timeAgo(p.created_at)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive" 
                      onClick={async () => { 
                        if (!confirm("Delete this project?")) return;
                        try {
                          await del({ data: { token: token!, ids: [p.id] } }); 
                          toast.success("Deleted"); 
                          q.refetch(); 
                        } catch (e: any) {
                          toast.error(e.message || "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">No projects found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
