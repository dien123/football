import React, { useContext, useState } from 'react';
import { AppContext } from '../App';

const ADMIN_PASSWORD = 'adml123'; // Can be changed by the user

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const ctx = useContext(AppContext);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!ctx) return null;
  const { isAdminAuthenticated, setAdminAuthenticated } = ctx;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAdminAuthenticated(true);
      setError('');
    } else {
      setError('Mật khẩu không chính xác!');
      setPassword('');
      // Simple shake effect via class toggle could be added here
    }
  };

  if (isAdminAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pb-20">
      <div className="w-full max-w-sm bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-sm border border-white/30">
            🔒
          </div>
          <h2 className="text-xl font-bold text-white">Quản trị viên</h2>
          <p className="text-indigo-100 text-sm mt-1 opacity-80">Vui lòng nhập mã PIN để tiếp tục</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Mật khẩu Admin
            </label>
            <input
              type="password"
              className={`w-full bg-slate-900 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 border ${error ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                } focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all`}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-rose-400 text-[10px] font-bold mt-2 flex items-center gap-1">⚠️ {error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            Đăng nhập
          </button>

        </form>
      </div>
    </div>
  );
};

export default AdminGuard;
