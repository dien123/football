import { useState, useEffect, useMemo, useContext, Fragment } from 'react';
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Custom Calculator States
  const [calcPlayer, setCalcPlayer] = useState<string>('');
  const [calcSelectedMatches, setCalcSelectedMatches] = useState<Record<string, boolean>>({});

  // Leaderboard Sorting States
  const [leaderboardSortField, setLeaderboardSortField] = useState<'wins' | 'totalAmount' | 'totalProfit'>('wins');
  const [leaderboardSortOrder, setLeaderboardSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSortLeaderboard = (field: 'wins' | 'totalAmount' | 'totalProfit') => {
    if (leaderboardSortField === field) {
      setLeaderboardSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setLeaderboardSortField(field);
      setLeaderboardSortOrder('desc');
    }
  };

  const ctx = useContext(AppContext);
  const isAdmin = ctx?.isAdminAuthenticated || false;

  const fetchRefunds = async () => {
    const { data, error } = await supabase
      .from('refunds')
      .select('*');
    if (!error && data) {
      // Sanitize/Clean up data for "Bet Thủ Thua Đủ" to fix database discrepancy client-side
      const sanitized = data
        .filter(r => {
          // Remove the incorrect 50.000 refund for Bet Thủ Thua Đủ
          if (r.user_name === 'Bet Thủ Thua Đủ' && r.amount === 50000 && (r.id === '84a39e33-37ac-4161-bfe3-3624cc42df9d' || r.refunded_at.startsWith('2026-06-15T04:30'))) {
            return false;
          }
          // Remove the incorrect 100.000 refund for Tài F on 2026-06-17
          if (r.user_name === 'Tài F' && r.amount === 100000 && (r.id === '011ff1b0-f503-4098-a355-1320665422f0' || r.refunded_at.startsWith('2026-06-17'))) {
            return false;
          }
          return true;
        })
        .map(r => {
          // Adjust the original 100.000 refund's date to 11:30 (2026-06-15T04:30:00Z) to reset Sweden vs Tunisia
          if (r.user_name === 'Bet Thủ Thua Đủ' && r.amount === 100000 && (r.id === 'a8d52516-7a42-426d-932c-0749277868a4' || r.refunded_at.startsWith('2026-06-15T01:33'))) {
            return {
              ...r,
              refunded_at: '2026-06-15T04:30:00.000Z'
            };
          }
          return r;
        });
      setRefunds(sanitized);
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
        const selectColumns = isAdmin
          ? '*'
          : 'id, match_id, user_name, option, created_at, user_id';

        const { data: betsData, error: betsError } = await (supabase
          .from('bets') as any)
          .select(selectColumns)
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
    const selectColumns = isAdmin
      ? '*'
      : 'id, match_id, user_name, option, created_at, user_id';

    const { data, error } = await (supabase
      .from('bets') as any)
      .select(selectColumns)
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
      userStats[bet.user_name].totalAmount += Number(bet.amount || 0);
      userStats[bet.user_name].totalProfit += Number(res.payout || 0);
    });

    return Object.values(userStats).sort((a, b) => {
      const valA = a[leaderboardSortField];
      const valB = b[leaderboardSortField];

      if (valA !== valB) {
        return leaderboardSortOrder === 'desc' ? valB - valA : valA - valB;
      }

      // Fallback sorting when equal
      if (leaderboardSortField !== 'wins' && b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.totalAmount - a.totalAmount;
    });
  }, [allBets, matches, leaderboardSortField, leaderboardSortOrder]);

  // Helper for computing refund based on lost matches in a streak
  const getRefundAmount = (losingMatches: { amount: number }[]) => {
    const len = losingMatches.length;
    if (len < 4) return 0;

    // Check if there is any 5-match window with total >= 500,000
    let hasFiveMatchTier = false;
    for (let i = 0; i <= len - 5; i++) {
      const windowSum = losingMatches.slice(i, i + 5).reduce((sum, item) => sum + item.amount, 0);
      if (windowSum >= 500000) {
        hasFiveMatchTier = true;
        break;
      }
    }
    if (hasFiveMatchTier) return 100000;

    // Check if there is any 4-match window with total >= 400,000
    let hasFourMatchTier = false;
    for (let i = 0; i <= len - 4; i++) {
      const windowSum = losingMatches.slice(i, i + 4).reduce((sum, item) => sum + item.amount, 0);
      if (windowSum >= 400000) {
        hasFourMatchTier = true;
        break;
      }
    }
    if (hasFourMatchTier) return 50000;

    return 0;
  };

  // Custom Calculator Memos & Helpers
  const uniquePlayers = useMemo(() => {
    const names = allBets.map(b => b.user_name);
    return [...new Set(names)].sort();
  }, [allBets]);



  // Automatically check all bets of the selected player by default when they change
  useEffect(() => {
    if (calcPlayer) {
      const initialSelected: Record<string, boolean> = {};
      const playerBets = allBets.filter(b => b.user_name === calcPlayer);
      playerBets.forEach(bet => {
        initialSelected[bet.id] = true;
      });
      setCalcSelectedMatches(initialSelected);
    } else {
      setCalcSelectedMatches({});
    }
  }, [calcPlayer, allBets]);

  const customCalcResults = useMemo(() => {
    if (!calcPlayer) return { totalAmount: 0, totalProfit: 0, matchesCount: 0, betDetails: [] };

    const playerBets = allBets.filter(b => b.user_name === calcPlayer);
    let totalAmount = 0;
    let totalProfit = 0;
    let matchesCount = 0;
    const betDetails: any[] = [];

    playerBets.forEach(bet => {
      // Find match
      const match = matches.find(m => m.id === bet.match_id);
      if (!match) return;

      const isChecked = !!calcSelectedMatches[bet.id];

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

      if (isChecked) {
        totalAmount += bet.amount;
        totalProfit += res.payout;
        matchesCount++;
      }

      const isTeamA = bet.option === 'teamA' || bet.option === match.team_a_name;
      const selectedTeamName = isTeamA ? match.team_a_name : match.team_b_name;

      const getRound = (startTimeStr: string) => {
        const time = new Date(startTimeStr).getTime();
        const round2Threshold = new Date('2026-06-18T18:00:00+07:00').getTime();
        const round3Threshold = new Date('2026-06-24T12:00:00+07:00').getTime();
        if (time >= round3Threshold) return 3;
        if (time >= round2Threshold) return 2;
        return 1;
      };

      const round = getRound(match.start_time);
      const isLeg2 = round >= 2;

      betDetails.push({
        betId: bet.id,
        matchId: match.id,
        matchName: `${match.team_a_name} vs ${match.team_b_name}`,
        matchScore: `${match.score_a} - ${match.score_b}`,
        chosenTeam: selectedTeamName,
        amount: bet.amount,
        outcome: res.outcome,
        payout: res.payout,
        isLeg2,
        round
      });
    });

    // Sort betDetails by start time (newest first)
    betDetails.sort((a, b) => {
      const matchA = matches.find(m => m.id === a.matchId);
      const matchB = matches.find(m => m.id === b.matchId);
      if (!matchA || !matchB) return 0;
      return new Date(matchB.start_time).getTime() - new Date(matchA.start_time).getTime();
    });

    return { totalAmount, totalProfit, matchesCount, betDetails };
  }, [calcPlayer, calcSelectedMatches, allBets, matches]);

  const handleToggleMatch = (betId: string) => {
    setCalcSelectedMatches(prev => ({
      ...prev,
      [betId]: !prev[betId]
    }));
  };

  const handleSelectAllMatches = () => {
    const updated: Record<string, boolean> = {};
    const playerBets = allBets.filter(b => b.user_name === calcPlayer);
    playerBets.forEach(bet => {
      updated[bet.id] = true;
    });
    setCalcSelectedMatches(updated);
  };

  const handleDeselectAllMatches = () => {
    const updated: Record<string, boolean> = {};
    const playerBets = allBets.filter(b => b.user_name === calcPlayer);
    playerBets.forEach(bet => {
      updated[bet.id] = false;
    });
    setCalcSelectedMatches(updated);
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
        const match = matches.find(m => m.id === bet.match_id);
        if (!match) return;

        // Skip matches that started before the last refund reset
        if (new Date(match.start_time).getTime() <= lastRefundTime) return;

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

        // Check if the user placed bets on both sides of the match (hedging)
        const hasBetA = bets.some(b => b.option === 'teamA' || b.option === match.team_a_name);
        const hasBetB = bets.some(b => b.option === 'teamB' || b.option === match.team_b_name);
        const isHedged = hasBetA && hasBetB;

        // The user lost this match if their net payout is negative and they did not hedge (bet on both sides)
        const isLoss = netPayout < 0 && !isHedged;

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

      if (max >= 4 || current >= 4) {
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
                    <p className="text-[12px] text-rose-400 font-bold uppercase tracking-wider">Thua 4 lần liên tiếp</p>
                    <p className="text-lg font-black text-amber-400 mt-1">Hoàn 50</p>
                    <p className="text-[12px] text-slate-500 font-bold mt-1">(Tổng dự đoán ≥ 400)</p>
                  </div>
                  <div className="bg-[#2a1318] border border-rose-500/40 rounded-2xl px-5 py-3.5 text-center flex-1 md:flex-none shadow-lg relative overflow-hidden">
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500/20 rotate-45" />
                    <p className="text-[12px] text-rose-300 font-bold uppercase tracking-wider">Thua 5 lần liên tiếp trở lên</p>
                    <p className="text-lg font-black text-amber-300 mt-1">Hoàn 100</p>
                    <p className="text-[12px] text-rose-400/75 font-bold mt-1">(Tổng dự đoán ≥ 500)</p>
                  </div>
                </div>
              </div>

              {/* Leaderboard of Losing Streaks */}
              <div className="mt-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>📉</span> Thành viên đang trong chuỗi thua (từ 4 lần trở lên)
                </p>

                {userStreaks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userStreaks.map(streak => {
                      const currentTotal = streak.currentTotalAmount;
                      const refundAmount = getRefundAmount(streak.currentStreakMatches || []);

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
                                    Tổng chuỗi: <span className="font-mono text-slate-300">{formatVND(currentTotal)}</span>
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
                                        if (window.confirm(`Xác nhận đã hoàn bảo hiểm ${formatVND(refundAmount)} cho ${streak.name}?`)) {
                                          const { error } = await supabase
                                            .from('refunds')
                                            .insert({
                                              user_name: streak.name,
                                              amount: refundAmount
                                            });
                                          if (error) {
                                            alert(`Lỗi hoàn : ${error.message}`);
                                          } else {
                                            alert(`Đã hoàn thành công cho ${streak.name}!`);
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
                              ) : streak.currentStreak >= 4 ? (
                                <>
                                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Thiếu Tổng </p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    Yêu cầu {formatVND(streak.currentStreak === 4 ? 400000 : 500000)}
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
                    🎉 Hiện tại chưa có người chơi nào chạm mốc chuỗi thua liên tiếp ≥ 4 trận!
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
                    Chưa có lịch sử hoàn bảo hiểm!
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Custom Bet Result Calculator Section */}
          {isAdmin && (
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-2 text-[12px] font-black uppercase tracking-[0.2em] text-cyan-400">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center">🧮</span>
                Bộ Tính Toán Kết Quả Tùy Chọn
              </div>

              <div className="bg-gradient-to-br from-cyan-950/20 via-slate-900/50 to-black/45 rounded-3xl border border-cyan-500/20 p-6 shadow-xl relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-600/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                  <div className="w-full md:w-1/2">
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Chọn người chơi cần tính</label>
                    <select
                      value={calcPlayer}
                      onChange={(e) => setCalcPlayer(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 text-white rounded-xl px-4 py-3 focus:border-cyan-500 outline-none cursor-pointer text-sm shadow-md"
                    >
                      <option value="">-- Chọn một người chơi --</option>
                      {uniquePlayers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {calcPlayer && (
                    <div className="flex gap-2 self-end w-full md:w-auto">
                      <button
                        onClick={handleSelectAllMatches}
                        className="flex-1 md:flex-none px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        onClick={handleDeselectAllMatches}
                        className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  )}
                </div>

                {calcPlayer ? (
                  <div className="relative z-10 mt-6 space-y-6">
                    {/* Results cards summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-black">Trận đấu đã chọn</p>
                        <p className="text-2xl font-black text-white mt-1">{customCalcResults.matchesCount} trận</p>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-black">Tổng </p>
                        <p className="text-2xl font-black text-slate-300 mt-1 font-mono">{formatVND(customCalcResults.totalAmount)}</p>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-black">Tổng</p>
                        <p className={`text-2xl font-black mt-1 font-mono ${customCalcResults.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {customCalcResults.totalProfit > 0 ? '+' : ''}{formatVND(customCalcResults.totalProfit)}
                        </p>
                      </div>
                    </div>

                    {/* Checklist of matches */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span>✓/✗</span> Chọn các trận đấu muốn cộng dồn kết quả:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {customCalcResults.betDetails.map((detail, index) => {
                          const isChecked = !!calcSelectedMatches[detail.betId];
                          const prevRound = customCalcResults.betDetails[index - 1]?.round || (customCalcResults.betDetails[index - 1]?.isLeg2 ? 2 : 1);
                          const currRound = detail.round || (detail.isLeg2 ? 2 : 1);
                          const showRound3To2Divider = index > 0 && prevRound === 3 && currRound === 2;
                          const showRound2To1Divider = index > 0 && prevRound === 2 && currRound === 1;
                          return (
                            <Fragment key={detail.betId}>
                              {showRound3To2Divider && (
                                <div className="col-span-full flex items-center gap-3 my-2 select-none">
                                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-slate-700/50 to-slate-700/50" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#222] px-3 py-1 rounded-full border border-white/5 shadow-md shrink-0">
                                    Hết Lượt 2 • Bắt đầu Lượt 3
                                  </span>
                                  <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-slate-700/50 to-slate-700/50" />
                                </div>
                              )}
                              {showRound2To1Divider && (
                                <div className="col-span-full flex items-center gap-3 my-2 select-none">
                                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-slate-700/50 to-slate-700/50" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#222] px-3 py-1 rounded-full border border-white/5 shadow-md shrink-0">
                                    Hết Lượt 1 • Bắt đầu Lượt 2
                                  </span>
                                  <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-slate-700/50 to-slate-700/50" />
                                </div>
                              )}
                              <div
                                onClick={() => handleToggleMatch(detail.betId)}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isChecked
                                  ? 'bg-cyan-950/10 border-cyan-500/30'
                                  : 'bg-black/25 border-white/5 opacity-60 hover:opacity-85'
                                  }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${isChecked
                                    ? 'bg-cyan-500 border-cyan-400 text-black'
                                    : 'bg-transparent border-slate-600'
                                    }`}>
                                    {isChecked && <span className="font-bold text-xs">✓</span>}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-black text-slate-200 text-xs truncate">{detail.matchName}</p>
                                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0 select-none ${
                                        currRound === 3
                                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                          : currRound === 2
                                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                      }`}>
                                        Lượt {currRound}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5 truncate font-semibold">
                                      Chọn: <span className="text-slate-300 font-bold">{detail.chosenTeam}</span> ({formatVND(detail.amount)})
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black border ${getOutcomeColorCls(detail.outcome)}`}>
                                    {getOutcomeLabel(detail.outcome)}
                                  </span>
                                  <p className={`text-[10px] font-black font-mono mt-0.5 ${detail.payout >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {detail.payout > 0 ? '+' : ''}{formatVND(detail.payout)}
                                  </p>
                                </div>
                              </div>
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-xs text-slate-500 italic">
                      Vui lòng chọn 1 người chơi từ danh sách để bắt đầu tính toán tùy chọn.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Statistics Cards */}
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4 text-[12px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">📊</span>
              {selectedMatchId === 'all' ? 'Tổng hợp toàn bộ giải đấu' : 'Chi tiết trận đấu'}
            </div>

            {(() => {


              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                    <p className="text-2xl md:text-3xl font-black text-white">{results.betResults.length}</p>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-black">Tổng lượt</p>
                  </div>

                  <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 text-center shadow-xl transition-transform hover:scale-[1.02]">
                    <p className="text-2xl md:text-3xl font-black text-emerald-400">{results.totalWinners}</p>
                    <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 uppercase font-black">Số lượt Thắng</p>
                  </div>













                </div>
              );
            })()}

            <div className="bg-[#222] rounded-2xl border border-white/5 overflow-hidden shadow-2xl overflow-x-auto">
              <div className="min-w-[750px]">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-black/40 text-[11px] font-black uppercase text-slate-500 border-b border-white/5">
                  <span className="col-span-4">Người chơi</span>
                  <span className="col-span-4">Lựa chọn</span>
                  <span className="col-span-4">Đội thắng</span>
                </div>
                <div className="divide-y divide-white/5">
                  {results.betResults.length > 0 ? (isExpanded ? results.betResults : results.betResults.slice(0, 10)).map((bet: any) => (
                    <div key={bet.id} className="grid grid-cols-12 gap-4 px-6 py-4 text-xs items-center hover:bg-white/5 transition-colors">
                      <span className="col-span-4 font-black text-[14px] text-slate-400 truncate">{bet.user_name}</span>
                      <div className="col-span-4 flex flex-col gap-1">
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
                      <div className="col-span-4">
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
                    </div>
                  )) : (
                    <div className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                      Chưa có dữ liệu...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {results.betResults.length > 10 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center gap-2 text-slate-300 hover:text-white"
                >
                  {isExpanded ? (
                    <>
                      <span>Thu gọn</span>
                      <span>▲</span>
                    </>
                  ) : (
                    <>
                      <span>Xem tất cả ({results.betResults.length} lượt )</span>
                      <span>▼</span>
                    </>
                  )}
                </button>
              </div>
            )}
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
                  <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-gradient-to-r from-amber-500/10 to-transparent text-[11px] font-black uppercase text-slate-400 border-b border-white/10 select-none">
                    <span className="col-span-2 text-center">Hạng</span>
                    <span className="col-span-7">Người chơi</span>
                    <button
                      onClick={() => handleSortLeaderboard('wins')}
                      className={`col-span-3 text-right font-black uppercase tracking-wider flex items-center justify-end gap-1 hover:text-white transition-colors ml-auto ${leaderboardSortField === 'wins' ? 'text-amber-400 font-black' : 'text-slate-400'
                        }`}
                    >
                      Thắng {leaderboardSortField === 'wins' ? (leaderboardSortOrder === 'desc' ? '▼' : '▲') : '⇅'}
                    </button>
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
                          <div className="col-span-2 flex justify-center">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black ${rank === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/40' :
                              rank === 2 ? 'bg-slate-300 text-black shadow-lg shadow-slate-300/40' :
                                rank === 3 ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/40' :
                                  'text-slate-500 bg-white/5'
                              }`}>
                              {rankIcon}
                            </span>
                          </div>

                          <div className="col-span-7 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-white group-hover:scale-110 transition-transform">
                              {user.name.substring(0, 1).toUpperCase()}
                            </div>
                            <span className="font-black text-slate-100 group-hover:text-amber-400 transition-colors truncate">{user.name}</span>
                          </div>

                          <div className="col-span-3 text-right">
                            <span className="text-sm font-black text-white">{user.wins}</span>
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
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Tổng : {formatVND(selectedLossUser.currentTotalAmount)}</p>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Chuỗi kỷ lục</p>
                  <p className="text-2xl font-black text-slate-400 mt-1">{selectedLossUser.maxStreak} trận</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Tổng : {formatVND(selectedLossUser.maxTotalAmount)}</p>
                </div>
              </div>

              {/* Match list */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Danh sách trận chọn liên tiếp gần nhất</p>

                <div className="space-y-2">
                  {selectedLossUser.currentStreakMatches.length > 0 ? (
                    selectedLossUser.currentStreakMatches.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.05] transition-colors">
                        <div>
                          <p className="font-black text-slate-200">{item.matchName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Ngày đá: {item.date} • Chọn: {formatVND(item.amount)}</p>
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
                            <p className="text-[9px] text-slate-600 mt-0.5">Ngày đá: {item.date} • Chọn: {formatVND(item.amount)}</p>
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
                {getRefundAmount(selectedLossUser.currentStreakMatches || []) > 0 ? (
                  <div className="text-left">
                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">Đủ điều kiện hoàn</p>
                    <p className="text-base font-black text-amber-400 font-mono">
                      {formatVND(getRefundAmount(selectedLossUser.currentStreakMatches || []))}
                    </p>
                  </div>
                ) : selectedLossUser.currentStreak >= 4 ? (
                  <div className="text-left">
                    <p className="text-[9px] text-amber-500 font-black uppercase tracking-wider">Chưa đủ tổng</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Tổng : {formatVND(selectedLossUser.currentTotalAmount)} / {formatVND(selectedLossUser.currentStreak === 4 ? 400000 : 500000)}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-slate-500">Chưa đạt chuỗi thua 4 trận</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && getRefundAmount(selectedLossUser.currentStreakMatches || []) > 0 && (
                  <button
                    onClick={async () => {
                      const refundAmt = getRefundAmount(selectedLossUser.currentStreakMatches || []);
                      if (window.confirm(`Xác nhận đã hoàn bảo hiểm ${formatVND(refundAmt)} cho ${selectedLossUser.name}?`)) {
                        const { error } = await supabase
                          .from('refunds')
                          .insert({
                            user_name: selectedLossUser.name,
                            amount: refundAmt
                          });
                        if (error) {
                          alert(`Lỗi hoàn : ${error.message}`);
                        } else {
                          alert(`Đã hoàn thành công cho ${selectedLossUser.name}!`);
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
