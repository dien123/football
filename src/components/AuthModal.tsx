import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CONSTANT_PASSWORD = 'football_match_secure_123'; // Hidden shared password for passwordless feel

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !fullName) {
      setError('Vui lòng nhập đầy đủ Email và Họ tên.');
      setLoading(false);
      return;
    }

    try {
      // 0. Identity Lookup
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      const { data: profileByName } = await supabase
        .from('profiles')
        .select('*')
        .eq('full_name', fullName)
        .maybeSingle();

      // CASE 1: Email already in profiles
      if (profileByEmail) {
        if (profileByEmail.full_name !== fullName) {
          setError(`Email đã tồn tại với tên khác. Vui lòng nhập đúng Tên "${profileByEmail.full_name}" để đăng nhập.`);
          setLoading(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: CONSTANT_PASSWORD,
        });

        if (signInError) throw signInError;
        onSuccess();
        return;
      }

      // CASE 2: No profile found - but user might exist in Auth (Legacy sync issue)
      // Try to sign in first with constant password
      const { data: legacySignInData, error: legacySignInError } = await supabase.auth.signInWithPassword({
        email,
        password: CONSTANT_PASSWORD,
      });

      if (!legacySignInError && legacySignInData.user) {
        // User exists in Auth but had no profile. Let's create it.
        // First check if the name they want to use is taken by someone else's profile
        if (profileByName && profileByName.email !== email) {
          setError(`Tên "${fullName}" đã được sử dụng bởi Email khác. Vui lòng dùng tên khác.`);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: legacySignInData.user.id,
            email: email,
            full_name: fullName
          });

        if (insertError) {
          // If fail to insert profile (maybe name conflict we missed), log out and fail
          await supabase.auth.signOut();
          throw insertError;
        }

        onSuccess();
        return;
      }

      // CASE 3: Not in profiles and not in Auth -> New User
      if (legacySignInError?.message?.includes('Invalid login credentials')) {
        // Check if name is taken globally
        if (profileByName) {
          setError(`Tên "${fullName}" đã được sử dụng bởi Email khác. Vui lòng dùng tên khác.`);
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: CONSTANT_PASSWORD,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError) throw signUpError;

        alert('Tài khoản mới đã được tạo! Đang đăng nhập...');
        
        const { error: finalSignInError } = await supabase.auth.signInWithPassword({
          email,
          password: CONSTANT_PASSWORD,
        });

        if (finalSignInError) {
           setError('Đã tạo tài khoản nhưng chưa thể đăng nhập tự động. Thử nhấn lại lần nữa nhé!');
        } else {
           onSuccess();
        }
      } else {
        throw legacySignInError;
      }
    } catch (err: any) {
      let msg = err.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      
      if (msg.includes('rate limit')) {
        msg = 'Hệ thống đang bận. Vui lòng đợi 1-2 phút hoặc tắt "Confirm email" trong Supabase.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Email chưa được xác nhận. Vui lòng tắt "Confirm email" trong cài đặt Supabase.';
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-sm bg-[#1a1a1a] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-10 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-sm border border-white/30">
            🏟️
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Chào mừng bạn!</h2>
          <p className="text-emerald-100 text-xs mt-2 opacity-80 uppercase font-bold tracking-widest">Gia nhập cộng đồng World Cup</p>
        </div>

        <form onSubmit={handleJoin} className="p-8 space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Họ và Tên thật</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              placeholder="Vd: Nguyễn Văn An"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Địa chỉ Email</label>
            <input
              type="email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              placeholder="nhap@cua-ban.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-[9px] text-slate-500 mt-2 italic px-1">* Dùng Gmail để nhận diện người chơi chính xác.</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold py-2 px-3 rounded-lg flex items-center gap-2">
               <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/40 transition-all uppercase tracking-widest text-xs active:scale-[0.98]"
          >
            {loading ? 'Đang kết nối...' : 'Bắt đầu ngay 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
