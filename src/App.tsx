import { createContext, useEffect, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import MatchPage from './pages/MatchPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import AdminGuard from './components/AdminGuard';
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
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';
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
        <div className="absolute -top-12 left-4 px-3 py-1.5 bg-white/5 backdrop-blur rounded-full border border-white/10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-300 font-bold truncate max-w-[120px]">
            Hi, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          </span>
          <button
            onClick={handleLogout}
            className="text-[10px] text-rose-400 hover:text-rose-300 font-black uppercase ml-1 border-l border-white/10 pl-2"
          >
            Thoát
          </button>
        </div>
      )}

      {isAdminPage && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500" />
      )}
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
            <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          </Routes>
          <NavBar />
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
