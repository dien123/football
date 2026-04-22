import { useState, useEffect, useMemo } from 'react';
import { Match, Bet } from '../types';
import { supabase } from '../lib/supabase';
import { formatVND } from '../utils/format';
import { calculateBetResult, getOutcomeColorCls, getOutcomeLabel } from '../utils/betLogic';

const ResultsPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('all');
  const [bets, setBets] = useState<Bet[]>([]); // Bets for specific selected match
  const [allBets, setAllBets] = useState<Bet[]>([]); // ALL bets for ALL finished matches

  useEffect(() => {
    fetchFinishedMatches();
  }, []);

  const fetchFinishedMatches = async () => {
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'finished')
      .order('start_time', { ascending: false });

    if (!matchesError && matchesData) {
      // Isolation: Filter for World Cup matches (exclude TIP Futsal)
      const wcMatches = matchesData.filter(m => m.league !== 'TIP Futsal league');
      setMatches(wcMatches);

      // Fetch ALL bets for ALL finished matches in World Cup
      const matchIds = wcMatches.map(m => m.id);
      if (matchIds.length > 0) {
        const { data: betsData, error: betsError } = await supabase
          .from('bets')
          .select('*')
          .in('match_id', matchIds);

        if (!betsError) {
          setAllBets(betsData || []);
        }
      }
    }
  };

  useEffect(() => {
    if (selectedMatchId !== 'all') {
      fetchBets(selectedMatchId);
    } else {
      setBets([]);
    }
  }, [selectedMatchId]);

  const fetchBets = async (matchId: string) => {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', matchId);

    if (!error) {
      setBets(data || []);
    }
  };

  // The Consolidated Results (Stats + Bet List)
  const results = useMemo(() => {
    // Determine which bets to show based on selection
    const targetBets = selectedMatchId === 'all' ? allBets : bets;

    let totalWinners = 0;
    let totalPayout = 0;

    const betResults = targetBets.map(bet => {
      const match = matches.find(m => m.id === bet.match_id);
      if (!match) return null;

      const res = calculateBetResult(
        bet.option,
        bet.amount,
        match.score_a,
        match.score_b,
        {
          handicap: match.handicap,
          rateA: match.rate_a,
          rateB: match.rate_b,
          teamAName: match.team_a_name,
          teamBName: match.team_b_name
        }
      );

      const isTeamA = bet.option === 'teamA' || bet.option === match.team_a_name;
      const selectedTeamName = isTeamA ? match.team_a_name : match.team_b_name;
      const selectedTeamCode = isTeamA ? match.team_a_code : match.team_b_code;

      // Determine match winner based on handicap
      const diff = (match.score_a - match.handicap) - match.score_b;
      let winningTeam = 'Hòa';
      let winningCode = '';
      if (diff > 0) {
        winningTeam = match.team_a_name ?? '';
        winningCode = match.team_a_code ?? '';
      } else if (diff < 0) {
        winningTeam = match.team_b_name ?? '';
        winningCode = match.team_b_code ?? '';
      }

      if (res.outcome === 'WIN_FULL' || res.outcome === 'WIN_HALF') {
        totalWinners++;
      }
      totalPayout += res.payout;
      return {
        ...bet,
        ...res,
        matchName: `${match.team_a_name} vs ${match.team_b_name}`,
        selectedTeamName,
        selectedTeamCode,
        winningTeam,
        winningCode,
        matchScore: `${match.score_a} - ${match.score_b}`
      };
    }).filter(Boolean);

    return { totalWinners, totalPayout, betResults };
  }, [selectedMatchId, allBets, bets, matches]);

  // Global Leaderboard Calculation (Always across ALL finished matches)
  const leaderboard = useMemo(() => {
    const userStats: Record<string, { name: string, wins: number, totalAmount: number, totalProfit: number }> = {};

    allBets.forEach(bet => {
      const match = matches.find(m => m.id === bet.match_id);
      if (!match) return;

      const res = calculateBetResult(
        bet.option,
        bet.amount,
        match.score_a,
        match.score_b,
        {
          handicap: match.handicap,
          rateA: match.rate_a,
          rateB: match.rate_b,
          teamAName: match.team_a_name,
          teamBName: match.team_b_name
        }
      );

      if (!userStats[bet.user_name]) {
        userStats[bet.user_name] = { name: bet.user_name, wins: 0, totalAmount: 0, totalProfit: 0 };
      }

      if (res.outcome === 'WIN_FULL' || res.outcome === 'WIN_HALF') {
        userStats[bet.user_name].wins += 1;
      }
      userStats[bet.user_name].totalAmount += bet.amount;
      userStats[bet.user_name].totalProfit += res.payout;
    });

    return Object.values(userStats).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalAmount - a.totalAmount;
    });
  }, [allBets, matches]);

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
        <div className="bg-[#1a2f1a] border-b border-white/10 px-6 py-12 mb-8 relative">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <h1 className="text-3xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-4">
              <span className="hidden md:block">🏆</span>
              Bảng Vàng Kết Quả
            </h1>

            <div className="w-full flex flex-col items-center gap-4">
              <select
                className="bg-[#222] border border-white/10 text-white rounded-xl px-4 py-3 w-full max-w-md focus:border-emerald-500 outline-none cursor-pointer shadow-lg"
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
              >
                <option value="all">⚡ Tất cả các trận đấu</option>
                {matches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.team_a_name} vs {m.team_b_name} ({new Date(m.start_time).toLocaleDateString()})
                  </option>
                ))}
              </select>

              {selectedMatchId !== 'all' && (
                <div className="flex items-center gap-6 mt-4 animate-in fade-in slide-in-from-top-2">
                  <span className="text-3xl font-black text-emerald-400">{matches.find(m => m.id === selectedMatchId)?.score_a}</span>
                  <span className="text-slate-500 font-bold uppercase tracking-tighter">kết quả</span>
                  <span className="text-3xl font-black text-emerald-400">{matches.find(m => m.id === selectedMatchId)?.score_b}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 space-y-12">
          {/* Statistics Cards */}
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4 text-[12px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">📊</span>
              {selectedMatchId === 'all' ? 'Tổng hợp toàn bộ giải đấu' : 'Chi tiết trận đấu'}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                <p className="text-3xl font-black text-white">{results.betResults.length}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-black">Tổng lượt cược</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                <p className="text-3xl font-black text-emerald-400">{results.totalWinners}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-black">Số lượt Thắng</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                <p className={`text-xl font-black font-mono ${results.totalPayout >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {results.totalPayout > 0 ? '+' : ''}{formatVND(results.totalPayout)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-black">Lời/Lãi Khách</p>
              </div>
            </div>

            <div className="bg-[#222] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-black/40 text-[11px] font-black uppercase text-slate-500 border-b border-white/5">
                <span className="col-span-2">Người chơi</span>
                <span className="col-span-3">Lựa chọn</span>
                <span className="col-span-3">Đội thắng</span>
                <span className="col-span-2 text-right">Tiền cược</span>
                <span className="col-span-2 text-right">Kết quả</span>
              </div>
              <div className="divide-y divide-white/5">
                {results.betResults.length > 0 ? results.betResults.map((bet: any) => (
                  <div key={bet.id} className="grid grid-cols-12 gap-4 px-6 py-4 text-xs items-center hover:bg-white/5 transition-colors">
                    <span className="col-span-2 font-black text-[14px] text-slate-400 truncate">{bet.user_name}</span>
                    <div className="col-span-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {bet.selectedTeamCode && (
                          <img src={`https://flagcdn.com/w20/${bet.selectedTeamCode.toLowerCase()}.png`} alt="" className="w-4 h-3 object-cover rounded-sm shadow-sm" />
                        )}
                        <span className="font-black text-slate-100 truncate">{bet.selectedTeamName}</span>
                      </div>
                      {selectedMatchId === 'all' && (
                        <span className="text-[10px] text-slate-600 truncate font-black uppercase tracking-tighter">{bet.matchName}</span>
                      )}
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        {bet.winningCode && (
                          <img src={`https://flagcdn.com/w20/${bet.winningCode.toLowerCase()}.png`} alt="" className="w-4 h-3 object-cover rounded-sm" />
                        )}
                        <span className={`font-black ${bet.winningTeam === 'Hòa' ? 'text-slate-500 border-b border-white/5 pb-0.5' : 'text-emerald-400'}`}>
                          {bet.winningTeam}
                          <span className="text-slate-500 ml-2 font-mono text-[14px] font-medium">({bet.matchScore})</span>
                        </span>
                      </div>
                    </div>
                    <span className="col-span-2 text-right font-mono text-slate-300 text-[12px]">{formatVND(bet.amount)}</span>
                    <div className="col-span-2 text-right flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getOutcomeColorCls(bet.outcome)}`}>
                        {getOutcomeLabel(bet.outcome)}
                      </span>
                      {bet.payout !== 0 && (
                        <span className={`text-[9px] font-black ${bet.payout > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {bet.payout > 0 ? '+' : ''}{formatVND(bet.payout)}
                        </span>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                    Chưa có dữ liệu...
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Global Leaderboard Section */}
          {leaderboard.length > 0 && (
            <section className="animate-fade-in delay-200">
              <div className="flex items-center gap-2 mb-6 text-[12px] font-black uppercase tracking-widest text-amber-400">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">👑</span>
                Bảng Xếp Hạng Cao Thủ
              </div>

              <div className="bg-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-gradient-to-r from-amber-500/10 to-transparent text-[11px] font-black uppercase text-slate-400 border-b border-white/10">
                  <span className="col-span-1 text-center">Hạng</span>
                  <span className="col-span-4">Người chơi</span>
                  <span className="col-span-2 text-right">Thắng</span>
                  <span className="col-span-2 text-right">Tổng cược</span>
                  <span className="col-span-3 text-right">Lời / Lãi</span>
                </div>

                <div className="divide-y divide-white/5">
                  {leaderboard.map((user, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;
                    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

                    return (
                      <div
                        key={user.name}
                        className={`grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-white/5 transition-all group ${isTop3 ? 'bg-amber-500/5' : ''}`}
                      >
                        <div className="col-span-1 flex justify-center">
                          <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black ${rank === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/40' :
                            rank === 2 ? 'bg-slate-300 text-black shadow-lg shadow-slate-300/40' :
                              rank === 3 ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/40' :
                                'text-slate-500 bg-white/5'
                            }`}>
                            {rankIcon}
                          </span>
                        </div>

                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-white group-hover:scale-110 transition-transform">
                            {user.name.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="font-black text-slate-100 group-hover:text-amber-400 transition-colors truncate">{user.name}</span>
                        </div>

                        <div className="col-span-2 text-right">
                          <span className="text-sm font-black text-white">{user.wins}</span>
                        </div>

                        <div className="col-span-2 text-right">
                          <span className="text-[12px] font-black text-slate-400 font-mono">{formatVND(user.totalAmount)}</span>
                        </div>

                        <div className="col-span-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-base font-black font-mono ${user.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {user.totalProfit > 0 ? '+' : ''}{formatVND(user.totalProfit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
