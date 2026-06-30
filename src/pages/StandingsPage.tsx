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

// Left Bracket R32 pairs from user's image
const LEFT_R32_PAIRS = [
  { a: 'Germany', b: 'Paraguay' },
  { a: 'France', b: 'Sweden' },
  { a: 'South Africa', b: 'Canada' },
  { a: 'Netherlands', b: 'Morocco' },
  { a: 'Portugal', b: 'Croatia' },
  { a: 'Spain', b: 'Austria' },
  { a: 'USA', b: 'Bosnia and Herzegovina' },
  { a: 'Belgium', b: 'Senegal' }
];

// Right Bracket R32 pairs from user's image
const RIGHT_R32_PAIRS = [
  { a: 'Brazil', b: 'Japan' },
  { a: 'Ivory Coast', b: 'Norway' },
  { a: 'Mexico', b: 'Ecuador' },
  { a: 'England', b: 'DR Congo' },
  { a: 'Argentina', b: 'Cape Verde' },
  { a: 'Australia', b: 'Egypt' },
  { a: 'Switzerland', b: 'Algeria' },
  { a: 'Colombia', b: 'Ghana' }
];

// Component to render a team in the bracket
const TeamDisplay: React.FC<{ name: string; code?: string | null; isWinner: boolean; isPlaceholder: boolean }> = ({ name, code, isWinner, isPlaceholder }) => {
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all ${isWinner ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'}`}>
      <div className="flex items-center gap-2 min-w-0 w-full">
        {code ? (
          <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            className="w-6 h-4 object-cover rounded-[2px] shadow-sm shrink-0"
            alt={name}
          />
        ) : (
          <div className="w-6 h-4 bg-white/10 rounded-[2px] flex items-center justify-center shrink-0">
            <span className="text-[9px] text-slate-500">❓</span>
          </div>
        )}
        <span className={`text-[12px] uppercase truncate flex-1 ${isWinner ? 'text-emerald-400 font-black' : isPlaceholder ? 'text-slate-500 font-normal italic' : 'text-slate-200 font-bold'}`}>
          {name}
        </span>
      </div>
    </div>
  );
};

// Component to render a match card in the bracket with score inputs and advancement selectors
const BracketMatchCard: React.FC<{
  match?: Match;
  teamA: { name: string; code?: string | null; isWinner: boolean };
  teamB: { name: string; code?: string | null; isWinner: boolean };
  scoreA: number;
  scoreB: number;
  title: string;
  onSelectTeam: (team: { name: string; code: string }) => void;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  onInsertAndScore: (roundName: string, teamA: string, teamACode: string | null, teamB: string, teamBCode: string | null, scoreA: number, scoreB: number) => void;
  roundName?: string;
  rawTeamA?: any;
  rawTeamB?: any;
  isFinal?: boolean;
}> = ({ match, teamA, teamB, scoreA, scoreB, title, onSelectTeam, onUpdateScore, onInsertAndScore, roundName, rawTeamA, rawTeamB, isFinal }) => {
  const isFinished = match?.status === 'finished' || match?.dc13_status === 'finished';
  const isLive = match?.status === 'live' || match?.dc13_status === 'live';

  const handleScoreChange = (isTeamA: boolean, val: number) => {
    if (match) {
      if (isTeamA) {
        onUpdateScore(match.id, val, scoreB);
      } else {
        onUpdateScore(match.id, scoreA, val);
      }
    } else if (roundName && rawTeamA && rawTeamB) {
      // Create match in DB on the fly when score is edited
      if (isTeamA) {
        onInsertAndScore(roundName, rawTeamA.name, rawTeamA.code, rawTeamB.name, rawTeamB.code, val, 0);
      } else {
        onInsertAndScore(roundName, rawTeamA.name, rawTeamA.code, rawTeamB.name, rawTeamB.code, 0, val);
      }
    }
  };

  const handleAdvanceClick = (isTeamA: boolean) => {
    if (match) {
      if (isTeamA) {
        const newScoreA = scoreA > scoreB ? scoreA : scoreB + 1;
        onUpdateScore(match.id, newScoreA, scoreB);
      } else {
        const newScoreB = scoreB > scoreA ? scoreB : scoreA + 1;
        onUpdateScore(match.id, scoreA, newScoreB);
      }
    } else if (roundName && rawTeamA && rawTeamB) {
      if (isTeamA) {
        onInsertAndScore(roundName, rawTeamA.name, rawTeamA.code, rawTeamB.name, rawTeamB.code, 1, 0);
      } else {
        onInsertAndScore(roundName, rawTeamA.name, rawTeamA.code, rawTeamB.name, rawTeamB.code, 0, 1);
      }
    }
  };

  const isTeamAClickable = !teamA.name.startsWith('Thắng') && !teamA.name.startsWith('Đội tuyển');
  const isTeamBClickable = !teamB.name.startsWith('Thắng') && !teamB.name.startsWith('Đội tuyển');
  const bothResolved = isTeamAClickable && isTeamBClickable;
  const showInputs = !!match || bothResolved;

  return (
    <div className={`w-[260px] bg-[#141414]/90 backdrop-blur-sm rounded-2xl border p-3 shadow-lg shrink-0 flex flex-col gap-2 transition-all select-none ${
      isFinal ? 'border-amber-500/40 hover:border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-[#1a1510]/95' : 'border-white/10 hover:border-emerald-500/30'
    }`}>
      {/* Card Header */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-white/5 pb-1.5">
        <span>{title}</span>
        {match ? (
          <span className={isLive ? 'text-rose-500 animate-pulse' : isFinished ? 'text-slate-500' : 'text-emerald-400'}>
            {isLive ? '🔴 LIVE' : isFinished ? 'Kết thúc' : 'Chờ đấu'}
          </span>
        ) : (
          <span className="text-slate-600">Chờ ghép cặp</span>
        )}
      </div>

      {/* Teams list */}
      <div className="flex flex-col gap-1.5">
        {/* Team A */}
        <div className="flex items-center justify-between gap-2">
          <div 
            onClick={() => {
              if (match && teamA.code && isTeamAClickable) {
                onSelectTeam({ name: teamA.name, code: teamA.code });
              }
            }}
            className={`flex-1 min-w-0 ${match && teamA.code && isTeamAClickable ? 'cursor-pointer' : ''}`}
          >
            <TeamDisplay name={teamA.name} code={teamA.code} isWinner={teamA.isWinner} isPlaceholder={!isTeamAClickable} />
          </div>
          
          {showInputs && (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={match ? scoreA : ''}
                placeholder="0"
                onChange={(e) => handleScoreChange(true, parseInt(e.target.value) || 0)}
                className="w-8 h-6 bg-black/60 border border-white/10 rounded-md text-center text-xs font-mono font-black text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={() => handleAdvanceClick(true)}
                title="Chọn thắng / Đi tiếp"
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] border transition-all ${
                  teamA.isWinner 
                    ? 'bg-emerald-500 border-emerald-400 text-white' 
                    : 'bg-white/5 border-white/10 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-400'
                }`}
              >
                ✓
              </button>
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="flex items-center justify-between gap-2">
          <div 
            onClick={() => {
              if (match && teamB.code && isTeamBClickable) {
                onSelectTeam({ name: teamB.name, code: teamB.code });
              }
            }}
            className={`flex-1 min-w-0 ${match && teamB.code && isTeamBClickable ? 'cursor-pointer' : ''}`}
          >
            <TeamDisplay name={teamB.name} code={teamB.code} isWinner={teamB.isWinner} isPlaceholder={!isTeamBClickable} />
          </div>
          
          {showInputs && (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={match ? scoreB : ''}
                placeholder="0"
                onChange={(e) => handleScoreChange(false, parseInt(e.target.value) || 0)}
                className="w-8 h-6 bg-black/60 border border-white/10 rounded-md text-center text-xs font-mono font-black text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={() => handleAdvanceClick(false)}
                title="Chọn thắng / Đi tiếp"
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] border transition-all ${
                  teamB.isWinner 
                    ? 'bg-emerald-500 border-emerald-400 text-white' 
                    : 'bg-white/5 border-white/10 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-400'
                }`}
              >
                ✓
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Match Time */}
      {match && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5 border-t border-white/5 pt-1">
          <span>
            {new Date(match.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}{' '}
            {new Date(match.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          {match.stadium && (
            <span className="truncate max-w-[120px]" title={match.stadium}>
              {match.stadium.split(',')[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const StandingsPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<{ name: string; code: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'bracket' | 'groups'>('bracket');
  const [selectedRoundTab, setSelectedRoundTab] = useState<'all' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'>('all');

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

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel('public:matches_standings_new2')
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
    if (normalized === 'cape verde') return 'cabo verde';
    return normalized;
  };

  // Helper to find match by team names in database
  const findMatchByTeams = (roundRegex: RegExp, teamA: string, teamB: string) => {
    const normA = normalizeTeamName(teamA);
    const normB = normalizeTeamName(teamB);
    return matches.find(m => {
      const isRound = roundRegex.test(m.league || '');
      if (!isRound) return false;
      const matchA = normalizeTeamName(m.team_a_name);
      const matchB = normalizeTeamName(m.team_b_name);
      return (matchA === normA && matchB === normB) || (matchA === normB && matchB === normA);
    });
  };

  // Memoized resolved split knockout bracket data structure
  const knockoutData = useMemo(() => {
    const r32Regex = /vòng 32|round of 32/i;
    const r16Regex = /vòng 16|round of 16|1\/8/i;
    const qfRegex = /tứ kết|quarter/i;
    const sfRegex = /bán kết|semi/i;
    const finalRegex = /chung kết|final/i;

    // Helper to extract score & winner from a match
    const getMatchDetails = (m?: Match) => {
      if (!m) return { scoreA: 0, scoreB: 0, isFinished: false, isLive: false, winner: null };
      
      const isFinished = m.dc13_status === 'finished' || m.status === 'finished';
      const isLive = m.dc13_status === 'live' || m.status === 'live';
      
      const scoreA = m.dc13_status === 'finished' ? (m.dc13_score_a ?? 0) : (m.score_a ?? 0);
      const scoreB = m.dc13_status === 'finished' ? (m.dc13_score_b ?? 0) : (m.score_b ?? 0);
      
      let winner = null;
      if (isFinished) {
        if (scoreA > scoreB) winner = { name: m.team_a_name, code: m.team_a_code };
        else if (scoreB > scoreA) winner = { name: m.team_b_name, code: m.team_b_code };
      }
      
      return { scoreA, scoreB, isFinished, isLive, winner };
    };

    // 1. Resolve R32 Left Slots (8 slots)
    const r32Left = LEFT_R32_PAIRS.map((pair, idx) => {
      const dbMatch = findMatchByTeams(r32Regex, pair.a, pair.b);
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(pair.a);
      
      return {
        match: dbMatch,
        teamA: {
          name: pair.a,
          code: isSwapped ? dbMatch?.team_b_code : dbMatch?.team_a_code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(pair.a) : false
        },
        teamB: {
          name: pair.b,
          code: isSwapped ? dbMatch?.team_a_code : dbMatch?.team_b_code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(pair.b) : false
        },
        scoreA: isSwapped ? scoreB : scoreA,
        scoreB: isSwapped ? scoreA : scoreB,
        title: `Vòng 32 - Trận L${idx + 1}`
      };
    });

    // 2. Resolve R32 Right Slots (8 slots)
    const r32Right = RIGHT_R32_PAIRS.map((pair, idx) => {
      const dbMatch = findMatchByTeams(r32Regex, pair.a, pair.b);
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(pair.a);
      
      return {
        match: dbMatch,
        teamA: {
          name: pair.a,
          code: isSwapped ? dbMatch?.team_b_code : dbMatch?.team_a_code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(pair.a) : false
        },
        teamB: {
          name: pair.b,
          code: isSwapped ? dbMatch?.team_a_code : dbMatch?.team_b_code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(pair.b) : false
        },
        scoreA: isSwapped ? scoreB : scoreA,
        scoreB: isSwapped ? scoreA : scoreB,
        title: `Vòng 32 - Trận R${idx + 1}`
      };
    });

    // Helpers to get R32 Winners
    const getR32LeftWinner = (idx: number) => {
      const slot = r32Left[idx];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    const getR32RightWinner = (idx: number) => {
      const slot = r32Right[idx];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    // 3. Resolve R16 Left Slots (4 slots)
    const r16Left = Array.from({ length: 4 }).map((_, idx) => {
      const wA = getR32LeftWinner(2 * idx);
      const wB = getR32LeftWinner(2 * idx + 1);

      const nameAPlaceholder = wA ? wA.name : `Thắng Trận L${2 * idx + 1}`;
      const nameBPlaceholder = wB ? wB.name : `Thắng Trận L${2 * idx + 2}`;

      const dbMatch = (wA && wB) ? findMatchByTeams(r16Regex, wA.name, wB.name) : undefined;
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && wA && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(wA.name);

      return {
        match: dbMatch,
        roundName: 'r16',
        teamA: {
          name: dbMatch ? (isSwapped ? dbMatch.team_b_name : dbMatch.team_a_name) : nameAPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_b_code : dbMatch.team_a_code) : wA?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wA?.name || '') : false
        },
        teamB: {
          name: dbMatch ? (isSwapped ? dbMatch.team_a_name : dbMatch.team_b_name) : nameBPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_a_code : dbMatch.team_b_code) : wB?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wB?.name || '') : false
        },
        scoreA: dbMatch ? (isSwapped ? scoreB : scoreA) : 0,
        scoreB: dbMatch ? (isSwapped ? scoreA : scoreB) : 0,
        title: `Vòng 16 - Trận L${idx + 1}`,
        rawTeamA: wA,
        rawTeamB: wB
      };
    });

    // 4. Resolve R16 Right Slots (4 slots)
    const r16Right = Array.from({ length: 4 }).map((_, idx) => {
      const wA = getR32RightWinner(2 * idx);
      const wB = getR32RightWinner(2 * idx + 1);

      const nameAPlaceholder = wA ? wA.name : `Thắng Trận R${2 * idx + 1}`;
      const nameBPlaceholder = wB ? wB.name : `Thắng Trận R${2 * idx + 2}`;

      const dbMatch = (wA && wB) ? findMatchByTeams(r16Regex, wA.name, wB.name) : undefined;
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && wA && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(wA.name);

      return {
        match: dbMatch,
        roundName: 'r16',
        teamA: {
          name: dbMatch ? (isSwapped ? dbMatch.team_b_name : dbMatch.team_a_name) : nameAPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_b_code : dbMatch.team_a_code) : wA?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wA?.name || '') : false
        },
        teamB: {
          name: dbMatch ? (isSwapped ? dbMatch.team_a_name : dbMatch.team_b_name) : nameBPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_a_code : dbMatch.team_b_code) : wB?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wB?.name || '') : false
        },
        scoreA: dbMatch ? (isSwapped ? scoreB : scoreA) : 0,
        scoreB: dbMatch ? (isSwapped ? scoreA : scoreB) : 0,
        title: `Vòng 16 - Trận R${idx + 1}`,
        rawTeamA: wA,
        rawTeamB: wB
      };
    });

    const getR16LeftWinner = (idx: number) => {
      const slot = r16Left[idx];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    const getR16RightWinner = (idx: number) => {
      const slot = r16Right[idx];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    // 5. Resolve QF Left Slots (2 slots)
    const qfLeft = Array.from({ length: 2 }).map((_, idx) => {
      const wA = getR16LeftWinner(2 * idx);
      const wB = getR16LeftWinner(2 * idx + 1);

      const nameAPlaceholder = wA ? wA.name : `Thắng V16 L${2 * idx + 1}`;
      const nameBPlaceholder = wB ? wB.name : `Thắng V16 L${2 * idx + 2}`;

      const dbMatch = (wA && wB) ? findMatchByTeams(qfRegex, wA.name, wB.name) : undefined;
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && wA && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(wA.name);

      return {
        match: dbMatch,
        roundName: 'qf',
        teamA: {
          name: dbMatch ? (isSwapped ? dbMatch.team_b_name : dbMatch.team_a_name) : nameAPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_b_code : dbMatch.team_a_code) : wA?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wA?.name || '') : false
        },
        teamB: {
          name: dbMatch ? (isSwapped ? dbMatch.team_a_name : dbMatch.team_b_name) : nameBPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_a_code : dbMatch.team_b_code) : wB?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wB?.name || '') : false
        },
        scoreA: dbMatch ? (isSwapped ? scoreB : scoreA) : 0,
        scoreB: dbMatch ? (isSwapped ? scoreA : scoreB) : 0,
        title: `Tứ Kết - Trận L${idx + 1}`,
        rawTeamA: wA,
        rawTeamB: wB
      };
    });

    // 6. Resolve QF Right Slots (2 slots)
    const qfRight = Array.from({ length: 2 }).map((_, idx) => {
      const wA = getR16RightWinner(2 * idx);
      const wB = getR16RightWinner(2 * idx + 1);

      const nameAPlaceholder = wA ? wA.name : `Thắng V16 R${2 * idx + 1}`;
      const nameBPlaceholder = wB ? wB.name : `Thắng V16 R${2 * idx + 2}`;

      const dbMatch = (wA && wB) ? findMatchByTeams(qfRegex, wA.name, wB.name) : undefined;
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && wA && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(wA.name);

      return {
        match: dbMatch,
        roundName: 'qf',
        teamA: {
          name: dbMatch ? (isSwapped ? dbMatch.team_b_name : dbMatch.team_a_name) : nameAPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_b_code : dbMatch.team_a_code) : wA?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wA?.name || '') : false
        },
        teamB: {
          name: dbMatch ? (isSwapped ? dbMatch.team_a_name : dbMatch.team_b_name) : nameBPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_a_code : dbMatch.team_b_code) : wB?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wB?.name || '') : false
        },
        scoreA: dbMatch ? (isSwapped ? scoreB : scoreA) : 0,
        scoreB: dbMatch ? (isSwapped ? scoreA : scoreB) : 0,
        title: `Tứ Kết - Trận R${idx + 1}`,
        rawTeamA: wA,
        rawTeamB: wB
      };
    });

    const getQFLeftWinner = (idx: number) => {
      const slot = qfLeft[idx];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    const getQFRightWinner = (idx: number) => {
      const slot = qfRight[idx];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    // 7. Resolve SF Left Slot (1 slot)
    const sfLeft = Array.from({ length: 1 }).map(() => {
      const wA = getQFLeftWinner(0);
      const wB = getQFLeftWinner(1);

      const nameAPlaceholder = wA ? wA.name : `Thắng Tứ Kết L1`;
      const nameBPlaceholder = wB ? wB.name : `Thắng Tứ Kết L2`;

      const dbMatch = (wA && wB) ? findMatchByTeams(sfRegex, wA.name, wB.name) : undefined;
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && wA && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(wA.name);

      return {
        match: dbMatch,
        roundName: 'sf',
        teamA: {
          name: dbMatch ? (isSwapped ? dbMatch.team_b_name : dbMatch.team_a_name) : nameAPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_b_code : dbMatch.team_a_code) : wA?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wA?.name || '') : false
        },
        teamB: {
          name: dbMatch ? (isSwapped ? dbMatch.team_a_name : dbMatch.team_b_name) : nameBPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_a_code : dbMatch.team_b_code) : wB?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wB?.name || '') : false
        },
        scoreA: dbMatch ? (isSwapped ? scoreB : scoreA) : 0,
        scoreB: dbMatch ? (isSwapped ? scoreA : scoreB) : 0,
        title: `Bán Kết - Trận L1`,
        rawTeamA: wA,
        rawTeamB: wB
      };
    });

    // 8. Resolve SF Right Slot (1 slot)
    const sfRight = Array.from({ length: 1 }).map(() => {
      const wA = getQFRightWinner(0);
      const wB = getQFRightWinner(1);

      const nameAPlaceholder = wA ? wA.name : `Thắng Tứ Kết R1`;
      const nameBPlaceholder = wB ? wB.name : `Thắng Tứ Kết R2`;

      const dbMatch = (wA && wB) ? findMatchByTeams(sfRegex, wA.name, wB.name) : undefined;
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && wA && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(wA.name);

      return {
        match: dbMatch,
        roundName: 'sf',
        teamA: {
          name: dbMatch ? (isSwapped ? dbMatch.team_b_name : dbMatch.team_a_name) : nameAPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_b_code : dbMatch.team_a_code) : wA?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wA?.name || '') : false
        },
        teamB: {
          name: dbMatch ? (isSwapped ? dbMatch.team_a_name : dbMatch.team_b_name) : nameBPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_a_code : dbMatch.team_b_code) : wB?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wB?.name || '') : false
        },
        scoreA: dbMatch ? (isSwapped ? scoreB : scoreA) : 0,
        scoreB: dbMatch ? (isSwapped ? scoreA : scoreB) : 0,
        title: `Bán Kết - Trận R1`,
        rawTeamA: wA,
        rawTeamB: wB
      };
    });

    const getSFLeftWinner = () => {
      const slot = sfLeft[0];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    const getSFRightWinner = () => {
      const slot = sfRight[0];
      if (slot.teamA.isWinner) return { name: slot.teamA.name, code: slot.teamA.code };
      if (slot.teamB.isWinner) return { name: slot.teamB.name, code: slot.teamB.code };
      return null;
    };

    // 9. Resolve Finals Slot (1 slot)
    const finalSlots = Array.from({ length: 1 }).map(() => {
      const wA = getSFLeftWinner();
      const wB = getSFRightWinner();

      const nameAPlaceholder = wA ? wA.name : `Thắng Bán Kết L1`;
      const nameBPlaceholder = wB ? wB.name : `Thắng Bán Kết R1`;

      const dbMatch = (wA && wB) ? findMatchByTeams(finalRegex, wA.name, wB.name) : undefined;
      const { scoreA, scoreB, winner } = getMatchDetails(dbMatch);
      const isSwapped = dbMatch && wA && normalizeTeamName(dbMatch.team_a_name) !== normalizeTeamName(wA.name);

      return {
        match: dbMatch,
        roundName: 'final',
        teamA: {
          name: dbMatch ? (isSwapped ? dbMatch.team_b_name : dbMatch.team_a_name) : nameAPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_b_code : dbMatch.team_a_code) : wA?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wA?.name || '') : false
        },
        teamB: {
          name: dbMatch ? (isSwapped ? dbMatch.team_a_name : dbMatch.team_b_name) : nameBPlaceholder,
          code: dbMatch ? (isSwapped ? dbMatch.team_a_code : dbMatch.team_b_code) : wB?.code,
          isWinner: winner ? normalizeTeamName(winner.name) === normalizeTeamName(wB?.name || '') : false
        },
        scoreA: dbMatch ? (isSwapped ? scoreB : scoreA) : 0,
        scoreB: dbMatch ? (isSwapped ? scoreA : scoreB) : 0,
        title: `Chung Kết`,
        rawTeamA: wA,
        rawTeamB: wB
      };
    });

    return {
      left: {
        r32: r32Left,
        r16: r16Left,
        qf: qfLeft,
        sf: sfLeft
      },
      right: {
        r32: r32Right,
        r16: r16Right,
        qf: qfRight,
        sf: sfRight
      },
      final: finalSlots
    };
  }, [matches]);

  const handleUpdateScore = async (matchId: string, scoreA: number, scoreB: number) => {
    try {
      const status = 'finished';
      const { error } = await supabase
        .from('matches')
        .update({
          score_a: scoreA,
          score_b: scoreB,
          status: status,
          dc13_score_a: scoreA,
          dc13_score_b: scoreB,
          dc13_status: status
        })
        .eq('id', matchId);

      if (error) {
        console.error('Error updating score:', error);
      } else {
        fetchMatches();
      }
    } catch (err) {
      console.error('Catch error updating score:', err);
    }
  };

  const handleInsertAndScore = async (
    roundName: string,
    teamA: string,
    teamACode: string | null,
    teamB: string,
    teamBCode: string | null,
    scoreA: number,
    scoreB: number
  ) => {
    try {
      let league = 'World Cup 2026 - ';
      if (roundName === 'r16') league += 'Vòng 16';
      else if (roundName === 'qf') league += 'Tứ Kết';
      else if (roundName === 'sf') league += 'Bán Kết';
      else if (roundName === 'final') league += 'Chung Kết';

      const payload = {
        team_a_name: teamA,
        team_b_name: teamB,
        team_a_code: teamACode || '',
        team_b_code: teamBCode || '',
        league: league,
        start_time: new Date().toISOString(),
        score_a: scoreA,
        score_b: scoreB,
        status: 'finished',
        dc13_score_a: scoreA,
        dc13_score_b: scoreB,
        dc13_status: 'finished',
        dc13_handicap_set: false
      };

      const { error } = await supabase.from('matches').insert([payload]);
      if (error) {
        console.error('Error inserting match:', error);
      } else {
        fetchMatches();
      }
    } catch (err) {
      console.error('Catch error inserting match:', err);
    }
  };

  // Helper to fetch grid cards for the focused round tab
  const getSelectedRoundSlots = () => {
    if (selectedRoundTab === 'r32') return [...knockoutData.left.r32, ...knockoutData.right.r32];
    if (selectedRoundTab === 'r16') return [...knockoutData.left.r16, ...knockoutData.right.r16];
    if (selectedRoundTab === 'qf') return [...knockoutData.left.qf, ...knockoutData.right.qf];
    if (selectedRoundTab === 'sf') return [...knockoutData.left.sf, ...knockoutData.right.sf];
    if (selectedRoundTab === 'final') return knockoutData.final;
    return [];
  };

  // Sort teams correctly (Pts -> GD -> GF) for Group Stage
  const sortedGroups = useMemo(() => {
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
              <span className="text-emerald-400">
                {activeTab === 'bracket' ? '🏆 SƠ ĐỒ NHÁNH KNOCKOUT' : '📈 BẢNG ĐẤU'}
              </span>
            </h1>
            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase text-center">
              {activeTab === 'bracket' ? 'World Cup 2026 - Nhánh đấu 2 bên đối xứng' : 'Vòng Bảng - World Cup 2026'}
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="max-w-7xl mx-auto px-4 mb-8 flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-6 py-3 rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${
              activeTab === 'bracket'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#141414] text-slate-400 border-white/10 hover:bg-white/5 hover:text-white'
            }`}
          >
            🌿 Nhánh Đấu Knockout
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-3 rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${
              activeTab === 'groups'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-[#141414] text-slate-400 border-white/10 hover:bg-white/5 hover:text-white'
            }`}
          >
            📊 Bảng xếp hạng Vòng Bảng
          </button>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {activeTab === 'bracket' ? (
            /* Knockout Bracket View */
            <div className="space-y-8">
              {/* Round Selector Tabs */}
              <div className="flex justify-start md:justify-center overflow-x-auto no-scrollbar gap-2 pb-2">
                {[
                  { id: 'all', label: 'Tất cả (Sơ đồ chia 2 bên)' },
                  { id: 'r32', label: 'Vòng 32' },
                  { id: 'r16', label: 'Vòng 16' },
                  { id: 'qf', label: 'Tứ Kết' },
                  { id: 'sf', label: 'Bán Kết' },
                  { id: 'final', label: 'Chung Kết' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedRoundTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all ${
                      selectedRoundTab === tab.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#141414]/80 text-slate-400 border border-white/5 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="w-full flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedRoundTab === 'all' ? (
                /* Horizontal Tree bracket layout: divided symmetric Left-Right */
                <div className="w-full overflow-x-auto no-scrollbar py-8 px-4 bg-[#111]/60 border border-white/5 rounded-[32px] shadow-2xl">
                  <div className="flex justify-between items-center gap-6 min-h-[980px] w-max mx-auto select-none py-6">
                    
                    {/* LEFT BRACKET */}
                    <div className="flex gap-8 items-stretch h-full">
                      {/* Vòng 32 Left */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Vòng 32 (Trái)</div>
                        {knockoutData.left.r32.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>
                      
                      {/* Vòng 16 Left */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Vòng 16 (Trái)</div>
                        {knockoutData.left.r16.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>

                      {/* Tứ kết Left */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Tứ Kết (Trái)</div>
                        {knockoutData.left.qf.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>

                      {/* Bán kết Left */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Bán Kết (Trái)</div>
                        {knockoutData.left.sf.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>
                    </div>

                    {/* CENTER COLUMN (TROPHY & FINALS) */}
                    <div className="flex flex-col justify-center items-center h-[920px] w-[300px] shrink-0 gap-6 relative px-4">
                      {/* World Cup Trophy Background */}
                      <div className="absolute inset-0 z-0 opacity-20 flex items-center justify-center pointer-events-none">
                        <img
                          src="/world_cup_trophy.png"
                          alt="Trophy"
                          className="h-[420px] object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      
                      {/* Final Match Card */}
                      <div className="relative z-10">
                        <div className="text-center font-black uppercase text-amber-400 text-xs tracking-widest mb-3 animate-pulse">🏆 CHUNG KẾT 🏆</div>
                        <BracketMatchCard {...knockoutData.final[0]} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} isFinal />
                      </div>
                    </div>

                    {/* RIGHT BRACKET */}
                    <div className="flex gap-8 items-stretch h-full">
                      {/* Bán kết Right */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Bán Kết (Phải)</div>
                        {knockoutData.right.sf.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>

                      {/* Tứ kết Right */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Tứ Kết (Phải)</div>
                        {knockoutData.right.qf.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>

                      {/* Vòng 16 Right */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Vòng 16 (Phải)</div>
                        {knockoutData.right.r16.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>

                      {/* Vòng 32 Right */}
                      <div className="flex flex-col justify-around h-[920px] gap-2">
                        <div className="text-center font-black uppercase text-emerald-400 text-[10px] tracking-wider mb-1 shrink-0 border-b border-emerald-500/20 pb-1">Vòng 32 (Phải)</div>
                        {knockoutData.right.r32.map((slot, i) => (
                          <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                /* Focus Round Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
                  {getSelectedRoundSlots().map((slot, i) => (
                    <BracketMatchCard key={i} {...slot} onSelectTeam={setSelectedTeam} onUpdateScore={handleUpdateScore} onInsertAndScore={handleInsertAndScore} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Group Stage Standings View */
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
                            const isPromoted = rank <= 2;
                            const isPlayoff = rank === 3;
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
          )}

          {/* Legend */}
          {activeTab === 'groups' && (
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
          )}
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
                    <p className="text-cyan-500 text-[9px] uppercase mb-1">Point</p>
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
