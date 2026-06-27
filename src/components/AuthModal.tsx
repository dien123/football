import React, { useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hideClose?: boolean;
}

const CONSTANT_PASSWORD = 'football_match_secure_123'; // Hidden shared password for passwordless feel

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, hideClose }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const ctx = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [password, setPassword] = useState('');

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

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // 0. Identity Lookup in profiles and dc13_profiles
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      const { data: dc13ProfileByEmail } = await supabase
        .from('dc13_profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      const { data: profileByName } = await supabase
        .from('profiles')
        .select('*')
        .eq('full_name', fullName)
        .maybeSingle();

      // CASE 1: Email already in profiles or dc13_profiles
      if (profileByEmail || dc13ProfileByEmail) {
        if (profileByEmail && profileByEmail.full_name && profileByEmail.full_name !== fullName) {
          setError(`Email đã tồn tại với tên khác. Vui lòng nhập đúng Tên "${profileByEmail.full_name}" để đăng nhập.`);
          setLoading(false);
          return;
        }

        if (!profileByEmail && dc13ProfileByEmail && dc13ProfileByEmail.full_name && dc13ProfileByEmail.full_name !== fullName) {
          setError(`Email đã đăng ký DC_13 với tên khác. Vui lòng nhập đúng Tên "${dc13ProfileByEmail.full_name}" để đăng nhập.`);
          setLoading(false);
          return;
        }

        // Try to sign in first
        const activePassword = showPasswordField ? password : CONSTANT_PASSWORD;
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: activePassword,
        });

        // If user exists in db profiles but not in Supabase Auth, auto-sign up
        if (signInError && signInError.message.includes('Invalid login credentials')) {
          if (!showPasswordField) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: normalizedEmail,
              password: CONSTANT_PASSWORD,
              options: {
                data: {
                  full_name: fullName
                }
              }
            });

            if (signUpError) {
              if (signUpError.message.includes('User already registered') || signUpError.code === 'user_already_exists') {
                setShowPasswordField(true);
                setError('Tài khoản của bạn yêu cầu mật khẩu cá nhân. Vui lòng nhập mật khẩu.');
                setLoading(false);
                return;
              }
              throw signUpError;
            }

            if (signUpData.user) {
              // Auto-create profiles if missing or update if missing name
              if (!profileByEmail) {
                await supabase.from('profiles').insert({
                  id: signUpData.user.id,
                  email: normalizedEmail,
                  full_name: fullName
                });
              } else if (!profileByEmail.full_name) {
                await supabase
                  .from('profiles')
                  .update({ full_name: fullName })
                  .eq('id', signUpData.user.id);
              }
              // Update dc13_profiles id to match the new Auth user id
              if (dc13ProfileByEmail) {
                const updateData: any = { id: signUpData.user.id };
                if (!dc13ProfileByEmail.full_name) {
                  updateData.full_name = fullName;
                }
                await supabase
                  .from('dc13_profiles')
                  .update(updateData)
                  .eq('email', normalizedEmail);
              }
            }

            if (ctx) await ctx.refreshFullName();
            onSuccess();
            return;
          }
          throw signInError;
        }

        if (signInError) throw signInError;

        // If sign in succeeded, but profiles record is missing or has no name
        if (signInData.user) {
          if (!profileByEmail) {
            await supabase.from('profiles').insert({
              id: signInData.user.id,
              email: normalizedEmail,
              full_name: fullName
            });
          } else if (!profileByEmail.full_name) {
            await supabase
              .from('profiles')
              .update({ full_name: fullName })
              .eq('id', signInData.user.id);
          }
        }

        // Also ensure dc13_profiles id and name are synced
        if (signInData.user && dc13ProfileByEmail) {
          const updateData: any = {};
          if (dc13ProfileByEmail.id !== signInData.user.id) {
            updateData.id = signInData.user.id;
          }
          if (!dc13ProfileByEmail.full_name) {
            updateData.full_name = fullName;
          }
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('dc13_profiles')
              .update(updateData)
              .eq('email', normalizedEmail);
          }
        }

        if (ctx) await ctx.refreshFullName();
        onSuccess();
        return;
      }

      // CASE 2: No profile found - but user might exist in Auth (Legacy sync issue)
      // Try to sign in first with constant password
      const activePassword = showPasswordField ? password : CONSTANT_PASSWORD;
      const { data: legacySignInData, error: legacySignInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: activePassword,
      });

      if (!legacySignInError && legacySignInData.user) {
        // User exists in Auth but had no profile. Let's create it.
        if (profileByName && profileByName.email.toLowerCase() !== normalizedEmail) {
          setError(`Tên "${fullName}" đã được sử dụng bởi Email khác. Vui lòng dùng tên khác.`);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: legacySignInData.user.id,
            email: normalizedEmail,
            full_name: fullName
          });

        if (insertError) {
          await supabase.auth.signOut();
          throw insertError;
        }

        if (ctx) await ctx.refreshFullName();
        onSuccess();
        return;
      }

      if (legacySignInError) {
        if (!showPasswordField && legacySignInError.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: CONSTANT_PASSWORD,
          });

          if (signUpError && (signUpError.message.includes('User already registered') || signUpError.code === 'user_already_exists')) {
            setShowPasswordField(true);
            setError('Tài khoản của bạn yêu cầu mật khẩu cá nhân. Vui lòng nhập mật khẩu.');
            setLoading(false);
            return;
          }
        }

        // CASE 3: Not in profiles and not in Auth -> block registration
        if (legacySignInError.message.includes('Invalid login credentials')) {
          if (showPasswordField) {
            setError('Mật khẩu cá nhân không chính xác. Vui lòng thử lại.');
          } else {
            setError('Tài khoản không tồn tại. Vui lòng liên hệ Admin để đăng ký tài khoản!');
          }
          setLoading(false);
          return;
        } else {
          throw legacySignInError;
        }
      }
    } catch (err: any) {
      let msg = err.message || 'Có lỗi xảy ra, vui lòng thử lại.';

      if (msg.includes('rate limit')) {
        msg = 'Hệ thống đang bận. Vui lòng đợi 1-2 phút hoặc tắt "Confirm email" trong Supabase.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Email chưa được xác nhận. Vui lòng tắt "Confirm email" trong cài đặt Supabase.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'Mật khẩu cá nhân không chính xác. Vui lòng thử lại.';
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
          {!hideClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
          {/* <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-sm border border-white/30">
            🏟️
          </div> */}
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Vibe Coding</h2>
          {/* <p className="text-emerald-100 text-xs mt-2 opacity-80 uppercase font-bold tracking-widest">Gia nhập cộng đồng World Cup</p> */}
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
              disabled={showPasswordField}
            />
            <p className="text-[9px] text-slate-500 mt-2 italic px-1">* Dùng Gmail để nhận diện người chơi chính xác.</p>
          </div>

          {showPasswordField && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Mật khẩu cá nhân</label>
              <input
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                placeholder="Nhập mật khẩu riêng của bạn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[9px] text-amber-400 mt-2 px-1 font-semibold">* Tài khoản này đã có mật khẩu bảo mật riêng. Vui lòng nhập mật khẩu của bạn.</p>
            </div>
          )}

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
            {loading ? 'Đang kết nối...' : 'Enter 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
