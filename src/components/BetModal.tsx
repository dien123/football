import React, { useEffect, useRef, useState } from 'react';
import { Match, BetOption } from '../types';
import { parseVND } from '../utils/format';

interface BetModalProps {
  isOpen: boolean;
  option: BetOption;
  match: Match;
  onSave: (userName: string, amount: number, option: BetOption) => void;
  onClose: () => void;
  initialUserName?: string;
  initialAmount?: number;
  isEditing?: boolean;
}

const BetModal: React.FC<BetModalProps> = ({
  isOpen,
  option,
  match,
  onSave,
  onClose,
  initialUserName,
  initialAmount,
  isEditing = false
}) => {
  const [currentOption, setCurrentOption] = useState<BetOption>(option);
  const [userName, setUserName] = useState(initialUserName || '');
  const [amountRaw, setAmountRaw] = useState(initialAmount?.toString() || '');
  const [amountDisplay, setAmountDisplay] = useState(initialAmount ? initialAmount.toLocaleString('vi-VN') : '');
  const [errors, setErrors] = useState<{ userName?: string; amount?: string }>({});

  const nameInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentOption(option);
      setUserName(initialUserName || '');
      setAmountRaw(initialAmount?.toString() || '');
      setAmountDisplay(initialAmount ? initialAmount.toLocaleString('vi-VN') : '');
      setErrors({});

      if (!initialUserName) {
        setTimeout(() => nameInputRef.current?.focus(), 50);
      } else {
        setTimeout(() => amountInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, initialUserName, initialAmount, option]);

  const validate = (): boolean => {
    const newErrors: { userName?: string; amount?: string } = {};
    if (!userName.trim()) newErrors.userName = 'Vui lòng nhập tên người dùng.';
    const amount = parseVND(amountRaw);
    if (!amountRaw || isNaN(amount) || amount < 50000) {
      newErrors.amount = 'Số tiền phải là số nguyên tối thiểu 50.000đ.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setAmountRaw(raw);
    setAmountDisplay(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
    setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(userName.trim(), parseVND(amountRaw), currentOption);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const isTeamA = currentOption === 'teamA';
  const rate = isTeamA ? match.rate_a : match.rate_b;
  const handicapVal = match.handicap;

  const handicapDisplay = isTeamA
    ? (match.favorite_team === 'teamA' ? '0' : `+${handicapVal}`)
    : (match.favorite_team === 'teamB' ? '0' : `+${handicapVal}`);


  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative bg-[#1a2f1a] px-8 py-8 border-b border-white/5">
          <div className="text-emerald-500 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            {isEditing ? 'Chỉnh sửa cược' : 'Đặt cược mới'}
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            {match.team_a_name} <span className="text-slate-500 px-1">vs</span> {match.team_b_name}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-8 space-y-6">
          {/* Lựa chọn đội - Có thể chuyển đổi khi edit */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Lựa chọn đội
            </label>
            <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
              {[
                { id: 'teamA' as BetOption, label: match.team_a_name },
                { id: 'teamB' as BetOption, label: match.team_b_name }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCurrentOption(opt.id)}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${currentOption === opt.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tỷ lệ Kèo</span>
              <span className="text-sm font-bold text-white">Chấp {handicapDisplay}</span>
            </div>
            <div className="text-right flex flex-col gap-1">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tỉ lệ ăn</span>
              <span className="text-sm font-bold text-emerald-400">Ăn {rate}%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-black text-[12px] uppercase tracking-widest">
              <span>📌 Quy định & Điều khoản</span>
            </div>
            <ul className="text-[12px] text-slate-400 space-y-1 list-disc pl-4 font-semibold leading-relaxed">
              <li>Đóng nhận cược trước giờ thi đấu <strong className="text-indigo-300">30 phút</strong>.</li>
              <li>Chỉ tính trong <strong className="text-indigo-300">thời gian thi đấu chính thức</strong> (không gồm hiệp phụ/luân lưu).</li>
            </ul>
          </div>

          {!initialUserName && (
            <div>
              <label htmlFor="bet-username" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Tên thật (Khuyên dùng Gmail)
              </label>
              <input
                ref={nameInputRef}
                id="bet-username"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label htmlFor="bet-amount" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Số tiền cược (vnđ) {initialUserName && <span className="lowercase font-medium text-slate-600 ml-1">(@{initialUserName})</span>}
            </label>
            <input
              ref={amountInputRef}
              id="bet-amount"
              type="text"
              value={amountDisplay}
              onChange={handleAmountChange}
              placeholder="Tối thiểu 50.000đ"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
            />
            {errors.amount && <p className="text-rose-400 text-[10px] font-bold mt-2">⚠️ {errors.amount}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/40 active:scale-95 transition-all"
          >
            {isEditing ? 'Cập nhật kèo 🚀' : 'Xác nhận cược 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetModal;
