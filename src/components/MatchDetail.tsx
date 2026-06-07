import React, { useState, useEffect } from 'react';
import { Match, BetOption } from '../types';
import { supabase } from '../lib/supabase';
import { formatVND, formatHandicap, formatRate } from '../utils/format';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
  onBet: (option: BetOption) => void;
  onEditBet?: (bet: any) => void;
  refreshTrigger?: number;
  isAdmin?: boolean;
  currentUserId?: string;
  currentFullName?: string;
  isBettingLockedManually?: boolean; // New prop to indicate manual lock
}

const MatchDetail: React.FC<MatchDetailProps> = ({
  match,
  onBack,
  onBet,
  onEditBet,
  refreshTrigger,
  isAdmin,
  currentUserId,
  currentFullName,
  isBettingLockedManually
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

  const totalA = betsA.reduce((sum, b) => sum + b.amount, 0);
  const totalB = betsB.reduce((sum, b) => sum + b.amount, 0);
  const totalPool = totalA + totalB;

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
          <span className="font-bold text-lg uppercase tracking-widest">Quay lại danh sách</span>
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
                {match.team_a_code && match.team_a_code !== 'unknown' && match.team_a_code.length > 0 ? (
                  <img src={`https://flagcdn.com/w160/${match.team_a_code.toLowerCase()}.png`} alt={match.team_a_name} className="w-full h-full object-cover" />
                ) : match.team_a_icon?.startsWith('http') ? (
                  <img src={match.team_a_icon} alt={match.team_a_name} className="w-full h-full object-cover" />
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
                {match.team_b_code && match.team_b_code !== 'unknown' && match.team_b_code.length > 0 ? (
                  <img src={`https://flagcdn.com/w160/${match.team_b_code.toLowerCase()}.png`} alt={match.team_b_name} className="w-full h-full object-cover" />
                ) : match.team_b_icon?.startsWith('http') ? (
                  <img src={match.team_b_icon} alt={match.team_b_name} className="w-full h-full object-cover" />
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

            <div className="flex items-center justify-center w-full gap-2 md:gap-6 tracking-wide">
              {/* Team A container */}
              <div className="flex-1 flex items-center justify-end gap-2 md:gap-3 min-w-0">
                <span className="text-white font-black text-sm md:text-3xl truncate text-right">
                  {match.team_a_name}
                </span>
                <span className="text-cyan-400 font-black text-base md:text-2xl shrink-0 bg-amber-500/10 px-2 py-1 rounded-xl border border-amber-500/20 shadow-inner">
                  {match.favorite_team === 'teamA' || match.handicap === 0
                    ? '0'
                    : `+${formatHandicap(Math.abs(match.handicap))}`}
                </span>
              </div>

              {/* Center Cup */}
              <div className="text-2xl md:text-4xl flex-shrink-0 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                🏆
              </div>

              {/* Team B container */}
              <div className="flex-1 flex items-center justify-start gap-2 md:gap-3 min-w-0">
                <span className="text-cyan-400 font-black text-base md:text-2xl shrink-0 bg-amber-500/10 px-2 py-1 rounded-xl border border-amber-500/20 shadow-inner">
                  {match.favorite_team === 'teamA' && match.handicap !== 0
                    ? `+${formatHandicap(Math.abs(match.handicap))}`
                    : '0'}
                </span>
                <span className="text-white font-black text-sm md:text-3xl truncate text-left">
                  {match.team_b_name}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Betting Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Option A */}
          <div className="space-y-4 relative">
            <div className="absolute -left-14 top-1/3 -translate-y-1/2 text-4xl animate-bounce hidden xl:block pointer-events-none">👉</div>
            <button
              onClick={() => (isAdmin || (match.status !== 'finished' && !isBettingLockedManually)) && onBet('teamA')}
              disabled={!isAdmin && (match.status === 'finished' || isBettingLockedManually)}
              className={`w-full bg-slate-900/60 border border-white/10 rounded-[32px] p-8 transition-all relative overflow-hidden shadow-2xl backdrop-blur-md group ${(isAdmin || (match.status !== 'finished' && !isBettingLockedManually)) ? 'hover:bg-slate-900/80 hover:scale-[1.02] active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'}
                }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-10 mb-4 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                  {match.team_a_code && match.team_a_code !== 'unknown' && match.team_a_code.length > 0 ? (
                    <img src={`https://flagcdn.com/w80/${match.team_a_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                  ) : match.team_a_icon?.startsWith('http') ? (
                    <img src={match.team_a_icon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-2xl pt-1">{match.team_a_icon || '⚽'}</div>
                  )}
                </div>
                <span className="text-lg font-bold text-slate-300 mb-4">{match.team_a_name}</span>

                <div className="inline-block px-10 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-[16px] font-black">
                  Rate: {formatRate(match.rate_a)}
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
          <div className="space-y-4 relative">
            <div className="absolute -right-14 top-1/3 -translate-y-1/2 text-4xl animate-bounce hidden xl:block pointer-events-none">👈</div>
            <button
              onClick={() => (isAdmin || (match.status !== 'finished' && !isBettingLockedManually)) && onBet('teamB')}
              disabled={!isAdmin && (match.status === 'finished' || isBettingLockedManually)}
              className={`w-full bg-slate-900/60 border border-white/10 rounded-[32px] p-8 transition-all relative overflow-hidden shadow-2xl backdrop-blur-md group ${(isAdmin || (match.status !== 'finished' && !isBettingLockedManually)) ? 'hover:bg-slate-900/80 hover:scale-[1.02] active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'}
                }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-10 mb-4 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                  {match.team_b_code && match.team_b_code !== 'unknown' && match.team_b_code.length > 0 ? (
                    <img src={`https://flagcdn.com/w80/${match.team_b_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                  ) : match.team_b_icon?.startsWith('http') ? (
                    <img src={match.team_b_icon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-2xl pt-1">{match.team_b_icon || '⚽'}</div>
                  )}
                </div>
                <span className="text-lg font-bold text-slate-300 mb-4">{match.team_b_name}</span>

                <div className="inline-block px-10 py-1.5 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-300 text-[16px] font-black">
                  Rate: {formatRate(match.rate_b)}
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

        {/* Match Betting Statistics */}
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
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tổng tiền cược</p>
                <p className="text-2xl font-black text-emerald-400">
                  {formatVND(totalPool)}
                </p>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tổng lượt cược</p>
                <p className="text-2xl font-black text-indigo-400">{bets.length} lượt</p>
              </div>
            </div>
          </div>

          {/* Distribution Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
              <span className="text-indigo-400">
                {match.team_a_name}: {formatVND(totalA)} ({totalPool > 0 ? Math.round((totalA / totalPool) * 100) : 0}%)
              </span>
              <span className="text-rose-400">
                {match.team_b_name}: {formatVND(totalB)} ({totalPool > 0 ? Math.round((totalB / totalPool) * 100) : 0}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-950/80 rounded-full overflow-hidden flex p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-l-full transition-all duration-500"
                style={{ width: `${totalPool > 0 ? (totalA / totalPool) * 100 : 50}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-500"
                style={{ width: `${totalPool > 0 ? (totalB / totalPool) * 100 : 50}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rules & Regulations Banner */}
        <div className="mt-8 bg-indigo-950/20 backdrop-blur-md border border-indigo-500/20 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] pointer-events-none" />

          <div className="flex items-center gap-2.5 mb-3 border-b border-indigo-500/10 pb-2.5">
            <span className="text-xl">🛡️</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300">
              Quy định & Thể lệ đặt cược trận đấu
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold leading-relaxed">
            <div className="flex items-start gap-3 bg-black/20 p-3.5 rounded-2xl border border-white/5">
              <span className="text-lg shrink-0 mt-0.5">🔒</span>
              <div>
                <h4 className="font-bold text-slate-200 mb-1">Đóng nhận cược tự động</h4>
                <p className="text-slate-400 font-medium">Hệ thống tự động khóa và dừng nhận cược trước thời gian trận đấu diễn ra <strong className="text-indigo-300">30 phút</strong>.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-black/20 p-3.5 rounded-2xl border border-white/5">
              <span className="text-lg shrink-0 mt-0.5">⏱️</span>
              <div>
                <h4 className="font-bold text-slate-200 mb-1">Thời gian thi đấu tính thưởng</h4>
                <p className="text-slate-400 font-medium">Kết quả được tính trong <strong className="text-indigo-300">thời gian thi đấu chính thức</strong> (90 phút + bù giờ). Không tính hiệp phụ & loạt sút luân lưu.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
