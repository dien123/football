import React, { useState, useEffect, useRef, useContext } from 'react';
import { Match, BetOption } from '../types';
import { supabase } from '../lib/supabase';
import MatchCard from '../components/MatchCard';
import BetModal from '../components/BetModal';
import MatchDetail from '../components/MatchDetail';
import AuthModal from '../components/AuthModal';
import { AppContext } from '../App';

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
        
        // Robust June 12 finding: check D=12 and M=6 instead of exact string start
        const startingDate = wcDates.find(d => {
          const [day, month] = d.split('/').map(Number);
          return day === 12 && month === 6;
        }) || wcDates[0];
        
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
      setView('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        alert('Lỗi khi đặt cược: ' + error.message);
      } else {
        setModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
        alert('Đặt cược thành công!');
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
        {view === 'grid' ? (
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-transparent py-12 mb-4 relative">
              <div className="max-w-7xl mx-auto">
                {/* Header Top: Title and Login */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                  <div className="flex flex-col items-center flex-1">
                    <div className="flex items-center gap-3 text-emerald-500 text-2xl md:text-3xl font-black mb-3 uppercase tracking-[0.5em] drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                      <span className="hidden md:block">🏆</span>
                      FIFA WORLD CUP 2026
                    </div>
                    <h1 className="text-4xl md:text-8xl font-black text-white tracking-tighter flex items-center gap-4 mt-8 mb-8 drop-shadow-2xl">
                      GIẢI ĐẤU TÔI YÊU
                    </h1>
                    {isAdmin && (
                      <div className="mt-2 px-3 py-1 bg-amber-500 rounded text-[10px] text-black font-black uppercase inline-block">
                        Admin Mode
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center md:items-end gap-4">
                    {!session && (
                      <button
                        onClick={() => setAuthModalOpen(true)}
                        className="px-2 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-emerald-400 transition-all shadow-lg"
                      >
                        Đăng nhập
                      </button>
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
                    <div className="relative flex-1 w-full max-w-3xl group px-10">
                      <button
                        onClick={scrollPrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-emerald-500/20 rounded-full text-white/50 hover:text-emerald-400 transition-all"
                      >
                        ◀
                      </button>

                      <div
                        ref={scrollerRef}
                        className="w-full overflow-x-auto no-scrollbar flex items-center gap-3 scroll-smooth"
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
                              className={`flex flex-col items-center min-w-[64px] py-1.5 rounded-xl border transition-all ${isActive
                                ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
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
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-emerald-500/20 rounded-full text-white/50 hover:text-emerald-400 transition-all"
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default MatchPage;
