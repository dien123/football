import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-[#0a0a0a] text-slate-400 py-10 px-6 overflow-hidden border-t border-white/5">
      {/* Background Watermark Logo - Adjusted to fit footer height */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.12] rotate-[-10deg]">
        <img src="/logo.png" alt="" className="h-full w-auto object-contain" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Top Logo - Larger Size */}
        <div className="mb-8">
          <img src="/logo.png" alt="GaVangTV" className="h-30 md:h-40 w-auto mx-auto object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
        </div>

        {/* Description Text */}
        <div className="max-w-4xl mb-6">
          <p className="text-sm md:text-base text-slate-400">
            Đồng hành cùng anh em đam mê bóng đá trong sự kiện bóng đá lớn nhất hành tinh - World Cup 2026.
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-4">
          {['CHÍNH SÁCH BẢO MẬT', 'ĐIỀU KHOẢN SỬ DỤNG', 'CHÍNH SÁCH BẢN QUYỀN', 'MIỄN TRỪ TRÁCH NHIỆM', 'THÔNG TIN LIÊN HỆ'].map((link) => (
            <a key={link} href="#" className="text-[11px] md:text-xs font-black uppercase tracking-widest text-slate-300 hover:text-emerald-400 transition-colors">
              {link}
            </a>
          ))}
        </div>

        {/* Contact info */}
        {/* <div className="flex flex-col gap-2 mb-8 text-[12px] md:text-sm text-slate-400">
          <p>Địa chỉ: 418 Đường Hoàng Diệu, Phường 12, Quận 4, Thành phố Hồ Chí Minh, Việt Nam</p>
          <p>Email: <span className="text-emerald-500 font-bold underline cursor-pointer">contact@gavang.tv</span></p>
        </div> */}

        {/* Hashtags */}
        <div className="flex flex-wrap justify-center gap-3 mb-4 text-[10px] md:text-[11px] font-bold text-slate-500">
          {['#Az.TV', '#tructiepbongda', '#xembongda', '#bongdatructuyen'].map((tag) => (
            <span key={tag} className="hover:text-emerald-500/60 transition-colors cursor-default">{tag}</span>
          ))}
        </div>

        {/* Hours & Social */}
        <div className="flex flex-col items-center gap-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Open - Closed: 24h every day.
          </p>
        </div>

        {/* Copyright bottom */}
        <div className="flex  flex-col items-center gap-1">
          <div className="mt-4 pt-4 border-t border-white/5 w-full text-[9px] uppercase tracking-[0.4em] font-black text-slate-600">
            © 2026 Az.TV ALL RIGHTS RESERVED
          </div>
          <span className="text-[20px] text-amber-500/80 font-black tracking-[0.15em] hidden lg:block drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            COPYRIGHT BY Az TV
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
