import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * ONE-TIME MIGRATION: Creates Projects feature tables in Supabase.
 * Access via: GET /api/setup-projects
 * DELETE THIS FILE after tables are created!
 */
export const runProjectsMigration = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const steps: { step: string; ok: boolean; error?: string }[] = [];

    async function runSQL(step: string, sql: string) {
      try {
        // Use pg via supabase's internal postgres connection
        const { error } = await (supabaseAdmin as any).rpc("exec_sql", { sql });
        if (error) throw error;
        steps.push({ step, ok: true });
      } catch (e: any) {
        steps.push({ step, ok: false, error: e?.message ?? String(e) });
      }
    }

    // Try creating tables via raw SQL through management API
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const PROJECT_REF = process.env.SUPABASE_PROJECT_ID ?? "tsmvnbtckrnxorhlovei";

    const SQL_STATEMENTS = [
      {
        name: "Create projects table",
        sql: `create table if not exists projects (
          id uuid primary key default gen_random_uuid(),
          owner_ghost_id text not null,
          owner_username text not null,
          title text not null,
          description text,
          image_url text,
          tags text[],
          github_url text,
          live_url text,
          looking_for_collaborators boolean default false,
          created_at timestamp default now()
        )`,
      },
      {
        name: "Create project_ratings table",
        sql: `create table if not exists project_ratings (
          id uuid primary key default gen_random_uuid(),
          project_id uuid references projects(id) on delete cascade,
          rater_ghost_id text not null,
          rater_username text not null,
          rating integer check (rating between 1 and 5),
          comment text,
          created_at timestamp default now(),
          unique(project_id, rater_ghost_id)
        )`,
      },
      {
        name: "Create collaborate_requests table",
        sql: `create table if not exists collaborate_requests (
          id uuid primary key default gen_random_uuid(),
          project_id uuid references projects(id) on delete cascade,
          project_title text not null,
          sender_ghost_id text not null,
          sender_username text not null,
          owner_ghost_id text not null,
          owner_username text not null,
          message text,
          skills text,
          status text default 'pending',
          created_at timestamp default now()
        )`,
      },
      {
        name: "Enable RLS on projects",
        sql: `alter table projects enable row level security`,
      },
      {
        name: "Enable RLS on project_ratings",
        sql: `alter table project_ratings enable row level security`,
      },
      {
        name: "Enable RLS on collaborate_requests",
        sql: `alter table collaborate_requests enable row level security`,
      },
      {
        name: "RLS policy: projects",
        sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='projects' and policyname='allow_all_projects') then
            create policy allow_all_projects on projects for all using (true) with check (true);
          end if; end $$`,
      },
      {
        name: "RLS policy: project_ratings",
        sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='project_ratings' and policyname='allow_all_ratings') then
            create policy allow_all_ratings on project_ratings for all using (true) with check (true);
          end if; end $$`,
      },
      {
        name: "RLS policy: collaborate_requests",
        sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='collaborate_requests' and policyname='allow_all_collab') then
            create policy allow_all_collab on collaborate_requests for all using (true) with check (true);
          end if; end $$`,
      },
    ];

    // Try via Supabase Management API
    for (const { name, sql } of SQL_STATEMENTS) {
      try {
        const res = await fetch(
          `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_ROLE}`,
            },
            body: JSON.stringify({ query: sql }),
          },
        );

        if (res.ok) {
          steps.push({ step: name, ok: true });
        } else {
          const body = await res.text();
          steps.push({ step: name, ok: false, error: `HTTP ${res.status}: ${body}` });
        }
      } catch (e: any) {
        steps.push({ step: name, ok: false, error: e?.message ?? "network error" });
      }
    }

    // Verify tables exist by trying to query them
    const verify: Record<string, boolean> = {};
    for (const table of ["projects", "project_ratings", "collaborate_requests"]) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, {
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
        });
        verify[table] = res.ok || res.status === 200;
      } catch {
        verify[table] = false;
      }
    }

    return { steps, verify };
  },
);
