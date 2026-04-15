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
    `relative flex flex-col items-center gap-0.5 text-xs font-semibold py-2 px-4  transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
    }`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#111]/95 backdrop-blur border-t border-white/5 shadow-2xl">
      <div className="max-w-2xl mx-auto flex items-center justify-around">
        <NavLink to="/" className={linkCls} end>
          {({ isActive }) => (
            <>
              <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>⚽</span>
              <span>Đặt cược</span>
            </>
          )}
        </NavLink>
        <NavLink to="/results" className={linkCls}>
          {({ isActive }) => (
            <>
              <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>🏆</span>
              <span>Kết quả</span>
            </>
          )}
        </NavLink>
        <NavLink to="/standings" className={linkCls}>
          {({ isActive }) => (
            <>
              <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>📈</span>
              <span>Bảng Đấu</span>
            </>
          )}
        </NavLink>
        <NavLink to="/admin" className={linkCls}>
          {({ isActive }) => (
            <>
              <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>⚙️</span>
              <span>Admin</span>
            </>
          )}
        </NavLink>
      </div>

      {session && (
        <div className="absolute -top-16 left-10 px-3 py-1.5 bg-white/5 backdrop-blur rounded-full border border-white/10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[14px] text-slate-300 font-bold truncate max-w-[120px]">
            Hi, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          </span>
          <button
            onClick={handleLogout}
            className="text-[13px] text-rose-400 hover:text-rose-300 font-black uppercase ml-1 border-l border-white/10 pl-2"
          >
            Thoát
          </button>
        </div>
      )}




      <div className="absolute -top-16 right-10 px-3 py-1.5 pointer-events-none flex items-center">
        <span className="text-[15px] text-amber-400 font-black uppercase tracking-widest drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse">
          Provided by Az Tv
        </span>
      </div>

      {/* Scrolling Warning Banner */}
      <div className="absolute top-2 -translate-y-full inset-x-0 h-8 bg-rose-900/60 border-t border-white/10 backdrop-blur-md overflow-hidden pointer-events-none shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
        <div className="animate-marquee whitespace-nowrap text-base sm:text-sm text-rose-500 font-black uppercase tracking-[0.1em] h-full flex items-center drop-shadow-md">
          TRANG WEB VỚI MỤC ĐÍCH GIẢI TRÍ, KHÔNG TUYÊN TRUYỀN CÁ ĐỘ BÓNG ĐÁ, CÁ ĐỘ LÀ VI PHẠM PHÁP LUẬT TẠI VIỆT NAM
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
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
        <div className="relative bg-[#111] min-h-screen">
          <Routes>
            <Route path="/" element={<MatchPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          </Routes>
          <div className="fixed top-14 left-10 z-40 pointer-events-none">
            <div className="pointer-events-auto">
              <RealTimeClock />
            </div>
          </div>
          <ScrollToTop />
          <NavBar />
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
