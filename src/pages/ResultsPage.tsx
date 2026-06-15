import { useState, useEffect, useMemo, useContext } from 'react';
import { Match, Bet } from '../types';
import { supabase } from '../lib/supabase';
import { formatVND } from '../utils/format';
import { calculateBetResult, getOutcomeColorCls, getOutcomeLabel } from '../utils/betLogic';
import { AppContext } from '../App';

const ResultsPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('all');
  const [bets, setBets] = useState<Bet[]>([]); // Bets for specific selected match
  const [allBets, setAllBets] = useState<Bet[]>([]); // ALL bets for ALL finished matches
  const [selectedLossUser, setSelectedLossUser] = useState<any>(null);
  const [refunds, setRefunds] = useState<any[]>([]);

  const ctx = useContext(AppContext);
  const isAdmin = ctx?.isAdminAuthenticated || false;

  const fetchRefunds = async () => {
    const { data, error } = await supabase
      .from('refunds')
      .select('*');
    if (!error && data) {
      setRefunds(data);
    }
  };

  useEffect(() => {
    fetchFinishedMatches();
    fetchRefunds();
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

  // Helper for computing refund based on losing streak and total bet amount
  const getRefundAmount = (streakCount: number, totalAmount: number) => {
    if (streakCount >= 4) {
      if (totalAmount >= 400000) return 100000;
      if (totalAmount >= 300000) return 50000; // fallback to 3-match tier
      return 0;
    }
    if (streakCount === 3) {
      if (totalAmount >= 300000) return 50000;
      return 0;
    }
    return 0;
  };

  // Consecutive Loss Streaks (Bảo hiểm dây đen)
  const userStreaks = useMemo(() => {
    const streaks: Record<string, {
      name: string;
      currentStreak: number;
      maxStreak: number;
      currentTotalAmount: number;
      maxTotalAmount: number;
      streakMatches: { matchName: string; outcome: string; payout: number; amount: number; date: string }[];
      currentStreakMatches: { matchName: string; outcome: string; payout: number; amount: number; date: string }[]
    }> = {};

    // Group bets by user
    const userBets: Record<string, Bet[]> = {};
    allBets.forEach(bet => {
      if (!userBets[bet.user_name]) {
        userBets[bet.user_name] = [];
      }
      userBets[bet.user_name].push(bet);
    });

    // For each user, calculate streaks
    Object.entries(userBets).forEach(([userName, betsList]) => {
      // Find this user's refunds to reset their current streak check
      const userRefunds = refunds.filter(r => r.user_name === userName);
      const lastRefund = userRefunds.length > 0
        ? userRefunds.sort((a, b) => new Date(b.refunded_at).getTime() - new Date(a.refunded_at).getTime())[0]
        : null;
      const lastRefundTime = lastRefund ? new Date(lastRefund.refunded_at).getTime() : 0;

      // Group this user's bets by match_id
      const betsByMatch: Record<string, { match: Match; bets: Bet[] }> = {};
      betsList.forEach(bet => {
        // Skip bets that were placed before the last refund reset
        if (new Date(bet.created_at).getTime() <= lastRefundTime) return;

        const match = matches.find(m => m.id === bet.match_id);
        if (!match) return;
        if (!betsByMatch[bet.match_id]) {
          betsByMatch[bet.match_id] = { match, bets: [] };
        }
        betsByMatch[bet.match_id].bets.push(bet);
      });

      // Sort matches chronologically
      const sortedMatches = Object.values(betsByMatch).sort((a, b) =>
        new Date(a.match.start_time).getTime() - new Date(b.match.start_time).getTime()
      );

      let current = 0;
      let max = 0;
      let currentLosingMatches: any[] = [];
      let longestLosingMatches: any[] = [];
      let tempLosingMatches: any[] = [];

      sortedMatches.forEach(({ match, bets }) => {
        // Calculate the net result of this match for the user
        let netPayout = 0;
        let totalAmountOnMatch = 0;

        bets.forEach(bet => {
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
          netPayout += res.payout;
          totalAmountOnMatch += bet.amount;
        });

        // The user lost this match if their net payout is negative
        const isLoss = netPayout < 0;

        if (isLoss) {
          current++;
          tempLosingMatches.push({
            matchName: `${match.team_a_name} vs ${match.team_b_name}`,
            outcome: netPayout === -totalAmountOnMatch ? 'LOSS_FULL' : 'LOSS_HALF',
            payout: netPayout,
            amount: totalAmountOnMatch,
            date: new Date(match.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
          });
          if (current > max) {
            max = current;
            longestLosingMatches = [...tempLosingMatches];
          }
        } else {
          current = 0;
          tempLosingMatches = [];
        }
      });

      currentLosingMatches = [...tempLosingMatches];

      const currentTotalAmount = currentLosingMatches.reduce((sum, item) => sum + item.amount, 0);
      const maxTotalAmount = longestLosingMatches.reduce((sum, item) => sum + item.amount, 0);

      if (max >= 3 || current >= 3) {
        streaks[userName] = {
          name: userName,
          currentStreak: current,
          maxStreak: max,
          currentTotalAmount,
          maxTotalAmount,
          streakMatches: longestLosingMatches,
          currentStreakMatches: currentLosingMatches
        };
      }
    });

    // Sort by currentStreak desc, then maxStreak desc
    return Object.values(streaks).sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      return b.maxStreak - a.maxStreak;
    });
  }, [allBets, matches, refunds]);

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

        <div className="max-w-4xl mx-auto px-6 space-y-8">
          {/* Consecutive Loss Insurance Section */}
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-black uppercase tracking-[0.2em] text-rose-400">
              <span className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center">🛡️</span>
              Bảo Hiểm Thua Liên Tiếp
            </div>

            <div className="bg-gradient-to-br from-rose-950/20 via-slate-900/50 to-black/40 rounded-3xl border border-rose-500/20 p-6 shadow-xl relative overflow-hidden">
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-rose-600/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[12px] font-black text-rose-400 uppercase tracking-widest">
                    🚨 QUYỀN LỢI THÀNH VIÊN
                  </span>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Voucher Hoàn</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    Nhằm khích lệ tinh thần khi người chơi gặp chuỗi không may mắn, ban tổ chức áp dụng chính sách hoàn trả bảo hiểm dây đen:
                  </p>
                </div>

                {/* Visual striking benefits badge */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                  <div className="bg-[#1f1215] border border-rose-500/30 rounded-2xl px-5 py-3.5 text-center flex-1 md:flex-none shadow-lg">
                    <p className="text-[12px] text-rose-400 font-bold uppercase tracking-wider">Thua 3 trận liên tiếp</p>
                    <p className="text-lg font-black text-amber-400 mt-1">Hoàn 50.000</p>
                    <p className="text-[12px] text-slate-500 font-bold mt-1">(Tổng dự đoán ≥ 300k)</p>
                  </div>
                  <div className="bg-[#2a1318] border border-rose-500/40 rounded-2xl px-5 py-3.5 text-center flex-1 md:flex-none shadow-lg relative overflow-hidden">
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500/20 rotate-45" />
                    <p className="text-[12px] text-rose-300 font-bold uppercase tracking-wider">Thua 4 trận trở lên</p>
                    <p className="text-lg font-black text-amber-300 mt-1">Hoàn 100.000</p>
                    <p className="text-[12px] text-rose-400/75 font-bold mt-1">(Tổng dự đoán ≥ 400k)</p>
                  </div>
                </div>
              </div>

              {/* Leaderboard of Losing Streaks */}
              <div className="mt-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>📉</span> Thành viên đang trong chuỗi thua (từ 3 trận trở lên)
                </p>

                {userStreaks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userStreaks.map(streak => {
                      const currentTotal = streak.currentTotalAmount;
                      const refundAmount = getRefundAmount(streak.currentStreak, currentTotal);

                      return (
                        <div
                          key={streak.name}
                          className="bg-black/30 border border-white/5 rounded-2xl p-4 hover:border-rose-500/30 hover:bg-black/45 transition-all cursor-pointer group flex flex-col justify-between"
                          onClick={() => setSelectedLossUser(streak)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-900/30 to-slate-900 border border-rose-500/20 flex items-center justify-center text-xs font-black text-rose-400">
                                {streak.name.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black text-slate-200 group-hover:text-rose-400 transition-colors text-sm">{streak.name}</p>
                                <div className="flex flex-col gap-1 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">Chuỗi:</span>
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase tracking-wider">
                                      {streak.currentStreak} Trận Thua 🔴
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    Tổng cược chuỗi: <span className="font-mono text-slate-300">{formatVND(currentTotal)}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end">
                              {refundAmount > 0 ? (
                                <>
                                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Đủ ĐK Hoàn</p>
                                  <p className="text-sm font-black text-white mt-0.5 font-mono">{formatVND(refundAmount)}</p>
                                  {isAdmin && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Xác nhận đã hoàn tiền bảo hiểm ${formatVND(refundAmount)} cho ${streak.name}?`)) {
                                          const { error } = await supabase
                                            .from('refunds')
                                            .insert({
                                              user_name: streak.name,
                                              amount: refundAmount
                                            });
                                          if (error) {
                                            alert(`Lỗi hoàn tiền: ${error.message}`);
                                          } else {
                                            alert(`Đã hoàn tiền thành công cho ${streak.name}!`);
                                            fetchRefunds();
                                          }
                                        }
                                      }}
                                      className="mt-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-500/20"
                                    >
                                      ✓ Đã hoàn
                                    </button>
                                  )}
                                </>
                              ) : streak.currentStreak >= 3 ? (
                                <>
                                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Thiếu Tổng Cược</p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    Yêu cầu {formatVND(streak.currentStreak === 3 ? 300000 : 400000)}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kỷ lục chuỗi</p>
                                  <p className="text-xs font-black text-slate-400 mt-0.5 font-mono">{streak.maxStreak} Trận</p>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-3.5 pt-3.5 border-t border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                            <span>Chi tiết trận thua gần nhất</span>
                            <span className="text-rose-400 group-hover:underline flex items-center gap-1">Xem chi tiết 🔍</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-dashed border-white/5 rounded-2xl py-8 text-center text-slate-500 font-bold text-xs uppercase tracking-widest">
                    🎉 Hiện tại chưa có người chơi nào chạm mốc chuỗi thua liên tiếp ≥ 3 trận!
                  </div>
                )}
              </div>

              {/* Refunded Users List */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>🟢</span> Danh sách thành viên đã nhận hoàn voucher bảo hiểm
                </p>

                {refunds.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[...refunds].sort((a, b) => new Date(b.refunded_at).getTime() - new Date(a.refunded_at).getTime()).map(refund => (
                      <div
                        key={refund.id}
                        className="bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-3.5 flex items-center justify-between text-xs transition-transform hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400">
                            ✓
                          </div>
                          <div>
                            <p className="font-black text-slate-200">{refund.user_name}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {new Date(refund.refunded_at).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                            Đã Hoàn
                          </span>
                          <p className="text-xs font-black font-mono text-emerald-400 mt-1">{formatVND(refund.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-dashed border-white/5 rounded-2xl py-6 text-center text-slate-600 font-bold text-[10px] uppercase tracking-widest">
                    Chưa có lịch sử hoàn tiền bảo hiểm!
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Statistics Cards */}
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4 text-[12px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">📊</span>
              {selectedMatchId === 'all' ? 'Tổng hợp toàn bộ giải đấu' : 'Chi tiết trận đấu'}
            </div>

            {(() => {
              const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
              const houseBalance = -results.totalPayout - (selectedMatchId === 'all' ? totalRefunded : 0);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                    <p className="text-2xl md:text-3xl font-black text-white">{results.betResults.length}</p>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-black">Tổng lượt cược</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                    <p className="text-2xl md:text-3xl font-black text-emerald-400">{results.totalWinners}</p>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-black">Số lượt Thắng</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                    <p className={`text-xl md:text-2xl font-black font-mono ${results.totalPayout >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {results.totalPayout > 0 ? '+' : ''}{formatVND(results.totalPayout)}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-black">Lời/Lãi Khách</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-rose-500 to-amber-500" />
                    <p className={`text-xl md:text-2xl font-black font-mono ${houseBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {houseBalance > 0 ? '+' : ''}{formatVND(houseBalance)}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-black">Tổng Quỹ Thu Chi</p>
                    {selectedMatchId === 'all' && totalRefunded > 0 && (
                      <p className="text-[8px] text-slate-600 font-bold mt-0.5 uppercase">
                        (Đã hoàn: {formatVND(totalRefunded)})
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="bg-[#222] rounded-2xl border border-white/5 overflow-hidden shadow-2xl overflow-x-auto">
              <div className="min-w-[750px]">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-black/40 text-[11px] font-black uppercase text-slate-500 border-b border-white/5">
                  <span className="col-span-2">Người chơi</span>
                  <span className="col-span-3">Lựa chọn</span>
                  <span className="col-span-3">Đội thắng</span>
                  <span className="col-span-2 text-right">Gía trị</span>
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
            </div>
          </section>

          {/* Global Leaderboard Section */}
          {leaderboard.length > 0 && (
            <section className="animate-fade-in delay-200">
              <div className="flex items-center gap-2 mb-6 text-[12px] font-black uppercase tracking-widest text-amber-400">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">👑</span>
                Bảng Xếp Hạng Cao Thủ
              </div>

              <div className="bg-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl overflow-x-auto">
                <div className="min-w-[750px]">
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
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Consecutive Loss Details Modal */}
      {selectedLossUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setSelectedLossUser(null)} />
          <div className="relative z-10 w-full max-w-lg bg-[#1a1315] rounded-[32px] shadow-2xl border border-rose-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-rose-950 to-slate-900 px-8 py-8 text-center border-b border-rose-500/10">
              <button onClick={() => setSelectedLossUser(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg">✕</button>
              <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]">🛡️</div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Chi Tiết Chuỗi Thua</h2>
              <p className="text-rose-300 text-[14px] mt-1 uppercase font-bold tracking-widest">{selectedLossUser.name}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Chuỗi hiện tại</p>
                  <p className="text-2xl font-black text-rose-500 mt-1">{selectedLossUser.currentStreak} trận</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Tổng cược: {formatVND(selectedLossUser.currentTotalAmount)}</p>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Chuỗi kỷ lục</p>
                  <p className="text-2xl font-black text-slate-400 mt-1">{selectedLossUser.maxStreak} trận</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Tổng cược: {formatVND(selectedLossUser.maxTotalAmount)}</p>
                </div>
              </div>

              {/* Match list */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Danh sách trận cược liên tiếp gần nhất</p>

                <div className="space-y-2">
                  {selectedLossUser.currentStreakMatches.length > 0 ? (
                    selectedLossUser.currentStreakMatches.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.05] transition-colors">
                        <div>
                          <p className="font-black text-slate-200">{item.matchName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Ngày đá: {item.date} • Cược: {formatVND(item.amount)}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black border bg-rose-500/10 text-rose-400 border-rose-500/20 uppercase tracking-wider">
                            {item.outcome === 'LOSS_FULL' ? 'Thua' : 'Thua nửa'}
                          </span>
                          <p className="text-[11px] font-black font-mono text-rose-400 mt-0.5">{formatVND(item.payout)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic text-center py-4">Không có trận thua nào trong chuỗi hiện tại.</p>
                  )}
                </div>

                {/* If max streak is longer, show notice */}
                {selectedLossUser.maxStreak > selectedLossUser.currentStreak && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Chuỗi kỷ lục lịch sử ({selectedLossUser.maxStreak} trận)</p>
                    <div className="space-y-2">
                      {selectedLossUser.streakMatches.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white/[0.01] border border-white/[0.02] rounded-xl p-3 flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-bold text-slate-400">{item.matchName}</p>
                            <p className="text-[9px] text-slate-600 mt-0.5">Ngày đá: {item.date} • Cược: {formatVND(item.amount)}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-500/5 text-rose-500 border border-rose-500/10 uppercase tracking-wider">
                              {item.outcome === 'LOSS_FULL' ? 'Thua' : 'Thua nửa'}
                            </span>
                            <p className="text-[10px] font-bold font-mono text-rose-500/80 mt-0.5">{formatVND(item.payout)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
              <div>
                {getRefundAmount(selectedLossUser.currentStreak, selectedLossUser.currentTotalAmount) > 0 ? (
                  <div className="text-left">
                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">Đủ điều kiện hoàn</p>
                    <p className="text-base font-black text-amber-400 font-mono">
                      {formatVND(getRefundAmount(selectedLossUser.currentStreak, selectedLossUser.currentTotalAmount))}
                    </p>
                  </div>
                ) : selectedLossUser.currentStreak >= 3 ? (
                  <div className="text-left">
                    <p className="text-[9px] text-amber-500 font-black uppercase tracking-wider">Chưa đủ tổng cược</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Tổng cược: {formatVND(selectedLossUser.currentTotalAmount)} / {formatVND(selectedLossUser.currentStreak === 3 ? 300000 : 400000)}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-slate-500">Chưa đạt chuỗi thua 3 trận</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && getRefundAmount(selectedLossUser.currentStreak, selectedLossUser.currentTotalAmount) > 0 && (
                  <button
                    onClick={async () => {
                      const refundAmt = getRefundAmount(selectedLossUser.currentStreak, selectedLossUser.currentTotalAmount);
                      if (window.confirm(`Xác nhận đã hoàn tiền bảo hiểm ${formatVND(refundAmt)} cho ${selectedLossUser.name}?`)) {
                        const { error } = await supabase
                          .from('refunds')
                          .insert({
                            user_name: selectedLossUser.name,
                            amount: refundAmt
                          });
                        if (error) {
                          alert(`Lỗi hoàn tiền: ${error.message}`);
                        } else {
                          alert(`Đã hoàn tiền thành công cho ${selectedLossUser.name}!`);
                          setSelectedLossUser(null);
                          fetchRefunds();
                        }
                      }
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-950/40 border border-emerald-500/20"
                  >
                    Xác nhận hoàn
                  </button>
                )}
                <button
                  onClick={() => setSelectedLossUser(null)}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-rose-900/30"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
