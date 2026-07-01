#!/usr/bin/env node
/**
 * One-time migration script: Creates the Projects feature tables in Supabase.
 * Run: node scripts/create-projects-tables.mjs
 */

const SUPABASE_URL = "https://tsmvnbtckrnxorhlovei.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzbXZuYnRja3JueG9yaGxvdmVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg0MjIzOSwiZXhwIjoyMDk4NDE4MjM5fQ.Jp72_Dmr5ze_Ta24vd7Qve1e1dglGOmRrRBz3lYJKA8";
const PROJECT_REF = "tsmvnbtckrnxorhlovei";

const SQL = `
-- 1. Projects table
create table if not exists projects (
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
);

-- 2. Project ratings
create table if not exists project_ratings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  rater_ghost_id text not null,
  rater_username text not null,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamp default now(),
  unique(project_id, rater_ghost_id)
);

-- 3. Collaborate requests
create table if not exists collaborate_requests (
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
);

-- Enable RLS
alter table projects enable row level security;
alter table project_ratings enable row level security;
alter table collaborate_requests enable row level security;

-- Permissive policies (service role bypasses RLS, but frontend needs read access)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'projects' and policyname = 'allow_all_projects'
  ) then
    create policy allow_all_projects on projects for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'project_ratings' and policyname = 'allow_all_ratings'
  ) then
    create policy allow_all_ratings on project_ratings for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'collaborate_requests' and policyname = 'allow_all_collab'
  ) then
    create policy allow_all_collab on collaborate_requests for all using (true) with check (true);
  end if;
end $$;
`;

async function runSQL(sql) {
  // Try Supabase Management API first
  const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  console.log("Trying Supabase Management API...");
  try {
    const res = await fetch(mgmtUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    const text = await res.text();
    if (res.ok) {
      console.log("✅ Management API succeeded:", text);
      return true;
    }
    console.log(`Management API returned ${res.status}: ${text}`);
  } catch (e) {
    console.log("Management API error:", e.message);
  }

  // Try via PostgREST rpc endpoint (if exec_sql function exists)
  console.log("\nTrying PostgREST rpc/exec_sql...");
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log("✅ exec_sql rpc succeeded:", text);
      return true;
    }
    console.log(`exec_sql returned ${res.status}: ${text}`);
  } catch (e) {
    console.log("exec_sql error:", e.message);
  }

  return false;
}

async function checkTablesExist() {
  const checkSql = `
    select table_name from information_schema.tables 
    where table_schema = 'public' 
    and table_name in ('projects', 'project_ratings', 'collaborate_requests')
    order by table_name;
  `;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql: checkSql }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}

  // Fallback: try to query the tables directly
  const tables = ["projects", "project_ratings", "collaborate_requests"];
  const found = [];
  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      if (res.status !== 404 && res.status !== 400) {
        found.push(table);
      }
    } catch {}
  }
  return found;
}

async function main() {
  console.log("🔍 Checking existing tables...");
  const existing = await checkTablesExist();
  console.log("Found tables:", existing);

  console.log("\n🚀 Running Projects feature migration...\n");
  const success = await runSQL(SQL);

  if (!success) {
    console.log("\n❌ Automated migration failed.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 MANUAL STEP REQUIRED:");
    console.log("1. Go to https://supabase.com/dashboard/project/tsmvnbtckrnxorhlovei/sql/new");
    console.log("2. Paste the SQL from: supabase/migrations/20260701095000_projects_feature.sql");
    console.log("3. Click Run");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } else {
    console.log("\n✅ Migration complete! Tables created.");

    console.log("\n🔍 Verifying tables...");
    const tables = ["projects", "project_ratings", "collaborate_requests"];
    for (const table of tables) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, {
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        if (res.ok || res.status === 200) {
          console.log(`  ✅ ${table} — OK`);
        } else {
          console.log(`  ❌ ${table} — HTTP ${res.status}`);
        }
      } catch (e) {
        console.log(`  ❌ ${table} — ${e.message}`);
      }
    }
  }
}

main().catch(console.error);
