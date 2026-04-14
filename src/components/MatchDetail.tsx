import React, { useState, useEffect } from 'react';
import { Match, BetOption } from '../types';
import { supabase } from '../lib/supabase';
import { formatVND, formatHandicap } from '../utils/format';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
  onBet: (option: BetOption) => void;
  onEditBet?: (bet: any) => void;
  refreshTrigger?: number;
  isAdmin?: boolean;
  currentUserId?: string;
  currentFullName?: string;
}

const MatchDetail: React.FC<MatchDetailProps> = ({
  match,
  onBack,
  onBet,
  onEditBet,
  refreshTrigger,
  isAdmin,
  currentUserId,
  currentFullName
}) => {
  const [bets, setBets] = useState<any[]>([]);

  useEffect(() => {
    fetchBets();

    const channel = supabase
      .channel(`match-bets-${match.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bets',
        filter: `match_id=eq.${match.id}`
      }, () => {
        fetchBets();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'bets',
        filter: `match_id=eq.${match.id}`
      }, () => {
        fetchBets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id, refreshTrigger]);

  const fetchBets = async () => {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', match.id)
      .order('created_at', { ascending: false });

    if (!error) setBets(data || []);
  };

  const handleDeleteBet = async (betId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cược này?')) return;

    const { error } = await supabase
      .from('bets')
      .delete()
      .eq('id', betId);

    if (error) {
      alert('Lỗi khi xóa cược: ' + error.message);
    } else {
      fetchBets();
    }
  };

  const betsA = bets.filter(b => b.option === 'teamA' || b.option === match.team_a_name);
  const betsB = bets.filter(b => b.option === 'teamB' || b.option === match.team_b_name);

  const startTime = new Date(match.start_time);
  const timeStr = startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = startTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen relative overflow-hidden text-white pb-20">
      {/* Immersive Background */}
      <div
        className="fixed inset-0 z-0 opacity-40 blur-sm pointer-events-none"
        style={{
          backgroundImage: 'url("/world_cup_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
        >
          <span className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10">←</span>
          <span className="font-bold text-xs uppercase tracking-widest">Quay lại danh sách</span>
        </button>

        {/* Match Header Card */}
        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 mb-8 shadow-2xl relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

          <div className="text-center mb-8">
            <span className="text-[14px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2 block">
              {match.league || 'FIFA WORLD CUP 2026'}
            </span>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <span>🗓️ {timeStr} {dateStr}</span>
                <span className="text-slate-600">•</span>
                <span>🏟️ {match.stadium}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 md:gap-12">
            <div className="flex flex-col items-center gap-4 flex-1">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-900/50 p-0 border border-white/5 shadow-inner flex items-center justify-center overflow-hidden">
                {match.team_a_code && match.team_a_code !== 'unknown' ? (
                  <img src={`https://flagcdn.com/w160/${match.team_a_code.toLowerCase()}.png`} alt={match.team_a_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-6xl md:text-7xl">{match.team_a_icon || '⚽'}</div>
                )}
              </div>
              <h2 className="text-xl md:text-3xl font-black text-white text-center">{match.team_a_name}</h2>
            </div>

            <div className="px-6 py-2 bg-indigo-600 rounded-2xl text-xl font-black shadow-lg shadow-indigo-500/30">
              VS
            </div>

            <div className="flex flex-col items-center gap-4 flex-1">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-900/50 p-0 border border-white/5 shadow-inner flex items-center justify-center overflow-hidden">
                {match.team_b_code && match.team_b_code !== 'unknown' ? (
                  <img src={`https://flagcdn.com/w160/${match.team_b_code.toLowerCase()}.png`} alt={match.team_b_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-6xl md:text-7xl">{match.team_b_icon || '⚽'}</div>
                )}
              </div>
              <h2 className="text-xl md:text-3xl font-black text-white text-center">{match.team_b_name}</h2>
            </div>
          </div>
        </div>

        {/* Handicap Info Badge */}
        <div className="flex justify-center mb-12">
          <div className="bg-amber-500/20 w-full border border-amber-500/30 px-4 md:px-8 py-4 rounded-3xl flex flex-col items-center gap-2 backdrop-blur-md shadow-lg shadow-amber-500/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚖️</span>
              <span className="text-base md:text-lg font-bold text-amber-400/90 uppercase tracking-widest">
                KÈO CHẤP
              </span>
            </div>
            
            <div className="flex items-center justify-center w-full gap-3 md:gap-6 text-lg md:text-3xl font-black text-amber-100 uppercase tracking-wide">
              <div className="flex-1 text-right">
                {match.favorite_team === 'teamA' 
                  ? `${match.team_a_name} 0` 
                  : `${match.team_a_name} +${formatHandicap(match.handicap)}`}
              </div>
              
              <div className="text-3xl md:text-4xl flex-shrink-0 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">🏆</div>

              <div className="flex-1 text-left">
                {match.favorite_team === 'teamA' 
                  ? `+${formatHandicap(match.handicap)} ${match.team_b_name}` 
                  : `${match.team_b_name} 0`}
              </div>
            </div>
          </div>
        </div>

        {/* Betting Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Option A */}
          <div className="space-y-4">
            <button
              onClick={() => (isAdmin || match.status !== 'finished') && onBet('teamA')}
              disabled={!isAdmin && match.status === 'finished'}
              className={`w-full bg-slate-900/60 border border-white/10 rounded-[32px] p-8 transition-all relative overflow-hidden shadow-2xl backdrop-blur-md group ${(isAdmin || match.status !== 'finished') ? 'hover:bg-slate-900/80 hover:scale-[1.02] active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
                }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-10 mb-4 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                  {match.team_a_code && match.team_a_code !== 'unknown' ? (
                    <img src={`https://flagcdn.com/w80/${match.team_a_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-2xl pt-1">{match.team_a_icon || '⚽'}</div>
                  )}
                </div>
                <span className="text-lg font-bold text-slate-300 mb-4">{match.team_a_name}</span>

                <div className="inline-block px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-[16px] font-black uppercase">
                  Ăn {match.rate_a}%
                </div>
              </div>
            </button>

            {/* Bets List A */}
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{match.team_a_name} thắng</span>
                <span className="text-xs font-black text-indigo-400">{betsA.length} cược</span>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {betsA.map((bet, idx) => {
                  const isOwner = currentUserId && bet.user_id === currentUserId && bet.user_name === currentFullName;
                  return (
                    <div key={idx} className="flex items-center justify-between text-[11px] animate-fade-in group/bet">
                      <div className="flex items-center gap-2">
                        {(isAdmin || isOwner) && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditBet?.(bet)}
                              className="text-amber-500 hover:text-amber-400 p-1 bg-amber-500/10 rounded transition-colors"
                              title="Sửa cược"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteBet(bet.id)}
                              className="text-rose-500 hover:text-rose-400 p-1 bg-rose-500/10 rounded transition-colors"
                              title="Xóa cược"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        <span className="text-slate-300 font-bold text-base">{bet.user_name} {isOwner && '(Bạn)'}</span>
                      </div>
                      <span className="text-emerald-400 font-mono font-bold text-base">{formatVND(bet.amount)}</span>
                    </div>
                  );
                })}
                {betsA.length === 0 && <p className="text-[10px] text-slate-500 italic text-center py-4">Chưa có cược nào...</p>}
              </div>
            </div>
          </div>

          {/* Option B */}
          <div className="space-y-4">
            <button
              onClick={() => (isAdmin || match.status !== 'finished') && onBet('teamB')}
              disabled={!isAdmin && match.status === 'finished'}
              className={`w-full bg-slate-900/60 border border-white/10 rounded-[32px] p-8 transition-all relative overflow-hidden shadow-2xl backdrop-blur-md group ${(isAdmin || match.status !== 'finished') ? 'hover:bg-slate-900/80 hover:scale-[1.02] active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
                }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-10 mb-4 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                  {match.team_b_code && match.team_b_code !== 'unknown' ? (
                    <img src={`https://flagcdn.com/w80/${match.team_b_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-2xl pt-1">{match.team_b_icon || '⚽'}</div>
                  )}
                </div>
                <span className="text-lg font-bold text-slate-300 mb-4">{match.team_b_name}</span>

                <div className="inline-block px-4 py-1.5 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-300 text-[16px] font-black uppercase">
                  Ăn {match.rate_b}%
                </div>
              </div>
            </button>

            {/* Bets List B */}
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{match.team_b_name} thắng</span>
                <span className="text-xs font-black text-rose-400">{betsB.length} cược</span>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {betsB.map((bet, idx) => {
                  const isOwner = currentUserId && bet.user_id === currentUserId && bet.user_name === currentFullName;
                  return (
                    <div key={idx} className="flex items-center justify-between text-[11px] animate-fade-in group/bet">
                      <div className="flex items-center gap-2">
                        {(isAdmin || isOwner) && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditBet?.(bet)}
                              className="text-amber-500 hover:text-amber-400 p-1 bg-amber-500/10 rounded transition-colors"
                              title="Sửa cược"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteBet(bet.id)}
                              className="text-rose-500 hover:text-rose-400 p-1 bg-rose-500/10 rounded transition-colors"
                              title="Xóa cược"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        <span className="text-slate-300 font-bold text-base">{bet.user_name} {isOwner && '(Bạn)'}</span>
                      </div>
                      <span className="text-emerald-400 font-mono font-bold text-base">{formatVND(bet.amount)}</span>
                    </div>
                  );
                })}
                {betsB.length === 0 && <p className="text-[10px] text-slate-500 italic text-center py-4">Chưa có cược nào...</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
