import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = 'd:/Test-Antigravity-Claude/football-bet/Frontend_clone/.env';
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function run() {
  const { data: profiles, error } = await supabase
    .from('dc13_profiles')
    .select('*')
    .ilike('email', '%phuongdien%');
    
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Profiles matching phuongdien:', profiles);
}

run().catch(console.error);
