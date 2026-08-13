import fs from 'fs';

const SUPABASE_URL = "https://tsmvnbtckrnxorhlovei.supabase.co";
const SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzbXZuYnRja3JueG9yaGxvdmVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg0MjIzOSwiZXhwIjoyMDk4NDE4MjM5fQ.Jp72_Dmr5ze_Ta24vd7Qve1e1dglGOmRrRBz3lYJKA8";
const PROJECT_REF = "tsmvnbtckrnxorhlovei";

const SQL = `
create table if not exists store_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  color_class text,
  created_at timestamp default now()
);
create table if not exists store_banners (
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
);
create table if not exists store_products (
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
);

alter table store_categories enable row level security;
alter table store_banners enable row level security;
alter table store_products enable row level security;

do $$ begin if not exists (select 1 from pg_policies where tablename='store_categories' and policyname='allow_all_read_categories') then create policy allow_all_read_categories on store_categories for select using (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where tablename='store_banners' and policyname='allow_all_read_banners') then create policy allow_all_read_banners on store_banners for select using (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where tablename='store_products' and policyname='allow_all_read_products') then create policy allow_all_read_products on store_products for select using (true); end if; end $$;

do $$ begin if not exists (select 1 from pg_policies where tablename='store_categories' and policyname='allow_all_write_categories') then create policy allow_all_write_categories on store_categories for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where tablename='store_banners' and policyname='allow_all_write_banners') then create policy allow_all_write_banners on store_banners for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where tablename='store_products' and policyname='allow_all_write_products') then create policy allow_all_write_products on store_products for all using (true) with check (true); end if; end $$;
`;

const categories = [
  { name: "Snacks", icon_url: "/shop/cat_snacks_1786624546251.png", color_class: "bg-orange-50" },
  { name: "Electronics", icon_url: "/shop/cat_electronics_1786624683132.png", color_class: "bg-blue-50" },
  { name: "Study", icon_url: "/shop/cat_study_1786624743210.png", color_class: "bg-purple-50" },
  { name: "Stationery", icon_url: "/shop/cat_stationery_1786624756922.png", color_class: "bg-red-50" },
  { name: "Audio", icon_url: "/shop/cat_audio_1786624820961.png", color_class: "bg-green-50" },
  { name: "Gaming", icon_url: "/shop/cat_gaming_1786625388222.png", color_class: "bg-indigo-50" },
  { name: "Fitness", icon_url: "/shop/cat_fitness_1786625416729.png", color_class: "bg-slate-50" },
  { name: "Wearables", icon_url: "/shop/cat_wearables_1786625466231.png", color_class: "bg-pink-50" }
];

const banners = [
  { title: "Laptops & Tabs", category: "Electronics", badge_text: "Up to 40% OFF", image_url: "/shop/shop_banner_1786623248806.png", bg_class: "bg-blue-50", text_class: "text-blue-900", badge_bg_class: "bg-blue-200", badge_text_class: "text-blue-700", badge_border_class: "border-blue-900" },
  { title: "Midnight Snacks", category: "Snacks", badge_text: "Delivery in 10 mins", image_url: "/shop/cat_snacks_1786624546251.png", bg_class: "bg-orange-50", text_class: "text-orange-900", badge_bg_class: "bg-orange-200", badge_text_class: "text-orange-700", badge_border_class: "border-orange-900" },
  { title: "Study Books", category: "Study", badge_text: "Semester Prep", image_url: "/shop/cat_study_1786624743210.png", bg_class: "bg-purple-50", text_class: "text-purple-900", badge_bg_class: "bg-purple-200", badge_text_class: "text-purple-700", badge_border_class: "border-purple-900" },
  { title: "Audio Gear", category: "Audio", badge_text: "Noise Cancelling", image_url: "/shop/cat_audio_1786624820961.png", bg_class: "bg-green-50", text_class: "text-green-900", badge_bg_class: "bg-green-200", badge_text_class: "text-green-700", badge_border_class: "border-green-900" }
];

async function main() {
  console.log("Creating tables...");
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ query: SQL }),
    });
    if (!res.ok) console.error("Table creation error:", await res.text());
    else console.log("Tables created successfully.");
  } catch(e) {
    console.error("Management API failed:", e.message);
  }

  console.log("Seeding categories...");
  for (const cat of categories) {
    await fetch(`${SUPABASE_URL}/rest/v1/store_categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
      body: JSON.stringify(cat),
    });
  }

  console.log("Seeding banners...");
  for (const ban of banners) {
    await fetch(`${SUPABASE_URL}/rest/v1/store_banners`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
      body: JSON.stringify(ban),
    });
  }
  console.log("Done seeding!");
}

main();
