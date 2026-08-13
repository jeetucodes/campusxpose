import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = env.match(/SUPABASE_URL="([^"]+)"/)?.[1];
const SUPABASE_ANON_KEY = env.match(/SUPABASE_ANON_KEY="([^"]+)"/)?.[1];

async function testFetch(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  const text = await res.text();
  console.log(`Table: ${table} | Status: ${res.status}`);
  if (!res.ok) console.log(text);
}

async function run() {
  await testFetch('store_products');
  await testFetch('store_categories');
  await testFetch('store_banners');
}

run();
