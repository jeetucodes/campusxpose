import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = env.match(/SUPABASE_URL="([^"]+)"/)?.[1];
const SUPABASE_ANON_KEY = env.match(/SUPABASE_ANON_KEY="([^"]+)"/)?.[1];

async function checkBanners() {
  const url = `${SUPABASE_URL}/rest/v1/store_banners?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
checkBanners();
