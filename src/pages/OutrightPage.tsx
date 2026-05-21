import { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import AuthModal from '../components/AuthModal';

const ALL_TEAMS = [
  { name: 'Mexico', code: 'mx' }, { name: 'Nam Phi', code: 'za' }, { name: 'Hàn Quốc', code: 'kr' }, { name: 'Cộng hòa Séc', code: 'cz' },
  { name: 'Canada', code: 'ca' }, { name: 'Bosnia & HZ', code: 'ba' }, { name: 'Qatar', code: 'qa' }, { name: 'Thụy Sĩ', code: 'ch' },
  { name: 'Brazil', code: 'br' }, { name: 'Maroc', code: 'ma' }, { name: 'Haiti', code: 'ht' }, { name: 'Scotland', code: 'gb-sct' },
  { name: 'Hoa Kỳ', code: 'us' }, { name: 'Paraguay', code: 'py' }, { name: 'Úc', code: 'au' }, { name: 'Thổ Nhĩ Kỳ', code: 'tr' },
  { name: 'Đức', code: 'de' }, { name: 'Curaçao', code: 'cw' }, { name: 'Bờ Biển Ngà', code: 'ci' }, { name: 'Ecuador', code: 'ec' },
  { name: 'Hà Lan', code: 'nl' }, { name: 'Nhật Bản', code: 'jp' }, { name: 'Thụy Điển', code: 'se' }, { name: 'Tunisia', code: 'tn' },
  { name: 'Bỉ', code: 'be' }, { name: 'Ai Cập', code: 'eg' }, { name: 'Iran', code: 'ir' }, { name: 'New Zealand', code: 'nz' },
  { name: 'Tây Ban Nha', code: 'es' }, { name: 'Cape Verde', code: 'cv' }, { name: 'Ả Rập Xê Út', code: 'sa' }, { name: 'Uruguay', code: 'uy' },
  { name: 'Pháp', code: 'fr' }, { name: 'Senegal', code: 'sn' }, { name: 'Iraq', code: 'iq' }, { name: 'Na Uy', code: 'no' },
  { name: 'Argentina', code: 'ar' }, { name: 'Algeria', code: 'dz' }, { name: 'Áo', code: 'at' }, { name: 'Jordan', code: 'jo' },
  { name: 'Bồ Đào Nha', code: 'pt' }, { name: 'CHDC Congo', code: 'cd' }, { name: 'Uzbekistan', code: 'uz' }, { name: 'Colombia', code: 'co' },
  { name: 'Anh', code: 'gb-eng' }, { name: 'Croatia', code: 'hr' }, { name: 'Ghana', code: 'gh' }, { name: 'Panama', code: 'pa' }
];

export default function OutrightPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bettingOn, setBettingOn] = useState<any | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const ctx = useContext(AppContext);

  const fetchOutrightData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Bets
      const { data: betsData, error: bError } = await supabase.from('outright_bets').select('*');
      if (!bError) setBets(betsData || []);

      // 2. Fetch Winner (Latest one)
      const { data: winData, error: wError } = await supabase
        .from('outright_winner')
        .select('team_name')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!wError && winData) {
        setWinner(winData.team_name);
      } else {
        setWinner(null);
      }
    } catch (err) {
      console.error('Error fetching outright data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOutrightData();
  }, []);

  const handlePlaceBet = async () => {
    if (!bettingOn || !ctx?.session?.user) {
      if (!ctx?.session?.user) setAuthModalOpen(true);
      return;
    }
    const betVal = Number(amount);
    if (!betVal || betVal < 10000) {
      alert('Số tiền tối thiểu là 10.000đ');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('outright_bets').insert([{
        user_id: ctx.session.user.id,
        user_name: ctx.session.user.user_metadata?.full_name || 'Người dùng',
        team_name: bettingOn.name,
        amount: betVal,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      alert(`Đã gửi dự đoán thành công!`);
      setBettingOn(null);
      fetchOutrightData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOptions = ALL_TEAMS.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
  const prizePool = totalPool * 0.9;

  const getEstPrize = (teamName: string, betAmount: number | '') => {
    const numAmount = Number(betAmount) || 0;
    // Current state of the world
    const teamTotal = bets.filter(b => b.team_name === teamName).reduce((sum, b) => sum + b.amount, 0);
    const myExistingBet = bets
      .filter(b => b.team_name === teamName && b.user_id === ctx?.session?.user?.id)
      .reduce((sum, b) => sum + b.amount, 0);

    // If user is just looking (betAmount is 0), show prize for their EXISTING bet
    // If user is betting more, calculate for (Existing + New)
    const totalInvestment = myExistingBet + numAmount;

    // The pool only grows if the betAmount is > 0
    const currentTotalPool = bets.reduce((sum, b) => sum + b.amount, 0);
    const hypotheticalTotalPool = currentTotalPool + numAmount;
    const hypotheticalPrizePool = hypotheticalTotalPool * 0.9;
    const hypotheticalTeamTotal = teamTotal + numAmount;

    if (hypotheticalTeamTotal === 0) return 0;

    return (totalInvestment / hypotheticalTeamTotal) * hypotheticalPrizePool;
  };

  const openBetPopup = (team: any) => {
    setBettingOn(team);
    setAmount(''); // Reset to empty string for clean input
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-20 relative overflow-hidden">
      {/* BACKGROUND STADIUM */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 blur-sm pointer-events-none" style={{ backgroundImage: 'url("/world_cup_bg.png")' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/40 via-black/20 to-[#080808]" />

      <div className="relative h-[400px] overflow-hidden flex items-center justify-center z-10">
        <div className="absolute h-[350px] inset-0 bg-gradient-to-b from-indigo-500/30 via-[#080808] to-[#080808]" />
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tighter">NHÀ VÔ ĐỊCH</h1>
          {winner && (
            <div className="mb-6 animate-bounce">
              <button
                onClick={() => setShowWinners(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-full font-black uppercase text-xs shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 mx-auto"
              >
                🏆 XEM DANH SÁCH THẮNG CUỘC 🏆
              </button>
            </div>
          )}
          <div className="mt-8 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-[14px] font-black text-slate-500 uppercase mb-1">Tổng quỹ cược</p>
              <p className="text-5xl font-black text-emerald-400 font-mono">{totalPool.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-[14px] font-black text-slate-500 uppercase mb-1">Tổng giải thưởng (90%)</p>
              <p className="text-5xl font-black text-indigo-400 font-mono">{prizePool.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        </div>
      </div>

      {/* RULES SECTION - COLLAPSIBLE */}
      <div className="max-w-7xl mx-auto px-6 mb-18">
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-white/[0.02] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-indigo-500 rounded-full" />
              <h2 className="text-lg font-black uppercase tracking-wider italic">THỂ LỆ & CÁCH TÍNH THƯỞNG</h2>
            </div>
            <div className={`w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs transition-transform duration-300 ${showRules ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showRules ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-10 pb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 font-black text-xs">01</div>
                    <div>
                      <h4 className="font-black text-slate-100 uppercase text-sm mb-2">Quỹ giải thưởng (Prize Pool)</h4>
                      <p className="text-slate-400 text-[13px] leading-relaxed">Tổng cộng 90% số tiền cược từ tất cả người chơi sẽ được đưa vào quỹ giải thưởng chung. 10% còn lại được sử dụng để duy trì và vận hành hệ thống.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 font-black text-xs">02</div>
                    <div>
                      <h4 className="font-black text-slate-100 uppercase text-sm mb-2">Điều kiện thắng cuộc</h4>
                      <p className="text-slate-400 text-[13px] leading-relaxed">Chỉ những thành viên dự đoán chính xác đội giành chức vô địch World Cup 2026 mới đủ điều kiện nhận thưởng từ quỹ giải thưởng.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                  <h4 className="font-black text-indigo-400 uppercase text-[10px] tracking-widest mb-4">Công thức tính thưởng</h4>
                  <div className="bg-black/40 p-4 rounded-xl font-mono text-[13px] text-emerald-400 border border-emerald-500/20 mb-4">
                    Tiền nhận được = (Tiền bạn cược / Tổng tiền cược đội đó) x Tổng quỹ thưởng
                  </div>
                  <p className="text-slate-300 text-[12px] italic leading-relaxed">
                    * Ví dụ: Đội Mexico có tổng cược là 100k, bạn cược 50k (chiếm 50%). Nếu Mexico vô địch và tổng quỹ thưởng là 1 triệu, bạn sẽ nhận được 500k.
                  </p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Lưu ý: Mọi kết quả dựa trên xác nhận cuối cùng của Admin dựa theo thực tế giải đấu.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 mt-16">
          <div className="relative flex-1 max-w-md group">
            <input
              type="text"
              placeholder="Tìm kiếm đội tuyển..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-sm font-bold group-hover:bg-white/10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-40">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filteredOptions.map(opt => {
              const teamBets = bets.filter(b => b.team_name === opt.name);
              const teamTotal = teamBets.reduce((sum, b) => sum + b.amount, 0);
              const isWinner = winner === opt.name;
              return (
                <div key={opt.name} onClick={() => openBetPopup(opt)}
                  className={`group relative bg-[#111]/60 border ${isWinner ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-white/5'} rounded-[32px] p-5 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer overflow-hidden flex flex-col items-center shadow-lg`}>
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl overflow-hidden border border-white/10 mb-4 scale-100 group-hover:scale-110 transition-transform relative">
                    <img src={`https://flagcdn.com/w160/${opt.code.toLowerCase()}.png`} className="w-full h-full object-cover" />
                    {isWinner && <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center"><span className="text-2xl animate-bounce">🏆</span></div>}
                  </div>
                  <h3 className={`font-black text-[13px] ${isWinner ? 'text-yellow-400' : 'text-slate-100'} mb-1 truncate w-full text-center uppercase`}>{opt.name}</h3>
                  <div className="mt-2 pt-2 border-t border-white/5 w-full text-center">
                    <p className="text-[14px] font-black text-emerald-500">{teamTotal.toLocaleString('vi-VN')}đ</p>
                    <p className="text-[12px] font-bold text-slate-600 uppercase">{teamBets.length} lượt</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {bettingOn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setBettingOn(null)} />
          <div className="relative bg-[#111] border border-white/10 rounded-[50px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in zoom-in duration-300">

            {/* LEFT SIDE: BETTING FORM */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto bg-slate-900 rounded-[28px] overflow-hidden border border-white/10 mb-6 shadow-2xl flex items-center justify-center">
                  <img src={`https://flagcdn.com/w160/${bettingOn.code.toLowerCase()}.png`} className="w-full h-full object-cover" />
                </div>
                <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">DỰ ĐOÁN <span className="text-indigo-400">{bettingOn.name}</span></h2>
                <p className="text-slate-500 text-[12px] font-black uppercase tracking-[0.2em]">WORLD CUP 2026 CHAMPION</p>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Số tiền bạn muốn cược (đ)</label>
                  </div>
                  <input type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Nhập số tiền (tối thiểu 20.000đ)..."
                    className="w-full bg-black border border-white/10 rounded-3xl px-8 py-6 text-xl font-black text-center text-white focus:border-indigo-500 transition-all font-mono" />
                  {amount !== '' && Number(amount) > 0 && Number(amount) < 20000 && (
                    <p className="text-rose-400 text-[11px] font-bold mt-2 text-center">⚠ Mức cược tối thiểu là 20.000đ</p>
                  )}
                  <div className="grid grid-cols-5 gap-3 mt-4">
                    {[20000, 50000, 100000, 200000, 500000].map(val => (
                      <button key={val} onClick={() => setAmount(val)} className={`py-3 rounded-2xl text-[11px] font-black transition-all border ${amount === val ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                        {val / 1000}K
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-[40px] p-8 text-center">
                  <p className="text-[13px] font-black text-indigo-300 uppercase mb-4">Tiền thưởng ước tính nếu vô địch</p>
                  <div className="flex items-baseline gap-3 justify-center mb-4">
                    <span className="text-5xl font-black text-emerald-400 font-mono">{Math.round(getEstPrize(bettingOn.name, amount)).toLocaleString('vi-VN')}</span>
                    <span className="text-2xl text-emerald-600/50 font-black">đ</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    disabled={submitting || !amount || Number(amount) < 20000}
                    onClick={handlePlaceBet}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black py-6 rounded-[30px] transition-all uppercase tracking-widest active:scale-95 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'ĐANG GỬI...' : 'XÁC NHẬN DỰ ĐOÁN'}
                  </button>
                  <button onClick={() => setBettingOn(null)} className="flex-1 bg-white/5 text-slate-400 font-bold py-6 rounded-[30px] uppercase border border-white/5 text-xs">HỦY</button>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: BETS LIST */}
            <div className="w-full md:w-80 bg-white/[0.02] border-l border-white/10 p-8 flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-8 border-b border-indigo-500/20 pb-4">Cộng Đồng Dự Đoán</h3>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-black">
                      <th className="pb-3 uppercase tracking-wider">Người dùng</th>
                      <th className="pb-3 uppercase tracking-wider text-right">Mức cược</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bets.filter(b => b.team_name === bettingOn.name).length > 0 ? (
                      bets.filter(b => b.team_name === bettingOn.name).sort((a, b) => b.amount - a.amount).map((b, i) => (
                        <tr key={i} className="group">
                          <td className="py-4">
                            <span className="font-bold text-slate-300 group-hover:text-indigo-400 transition-colors uppercase">{b.user_name}</span>
                          </td>
                          <td className="py-4 text-right">
                            <span className="font-black text-emerald-400 font-mono">{b.amount.toLocaleString('vi-VN')}đ</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={2} className="py-20 text-center text-slate-600 italic">Chưa có lượt dự đoán nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          fetchOutrightData();
        }}
      />

      {/* WINNERS MODAL */}
      {showWinners && winner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowWinners(false)} />
          <div className="relative bg-[#111] border border-yellow-500/30 rounded-[50px] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-yellow-500 to-amber-700 p-10 text-center relative">
              <button onClick={() => setShowWinners(false)} className="absolute top-6 right-6 text-white/50 hover:text-white">✕</button>
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 border border-white/30">🏆</div>
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">BẢNG VÀNG THẮNG CUỘC</h2>
              <p className="text-yellow-100/80 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Đội vô địch: {winner}</p>
            </div>

            <div className="p-8">
              <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-4">Người chơi</th>
                      <th className="pb-4 text-center">Tiền cược</th>
                      <th className="pb-4 text-right">Tiền thưởng nhận được</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const winnerBets = bets.filter(b => b.team_name === winner);
                      const teamTotal = winnerBets.reduce((sum, b) => sum + b.amount, 0);
                      const prizePool = bets.reduce((sum, b) => sum + b.amount, 0) * 0.9;

                      return winnerBets.sort((a, b) => b.amount - a.amount).map((b, i) => {
                        const prize = (b.amount / teamTotal) * prizePool;
                        return (
                          <tr key={i} className="group hover:bg-white/[0.02] transition-all">
                            <td className="py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <span className="font-black text-slate-200 uppercase text-xs">{b.user_name}</span>
                              </div>
                            </td>
                            <td className="py-5 text-center text-slate-400 font-mono text-xs">{b.amount.toLocaleString('vi-VN')}₫</td>
                            <td className="py-5 text-right font-black text-emerald-400 font-mono text-sm">{Math.round(prize).toLocaleString('vi-VN')}₫</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                {bets.filter(b => b.team_name === winner).length === 0 && (
                  <div className="py-20 text-center text-slate-600 italic text-sm">Chưa có ai dự đoán đúng đội vô địch này.</div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-500 uppercase">Tổng quỹ thưởng được chia:</span>
                <span className="text-xl font-black text-yellow-500 font-mono">{(bets.reduce((sum, b) => sum + b.amount, 0) * 0.9).toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
