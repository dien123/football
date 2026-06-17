import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import AuthModal from '../components/AuthModal';
import { calculateBetResult, getOutcomeLabel, getOutcomeColorCls } from '../utils/betLogic';
import { formatVND, formatHandicap } from '../utils/format';

const TIERS = [
  {
    name: "Tier S",
    teams: [
      { name: "Argentina", code: "ar" },
      { name: "Pháp", code: "fr" },
      { name: "Brazil", code: "br" },
      { name: "Tây Ban Nha", code: "es" },
      { name: "Anh", code: "gb-eng" },
      { name: "Đức", code: "de" },
      { name: "Hà Lan", code: "nl" },
    ],
  },
  {
    name: "Tier A",
    teams: [
      { name: "Bồ Đào Nha", code: "pt" },
      { name: "Uruguay", code: "uy" },
      { name: "Bỉ", code: "be" },
      { name: "Croatia", code: "hr" },
      { name: "Colombia", code: "co" },
      { name: "Nhật Bản", code: "jp" },
    ],
  },
  {
    name: "Tier B",
    teams: [
      { name: "Maroc", code: "ma" },
      { name: "Thụy Sĩ", code: "ch" },
      { name: "Mexico", code: "mx" },
      { name: "Hoa Kỳ", code: "us" },
      { name: "Hàn Quốc", code: "kr" },
      { name: "Senegal", code: "sn" },
      { name: "Áo", code: "at" },
      { name: "Thụy Điển", code: "se" },
      { name: "Na Uy", code: "no" },
      { name: "Thổ Nhĩ Kỳ", code: "tr" },
      { name: "Paraguay", code: "py" },
      { name: "Ecuador", code: "ec" },
      { name: "Đan Mạch", code: "dk" },
      { name: "Iran", code: "ir" },
      { name: "Ai Cập", code: "eg" },
      { name: "Canada", code: "ca" },
    ],
  },
  {
    name: "Tier C",
    teams: [
      { name: "Úc", code: "au" },
      { name: "Tunisia", code: "tn" },
      { name: "Algeria", code: "dz" },
      { name: "Ghana", code: "gh" },
      { name: "Bờ Biển Ngà", code: "ci" },
      { name: "Cộng hòa Séc", code: "cz" },
      { name: "Scotland", code: "gb-sct" },
      { name: "Ả Rập Xê Út", code: "sa" },
      { name: "Qatar", code: "qa" },
      { name: "Nam Phi", code: "za" },
      { name: "Bosnia & HZ", code: "ba" },
      { name: "CHDC Congo", code: "cd" },
      { name: "Panama", code: "pa" },
      { name: "Iraq", code: "iq" },
    ],
  },
  {
    name: "Tier D",
    teams: [
      { name: "Jordan", code: "jo" },
      { name: "Uzbekistan", code: "uz" },
      { name: "Cape Verde", code: "cv" },
      { name: "New Zealand", code: "nz" },
      { name: "Haiti", code: "ht" },
      { name: "Curaçao", code: "cw" },
    ],
  },
];

const TIER_ODDS: Record<string, number> = {
  "Tier S": 2.5,
  "Tier A": 3.5,
  "Tier B": 5.0,
  "Tier C": 8.0,
  "Tier D": 15.0,
};

const HistoryPage: React.FC = () => {
  const ctx = useContext(AppContext);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // States for user bets
  const [matchBets, setMatchBets] = useState<any[]>([]);
  const [outrightBets, setOutrightBets] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [outrightWinner, setOutrightWinner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'finished' | 'outright'>('pending');

  const session = ctx?.session;
  const user = ctx?.user;

  const getTeamFlagAndTier = (teamName: string) => {
    for (const tier of TIERS) {
      const team = tier.teams.find(t => t.name === teamName);
      if (team) {
        return { code: team.code, tierName: tier.name };
      }
    }
    return { code: '', tierName: '' };
  };

  const getTeamOdds = (teamName: string, allOutrightBets: any[]): number => {
    const tier = TIERS.find(t => t.teams.some(team => team.name === teamName));
    if (!tier) return 1.0;

    const baseOdds = TIER_ODDS[tier.name] || 1.0;
    const totalPool = allOutrightBets.reduce((sum, b) => sum + b.amount, 0);
    if (totalPool === 0) return baseOdds;

    const teamTotal = allOutrightBets.filter(b => b.team_name === teamName).reduce((sum, b) => sum + b.amount, 0);
    const ratio = teamTotal / totalPool;

    if (tier.name === "Tier S") {
      if (ratio > 0.50) return 1.8;
      if (ratio > 0.35) return 2.0;
    } else if (tier.name === "Tier A") {
      if (ratio > 0.50) return 2.5;
      if (ratio > 0.35) return 3.0;
    } else if (tier.name === "Tier B") {
      if (ratio > 0.40) return 4.0;
    }

    return baseOdds;
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*');
      setMatches(matchesData || []);

      // 2. Fetch user match bets
      const { data: betsData } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setMatchBets(betsData || []);

      // 3. Fetch user outright bets
      const { data: outrightBetsData } = await supabase
        .from('outright_bets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setOutrightBets(outrightBetsData || []);

      // 4. Fetch outright winner
      const { data: winData } = await supabase
        .from('outright_winner')
        .select('team_name')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setOutrightWinner(winData?.team_name || null);

    } catch (err) {
      console.error('Lỗi khi tải lịch sử :', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Compute all outright bets (needed for odds calculation ratio)
  const [allOutrightBets, setAllOutrightBets] = useState<any[]>([]);
  useEffect(() => {
    if (user) {
      supabase
        .from('outright_bets')
        .select('*')
        .then(({ data }) => {
          setAllOutrightBets(data || []);
        });
    }
  }, [user]);

  // Calculate statistics across active user 
  const stats = useMemo(() => {
    let totalBetsCount = 0;
    let totalInvested = 0;
    let totalProfit = 0;

    // 1. Process match bets
    matchBets.forEach(bet => {
      const match = matches.find(m => m.id === bet.match_id);
      if (!match || match.league === 'TIP Futsal league') return; // Exclude Futsal!

      totalBetsCount++;
      totalInvested += bet.amount;

      if (match.status === 'finished') {
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
        totalProfit += res.payout;
      }
    });

    // 2. Process outright bets
    outrightBets.forEach(bet => {
      totalBetsCount++;
      totalInvested += bet.amount;

      if (outrightWinner) {
        if (outrightWinner === bet.team_name) {
          const odds = getTeamOdds(bet.team_name, allOutrightBets);
          totalProfit += Math.round(bet.amount * odds - bet.amount);
        } else {
          totalProfit -= bet.amount;
        }
      }
    });

    return { totalBetsCount, totalInvested, totalProfit };
  }, [matchBets, outrightBets, matches, outrightWinner, allOutrightBets]);

  // Filtered match bets based on activeTab
  const filteredBets = useMemo(() => {
    return matchBets.map(bet => {
      const match = matches.find(m => m.id === bet.match_id);
      if (!match) return null;
      return { bet, match };
    }).filter((item): item is { bet: any; match: any } => {
      if (!item) return false;
      const isFutsal = item.match.league === 'TIP Futsal league';
      if (isFutsal) return false; // Exclude Futsal from history page completely

      const isFinished = item.match.status === 'finished';
      if (activeTab === 'pending') return !isFinished;
      if (activeTab === 'finished') return isFinished;
      return false;
    });
  }, [matchBets, matches, activeTab]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#080808] relative overflow-hidden text-white font-sans flex items-center justify-center py-20 px-6">
        <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 blur-sm pointer-events-none" style={{ backgroundImage: 'url("/world_cup_bg.png")' }} />
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />

        <div className="relative z-10 w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">🔒</div>
          <h2 className="text-xl font-black uppercase tracking-tight italic mb-3">LỊCH SỬ DỰ ĐOÁN</h2>
          <p className="text-slate-400 text-xs leading-relaxed font-medium mb-8">
            Vui lòng đăng nhập tài khoản của bạn để kiểm tra toàn bộ danh sách các trận đã , đang , thắng thua và hiệu số lời lãi thực tế.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-950/40 border border-emerald-500/20 active:scale-[0.98]"
          >
            Đăng nhập ngay
          </button>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            fetchData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] relative overflow-hidden text-white font-sans pb-20">
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 blur-sm pointer-events-none" style={{ backgroundImage: 'url("/world_cup_bg.png")' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-xl border border-white/20 shrink-0">📋</div>
            <div>
              <h1 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic">LỊCH SỬ <span className="text-emerald-500">DỰ ĐOÁN</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Tài khoản: {ctx?.fullName || user?.email}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all self-end md:self-auto"
          >
            🔄 Tải lại dữ liệu
          </button>
        </div>

        {/* SUMMARY STATS DASHBOARD */}
        <div className="bg-gradient-to-br from-emerald-950/10 via-slate-900/40 to-black/60 rounded-3xl border border-white/10 p-5 md:p-6 shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tổng lượt  */}
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Tổng lượt dự đoán</p>
              <p className="text-xl md:text-2xl font-black text-white mt-1 font-mono">{stats.totalBetsCount}</p>
            </div>

            {/* Tổng đầu tư */}
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Tổng</p>
              <p className="text-xl md:text-2xl font-black text-white mt-1 font-mono">{formatVND(stats.totalInvested)}</p>
            </div>

            {/* Tổng Lời / Lãi */}
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center relative overflow-hidden">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Hiệu số Lời/Lãi ròng</p>
              <p className={`text-xl md:text-2xl font-black mt-1 font-mono ${stats.totalProfit >= 0 ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`}>
                {stats.totalProfit > 0 ? '+' : ''}{formatVND(stats.totalProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* SYSTEM TAB BAR */}
        <div className="flex bg-black/40 backdrop-blur-xl p-1 rounded-2xl border border-white/10 max-w-md mb-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'pending' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Đã bet chưa đá
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'finished' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Đã bet đã đá
          </button>
          <button
            onClick={() => setActiveTab('outright')}
            className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'outright' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Chọn Vô Địch
          </button>
        </div>

        {/* LOADING INDICATOR */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* MATCH BETS (WORLD CUP & FUTSAL) */}
            {activeTab !== 'outright' && (
              filteredBets.length > 0 ? (
                filteredBets.map(({ bet, match }) => {
                  const isFinished = match.status === 'finished';
                  const isLive = match.status === 'live' || (match.status !== 'finished' && new Date(match.start_time) <= new Date());

                  let payout = 0;
                  let outcomeLabel = 'Đang chờ';
                  let outcomeColorClass = 'text-slate-400 bg-slate-500/10 border-slate-500/30';

                  if (isFinished) {
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
                    payout = res.payout;
                    outcomeLabel = getOutcomeLabel(res.outcome);
                    outcomeColorClass = getOutcomeColorCls(res.outcome);
                  }

                  const isBetOnA = bet.option === 'teamA' || bet.option === match.team_a_name;
                  const chosenTeamName = isBetOnA ? match.team_a_name : match.team_b_name;
                  const oddsUsed = isBetOnA ? match.rate_a : match.rate_b;

                  return (
                    <div
                      key={bet.id}
                      className="bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[28px] p-4 md:p-5 hover:bg-white/[0.04] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left side: Teams and Match metadata */}
                      <div className="flex items-center gap-4">
                        {/* Flags Row */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-8 h-8 bg-black/40 rounded-lg overflow-hidden border border-white/10">
                            <img src={`https://flagcdn.com/w80/${match.team_a_code?.toLowerCase()}.png`} className="w-full h-full object-cover" alt={match.team_a_name} />
                          </div>
                          <span className="text-[10px] text-slate-600 font-bold">VS</span>
                          <div className="w-8 h-8 bg-black/40 rounded-lg overflow-hidden border border-white/10">
                            <img src={`https://flagcdn.com/w80/${match.team_b_code?.toLowerCase()}.png`} className="w-full h-full object-cover" alt={match.team_b_name} />
                          </div>
                        </div>

                        {/* Match & Bet info */}
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-black uppercase text-slate-200 truncate leading-tight">
                            {match.team_a_name} vs {match.team_b_name}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">KÈO: {formatHandicap(match.handicap)}</span>
                            {isFinished ? (
                              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">XONG ({match.score_a} - {match.score_b})</span>
                            ) : isLive ? (
                              <span className="bg-rose-600 text-white px-2 py-0.5 rounded animate-pulse">LIVE ({match.score_a} - {match.score_b})</span>
                            ) : (
                              <span className="bg-slate-900 text-slate-500 px-2 py-0.5 rounded">SẮP ĐÁ</span>
                            )}
                            <span className="italic opacity-60 font-medium">{new Date(match.start_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: User choices and Net profits */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-white/5 pt-3 sm:pt-0 sm:border-t-0 font-medium">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider leading-none">Cửa chọn</p>
                          <h5 className="text-[12px] font-black text-slate-200 mt-1 uppercase truncate max-w-[150px]">
                            {chosenTeamName}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            Chọn: {formatVND(bet.amount)} • Ăn: {oddsUsed}%
                          </span>
                        </div>

                        <div className="text-right flex flex-col items-end shrink-0 min-w-[100px]">
                          {isFinished ? (
                            <>
                              <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${outcomeColorClass}`}>
                                {outcomeLabel}
                              </span>
                              <span className={`text-[13px] font-black font-mono mt-1 ${payout >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {payout > 0 ? '+' : ''}{formatVND(payout)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="px-2 py-0.5 rounded border border-white/5 bg-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                Đang chọn
                              </span>
                              <span className="text-[12px] font-bold text-slate-500 font-mono mt-1">
                                Đợi kết quả
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-3xl py-20 text-center text-slate-500 italic text-sm">
                  Bạn chưa thực hiện lượt dự đoán nào cho tab này.
                </div>
              )
            )}

            {/* OUTRIGHT WINNER BETS */}
            {activeTab === 'outright' && (
              outrightBets.length > 0 ? (
                outrightBets.map(bet => {
                  const { code, tierName } = getTeamFlagAndTier(bet.team_name);
                  const odds = getTeamOdds(bet.team_name, allOutrightBets);
                  const isWon = outrightWinner === bet.team_name;
                  const isWinnerDetermined = outrightWinner !== null;

                  return (
                    <div
                      key={bet.id}
                      className="bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[28px] p-4 md:p-5 hover:bg-white/[0.04] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Flag and Team Name */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-7 bg-black/40 rounded-lg overflow-hidden border border-white/10 shrink-0">
                          {code && <img src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`} className="w-full h-full object-cover" alt={bet.team_name} />}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-black uppercase text-slate-200 leading-tight">
                            {bet.team_name} Vô Địch
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{tierName || 'N/A'}</span>
                            <span className="italic opacity-60 font-medium">{new Date(bet.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Betting details and financial results */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-white/5 pt-3 sm:pt-0 sm:border-t-0 font-medium">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider leading-none">Chọn đầu tư</p>
                          <h5 className="text-[13px] font-mono font-black text-emerald-400 mt-1">
                            {formatVND(bet.amount)}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            Odds hiện tại: x{odds.toFixed(1)}
                          </span>
                        </div>

                        <div className="text-right flex flex-col items-end shrink-0 min-w-[100px]">
                          {isWinnerDetermined ? (
                            isWon ? (
                              <>
                                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                                  Thắng cuộc
                                </span>
                                <span className="text-[13px] font-black font-mono text-emerald-400 mt-1 animate-pulse">
                                  +{formatVND(Math.round(bet.amount * odds - bet.amount))}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border-rose-500/30">
                                  Thua cuộc
                                </span>
                                <span className="text-[13px] font-black font-mono text-rose-400 mt-1">
                                  -{formatVND(bet.amount)}
                                </span>
                              </>
                            )
                          ) : (
                            <>
                              <span className="px-2 py-0.5 rounded border border-white/5 bg-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                Đang diễn ra
                              </span>
                              <span className="text-[11px] font-black text-amber-400 font-mono mt-1" title="Dự kiến nếu vô địch">
                                Nhận: {formatVND(Math.round(bet.amount * odds))}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-3xl py-20 text-center text-slate-500 italic text-sm">
                  Bạn chưa thực hiện lượt dự đoán nhà vô địch nào.
                </div>
              )
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default HistoryPage;
