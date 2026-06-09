import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Match } from '../types';

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
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<{ name: string; code: string } | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .order('start_time', { ascending: true });
        if (!error && data) {
          setMatches(data);
        }
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();

    const channel = supabase
      .channel('public:matches_standings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const normalizeTeamName = (name: string): string => {
    const normalized = name.trim().toLowerCase();
    if (normalized === 'mỹ') return 'hoa kỳ';
    if (normalized === 'bosnia') return 'bosnia & hz';
    if (normalized === 'bosnia & herzegovina') return 'bosnia & hz';
    if (normalized === 'séngal') return 'senegal';
    return normalized;
  };

  // Sort teams correctly (Pts -> GD -> GF)
  const sortedGroups = useMemo(() => {
    // Clone GROUPS_DATA to avoid mutating the original reference
    const groups = GROUPS_DATA.map(group => ({
      ...group,
      teams: group.teams.map(team => ({
        ...team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0
      }))
    }));

    // Iterate through all matches that are finished
    matches.forEach(match => {
      if (match.status !== 'finished') return;
      const teamAName = match.team_a_name;
      const teamBName = match.team_b_name;
      const scoreA = match.score_a ?? 0;
      const scoreB = match.score_b ?? 0;

      const normA = normalizeTeamName(teamAName);
      const normB = normalizeTeamName(teamBName);

      groups.forEach(group => {
        group.teams.forEach(team => {
          const teamCode = team.code.toLowerCase();
          const matchCodeA = match.team_a_code?.toLowerCase();
          const matchCodeB = match.team_b_code?.toLowerCase();

          const normTeamName = normalizeTeamName(team.name);

          const isTeamA = (matchCodeA && matchCodeA === teamCode) || (normTeamName === normA);
          const isTeamB = (matchCodeB && matchCodeB === teamCode) || (normTeamName === normB);

          if (isTeamA) {
            team.played += 1;
            team.gf += scoreA;
            team.ga += scoreB;
            if (scoreA > scoreB) {
              team.won += 1;
              team.points += 3;
            } else if (scoreA === scoreB) {
              team.drawn += 1;
              team.points += 1;
            } else {
              team.lost += 1;
            }
          } else if (isTeamB) {
            team.played += 1;
            team.gf += scoreB;
            team.ga += scoreA;
            if (scoreB > scoreA) {
              team.won += 1;
              team.points += 3;
            } else if (scoreB === scoreA) {
              team.drawn += 1;
              team.points += 1;
            } else {
              team.lost += 1;
            }
          }
        });
      });
    });

    return groups.map(group => {
      const sortedTeams = [...group.teams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.gf - a.ga;
        const gdB = b.gf - b.ga;
        if (gdB !== gdA) return gdB - gdA;
        return b.gf - a.gf;
      });
      return { ...group, teams: sortedTeams };
    });
  }, [matches]);

  // Compute selected team's matches
  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    const normSelected = normalizeTeamName(selectedTeam.name);
    const selectedCode = selectedTeam.code.toLowerCase();
    return matches.filter(m => {
      const normA = normalizeTeamName(m.team_a_name);
      const normB = normalizeTeamName(m.team_b_name);
      const codeA = m.team_a_code?.toLowerCase();
      const codeB = m.team_b_code?.toLowerCase();
      return codeA === selectedCode || codeB === selectedCode || normA === normSelected || normB === normSelected;
    });
  }, [selectedTeam, matches]);

  // Compute selected team's standings stats
  const selectedTeamStats = useMemo(() => {
    if (!selectedTeam) return null;
    const normSelected = normalizeTeamName(selectedTeam.name);
    const selectedCode = selectedTeam.code.toLowerCase();
    for (const group of sortedGroups) {
      const found = group.teams.find(t => t.code.toLowerCase() === selectedCode || normalizeTeamName(t.name) === normSelected);
      if (found) return found;
    }
    return null;
  }, [selectedTeam, sortedGroups]);

  return (
    <div className="min-h-screen relative overflow-hidden text-white pb-12">
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
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#1a1a1a] rounded-[24px] border border-white/10 overflow-hidden shadow-2xl animate-pulse">
                  <div className="bg-white/5 px-6 py-4 flex items-center gap-3 border-b border-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-24 h-4 bg-white/10 rounded" />
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="w-full h-5 bg-white/5 rounded" />
                    <div className="w-full h-5 bg-white/5 rounded" />
                    <div className="w-full h-5 bg-white/5 rounded" />
                    <div className="w-full h-5 bg-white/5 rounded" />
                  </div>
                </div>
              ))
            ) : (
              sortedGroups.map((group) => (
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
                            <tr
                              key={team.name}
                              onClick={() => setSelectedTeam({ name: team.name, code: team.code })}
                              className="hover:bg-white/10 cursor-pointer transition-colors group"
                            >
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
                                    {/* {rank === 1 && (
                                  <div className="absolute -top-2 -right-2 text-[10px]">👑</div>
                                )} */}
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
              ))
            )}
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

      {/* Selected Team Match Detail Modal */}
      {selectedTeam && selectedTeamStats && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedTeam(null)}
          />
          {/* Card */}
          <div className="relative z-10 w-full max-w-lg bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-6 text-center relative shrink-0">
              <button
                onClick={() => setSelectedTeam(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
              <div className="w-16 h-11 mx-auto mb-3 rounded overflow-hidden border border-white/20 shadow-md">
                <img
                  src={`https://flagcdn.com/w160/${selectedTeam.code.toLowerCase()}.png`}
                  className="w-full h-full object-cover"
                  alt={selectedTeam.name}
                />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">{selectedTeam.name}</h2>
              <p className="text-emerald-100 text-[12px] font-bold mt-1 uppercase tracking-widest">Chi Tiết Trận Đấu & Thống Kê</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto no-scrollbar space-y-6 flex-1">
              {/* Stats Summary Grid */}
              <div>
                <p className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Thống kê vòng bảng</p>
                <div className="grid grid-cols-6 gap-2 text-center text-[11px] font-black">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                    <p className="text-slate-500 text-[9px] uppercase mb-1">Trận</p>
                    <p className="text-white text-sm font-mono">{selectedTeamStats.played}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-2.5">
                    <p className="text-emerald-500 text-[9px] uppercase mb-1">Thắng</p>
                    <p className="text-emerald-400 text-sm font-mono">{selectedTeamStats.won}</p>
                  </div>
                  <div className="bg-slate-500/10 border border-slate-500/10 rounded-xl p-2.5">
                    <p className="text-slate-400 text-[9px] uppercase mb-1">Hòa</p>
                    <p className="text-slate-300 text-sm font-mono">{selectedTeamStats.drawn}</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/10 rounded-xl p-2.5">
                    <p className="text-rose-500 text-[9px] uppercase mb-1">Thua</p>
                    <p className="text-rose-400 text-sm font-mono">{selectedTeamStats.lost}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                    <p className="text-slate-500 text-[9px] uppercase mb-1">HS</p>
                    <p className="text-white text-sm font-mono">
                      {(selectedTeamStats.gf - selectedTeamStats.ga) > 0 ? `+${selectedTeamStats.gf - selectedTeamStats.ga}` : selectedTeamStats.gf - selectedTeamStats.ga}
                    </p>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/10 rounded-xl p-2.5">
                    <p className="text-cyan-500 text-[9px] uppercase mb-1">Điểm</p>
                    <p className="text-cyan-400 text-sm font-mono">{selectedTeamStats.points}</p>
                  </div>
                </div>
              </div>

              {/* Match List */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Danh sách trận đấu ({teamMatches.length})</p>
                <div className="space-y-3">
                  {teamMatches.map(m => {
                    const isFinished = m.status === 'finished';
                    const isLive = m.status === 'live';

                    // Determine match result from selectedTeam perspective
                    let resultClass = "border-white/5 bg-white/[0.02]";
                    let resultText = "";
                    if (isFinished) {
                      const isTeamA = (m.team_a_code?.toLowerCase() === selectedTeam.code.toLowerCase()) ||
                        (normalizeTeamName(m.team_a_name) === normalizeTeamName(selectedTeam.name));
                      const myScore = isTeamA ? (m.score_a ?? 0) : (m.score_b ?? 0);
                      const oppScore = isTeamA ? (m.score_b ?? 0) : (m.score_a ?? 0);

                      if (myScore > oppScore) {
                        resultClass = "border-emerald-500/20 bg-emerald-500/5";
                        resultText = "Thắng ✅";
                      } else if (myScore < oppScore) {
                        resultClass = "border-rose-500/20 bg-rose-500/5";
                        resultText = "Thua ❌";
                      } else {
                        resultClass = "border-slate-500/20 bg-slate-500/5";
                        resultText = "Hòa 🤝";
                      }
                    } else if (isLive) {
                      resultClass = "border-rose-500/30 bg-rose-500/[0.02]";
                      resultText = "🔴 LIVE";
                    }

                    return (
                      <div
                        key={m.id}
                        className={`border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${resultClass}`}
                      >
                        <div className="min-w-0 flex-1">
                          {/* Match Header Info */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isLive ? 'bg-rose-500 text-white animate-pulse' :
                              isFinished ? 'bg-slate-700 text-slate-400' : 'bg-white/10 text-slate-400'
                              }`}>
                              {isLive ? 'Live' : isFinished ? 'Kết thúc' : 'Sắp đá'}
                            </span>
                            <span className="text-[12px] text-slate-500 font-bold">
                              {new Date(m.start_time).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {resultText && (
                              <span className={`text-[9px] font-black uppercase tracking-wider ${resultText.includes('Thắng') ? 'text-emerald-400' :
                                resultText.includes('Thua') ? 'text-rose-400' : 'text-slate-400'
                                }`}>
                                {resultText}
                              </span>
                            )}
                          </div>

                          {/* Teams Display */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Team A */}
                            <div className="flex items-center gap-2 min-w-0 max-w-[45%]">
                              {m.team_a_code && (
                                <div className="w-5 h-3.5 rounded overflow-hidden border border-white/10 shrink-0">
                                  <img
                                    src={`https://flagcdn.com/w40/${m.team_a_code.toLowerCase()}.png`}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                </div>
                              )}
                              <span className={`text-[12px] font-bold uppercase truncate ${(m.team_a_code?.toLowerCase() === selectedTeam.code.toLowerCase()) ||
                                (normalizeTeamName(m.team_a_name) === normalizeTeamName(selectedTeam.name))
                                ? 'text-emerald-400 font-black' : 'text-slate-300'
                                }`}>
                                {m.team_a_name}
                              </span>
                            </div>

                            {/* Score or VS */}
                            <div className="shrink-0 font-mono text-center">
                              {isFinished || isLive ? (
                                <span className={`text-sm font-black px-3 py-1 rounded-lg bg-black/40 ${isLive ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                                  {m.score_a} - {m.score_b}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">VS</span>
                              )}
                            </div>

                            {/* Team B */}
                            <div className="flex items-center justify-end gap-2 min-w-0 max-w-[45%] text-right">
                              <span className={`text-[12px] font-bold uppercase truncate ${(m.team_b_code?.toLowerCase() === selectedTeam.code.toLowerCase()) ||
                                (normalizeTeamName(m.team_b_name) === normalizeTeamName(selectedTeam.name))
                                ? 'text-emerald-400 font-black' : 'text-slate-300'
                                }`}>
                                {m.team_b_name}
                              </span>
                              {m.team_b_code && (
                                <div className="w-5 h-3.5 rounded overflow-hidden border border-white/10 shrink-0">
                                  <img
                                    src={`https://flagcdn.com/w40/${m.team_b_code.toLowerCase()}.png`}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {teamMatches.length === 0 && (
                    <div className="text-center py-8 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                      <p className="text-[11px] text-slate-600 italic">Chưa có thông tin trận đấu nào cho đội này...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandingsPage;
