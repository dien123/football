import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  isClosing?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const startClosingToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isClosing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250); // Matches the duration of animate-toast-out (250ms)
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      startClosingToast(id);
    }, 4000); // Expiry timeout
  }, [startClosingToast]);

  // Expose global window.alert redirect to Toast
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message: string) => {
      if (!message) return;
      const strMsg = String(message);
      const lowercaseMsg = strMsg.toLowerCase();

      let type: ToastType = 'info';
      if (
        lowercaseMsg.includes('thành công') ||
        lowercaseMsg.includes('success') ||
        lowercaseMsg.includes('hoàn thành')
      ) {
        type = 'success';
      } else if (
        lowercaseMsg.includes('lỗi') ||
        lowercaseMsg.includes('error') ||
        lowercaseMsg.includes('không chính xác') ||
        lowercaseMsg.includes('thất bại') ||
        lowercaseMsg.includes('sai') ||
        lowercaseMsg.includes('vui lòng nhập đầy đủ')
      ) {
        type = 'error';
      } else if (
        lowercaseMsg.includes('cảnh báo') ||
        lowercaseMsg.includes('khóa') ||
        lowercaseMsg.includes('chưa có') ||
        lowercaseMsg.includes('vui lòng') ||
        lowercaseMsg.includes('tối thiểu') ||
        lowercaseMsg.includes('bị xóa')
      ) {
        type = 'warning';
      }

      showToast(strMsg, type);
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-[118px] right-5 z-[999999] flex flex-col gap-3.5 max-w-sm w-[90vw] pointer-events-none">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-[#061f14]/90 border-emerald-500/30 text-emerald-300 shadow-emerald-500/5',
            error: 'bg-[#270c14]/90 border-rose-500/30 text-rose-300 shadow-rose-500/5',
            warning: 'bg-[#241305]/90 border-amber-500/30 text-amber-300 shadow-amber-500/5',
            info: 'bg-[#0c1b2d]/90 border-cyan-500/30 text-cyan-300 shadow-cyan-500/5',
          }[toast.type];

          const icon = {
            success: '🟢',
            error: '🔴',
            warning: '🟡',
            info: '🔵',
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3.5 px-4.5 py-4.5 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all duration-300 ${toast.isClosing ? 'animate-toast-out' : 'animate-toast-in'
                } ${typeStyles}`}
              style={{ padding: '14px 18px' }}
            >
              <span className="text-base shrink-0 select-none mt-0.5">{icon}</span>
              <p className="text-xs md:text-sm font-bold flex-1 leading-relaxed text-left tracking-wide whitespace-pre-line">
                {toast.message}
              </p>
              <button
                onClick={() => startClosingToast(toast.id)}
                className="text-white/30 hover:text-white/80 transition-colors text-sm ml-1.5 font-bold cursor-pointer select-none mt-0.5"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
