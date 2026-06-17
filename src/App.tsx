import { createContext, useEffect, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { ToastProvider } from './components/Toast';
import MatchPage from './pages/MatchPage';
import FutsalLeaguePage from './pages/FutsalLeaguePage';
import ResultsPage from './pages/ResultsPage';
import StandingsPage from './pages/StandingsPage';
import OutrightPage from './pages/OutrightPage';
import AdminPage from './pages/AdminPage';
import DC13Page from './pages/DC13Page';
import HistoryPage from './pages/HistoryPage';

import AdminGuard from './components/AdminGuard';
import RealTimeClock from './components/RealTimeClock';
import CountdownClock from './components/CountdownClock';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';
import { supabase } from './lib/supabase';
import { checkAdminSession, setAdminSession } from './utils/security';

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextType {
  isAdminAuthenticated: boolean;
  setAdminAuthenticated: (val: boolean) => void;
  session: Session | null;
  user: User | null;
  fullName: string;
  refreshFullName: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

// ─── Navigation ───────────────────────────────────────────────────────────────
const mobileLinkCls = ({ isActive }: { isActive: boolean }) =>
  `w-full max-w-[280px] text-center py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${isActive
    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
    : 'text-slate-400 hover:text-white hover:bg-white/5'
  }`;

// const mobileOutrightCls = ({ isActive }: { isActive: boolean }) =>
//   `w-full max-w-[280px] text-center py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all relative ${isActive
//     ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.6)]'
//     : 'text-amber-400 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10'
//   }`;

const mobileFutsalCls = ({ isActive }: { isActive: boolean }) =>
  `w-full max-w-[280px] text-center py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all relative ${isActive
    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)]'
    : 'text-blue-400 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10'
  }`;

const mobileDC13Cls = ({ isActive }: { isActive: boolean }) =>
  `w-full max-w-[280px] text-center py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all relative ${isActive
    ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)]'
    : 'text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10'
  }`;

interface NavBarProps {
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

function NavBar({ mobileOpen, setMobileOpen }: NavBarProps) {
  const ctx = useContext(AppContext);
  if (!ctx) return null;
  const { session, user, setAdminAuthenticated, fullName } = ctx;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAdminAuthenticated(false);
    setMobileOpen(false);
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${isActive
      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
      : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`;

  // const outrightCls = ({ isActive }: { isActive: boolean }) =>
  //   `px-4 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all relative group ${isActive
  //     ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.6)]'
  //     : 'text-amber-400 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
  //   }`;

  const futsalCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative group ${isActive
      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)]'
      : 'text-blue-400 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
    }`;

  const dc13Cls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative group ${isActive
      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] transform scale-[1.02]'
      : 'text-cyan-300 border border-cyan-400/35 hover:border-cyan-300 hover:bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
    }`;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#050505]/95 backdrop-blur-xl">
      {/* Warning Banner */}
      <div className="w-full h-9 bg-rose-950/90 border-b border-rose-900/30 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-[14px] text-rose-400 font-bold uppercase tracking-[0.2em] h-full flex items-center">
          ⚠️ &nbsp; TRANG WEB VỚI MỤC ĐÍCH GIẢI TRÍ — KHÔNG THỰC HIỆN, TUYÊN TRUYỀN CÁ ĐỘ BÓNG ĐÁ — CÁ ĐỘ LÀ HÀNH VI VI PHẠM PHÁP LUẬT TẠI VIỆT NAM &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
      </div>

      {/* Main nav row */}
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-20">
        {/* Brand / Logo */}
        <NavLink to="/" className="flex items-center gap-2 text-emerald-400 font-black tracking-widest text-base shrink-0" onClick={() => setMobileOpen(false)}>
          <span>⚽</span>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Az</span>
        </NavLink>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1.5 flex-1 justify-center px-2">
          <NavLink to="/" className={linkCls} end>Dự đoán</NavLink>
          <NavLink to="/standings" className={linkCls}>Bảng Xếp Hạng</NavLink>
          <NavLink to="/results" className={linkCls}>Kết Quả - Thống Kê</NavLink>
          <NavLink to="/history" className={linkCls}>Lịch sử User</NavLink>

          {/* <NavLink to="/outright" className={outrightCls}>
            Dự đoán Vô Địch
            <span className="absolute -top-2 -right-2 flex h-4 w-9">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-10 bg-amber-500 text-[7px] items-center justify-center text-black font-black">WINNER</span>
            </span>
          </NavLink> */}
          <NavLink to="/futsal" className={futsalCls}>
            TIP Futsal 2026
            <span className="absolute -top-2 -right-2 flex h-4 w-7">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-8 bg-rose-500 text-[8px] items-center justify-center text-white font-black">HOT</span>
            </span>
          </NavLink>
          <NavLink to="/dc13" className={dc13Cls}>
            DC 13
            <span className="absolute -top-2 -right-2 flex h-4 w-8">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-8 bg-gradient-to-r from-cyan-400 to-teal-400 text-[8px] items-center justify-center text-slate-950 font-black">NEW</span>
            </span>
          </NavLink>
          <NavLink to="/admin" className={linkCls}>Admin</NavLink>
        </div>

        {/* Desktop Right side (session) */}
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          {session && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[13px] text-slate-300 font-black truncate max-w-[120px]">
                {fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="text-[11px] text-rose-500 hover:text-rose-400 font-black uppercase ml-2"
              >
                Thoát
              </button>
            </div>
          )}
        </div>

        {/* Mobile Controls (Profile & Hamburger) */}
        <div className="flex lg:hidden items-center gap-3">
          {session && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 max-w-[120px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="text-[11px] text-slate-300 font-black truncate">
                {fullName ? fullName.split(' ').pop() : (user?.user_metadata?.full_name?.split(' ').pop() || user?.email?.split('@')[0])}
              </span>
            </div>
          )}

          {/* Hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? (
              <span className="text-xl font-black">✕</span>
            ) : (
              <span className="text-xl font-black">☰</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdminAuthenticated, setAdminAuthenticatedState] = useState(() => {
    // Cleanup old insecure key if present to prevent F12 bypass
    if (localStorage.getItem('admin_auth')) {
      localStorage.removeItem('admin_auth');
    }
    return checkAdminSession();
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fullName, setFullName] = useState<string>('');

  const setAdminAuthenticated = (val: boolean) => {
    setAdminAuthenticatedState(val);
    setAdminSession(val);
  };

  const refreshFullName = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const currentUser = currentSession?.user;
    if (!currentUser) {
      setFullName('');
      return;
    }
    try {
      // 1. Try dc13_profiles
      const { data: dc13Prof, error: err1 } = await supabase
        .from('dc13_profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!err1 && dc13Prof?.full_name) {
        setFullName(dc13Prof.full_name);
        return;
      }

      // 2. Try profiles
      const { data: stdProf, error: err2 } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!err2 && stdProf?.full_name) {
        setFullName(stdProf.full_name);
        return;
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin tên hiển thị:', err);
    }

    // Fallback: metadata or email split
    const metaName = currentUser.user_metadata?.full_name;
    if (metaName) {
      setFullName(metaName);
    } else {
      setFullName(currentUser.email?.split('@')[0] || '');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      refreshFullName();
    } else {
      setFullName('');
    }
  }, [session]);

  return (
    <AppContext.Provider value={{
      isAdminAuthenticated,
      setAdminAuthenticated,
      session,
      user: session?.user ?? null,
      fullName,
      refreshFullName
    }}>
      <ToastProvider>
        <BrowserRouter>
          <div className="relative bg-[#080808] min-h-screen">
            <NavBar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

            {/* Mobile Drawer (Menu Overlay) - Rendered at Top-Level to guarantee stacking context! */}
            <div
              className={`lg:hidden fixed top-[116px] inset-x-0 bottom-0 bg-[#080808] border-t border-white/10 z-[99999] transition-all duration-300 ease-in-out ${mobileOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible pointer-events-none'
                }`}
            >
              <div className="flex flex-col items-center justify-start p-6 space-y-4 h-full overflow-y-auto pb-20">
                <NavLink to="/" className={mobileLinkCls} onClick={() => setMobileOpen(false)} end>
                  Dự đoán
                </NavLink>
                <NavLink to="/standings" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>
                  Bảng Xếp Hạng
                </NavLink>
                <NavLink to="/results" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>
                  Kết Quả - Thống Kê
                </NavLink>
                <NavLink to="/history" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>
                  Lịch sử User
                </NavLink>


                {/* <NavLink to="/outright" className={mobileOutrightCls} onClick={() => setMobileOpen(false)}>
                  Dự đoán Vô Địch
                  <span className="absolute top-4 right-6 bg-amber-500 text-[8px] px-2.5 py-0.5 rounded-full text-black font-black">
                    WINNER
                  </span>
                </NavLink> */}

                <NavLink to="/futsal" className={mobileFutsalCls} onClick={() => setMobileOpen(false)}>
                  TIP Futsal 2026
                  <span className="absolute top-4 right-6 bg-rose-500 text-[8px] px-2.5 py-0.5 rounded-full text-white font-black">
                    HOT
                  </span>
                </NavLink>

                <NavLink to="/dc13" className={mobileDC13Cls} onClick={() => setMobileOpen(false)}>
                  DC 13
                  <span className="absolute top-4 right-6 bg-cyan-500 text-[8px] px-2.5 py-0.5 rounded-full text-black font-black">
                    NEW
                  </span>
                </NavLink>

                <NavLink to="/admin" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>
                  Admin
                </NavLink>

                {session && (
                  <div className="w-full pt-6 border-t border-white/5 flex flex-col items-center gap-3">
                    <span className="text-[12px] text-slate-500 font-bold uppercase">Tài khoản</span>
                    <span className="text-sm font-black text-slate-300">
                      {fullName || session.user.user_metadata?.full_name || session.user.email}
                    </span>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setAdminAuthenticated(false);
                        setMobileOpen(false);
                      }}
                      className="w-full py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest border border-rose-500/20 active:scale-95 transition-all"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Spacer for fixed top nav (28px warning + 80px nav = 108px) */}
            <div className="h-[108px]" />
            <Routes>
              <Route path="/" element={<MatchPage />} />
              <Route path="/futsal" element={<FutsalLeaguePage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/outright" element={<OutrightPage />} />
              <Route path="/dc13" element={<DC13Page />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />

            </Routes>
            <div className="hidden lg:block fixed top-[120px] left-4 z-40 pointer-events-none">
              <div className="pointer-events-auto flex flex-col gap-8 pl-2">
                <RealTimeClock />
                <CountdownClock />
              </div>
            </div>
            <Footer />
            <ScrollToTop />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </AppContext.Provider>
  );
}

export default App;
