import React, { useMemo } from 'react';

// Data Structures
interface TeamStat {
  name: string;
  code: string; // ISO country code for flag
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // Goals For
  ga: number; // Goals Against
  points: number;
}

interface Group {
  name: string;
  teams: TeamStat[];
}

// World Cup 2026 Simulator Groups
const GROUPS_DATA: Group[] = [
  {
    name: 'Bảng A',
    teams: [
      { name: 'Mexico', code: 'mx', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Nam Phi', code: 'za', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Hàn Quốc', code: 'kr', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Cộng hòa Séc', code: 'cz', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng B',
    teams: [
      { name: 'Canada', code: 'ca', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Bosnia & HZ', code: 'ba', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Qatar', code: 'qa', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Thụy Sĩ', code: 'ch', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng C',
    teams: [
      { name: 'Brazil', code: 'br', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Maroc', code: 'ma', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Haiti', code: 'ht', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Scotland', code: 'gb-sct', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng D',
    teams: [
      { name: 'Hoa Kỳ', code: 'us', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Paraguay', code: 'py', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Úc', code: 'au', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Thổ Nhĩ Kỳ', code: 'tr', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng E',
    teams: [
      { name: 'Đức', code: 'de', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Curaçao', code: 'cw', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Bờ Biển Ngà', code: 'ci', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Ecuador', code: 'ec', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng F',
    teams: [
      { name: 'Hà Lan', code: 'nl', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Nhật Bản', code: 'jp', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Thụy Điển', code: 'se', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Tunisia', code: 'tn', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng G',
    teams: [
      { name: 'Bỉ', code: 'be', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Ai Cập', code: 'eg', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Iran', code: 'ir', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'New Zealand', code: 'nz', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng H',
    teams: [
      { name: 'Tây Ban Nha', code: 'es', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Cape Verde', code: 'cv', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Ả Rập Xê Út', code: 'sa', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Uruguay', code: 'uy', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng I',
    teams: [
      { name: 'Pháp', code: 'fr', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Senegal', code: 'sn', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Iraq', code: 'iq', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Na Uy', code: 'no', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng J',
    teams: [
      { name: 'Argentina', code: 'ar', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Algeria', code: 'dz', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Áo', code: 'at', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Jordan', code: 'jo', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng K',
    teams: [
      { name: 'Bồ Đào Nha', code: 'pt', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'CHDC Congo', code: 'cd', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Uzbekistan', code: 'uz', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Colombia', code: 'co', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  },
  {
    name: 'Bảng L',
    teams: [
      { name: 'Anh', code: 'gb-eng', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Croatia', code: 'hr', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Ghana', code: 'gh', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
      { name: 'Panama', code: 'pa', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    ]
  }
];

const StandingsPage: React.FC = () => {
  // Sort teams correctly (Pts -> GD -> GF)
  const sortedGroups = useMemo(() => {
    return GROUPS_DATA.map(group => {
      const sortedTeams = [...group.teams].sort((a, b) => {
        // Points
        if (b.points !== a.points) return b.points - a.points;
        // Goal Difference
        const gdA = a.gf - a.ga;
        const gdB = b.gf - b.ga;
        if (gdB !== gdA) return gdB - gdA;
        // Goals For
        return b.gf - a.gf;
      });
      return { ...group, teams: sortedTeams };
    });
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden text-white pb-32">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 opacity-40 blur-sm pointer-events-none"
        style={{
          backgroundImage: 'url("/world_cup_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="relative z-10">
        {/* Header Banner */}
        <div className="bg-[#1a2f1a] border-b border-white/10 px-6 py-12 mb-8 relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <h1 className="text-2xl md:text-4xl font-black text-white mb-2 uppercase tracking-widest flex items-center gap-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <span className="text-emerald-400">📈 BẢNG ĐẤU</span>
            </h1>
            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">
              Vòng Bảng - World Cup 2026
            </p>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedGroups.map((group) => (
            <div key={group.name} className="bg-[#1a1a1a] rounded-[24px] border border-white/10 overflow-hidden shadow-2xl transition-transform hover:scale-[1.01]">
              <div className="bg-gradient-to-r from-emerald-600/20 to-transparent px-6 py-4 flex items-center gap-3 border-b border-white/5">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center font-black text-emerald-400 border border-emerald-500/30">
                  {group.name.split(' ')[1]}
                </span>
                <h2 className="text-lg font-black uppercase tracking-widest text-white">{group.name}</h2>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[340px]">
                  <thead>
                    <tr className="bg-black/40 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-4 py-3 w-10 text-center">#</th>
                      <th className="px-2 py-3">Đội</th>
                      <th className="px-2 py-3 text-center">T</th>
                      <th className="px-2 py-3 text-center" title="Hiệu số">HS</th>
                      <th className="px-4 py-3 text-center text-emerald-400">Đ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[13px] font-bold">
                    {group.teams.map((team, index) => {
                      const rank = index + 1;
                      const isPromoted = rank <= 2; // top 2 advance directly
                      const isPlayoff = rank === 3; // 8 best 3rd advance, we mark all 3rd tentatively
                      const gd = team.gf - team.ga;

                      return (
                        <tr key={team.name} className="hover:bg-white/5 transition-colors group">
                          <td className="px-4 py-3 text-center relative">
                            {isPromoted && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                            {isPlayoff && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                            <span className={rank === 1 ? 'text-white' : 'text-slate-400'}>{rank}</span>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  src={`https://flagcdn.com/w40/${team.code.toLowerCase()}.png`}
                                  alt={team.name}
                                  className="w-6 h-4 object-cover rounded-[2px] shadow-sm transform group-hover:scale-110 transition-transform"
                                />
                                {rank === 1 && (
                                  <div className="absolute -top-2 -right-2 text-[10px]">👑</div>
                                )}
                              </div>
                              <span className={`truncate max-w-[100px] sm:max-w-[120px] ${rank <= 2 ? 'text-white font-black' : 'text-slate-300'}`}>
                                {team.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center text-slate-400 font-mono">{team.played}</td>
                          <td className="px-2 py-3 text-center font-mono">
                            <span className={gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-slate-400'}>
                              {gd > 0 ? `+${gd}` : gd}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-black font-mono text-emerald-400 text-[15px]">
                            {team.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 px-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Đi tiếp (Top 2)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Xét Đi Tiếp (Hạng 3)</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default StandingsPage;
