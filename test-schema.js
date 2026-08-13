import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = env.match(/SUPABASE_URL="([^"]+)"/)?.[1];
const SUPABASE_ANON_KEY = env.match(/SUPABASE_ANON_KEY="([^"]+)"/)?.[1];

async function checkSchema() {
  const url = `${SUPABASE_URL}/rest/v1/store_banners?select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  const data = await res.json();
  console.log("Banner data:", data);
}

checkSchema();
