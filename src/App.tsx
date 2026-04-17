import { createContext, useEffect, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import MatchPage from './pages/MatchPage';
import ResultsPage from './pages/ResultsPage';
import StandingsPage from './pages/StandingsPage';
import AdminPage from './pages/AdminPage';
import AdminGuard from './components/AdminGuard';
import RealTimeClock from './components/RealTimeClock';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';
import { supabase } from './lib/supabase';

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextType {
  isAdminAuthenticated: boolean;
  setAdminAuthenticated: (val: boolean) => void;
  session: Session | null;
  user: User | null;
}

export const AppContext = createContext<AppContextType | null>(null);

// ─── Navigation ───────────────────────────────────────────────────────────────
function NavBar() {
  const ctx = useContext(AppContext);
  if (!ctx) return null;
  const { session, user, setAdminAuthenticated } = ctx;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAdminAuthenticated(false);
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `relative text-sm font-black uppercase tracking-widest px-6 py-2 rounded-xl transition-all whitespace-nowrap ${isActive
      ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40'
      : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#050505]/95 backdrop-blur-xl">
      {/* Warning Banner */}
      <div className="w-full h-9 bg-rose-950/90 border-b border-rose-900/30 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-[14px] text-rose-400 font-bold uppercase tracking-[0.2em] h-full flex items-center">
          ⚠️ &nbsp; TRANG WEB VỚI MỤC ĐÍCH GIẢI TRÍ — KHÔNG TUYÊN TRUYỀN CÁ ĐỘ BÓNG ĐÁ — CÁ ĐỘ LÀ HÀNH VI VI PHẠM PHÁP LUẬT TẠI VIỆT NAM &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
      </div>

      {/* Main nav row */}
      <div className="max-w-[1400px] mx-auto px-6 flex items-center gap-8 h-20">
        <div className="flex items-center gap-2">
          {/* Logo removed from here and moved to bottom-right per user request */}
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-2 flex-1">
          <NavLink to="/" className={linkCls} end>Đặt Cược</NavLink>
          <NavLink to="/standings" className={linkCls}>Bảng Xếp Hạng</NavLink>
          <NavLink to="/results" className={linkCls}>Kết Quả Bóng Đá</NavLink>
          <NavLink to="/admin" className={linkCls}>Admin</NavLink>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {session && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[13px] text-slate-300 font-black truncate max-w-[120px]">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
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
      </div>
    </nav>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdminAuthenticated, setAdminAuthenticatedState] = useState(() => {
    return localStorage.getItem('admin_auth') === 'true';
  });

  const setAdminAuthenticated = (val: boolean) => {
    setAdminAuthenticatedState(val);
    localStorage.setItem('admin_auth', val.toString());
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

  return (
    <AppContext.Provider value={{
      isAdminAuthenticated,
      setAdminAuthenticated,
      session,
      user: session?.user ?? null
    }}>
      <BrowserRouter>
        <div className="relative bg-[#080808] min-h-screen">
          <NavBar />
          {/* Spacer for fixed top nav (28px warning + 80px nav = 108px) */}
          <div className="h-[108px]" />
          <Routes>
            <Route path="/" element={<MatchPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          </Routes>
          <div className="fixed top-[120px] left-4 z-40 pointer-events-none">
            <div className="pointer-events-auto">
              <RealTimeClock />
            </div>
          </div>
          <Footer />
          <ScrollToTop />
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
