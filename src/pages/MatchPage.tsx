import React, { useState, useEffect, useRef, useContext } from 'react';
import { Match, BetOption } from '../types';
import { supabase } from '../lib/supabase';
import MatchCard from '../components/MatchCard';
import BetModal from '../components/BetModal';
import MatchDetail from '../components/MatchDetail';
import AuthModal from '../components/AuthModal';
import { AppContext } from '../App';
import { isMatchBettingLocked } from '../utils/betLogic';

const MatchPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'detail'>('grid');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<BetOption>('teamA');
  const [filter, setFilter] = useState('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingBet, setEditingBet] = useState<any | null>(null);
  const [betListModalOpen, setBetListModalOpen] = useState(false); // State for the new bet list modal

  const scrollerRef = useRef<HTMLDivElement>(null);

  const ctx = useContext(AppContext);
  if (!ctx) return null;
  const { isAdminAuthenticated, session, user } = ctx;
  const isAdmin = isAdminAuthenticated || false;

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: true });

    if (!error && data) {
      setMatches(data);
      if (data.length > 0 && !selectedDate) {
        const wcMatches = data.filter(m => m.league !== 'TIP Futsal league');
        const wcDates = [...new Set(wcMatches.map(m => new Date(m.start_time).toLocaleDateString('vi-VN')))].sort((a, b) => {
          const [da, ma, ya] = a.split('/').map(Number);
          const [db, mb, yb] = b.split('/').map(Number);
          return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });

        const today = new Date();
        const parsedDates = wcDates.map(dStr => {
          const [d, m, y] = dStr.split('/').map(Number);
          return { str: dStr, date: new Date(y, m - 1, d) };
        });

        let startingDateObj = parsedDates.find(item =>
          item.date.getDate() === today.getDate() &&
          item.date.getMonth() === today.getMonth() &&
          item.date.getFullYear() === today.getFullYear()
        );

        if (!startingDateObj) {
          const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          startingDateObj = parsedDates.find(item => item.date >= todayReset);
        }

        const startingDate = startingDateObj?.str || wcDates[wcDates.length - 1] || wcDates[0];
        setSelectedDate(startingDate);
      }
      if (selectedMatch) {
        const updated = data.find(m => m.id === selectedMatch.id);
        if (updated) setSelectedMatch(updated);
      }
    }
    setLoading(false);
  };

  const handleMatchClick = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
      const isLocked = isMatchBettingLocked(match);
      const canBet = isAdmin || !isLocked;

      if (canBet) {
        setView('detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setBetListModalOpen(true);
      }
    }
  };

  const handleBetClick = (option: BetOption) => {
    if (!session) {
      setAuthModalOpen(true);
      return;
    }
    setSelectedOption(option);
    setModalOpen(true);
  };

  const handleSaveBet = async (userName: string, amount: number, option: BetOption) => {
    if (!selectedMatch || !user) return;

    if (editingBet) {
      // Conversion: Store actual team name instead of placeholders
      const finalOption = option === 'teamA' ? selectedMatch.team_a_name : selectedMatch.team_b_name;

      // Update existing bet
      const { error } = await supabase
        .from('bets')
        .update({
          amount: amount,
          option: finalOption,
          user_name: userName // In case they changed it, though UI might hide it
        })
        .eq('id', editingBet.id);

      if (error) {
        alert('Lỗi khi cập nhật cược: ' + error.message);
      } else {
        setModalOpen(false);
        setEditingBet(null);
        setRefreshTrigger(prev => prev + 1);
        alert('Cập nhật thành công!');
      }
    } else {
      // Conversion: Store actual team name instead of placeholders
      const finalOption = option === 'teamA' ? selectedMatch.team_a_name : selectedMatch.team_b_name;

      // Insert new bet
      const { error } = await supabase
        .from('bets')
        .insert({
          match_id: selectedMatch.id,
          user_name: userName,
          amount: amount,
          option: finalOption,
          user_id: user.id
        });

      if (error) {
        alert('Lỗi khi dự đoán: ' + error.message);
      } else {
        setModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
        alert('Dự đoán thành công!');
      }
    }
  };

  const handleEditBet = (bet: any) => {
    if (!selectedMatch) return;
    setEditingBet(bet);
    setSelectedOption((bet.option === 'teamA' || bet.option === selectedMatch.team_a_name) ? 'teamA' : 'teamB');
    setModalOpen(true);
  };

  const scrollPrev = () => {
    scrollerRef.current?.scrollBy({ left: -250, behavior: 'smooth' });
  };

  const scrollNext = () => {
    scrollerRef.current?.scrollBy({ left: 250, behavior: 'smooth' });
  };

  const uniqueDates = [...new Set(matches
    .filter(m => m.league !== 'TIP Futsal league')
    .map(m => new Date(m.start_time).toLocaleDateString('vi-VN'))
  )].sort((a, b) => {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  const filteredMatches = matches.filter(m => {
    // Isolation: Exclude TIP Futsal league
    const isWC = m.league !== 'TIP Futsal league';
    if (!isWC) return false;

    if (filter === 'live') return m.status === 'live';
    if (filter === 'date' && selectedDate) {
      return new Date(m.start_time).toLocaleDateString('vi-VN') === selectedDate;
    }
    if (filter === 'all') return true;
    return true;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-emerald-500 font-black text-xs uppercase tracking-widest animate-pulse">Đang tải giải đấu...</span>
      </div>
    </div>
  );

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
        {/* Login button: absolute top right of the page body */}
        {!session && view === 'grid' && (
          <div className="absolute right-6 top-6 md:right-8 md:top-8 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-emerald-400 hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-black/40 border border-white/10"
            >
              Đăng nhập
            </button>
          </div>
        )}

        {view === 'grid' ? (
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-transparent py-12 mb-4 relative">
              <div className="max-w-7xl mx-auto">
                {/* Header Top: Title and Login */}
                <div className="relative flex flex-col items-center mb-8">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl md:text-7xl font-black text-emerald-500 tracking-tighter flex items-center gap-4 mt-8 mb-4 drop-shadow-2xl">
                      <span className="hidden md:block">🏆</span> FIFA WORLD CUP 2026
                    </h1>
                    {isAdmin && (
                      <div className="mt-2 px-3 py-1 bg-amber-500 rounded text-[10px] text-black font-black uppercase inline-block">
                        Admin Mode
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters Section: Moved Below Title */}
                <div className="flex flex-col md:flex-row items-center gap-8 bg-white/5 backdrop-blur-md p-3 rounded-[32px] border border-white/10">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFilter('date')}
                      className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'date' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      Theo Ngày
                    </button>
                    <button
                      onClick={() => setFilter('live')}
                      className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'live' ? 'bg-rose-600 text-white shadow-xl animate-pulse' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      Đang Đá
                    </button>
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-slate-700 text-white shadow-xl' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      Tất Cả
                    </button>
                  </div>

                  {/* Date Scroller */}
                  {filter === 'date' && (
                    <div className="flex-1 flex items-center gap-2.5 w-full max-w-3xl min-w-0">
                      <button
                        onClick={scrollPrev}
                        className="shrink-0 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-emerald-500/20 rounded-full text-white/50 hover:text-emerald-400 transition-all text-xs"
                      >
                        ◀
                      </button>

                      <div
                        ref={scrollerRef}
                        className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3 scroll-smooth py-1"
                      >
                        {uniqueDates.map((date) => {
                          const [d, m, y] = date.split('/');
                          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                          const daysOfWeek = ['CN', 'T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7'];
                          const dayOfWeek = daysOfWeek[dateObj.getDay()];
                          const isActive = selectedDate === date;
                          return (
                            <button
                              key={date}
                              onClick={() => setSelectedDate(date)}
                              className={`flex flex-col items-center min-w-[64px] py-1.5 rounded-xl border transition-all shrink-0 ${isActive
                                ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                                }`}
                            >
                              <span className={`text-[11px] font-black uppercase ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>{dayOfWeek}</span>
                              <span className={`text-lg font-black leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>{d}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={scrollNext}
                        className="shrink-0 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-emerald-500/20 rounded-full text-white/50 hover:text-emerald-400 transition-all text-xs"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onBet={handleMatchClick}
                  isAdmin={isAdmin}
                />
              ))}
            </div>

            {filteredMatches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-slate-600">
                <p className="font-black uppercase tracking-widest text-xs">Không có trận đấu nào trong ngày này</p>
              </div>
            )}
          </div>
        ) : (
          selectedMatch && (
            <MatchDetail
              match={selectedMatch}
              onBack={() => setView('grid')}
              onBet={handleBetClick}
              onEditBet={handleEditBet}
              refreshTrigger={refreshTrigger}
              isAdmin={isAdmin}
              currentUserId={user?.id}
              currentFullName={user?.user_metadata?.full_name}
              isBettingLockedManually={isMatchBettingLocked(selectedMatch)}
            />
          )
        )}
      </div>

      {selectedMatch && (
        <BetModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingBet(null);
          }}
          match={selectedMatch}
          option={selectedOption}
          onSave={handleSaveBet}
          initialUserName={user?.user_metadata?.full_name}
          initialAmount={editingBet?.amount}
          isEditing={!!editingBet}
        />
      )}

      {selectedMatch && (
        <BetListModal
          isOpen={betListModalOpen}
          onClose={() => setBetListModalOpen(false)}
          match={selectedMatch}
          isAdmin={isAdmin}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default MatchPage;

// ─── BetListModal ───────────────────────────────────────────────────────────────
interface BetListModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  isAdmin?: boolean;
}

const BetListModal: React.FC<BetListModalProps> = ({ isOpen, onClose, match }) => {
  const [bets, setBets] = useState<any[]>([]);
  const [loadingBets, setLoadingBets] = useState(true);
  const { user } = useContext(AppContext) || {};

  useEffect(() => {
    if (isOpen && match) {
      fetchBetsForMatch(match.id);

      const channel = supabase
        .channel(`match-bets-${match.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "bets", filter: `match_id=eq.${match.id}` }, () => {
          fetchBetsForMatch(match.id);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      setBets([]); // Clear bets when modal is closed
    }
  }, [isOpen, match?.id]);

  const fetchBetsForMatch = async (matchId: string) => {
    setLoadingBets(true);
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });

    if (!error) setBets(data || []);
    setLoadingBets(false);
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl lg:max-w-3xl bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative bg-[#1a2f1a] px-6 py-6 sm:px-8 sm:py-8 border-b border-white/5">
          <div className="text-emerald-500 text-xs sm:text-sm font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            Danh sách cược
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            {match.team_a_name} <span className="text-slate-500 px-1">vs</span> {match.team_b_name}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {loadingBets ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-emerald-500 font-black text-xs uppercase tracking-widest animate-pulse">Đang tải cược...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Match Bet Statistics - Reused from MatchDetail.tsx */}
              <div className="bg-[#1e293b]/60 backdrop-blur-md border border-white/10 rounded-[32px] p-6 mb-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 via-emerald-500 to-rose-500" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                        Thống kê lượng cược trận đấu
                      </h3>
                      <p className="text-[11px] text-slate-500 font-bold uppercase mt-0.5">Cập nhật thời gian thực</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 font-mono">
                    <div className="text-center md:text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tổng giá trị</p>
                      <p className="text-2xl font-black text-emerald-400">
                        {bets.reduce((sum, b) => sum + b.amount, 0).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="text-center md:text-left">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tổng lượt dự đoán</p>
                      <p className="text-2xl font-black text-indigo-400">{bets.length} lượt</p>
                    </div>
                  </div>
                </div>

                {/* Distribution Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="text-indigo-400">
                      {match.team_a_name}: {bets.filter(b => b.option === match.team_a_name || b.option === "teamA").reduce((sum, b) => sum + b.amount, 0).toLocaleString("vi-VN")} ({bets.reduce((sum, b) => sum + b.amount, 0) > 0 ? Math.round((bets.filter(b => b.option === match.team_a_name || b.option === "teamA").reduce((sum, b) => sum + b.amount, 0) / bets.reduce((sum, b) => sum + b.amount, 0)) * 100) : 0}%)
                    </span>
                    <span className="text-rose-400">
                      {match.team_b_name}: {bets.filter(b => b.option === match.team_b_name || b.option === "teamB").reduce((sum, b) => sum + b.amount, 0).toLocaleString("vi-VN")} ({bets.reduce((sum, b) => sum + b.amount, 0) > 0 ? Math.round((bets.filter(b => b.option === match.team_b_name || b.option === "teamB").reduce((sum, b) => sum + b.amount, 0) / bets.reduce((sum, b) => sum + b.amount, 0)) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-950/80 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-l-full transition-all duration-500"
                      style={{ width: `${bets.reduce((sum, b) => sum + b.amount, 0) > 0 ? (bets.filter(b => b.option === match.team_a_name || b.option === "teamA").reduce((sum, b) => sum + b.amount, 0) / bets.reduce((sum, b) => sum + b.amount, 0)) * 100 : 50}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-500"
                      style={{ width: `${bets.reduce((sum, b) => sum + b.amount, 0) > 0 ? (bets.filter(b => b.option === match.team_b_name || b.option === "teamB").reduce((sum, b) => sum + b.amount, 0) / bets.reduce((sum, b) => sum + b.amount, 0)) * 100 : 50}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Team A Bets */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-4 border-b border-white/5 pb-2">
                    Cược cho {match.team_a_name}
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {bets.filter(b => b.option === match.team_a_name || b.option === "teamA").length > 0 ? (
                      bets.filter(b => b.option === match.team_a_name || b.option === "teamA").map((bet: any, idx: number) => {
                        const isOwner = user && bet.user_id === user.id && bet.user_name === user.user_metadata?.full_name;
                        return (
                          <div key={idx} className="flex items-center justify-between text-[13px] animate-fade-in group/bet">
                            <span className="text-slate-300 font-bold truncate">{bet.user_name} {isOwner && "(Bạn)"}</span>
                            <span className="text-emerald-400 font-mono font-bold">{bet.amount.toLocaleString("vi-VN")}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-500 italic text-center py-4">Chưa có cược nào.</p>
                    )}
                  </div>
                </div>

                {/* Team B Bets */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-4 border-b border-white/5 pb-2">
                    Cược cho {match.team_b_name}
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {bets.filter(b => b.option === match.team_b_name || b.option === "teamB").length > 0 ? (
                      bets.filter(b => b.option === match.team_b_name || b.option === "teamB").map((bet: any, idx: number) => {
                        const isOwner = user && bet.user_id === user.id && bet.user_name === user.user_metadata?.full_name;
                        return (
                          <div key={idx} className="flex items-center justify-between text-[13px] animate-fade-in group/bet">
                            <span className="text-slate-300 font-bold truncate">{bet.user_name} {isOwner && "(Bạn)"}</span>
                            <span className="text-emerald-400 font-mono font-bold">{bet.amount.toLocaleString("vi-VN")}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-500 italic text-center py-4">Chưa có cược nào.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex justify-center">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
