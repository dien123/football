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
            <div className="relative">
              <div className="absolute -inset-1 bg-emerald-500 rounded-lg blur-[2px] opacity-20 animate-pulse"></div>
              <div className="relative px-2 py-1 bg-black/40 backdrop-blur-xl rounded-lg border border-white/10 shadow-2xl min-w-[45px] text-center">
                <span className="text-2xl md:text-3xl font-black tabular-nums tracking-tighter text-white drop-shadow-lg">
                  {part}
                </span>
              </div>
            </div>
            {i < 2 && <span className="text-xl font-black text-emerald-500/50 animate-pulse">:</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 px-1">
        <span className="text-[12px] md:text-sm font-black uppercase tracking-wider text-emerald-400 drop-shadow-md">
          {formatDate(time)}
        </span>
      </div>
    </div>
  );
};

export default RealTimeClock;
