import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_PROJECT_ID = env.match(/SUPABASE_PROJECT_ID="([^"]+)"/)?.[1];
const SUPABASE_SERVICE_ROLE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)?.[1];

async function migrate() {
  const sql = `ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS button_text text; ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS button_link text;`;
  
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (res.ok) {
    console.log("Migration successful");
  } else {
    console.error("Migration failed", await res.text());
  }
}

migrate();
