import { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import AuthModal from '../components/AuthModal';

const TIERS = [
  {
    name: "Tier S",
    teams: [
      { name: "Argentina", code: "ar" },
      { name: "Pháp", code: "fr" },
      { name: "Brazil", code: "br" },
      { name: "Tây Ban Nha", code: "es" },
      { name: "Anh", code: "gb-eng" },
      { name: "Đức", code: "de" },
      { name: "Hà Lan", code: "nl" },
    ],
  },
  {
    name: "Tier A",
    teams: [
      { name: "Bồ Đào Nha", code: "pt" },
      { name: "Uruguay", code: "uy" },
      { name: "Bỉ", code: "be" },
      { name: "Croatia", code: "hr" },
      { name: "Colombia", code: "co" },
      { name: "Nhật Bản", code: "jp" },
    ],
  },
  {
    name: "Tier B",
    teams: [
      { name: "Maroc", code: "ma" },
      { name: "Thụy Sĩ", code: "ch" },
      { name: "Mexico", code: "mx" },
      { name: "Hoa Kỳ", code: "us" },
      { name: "Hàn Quốc", code: "kr" },
      { name: "Senegal", code: "sn" },
      { name: "Áo", code: "at" },
      { name: "Thụy Điển", code: "se" },
      { name: "Na Uy", code: "no" },
      { name: "Thổ Nhĩ Kỳ", code: "tr" },
      { name: "Paraguay", code: "py" },
      { name: "Ecuador", code: "ec" },
      { name: "Đan Mạch", code: "dk" },
      { name: "Iran", code: "ir" },
      { name: "Ai Cập", code: "eg" },
      { name: "Canada", code: "ca" },
    ],
  },
  {
    name: "Tier C",
    teams: [
      { name: "Úc", code: "au" },
      { name: "Tunisia", code: "tn" },
      { name: "Algeria", code: "dz" },
      { name: "Ghana", code: "gh" },
      { name: "Bờ Biển Ngà", code: "ci" },
      { name: "Cộng hòa Séc", code: "cz" },
      { name: "Scotland", code: "gb-sct" },
      { name: "Ả Rập Xê Út", code: "sa" },
      { name: "Qatar", code: "qa" },
      { name: "Nam Phi", code: "za" },
      { name: "Bosnia & HZ", code: "ba" },
      { name: "CHDC Congo", code: "cd" },
      { name: "Panama", code: "pa" },
      { name: "Iraq", code: "iq" },
    ],
  },
  {
    name: "Tier D",
    teams: [
      { name: "Jordan", code: "jo" },
      { name: "Uzbekistan", code: "uz" },
      { name: "Cape Verde", code: "cv" },
      { name: "New Zealand", code: "nz" },
      { name: "Haiti", code: "ht" },
      { name: "Curaçao", code: "cw" },
    ],
  },
];

const TIER_ODDS: Record<string, number> = {
  "Tier S": 2.5,
  "Tier A": 3.5,
  "Tier B": 5.0,
  "Tier C": 8.0,
  "Tier D": 15.0,
};


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
  const [editingBet, setEditingBet] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const ctx = useContext(AppContext);

  const getTeamOdds = (teamName: string): number => {
    const tier = TIERS.find(t => t.teams.some(team => team.name === teamName));
    if (!tier) return 1.0;

    const baseOdds = TIER_ODDS[tier.name] || 1.0;

    // Calculate total pool
    const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalPool === 0) return baseOdds;

    // Calculate total bet for this team
    const teamTotal = bets.filter(b => b.team_name === teamName).reduce((sum, b) => sum + b.amount, 0);
    const ratio = teamTotal / totalPool;

    if (tier.name === "Tier S") {
      if (ratio > 0.50) return 1.8;
      if (ratio > 0.35) return 2.0;
    } else if (tier.name === "Tier A") {
      if (ratio > 0.50) return 2.5;
      if (ratio > 0.35) return 3.0;
    } else if (tier.name === "Tier B") {
      if (ratio > 0.40) return 4.0;
    }

    return baseOdds;
  };

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
    if (!betVal || betVal < 20000) {
      alert('Số tiền tối thiểu là 20.000đ');
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

  const handleDeleteOutrightBet = async (betId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lượt dự đoán này?')) return;
    try {
      const { error } = await supabase
        .from('outright_bets')
        .delete()
        .eq('id', betId);

      if (error) throw error;
      alert('Đã xóa lượt dự đoán thành công!');
      fetchOutrightData();
    } catch (err: any) {
      alert('Lỗi khi xóa lượt dự đoán: ' + err.message);
    }
  };

  const handleUpdateOutrightBet = async () => {
    if (!editingBet) return;
    const betVal = Number(editAmount);
    if (!betVal || betVal < 20000) {
      alert('Số tiền tối thiểu là 20.000đ');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('outright_bets')
        .update({ amount: betVal })
        .eq('id', editingBet.id);

      if (error) throw error;
      alert('Cập nhật lượt dự đoán thành công!');
      setEditingBet(null);
      fetchOutrightData();
    } catch (err: any) {
      alert('Lỗi khi sửa lượt dự đoán: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
  const winnerOdds = winner ? getTeamOdds(winner) : 1.0;

  const getEstPrize = (teamName: string, betAmount: number | '') => {
    const numAmount = Number(betAmount) || 0;
    const myExistingBet = bets
      .filter(b => b.team_name === teamName && b.user_id === ctx?.session?.user?.id)
      .reduce((sum, b) => sum + b.amount, 0);

    const totalInvestment = myExistingBet + numAmount;
    const odds = getTeamOdds(teamName);

    return totalInvestment * odds;
  };

  const getTeamFlagAndTier = (teamName: string) => {
    for (const tier of TIERS) {
      const team = tier.teams.find(t => t.name === teamName);
      if (team) {
        return { code: team.code, tierName: tier.name };
      }
    }
    return { code: '', tierName: '' };
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '---';
    }
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
              <p className="text-[14px] font-black text-slate-500 uppercase mb-1">Tổng lượt dự đoán</p>
              <p className="text-5xl font-black text-indigo-400 font-mono">{bets.length.toLocaleString('vi-VN')} lượt</p>
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
              <h2 className="text-lg font-black uppercase tracking-wider italic">THỂ LỆ & CÁCH TÍNH THƯỞNG CHI TIẾT</h2>
            </div>
            <div className={`w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs transition-transform duration-300 ${showRules ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showRules ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-6 md:px-10 pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* COLUMN 1: FIXED ODDS MODEL */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm">🎯</div>
                    <h3 className="font-black text-slate-100 uppercase tracking-wider text-base">Cơ chế Tỷ lệ cược Cố định</h3>
                  </div>

                  <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                    <p>
                      Để mang lại sự minh bạch tối đa và giúp người tham gia dễ dàng tính toán chính xác phần thưởng của mình, hệ thống áp dụng cơ chế <span className="text-indigo-400 font-black">Tỷ lệ cược Cố định (Fixed Odds)</span> theo phân hạng sức mạnh (Tier) của từng đội tuyển.
                    </p>

                    {/* <div className="bg-black/30 p-5 rounded-2xl border border-white/5 space-y-3">
                      <p className="font-black text-indigo-400 uppercase tracking-widest text-xs">Ưu điểm của cơ chế này:</p>
                      <ul className="list-disc pl-5 space-y-2 text-slate-400 text-xs">
                        <li><span className="text-slate-200 font-bold">Biết trước kết quả:</span> Tỷ lệ Odds được chốt và áp dụng chung cho toàn bộ người chơi đặt trước và sau.</li>
                        <li><span className="text-slate-200 font-bold">Tính toán cực kỳ dễ dàng:</span> Số tiền nhận về = Tiền cược &times; Odds thực tế của Tier tương ứng.</li>
                      </ul>
                    </div> */}

                    <div className="bg-rose-950/20 p-5 rounded-2xl border border-rose-500/10 space-y-3">
                      <p className="font-black text-rose-400 uppercase tracking-widest text-xs">⚠️ Điều chỉnh Odds tự động:</p>
                      <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                        Để cân bằng tính thanh khoản khi lượng cược dồn quá nhiều vào một đội cửa trên, Odds gốc sẽ tự động giảm dựa trên tỷ trọng của đội đó trên tổng quỹ cược:
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-slate-400 text-xs">
                        <li><span className="text-slate-200 font-bold">Tier S (Gốc 2.5):</span> Vượt 35% tổng cược giảm còn <span className="text-rose-400 font-bold font-mono">2.0</span>; Vượt 50% giảm còn <span className="text-rose-400 font-bold font-mono">1.8</span>.</li>
                        <li><span className="text-slate-200 font-bold">Tier A (Gốc 3.5):</span> Vượt 35% tổng cược giảm còn <span className="text-rose-400 font-bold font-mono">3.0</span>; Vượt 50% giảm còn <span className="text-rose-400 font-bold font-mono">2.5</span>.</li>
                        <li><span className="text-slate-200 font-bold">Tier B (Gốc 5.0):</span> Vượt 40% tổng cược giảm còn <span className="text-rose-400 font-bold font-mono">4.0</span>.</li>
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Bảng quy đổi tỷ lệ cược (Odds) theo Tier:</p>
                      <div className="grid grid-cols-5 gap-3 text-center">
                        {Object.entries(TIER_ODDS).map(([tier, odds]) => (
                          <div key={tier} className="bg-black/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-center items-center">
                            <span className="text-[11px] font-black text-slate-400">{tier}</span>
                            <span className="text-lg font-black text-emerald-400 mt-1">x{odds.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: PRACTICAL EXAMPLES */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">🏆</div>
                      <h3 className="font-black text-slate-100 uppercase tracking-wider text-base">Ví dụ thực tế chi tiết</h3>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs text-slate-400 font-bold">Giả sử bạn đưa ra dự đoán với số tiền <span className="text-white font-black font-mono">100.000đ</span>:</p>

                      <div className="space-y-3 font-mono text-xs">
                        {Object.entries(TIER_ODDS).map(([tierName, odds]) => {
                          const badgeConfig: Record<string, { color: string; animate: string }> = {
                            "Tier S": { color: "bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]", animate: "animate-pulse" },
                            "Tier A": { color: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]", animate: "" },
                            "Tier B": { color: "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]", animate: "" },
                            "Tier C": { color: "bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]", animate: "" },
                            "Tier D": { color: "bg-slate-600 shadow-[0_0_8px_rgba(71,85,105,0.4)]", animate: "" }
                          };
                          const currentConfig = badgeConfig[tierName] || { color: "bg-slate-600", animate: "" };
                          const estReturn = 100000 * odds;

                          return (
                            <div key={tierName} className="bg-black/30 border border-white/5 p-3.5 rounded-2xl flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${currentConfig.color} ${currentConfig.animate}`} />
                                <span className="font-black text-white">{tierName} (Odds {odds.toFixed(1)})</span>
                              </div>
                              <span className="text-emerald-400 font-black text-[13px]">Nhận về: {Math.round(estReturn).toLocaleString('vi-VN')} đ</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 text-[11px] font-bold text-slate-400 uppercase leading-relaxed text-center">
                    💡 Lưu ý: Hệ thống chỉ ghi nhận kết quả cuối cùng dựa trên xác nhận chính thức của ban quản trị khi giải đấu khép lại.
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
          <div className="space-y-16">
            {TIERS.map((tier) => {
              const tierFilteredTeams = tier.teams.filter((opt) =>
                opt.name.toLowerCase().includes(search.toLowerCase())
              );

              if (tierFilteredTeams.length === 0) return null;

              return (
                <div key={tier.name} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`px-6 py-2 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg ${tier.name === 'Tier S' ? 'bg-rose-600 text-white shadow-rose-900/40' :
                      tier.name === 'Tier A' ? 'bg-amber-500 text-black shadow-amber-900/40' :
                        tier.name === 'Tier B' ? 'bg-indigo-600 text-white shadow-indigo-900/40' :
                          tier.name === 'Tier C' ? 'bg-emerald-600 text-white shadow-emerald-900/40' :
                            'bg-slate-700 text-slate-300'
                      }`}>
                      {tier.name}
                    </div>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {tierFilteredTeams.map((opt) => {
                      const teamBets = bets.filter((b) => b.team_name === opt.name);
                      const teamTotal = teamBets.reduce((sum, b) => sum + b.amount, 0);
                      const isWinner = winner === opt.name;
                      return (
                        <div
                          key={opt.name}
                          onClick={() => openBetPopup(opt)}
                          className={`group relative bg-[#111]/60 border ${isWinner
                            ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                            : "border-white/5"
                            } rounded-[32px] p-5 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer overflow-hidden flex flex-col items-center shadow-lg`}
                        >
                          <div className="w-16 h-16 bg-slate-900 rounded-2xl overflow-hidden border border-white/10 mb-4 scale-100 group-hover:scale-110 transition-transform relative">
                            <img
                              src={`https://flagcdn.com/w160/${opt.code.toLowerCase()}.png`}
                              className="w-full h-full object-cover"
                            />
                            {isWinner && (
                              <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                                <span className="text-2xl animate-bounce">🏆</span>
                              </div>
                            )}
                          </div>
                          <h3
                            className={`font-black text-[13px] ${isWinner ? "text-yellow-400" : "text-slate-100"
                              } mb-1 truncate w-full text-center uppercase`}
                          >
                            {opt.name}
                          </h3>
                          <div className="mt-2 pt-2 border-t border-white/5 w-full text-center">
                            <p className="text-[14px] font-black text-emerald-400">
                              {teamTotal.toLocaleString("vi-VN")}đ
                            </p>
                            {(() => {
                              const currentOdds = getTeamOdds(opt.name);
                              const baseOdds = TIER_ODDS[tier.name] || 1.0;
                              const isOddsAdjusted = currentOdds < baseOdds;

                              let adjustReason = "";
                              if (isOddsAdjusted) {
                                if (tier.name === "Tier S") {
                                  adjustReason = currentOdds === 1.8
                                    ? `Đã hạ Odds từ x${baseOdds.toFixed(1)} xuống x1.8 do vượt 50% tổng cược`
                                    : `Đã hạ Odds từ x${baseOdds.toFixed(1)} xuống x2.0 do vượt 35% tổng cược`;
                                } else if (tier.name === "Tier A") {
                                  adjustReason = currentOdds === 2.5
                                    ? `Đã hạ Odds từ x${baseOdds.toFixed(1)} xuống x2.5 do vượt 50% tổng cược`
                                    : `Đã hạ Odds từ x${baseOdds.toFixed(1)} xuống x3.0 do vượt 35% tổng cược`;
                                } else if (tier.name === "Tier B") {
                                  adjustReason = `Đã hạ Odds từ x${baseOdds.toFixed(1)} xuống x4.0 do vượt 40% tổng cược`;
                                }
                              }

                              return (
                                <div className="flex justify-between items-center mt-1 text-[13px] font-bold uppercase">
                                  <span className="text-slate-600">{teamBets.length} lượt</span>
                                  <span className={`font-black font-mono ${isOddsAdjusted ? 'text-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.2)]' : 'text-indigo-400'}`} title={isOddsAdjusted ? adjustReason : undefined}>
                                    x{currentOdds.toFixed(1)}{isOddsAdjusted && ' 📉'}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BẢNG TỔNG HỢP DỰ ĐOÁN TOÀN BỘ */}
        <div className="mt-20 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[40px] p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl text-indigo-400">
                📊
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider italic text-slate-100 flex items-center gap-2">
                  Bảng tổng hợp dự đoán toàn bộ
                  <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-black not-italic px-2.5 py-0.5 rounded-full">
                    {bets.length} lượt
                  </span>
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">Danh sách đầy đủ tất cả các lượt dự đoán từ cộng đồng người chơi</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-2xl">
                <span>Tổng cược:</span>
                <span className="text-emerald-400 font-black">{totalPool.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pr-2 custom-scrollbar">
            <div className="min-w-[800px] max-h-[480px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-black uppercase tracking-widest text-[12px]">
                    <th className="pb-4 pl-4">Người chơi</th>
                    <th className="pb-4">Đội dự đoán</th>
                    <th className="pb-4">Phân hạng</th>
                    <th className="pb-4 text-right">Tiền cược</th>
                    <th className="pb-4 text-center">Odds áp dụng</th>
                    <th className="pb-4 text-right">Thưởng ước tính</th>
                    <th className="pb-4 pr-4 text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {bets.length > 0 ? (
                    [...bets]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((b, i) => {
                        const { code, tierName } = getTeamFlagAndTier(b.team_name);
                        const currentOdds = getTeamOdds(b.team_name);
                        const estPrize = b.amount * currentOdds;
                        const tierColors: Record<string, string> = {
                          "Tier S": "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                          "Tier A": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                          "Tier B": "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                          "Tier C": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                          "Tier D": "bg-slate-500/10 text-slate-400 border border-slate-500/20",
                        };

                        return (
                          <tr key={i} className="group hover:bg-white/[0.01] transition-all">
                            <td className="py-4 pl-4">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const isAdmin = ctx?.isAdminAuthenticated || false;
                                  const isOwner = ctx?.session?.user && b.user_id === ctx?.session?.user?.id;
                                  return (isAdmin || isOwner) && (
                                    <div className="flex items-center gap-1.5 mr-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingBet(b);
                                          setEditAmount(b.amount);
                                        }}
                                        className="text-amber-500 hover:text-amber-400 p-1 bg-amber-500/10 rounded transition-colors text-[10px] cursor-pointer"
                                        title="Sửa lượt dự đoán"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOutrightBet(b.id)}
                                        className="text-rose-500 hover:text-rose-400 p-1 bg-rose-500/10 rounded transition-colors text-[10px] cursor-pointer"
                                        title="Xóa lượt dự đoán"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  );
                                })()}
                                <span className="font-black text-slate-200 group-hover:text-indigo-400 transition-colors uppercase">
                                  {b.user_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                {code && (
                                  <div className="w-6 h-4 bg-slate-900 rounded overflow-hidden border border-white/10 shrink-0">
                                    <img
                                      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                                      className="w-full h-full object-cover"
                                      alt={b.team_name}
                                    />
                                  </div>
                                )}
                                <span className="font-bold text-slate-100 uppercase">{b.team_name}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${tierColors[tierName] || 'bg-slate-800 text-slate-400'}`}>
                                {tierName || 'N/A'}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <span className="font-black text-emerald-400 font-mono text-[13px]">
                                {b.amount.toLocaleString('vi-VN')}₫
                              </span>
                            </td>
                            <td className="py-4 text-center font-mono font-black text-indigo-400">
                              x{currentOdds.toFixed(1)}
                            </td>
                            <td className="py-4 text-right">
                              <span className="font-black text-amber-400 font-mono text-[13px]">
                                {Math.round(estPrize).toLocaleString('vi-VN')}₫
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-right text-slate-400 font-mono text-[11px]">
                              {formatDateTime(b.created_at)}
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-24 text-center text-slate-500 italic text-sm">
                        Chưa có lượt dự đoán nào được ghi nhận từ cộng đồng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

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

                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-[40px] p-8 text-center relative overflow-hidden">
                  <p className="text-[13px] font-black text-indigo-300 uppercase mb-2">Tiền thưởng ước tính nếu vô địch</p>
                  <div className="text-[13px] font-black text-slate-500 uppercase mb-4">
                    Tỷ lệ Odds áp dụng: <span className="text-indigo-400 font-mono">x{getTeamOdds(bettingOn.name).toFixed(1)}</span>
                  </div>
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

      {/* EDIT MODAL */}
      {editingBet && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditingBet(null)} />
          <div className="relative bg-[#111] border border-white/10 rounded-[50px] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />

            <div className="p-8 md:p-12 overflow-y-auto">
              <div className="text-center mb-8">
                {getTeamFlagAndTier(editingBet.team_name).code && (
                  <div className="w-24 h-24 mx-auto bg-slate-900 rounded-[28px] overflow-hidden border border-white/10 mb-6 shadow-2xl flex items-center justify-center">
                    <img src={`https://flagcdn.com/w160/${getTeamFlagAndTier(editingBet.team_name).code.toLowerCase()}.png`} className="w-full h-full object-cover" />
                  </div>
                )}
                <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">SỬA LƯỢT DỰ ĐOÁN</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Đội tuyển: <span className="text-indigo-400">{editingBet.team_name}</span> ({getTeamFlagAndTier(editingBet.team_name).tierName})
                </p>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1">
                  Người chơi: <span className="text-amber-400">{editingBet.user_name}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Số tiền cược mới (đ)</label>
                    <span className="text-[11px] font-bold text-slate-400">
                      Cũ: {editingBet.amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Nhập số tiền (tối thiểu 20.000đ)..."
                    className="w-full bg-black border border-white/10 rounded-3xl px-8 py-5 text-xl font-black text-center text-white focus:border-amber-500 transition-all font-mono"
                  />
                  {editAmount !== '' && Number(editAmount) > 0 && Number(editAmount) < 20000 && (
                    <p className="text-rose-400 text-[11px] font-bold mt-2 text-center">⚠ Mức cược tối thiểu là 20.000đ</p>
                  )}
                  <div className="grid grid-cols-5 gap-3 mt-4">
                    {[20000, 50000, 100000, 200000, 500000].map(val => (
                      <button
                        key={val}
                        onClick={() => setEditAmount(val)}
                        className={`py-3 rounded-2xl text-[11px] font-black transition-all border ${editAmount === val ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        {val / 1000}K
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-[40px] p-6 text-center relative overflow-hidden">
                  <p className="text-[13px] font-black text-amber-300 uppercase mb-2">Tiền thưởng ước tính mới nếu vô địch</p>
                  <div className="text-[13px] font-black text-slate-500 uppercase mb-4">
                    Tỷ lệ Odds áp dụng: <span className="text-amber-400 font-mono">x{getTeamOdds(editingBet.team_name).toFixed(1)}</span>
                  </div>
                  <div className="flex items-baseline gap-3 justify-center mb-2">
                    <span className="text-4xl font-black text-emerald-400 font-mono">
                      {Math.round((Number(editAmount) || 0) * getTeamOdds(editingBet.team_name)).toLocaleString('vi-VN')}
                    </span>
                    <span className="text-xl text-emerald-600/50 font-black">đ</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    disabled={submitting || !editAmount || Number(editAmount) < 20000}
                    onClick={handleUpdateOutrightBet}
                    className="flex-[2] bg-amber-600 hover:bg-amber-500 text-white font-black py-5 rounded-[30px] transition-all uppercase tracking-widest active:scale-95 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'ĐANG CẬP NHẬT...' : 'XÁC NHẬN CẬP NHẬT'}
                  </button>
                  <button
                    onClick={() => setEditingBet(null)}
                    className="flex-1 bg-white/5 text-slate-400 font-bold py-5 rounded-[30px] uppercase border border-white/5 text-xs hover:bg-white/10"
                  >
                    HỦY
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

                      return winnerBets.sort((a, b) => b.amount - a.amount).map((b, i) => {
                        const prize = b.amount * winnerOdds;
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

              <div className="mt-8 pt-6 border-t border-white/5 space-y-3 px-2">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase font-mono">
                  <span>Tổng tiền cược đội thắng (W):</span>
                  <span className="text-slate-200 font-bold">
                    {(() => {
                      const winnerBets = bets.filter(b => b.team_name === winner);
                      const teamTotal = winnerBets.reduce((sum, b) => sum + b.amount, 0);
                      return teamTotal.toLocaleString('vi-VN');
                    })()}₫
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase font-mono">
                  <span>Tỷ lệ Odds cố định của Tier ({winner ? TIERS.find(t => t.teams.some(team => team.name === winner))?.name : 'N/A'}):</span>
                  <span className="text-indigo-300 font-bold font-mono">
                    x{winnerOdds.toFixed(1)}
                  </span>
                </div>
                <div className="h-[1px] bg-white/5 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-400 uppercase font-mono">Tổng tiền trả thưởng thực tế:</span>
                  <span className="text-xl font-black text-yellow-500 font-mono">
                    {(() => {
                      const winnerBets = bets.filter(b => b.team_name === winner);
                      const teamTotal = winnerBets.reduce((sum, b) => sum + b.amount, 0);
                      const totalPayout = teamTotal * winnerOdds;
                      return totalPayout.toLocaleString('vi-VN');
                    })()}₫
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
