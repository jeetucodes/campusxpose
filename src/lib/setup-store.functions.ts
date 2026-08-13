import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * ONE-TIME MIGRATION: Creates Store feature tables in Supabase.
 * Access via: GET /api/setup-store
 * DELETE THIS FILE after tables are created!
 */
export const runStoreMigration = createServerFn({ method: "GET" }).handler(async () => {
  const steps: { step: string; ok: boolean; error?: string }[] = [];

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const PROJECT_REF = process.env.SUPABASE_PROJECT_ID ?? "tsmvnbtckrnxorhlovei";

  const SQL_STATEMENTS = [
    {
      name: "Create store_categories table",
      sql: `create table if not exists store_categories (
          id uuid primary key default gen_random_uuid(),
          name text not null,
          icon_url text,
          color_class text,
          created_at timestamp default now()
        )`,
    },
    {
      name: "Create store_banners table",
      sql: `create table if not exists store_banners (
          id uuid primary key default gen_random_uuid(),
          title text not null,
          category text not null,
          badge_text text,
          image_url text,
          bg_class text,
          text_class text,
          badge_bg_class text,
          badge_text_class text,
          badge_border_class text,
          created_at timestamp default now()
        )`,
    },
    {
      name: "Create store_products table",
      sql: `create table if not exists store_products (
          id uuid primary key default gen_random_uuid(),
          name text not null,
          qty text not null,
          price text not null,
          original_price text,
          time text,
          icon_url text,
          platform text,
          category text,
          description text,
          features text[],
          is_hot_deal boolean default false,
          created_at timestamp default now()
        )`,
    },
    {
      name: "Enable RLS on store_categories",
      sql: `alter table store_categories enable row level security`,
    },
    {
      name: "Enable RLS on store_banners",
      sql: `alter table store_banners enable row level security`,
    },
    {
      name: "Enable RLS on store_products",
      sql: `alter table store_products enable row level security`,
    },
    {
      name: "RLS policy: allow all to read categories",
      sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='store_categories' and policyname='allow_all_read_categories') then
            create policy allow_all_read_categories on store_categories for select using (true);
          end if; end $$`,
    },
    {
      name: "RLS policy: allow all to read banners",
      sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='store_banners' and policyname='allow_all_read_banners') then
            create policy allow_all_read_banners on store_banners for select using (true);
          end if; end $$`,
    },
    {
      name: "RLS policy: allow all to read products",
      sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='store_products' and policyname='allow_all_read_products') then
            create policy allow_all_read_products on store_products for select using (true);
          end if; end $$`,
    },
    // We assume admins can write, but for simplicity of setup we allow all to write to the store via the UI in this prototype.
    // In production, you would restrict INSERT/UPDATE/DELETE to authenticated admin users.
    {
      name: "RLS policy: allow all to write categories",
      sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='store_categories' and policyname='allow_all_write_categories') then
            create policy allow_all_write_categories on store_categories for all using (true) with check (true);
          end if; end $$`,
    },
    {
      name: "RLS policy: allow all to write banners",
      sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='store_banners' and policyname='allow_all_write_banners') then
            create policy allow_all_write_banners on store_banners for all using (true) with check (true);
          end if; end $$`,
    },
    {
      name: "RLS policy: allow all to write products",
      sql: `do $$ begin
          if not exists (select 1 from pg_policies where tablename='store_products' and policyname='allow_all_write_products') then
            create policy allow_all_write_products on store_products for all using (true) with check (true);
          end if; end $$`,
    }
  ];

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

  const verify: Record<string, boolean> = {};
  for (const table of ["store_categories", "store_banners", "store_products"]) {
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
});
