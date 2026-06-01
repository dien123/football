import React, { useState, useEffect } from 'react';

const CountdownClock: React.FC = () => {
  // Target date: World Cup 2026 Opening Ceremony / Kick-off
  // June 12, 2026 at 02:00:00 (Vietnam Time GMT+7)
  const targetDate = new Date('2026-06-12T02:00:00+07:00').getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isCompleted: true
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isCompleted: false
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  const timeItems = [
    { label: 'DAYS', value: formatNumber(timeLeft.days) },
    { label: 'HOURS', value: formatNumber(timeLeft.hours) },
    { label: 'MINUTES', value: formatNumber(timeLeft.minutes) },
    { label: 'SECONDS', value: formatNumber(timeLeft.seconds) }
  ];

  return (
    <div className="flex flex-col items-center md:items-start animate-fade-in">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3 pl-1">
        KICKS OFF IN
      </div>
      <div className="flex items-center gap-2.5">
        {timeItems.map((item, index) => (
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
    </div>
  );
};

export default CountdownClock;
