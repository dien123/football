import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env from local directory
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

const TARGET_NAMES = [
  'PHIÊU LƯU KÝ',
  'vua EPL 2026',
  'Nha vua EPL acc phu',
  'Vương Ngô',
  'Ý Võ (Tiktok @vovanyngu)',
  'Vy Nguyen',
  'Bạn e Triều DC43',
  'Tài F',
  'em G giấu tênn',
  'Thái Phong - DC 13',
  'Vinh LEE'
];

async function run() {
  const args = process.argv.slice(2);
  let filterNames = TARGET_NAMES;
  
  if (args.length > 0) {
    const customName = args.join(' ');
    filterNames = [customName];
    console.log(`Lọc danh sách cược cho tên: "${customName}"...`);
  } else {
    console.log('Lọc danh sách cược cho các tên trên bảng đấu mặc định...');
  }

  // Fetch all matches to resolve match names
  const { data: matches } = await supabase
    .from('matches')
    .select('id, team_a_name, team_b_name');

  const matchMap = {};
  if (matches) {
    matches.forEach(m => {
      matchMap[m.id] = `${m.team_a_name} vs ${m.team_b_name}`;
    });
  }

  // Fetch bets
  const { data: bets, error } = await supabase
    .from('bets')
    .select('*')
    .in('user_name', filterNames);

  if (error) {
    console.error('Lỗi khi truy vấn:', error);
    return;
  }

  if (!bets || bets.length === 0) {
    console.log('Không tìm thấy lượt cược nào cho các tên đã nhập.');
    return;
  }

  console.log(`\nTìm thấy ${bets.length} lượt cược:\n`);
  
  // Format console output
  console.log(''.padEnd(100, '-'));
  console.log(
    'Tên người chơi'.padEnd(25) + ' | ' +
    'Trận đấu'.padEnd(30) + ' | ' +
    'Cửa đặt'.padEnd(15) + ' | ' +
    'Giá trị'.padEnd(20)
  );
  console.log(''.padEnd(100, '-'));
  
  bets.forEach(b => {
    const matchName = matchMap[b.match_id] || 'Trận đấu không xác định';
    const displayAmount = (b.amount / 1000).toLocaleString('vi-VN');
    console.log(
      b.user_name.padEnd(25) + ' | ' +
      matchName.padEnd(30) + ' | ' +
      b.option.padEnd(15) + ' | ' +
      `${displayAmount} điểm (${b.amount.toLocaleString('vi-VN')}đ)`
    );
  });
  console.log(''.padEnd(100, '-'));
}

run().catch(console.error);
