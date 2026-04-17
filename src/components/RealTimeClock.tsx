import React, { useState, useEffect } from 'react';

const RealTimeClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimeParts = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return { hours, minutes, seconds };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const { hours, minutes, seconds } = formatTimeParts(time);

  return (
    <div className="flex flex-col items-center md:items-start gap-1.5">
      <div className="flex items-center gap-1.5">
        {[hours, minutes, seconds].map((part, i) => (
          <React.Fragment key={i}>
            <div className="relative group">
              <div className="absolute -inset-[1px] bg-emerald-500/50 rounded-lg blur-[1px] opacity-100"></div>
              <div className="relative px-3 py-1.5 bg-[#0a0a0a] rounded-lg border border-emerald-500/30 shadow-2xl min-w-[54px] text-center transition-all group-hover:border-emerald-500/60">
                <span className="text-2xl md:text-4xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {part}
                </span>
              </div>
            </div>
            {i < 2 && <span className="text-xl font-black text-emerald-500/50 animate-pulse">:</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 px-1 mt-1">
        <span className="text-[11px] md:text-[13px] font-black uppercase tracking-[0.2em] text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
          {formatDate(time)}
        </span>
      </div>
    </div>
  );
};

export default RealTimeClock;
