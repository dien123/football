import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key && val) env[key] = val.replace(/['"]/g, '');
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function run() {
  const email = 'phuongdien997@gmail.com';
  
  // Find dc13_profile
  const { data: profile } = await supabase
    .from('dc13_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
    
  console.log('Profile:', profile);
  
  if (profile) {
    const { data: bets } = await supabase
      .from('dc13_bets')
      .select('*')
      .eq('user_id', profile.id);
    console.log('Bets count:', bets?.length);
    console.log('Bets:', bets);
  }
}

run().catch(console.error);
