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
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching matches:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in matches table:', Object.keys(data[0]));
    console.log('Sample match:', data[0]);
  } else {
    console.log('No matches found.');
  }
}

run().catch(console.error);
