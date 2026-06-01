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

  const clockItems = [
    { label: 'HOURS', value: hours },
    { label: 'MINUTES', value: minutes },
    { label: 'SECONDS', value: seconds }
  ];

  return (
    <div className="flex flex-col items-center md:items-start animate-fade-in">
      {/* Title */}
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3 pl-1">
        CURRENT TIME
      </div>
      
      {/* Clock cards */}
      <div className="flex items-center gap-2.5">
        {clockItems.map((item, index) => (
          <div key={index} className="relative group">
            {/* Soft glowing lime border on hover */}
            <div className="absolute -inset-[1px] bg-lime-500/10 rounded-[14px] blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Card box */}
            <div className="relative flex flex-col items-center justify-center w-[72px] h-[82px] bg-[#12161a] border border-white/5 rounded-[12px] shadow-2xl transition-all duration-300 group-hover:border-lime-500/20">
              {/* Digit */}
              <span className="text-3xl font-black font-mono tracking-tighter text-[#c5ff00] drop-shadow-[0_0_12px_rgba(197,255,0,0.35)]">
                {item.value}
              </span>
              
              {/* Label */}
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-2">
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Calendar date representation */}
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-3 pl-1">
        {formatDate(time)}
      </div>
    </div>
  );
};

export default RealTimeClock;
