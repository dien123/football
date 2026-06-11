import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env variables
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function run() {
  // Let's get the first match ID
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .limit(1);
  
  if (!matches || matches.length === 0) {
    console.log('No matches found.');
    return;
  }
  
  const matchId = matches[0].id;
  console.log(`Attempting to update match ${matchId} with dc13_handicap = -0.5, dc13_favorite_team = teamB, dc13_handicap_set = true...`);
  
  const { error } = await supabase
    .from('matches')
    .update({
      dc13_handicap: -0.5,
      dc13_favorite_team: 'teamB',
      dc13_handicap_set: true
    })
    .eq('id', matchId);
    
  if (error) {
    console.error('Update FAILED with database error:', error);
  } else {
    console.log('Update succeeded without any database errors!');
  }
}

run().catch(console.error);
