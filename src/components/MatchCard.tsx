import React, { useState, useEffect } from 'react';

interface MatchCardProps {
  match: {
    id: string;
    team_a_name: string;
    team_b_name: string;
    team_a_icon: string;
    team_b_icon: string;
    team_a_code?: string;
    team_b_code?: string;
    stadium: string;
    league: string;
    start_time: string;
    commentator: string;
    status: string;
    score_a: number;
    score_b: number;
  };
  onBet: (matchId: string) => void;
  isAdmin?: boolean;
  customClass?: string;
}

const LOCK_MINUTES = 30; // lock betting N minutes before kick-off

const isBettingLocked = (startTime: string): boolean => {
  const now = new Date().getTime();
  const kick = new Date(startTime).getTime();
  const diffMinutes = (kick - now) / 60000;
  // Lock if kick-off is within 30 min OR has already passed (but not yet marked live/finished)
  return diffMinutes <= LOCK_MINUTES;
};

const MatchCard: React.FC<MatchCardProps> = ({ match, onBet, isAdmin, customClass }) => {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  // Real-time lock: re-evaluate every 30 seconds
  const [locked, setLocked] = useState(() => isBettingLocked(match.start_time));

  useEffect(() => {
    const check = () => setLocked(isBettingLocked(match.start_time));
    check();
    const interval = setInterval(check, 30_000); // re-check every 30s
    return () => clearInterval(interval);
  }, [match.start_time]);

  const canEnter = isAdmin || (!isFinished && !locked);

  const startTime = new Date(match.start_time);
  const timeStr = startTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = startTime.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  return (
    <div
      onClick={() => onBet(match.id)}
      className={`backdrop-blur-md rounded-[24px] p-5 shadow-2xl transition-all group ${customClass || "bg-white/5 border border-white/10"
        } ${!canEnter ? "opacity-80" : ""} hover:border-indigo-500/50 hover:bg-white/10 cursor-pointer
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Live
              </span>
            ) : match.status === 'finished' ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[13px] font-bold uppercase tracking-wider">
                Finished
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[13px] font-bold uppercase tracking-wider">
                Scheduled
              </span>
            )}
            <span className="text-slate-200 text-xsm font-semibold uppercase">{timeStr} - {dateStr}</span>
          </div>
          <span className="text-slate-500 text-[13px] uppercase font-bold tracking-tight">{match.stadium}</span>
        </div>

        <div className="bg-slate-800 p-1.5 rounded-full">
          <span className="text-lg opacity-50">⚽</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 px-2">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform overflow-hidden border border-white/5">
            {match.team_a_code && match.team_a_code !== 'unknown' && match.team_a_code.length > 0 ? (
              <img src={`https://flagcdn.com/w80/${match.team_a_code.toLowerCase()}.png`} alt={match.team_a_name} className="w-full h-full object-cover" />
            ) : match.team_a_icon?.startsWith('http') ? (
              <img src={match.team_a_icon} alt={match.team_a_name} className="w-full h-full object-cover" />
            ) : (
              match.team_a_icon || '⚽'
            )}
          </div>
          <span className="text-center text-xsm font-bold text-slate-300 line-clamp-1 border-b-2 border-transparent group-hover:border-emerald-500 transition-all pb-1">
            {match.team_a_name}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className={`text-xl font-black transition-colors ${match.status === 'finished' ? 'text-emerald-400' : 'text-slate-600 group-hover:text-emerald-500'}`}>
            {match.status === 'scheduled' ? '🏆' : `${match.score_a} : ${match.score_b}`}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform overflow-hidden border border-white/5">
            {match.team_b_code && match.team_b_code !== 'unknown' && match.team_b_code.length > 0 ? (
              <img src={`https://flagcdn.com/w80/${match.team_b_code.toLowerCase()}.png`} alt={match.team_b_name} className="w-full h-full object-cover" />
            ) : match.team_b_icon?.startsWith('http') ? (
              <img src={match.team_b_icon} alt={match.team_b_name} className="w-full h-full object-cover" />
            ) : (
              match.team_b_icon || '⚽'
            )}
          </div>
          <span className="text-center text-xsm font-bold text-slate-300 line-clamp-1 border-b-2 border-transparent group-hover:border-emerald-500 transition-all pb-1">
            {match.team_b_name}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
            👤
          </div>
          <span className="text-slate-500 text-[10px] font-bold uppercase">{match.commentator || 'Chưa có BLV'}</span>
        </div>
        {isFinished ? (
          <span className="text-slate-300 text-[11px] font-black uppercase border-2 border-white/10 px-4 py-1.5 rounded-xl bg-white/10 shadow-xl backdrop-blur-sm">
            Đã Kết Thúc
          </span>
        ) : locked ? (
          <span className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black uppercase border-2 border-amber-500/30 px-3 py-1.5 rounded-xl bg-amber-500/10 shadow-lg backdrop-blur-sm">
            🔒 Khóa Cược
          </span>
        ) : (
          <button
            className="relative bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black py-1.5 px-4 rounded shadow-lg shadow-rose-900/20 transition-all uppercase animate-pulse hover:animate-none ring-2 ring-rose-400/50 ring-offset-1 ring-offset-transparent"
          >
            Cược Ngay 👈
          </button>
        )}
      </div>
    </div>
  );
};

export default MatchCard;
