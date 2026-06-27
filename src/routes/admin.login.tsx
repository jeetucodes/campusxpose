import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { Ghost, Lock } from "lucide-react";
import { adminLogin } from "@/lib/admin.functions";
import { useAdmin } from "@/stores/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — CampusXpose" }, { name: "robots", content: "noindex" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const login = useServerFn(adminLogin);
  const { setToken } = useAdmin();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await login({ data: { password: pw } });
      if (res.ok) {
        setToken(res.token);
        navigate({ to: "/admin/dashboard" });
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <motion.div
        animate={error ? { x: [0, -10, 10, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><Ghost className="h-6 w-6" /></span>
          <h1 className="mt-3 font-extrabold">Campus<span className="text-accent">Xpose</span></h1>
          <span className="mt-1 rounded bg-destructive/20 px-2 py-0.5 text-[10px] font-bold text-destructive">ADMIN PANEL</span>
        </div>
        <label className="text-xs text-muted-foreground">Password</label>
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={`bg-surface-2 pl-9 ${error ? "border-destructive" : ""}`}
            placeholder="Enter admin password"
          />
        </div>
        {error && <p className="mt-2 text-sm text-destructive">Wrong password. Try again.</p>}
        <Button onClick={submit} disabled={busy} className="mt-4 w-full rounded-full">{busy ? "Checking..." : "Login"}</Button>
      </motion.div>
    </div>
  );
}
