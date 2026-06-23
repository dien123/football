import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key && val) env[key] = val;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL']?.replace(/['"]/g, '');
const supabaseKey = env['VITE_SUPABASE_ANON_KEY']?.replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name');
  if (error) {
    console.error(error);
  } else {
    console.log('Profiles:', profiles);
  }
}

run().catch(console.error);
