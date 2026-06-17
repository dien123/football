import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Match } from '../types';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { calculateBetResult, getOutcomeLabel } from '../utils/betLogic';
import { formatVND } from '../utils/format';


const AdminPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'date' | 'unplayed' | 'live' | 'all'>('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [localScores, setLocalScores] = useState<Record<string, { a: number, b: number }>>({});
  const [activeTab, setActiveTab] = useState<'matches' | 'outright'>('matches');
  const [allBets, setAllBets] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);

  const [contributedInput, setContributedInput] = useState(() => {
    const saved = localStorage.getItem('admin_contributed_fund') || '';
    const num = parseInt(saved.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num >= 10000) {
      const converted = (num / 1000).toLocaleString('vi-VN');
      localStorage.setItem('admin_contributed_fund', converted);
      return converted;
    }
    return saved;
  });

  const contributedValue = useMemo(() => {
    const num = parseInt(contributedInput.replace(/\D/g, ''), 10);
    return isNaN(num) ? 0 : num * 1000;
  }, [contributedInput]);

  const handleContributedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (rawVal) {
      formatted = Number(rawVal).toLocaleString('vi-VN');
    }
    setContributedInput(formatted);
    localStorage.setItem('admin_contributed_fund', formatted);
  };

  const scrollerRef = useRef<HTMLDivElement>(null);
  const ctx = useContext(AppContext);
  if (!ctx) return null;
  const { setAdminAuthenticated } = ctx;

  const ALL_TEAMS = [
    'Mexico', 'Nam Phi', 'Hàn Quốc', 'Cộng hòa Séc',
    'Canada', 'Bosnia & HZ', 'Qatar', 'Thụy Sĩ',
    'Brazil', 'Maroc', 'Haiti', 'Scotland',
    'Hoa Kỳ', 'Paraguay', 'Úc', 'Thổ Nhĩ Kỳ',
    'Đức', 'Curaçao', 'Bờ Biển Ngà', 'Ecuador',
    'Hà Lan', 'Nhật Bản', 'Thụy Điển', 'Tunisia',
    'Bỉ', 'Ai Cập', 'Iran', 'New Zealand',
    'Tây Ban Nha', 'Cape Verde', 'Ả Rập Xê Út', 'Uruguay',
    'Pháp', 'Senegal', 'Iraq', 'Na Uy',
    'Argentina', 'Algeria', 'Áo', 'Jordan',
    'Bồ Đào Nha', 'CHDC Congo', 'Uzbekistan', 'Colombia',
    'Anh', 'Croatia', 'Ghana', 'Panama'
  ].sort();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: true });

    if (!error) {
      const fetched = data || [];
      setMatches(fetched);

      if (fetched.length > 0 && !selectedDate) {
        const dates = [...new Set(fetched.map(m => new Date(m.start_time).toLocaleDateString('vi-VN')))].sort((a, b) => {
          const [da, ma, ya] = a.split('/').map(Number);
          const [db, mb, yb] = b.split('/').map(Number);
          return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });

        const today = new Date();
        const parsedDates = dates.map(dStr => {
          const [d, m, y] = dStr.split('/').map(Number);
          return { str: dStr, date: new Date(y, m - 1, d) };
        });

        let startingDateObj = parsedDates.find(item =>
          item.date.getDate() === today.getDate() &&
          item.date.getMonth() === today.getMonth() &&
          item.date.getFullYear() === today.getFullYear()
        );

        if (!startingDateObj) {
          const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          startingDateObj = parsedDates.find(item => item.date >= todayReset);
        }

        const startingDate = startingDateObj?.str || dates[dates.length - 1] || dates[0];
        setSelectedDate(startingDate);
      }
    }

    const { data: betsData } = await supabase.from('bets').select('*');
    if (betsData) setAllBets(betsData);

    const { data: refundsData } = await supabase.from('refunds').select('*');
    if (refundsData) {
      const sanitized = refundsData
        .filter(r => {
          // Remove the incorrect 50.000 refund for Bet Thủ Thua Đủ
          if (r.user_name === 'Bet Thủ Thua Đủ' && r.amount === 50000 && (r.id === '84a39e33-37ac-4161-bfe3-3624cc42df9d' || r.refunded_at.startsWith('2026-06-15T04:30'))) {
            return false;
          }
          // Remove the incorrect 100.000 refund for Tài F on 2026-06-17
          if (r.user_name === 'Tài F' && r.amount === 100000 && (r.id === '011ff1b0-f503-4098-a355-1320665422f0' || r.refunded_at.startsWith('2026-06-17'))) {
            return false;
          }
          return true;
        })
        .map(r => {
          // Adjust the original 100.000 refund's date to 11:30 (2026-06-15T04:30:00Z) to reset Sweden vs Tunisia
          if (r.user_name === 'Bet Thủ Thua Đủ' && r.amount === 100000 && (r.id === 'a8d52516-7a42-426d-932c-0749277868a4' || r.refunded_at.startsWith('2026-06-15T01:33'))) {
            return {
              ...r,
              refunded_at: '2026-06-15T04:30:00.000Z'
            };
          }
          return r;
        });
      setRefunds(sanitized);
    }
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;
    const { id, ...payload } = editingMatch;

    // Auto-adjust handicap sign based on the selected favorite_team
    const selectedFav = payload.favorite_team || 'teamA';
    if (payload.handicap !== undefined) {
      const rawHandicap = Math.abs(payload.handicap);
      if (selectedFav === 'teamB') {
        payload.handicap = -rawHandicap;
        payload.favorite_team = 'teamB';
      } else {
        payload.handicap = rawHandicap;
        payload.favorite_team = 'teamA';
      }
    }

    let error;
    if (id) {
      if (payload.status === 'scheduled') {
        payload.score_a = 0;
        payload.score_b = 0;
      }
      const { error: err } = await supabase.from('matches').update(payload).eq('id', id);
      error = err;
    } else {
      const { error: err } = await supabase.from('matches').insert([payload]);
      error = err;
    }
    if (!error) {
      setEditingMatch(null);
      setIsAdding(false);
      fetchMatches();
      alert('Đã lưu thành công!');
    }
  };

  const handleUpdateBettingStatus = async (matchId: string, status: string) => {
    let value: boolean | null = null;
    if (status === 'open') value = true;
    else if (status === 'closed') value = false;

    const { error } = await supabase
      .from('matches')
      .update({ betting_open: value })
      .eq('id', matchId);

    if (!error) {
      fetchMatches();
    } else {
      alert(`Lỗi khi cập nhật trạng thái cược: ${error.message}`);
    }
  };

  const handleSetWinner = async (teamName: string) => {
    if (!window.confirm(`Xác nhận đội ${teamName} là nhà vô địch?`)) return;

    try {
      const { error } = await supabase
        .from('outright_winner')
        .upsert({
          id: 1,
          team_name: teamName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      alert(`Đã đặt ${teamName} là nhà vô địch thành công!`);
    } catch (err: any) {
      console.error('Lỗi khi set đội vô địch:', err);
      alert(`LỖI: ${err.message || 'Không thể lưu dữ liệu. Hãy kiểm tra lại bảng outright_winner trong Supabase.'}`);
    }
  };

  const handleDeleteWinner = async () => {
    if (!window.confirm('Xóa dữ liệu đội vô địch và reset giải đấu?')) return;
    const { error } = await supabase.from('outright_winner').delete().gt('id', -1);
    if (!error) {
      alert('Đã xóa dữ liệu vô địch thành công!');
    } else {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleQuickUpdateResult = async (match: Match) => {
    const scores = localScores[match.id];
    if (!scores) return;
    await supabase.from('matches').update({ score_a: scores.a, score_b: scores.b, status: 'finished' }).eq('id', match.id);
    setLocalScores(prev => { const next = { ...prev }; delete next[match.id]; return next; });
    fetchMatches();
  };

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Xóa trận đấu?')) return;
    await supabase.from('matches').delete().eq('id', id);
    fetchMatches();
  };

  const handleResetMatch = async (matchId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn reset trận đấu này về "Sắp đá"? Mọi tỷ số và lượt cược bên ngoài của trận đấu này sẽ bị xóa!')) return;

    const { error: matchErr } = await supabase
      .from('matches')
      .update({
        status: 'scheduled',
        score_a: 0,
        score_b: 0
      })
      .eq('id', matchId);

    if (matchErr) {
      alert(`Lỗi reset trận: ${matchErr.message}`);
      return;
    }

    const { error: betErr } = await supabase
      .from('bets')
      .delete()
      .eq('match_id', matchId);

    if (betErr) {
      alert(`Lỗi xóa cược: ${betErr.message}`);
    } else {
      alert('Đã reset trận đấu thành công!');
    }
    fetchMatches();
  };

  const exportToCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMatchBets = async (match: Match) => {
    try {
      const { data: matchBets, error } = await supabase
        .from('bets')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!matchBets || matchBets.length === 0) {
        alert('Trận đấu này chưa có ai dự đoán!');
        return;
      }

      let csv = 'ID Lượt dự đoán,Tài Khoản,Lựa Chọn,Gía Trị,Tỷ Lệ ,Kết Quả ,Thực  (LN/TL),Thời Gian Dự Đoán\n';

      matchBets.forEach(b => {
        const isTeamA = b.option === 'teamA' || b.option === match.team_a_name;
        const chosenTeamName = isTeamA ? match.team_a_name : match.team_b_name;
        const rate = isTeamA ? match.rate_a : match.rate_b;

        let statusStr = 'Đang chờ';
        let payoutStr = '0';

        if (match.status === 'finished') {
          const res = calculateBetResult(
            b.option,
            b.amount,
            match.score_a,
            match.score_b,
            {
              handicap: match.handicap,
              rateA: match.rate_a,
              rateB: match.rate_b,
              teamAName: match.team_a_name,
              teamBName: match.team_b_name
            }
          );
          statusStr = getOutcomeLabel(res.outcome);
          payoutStr = res.payout > 0 ? `+${res.payout}` : `${res.payout}`;
        }

        const timeStr = new Date(b.created_at).toLocaleString('vi-VN');
        const escapedName = b.user_name.includes(',') ? `"${b.user_name}"` : b.user_name;
        const escapedTeamName = chosenTeamName.includes(',') ? `"${chosenTeamName}"` : chosenTeamName;

        csv += `${b.id},${escapedName},${escapedTeamName},${b.amount},${rate}%,${statusStr},${payoutStr},${timeStr}\n`;
      });

      const fileName = `Bets_${match.team_a_name}_vs_${match.team_b_name}.csv`;
      exportToCSV(csv, fileName);
    } catch (err: any) {
      alert('Lỗi xuất cược: ' + err.message);
    }
  };

  const filteredMatches = matches.filter(m => {
    if (m.id === 'WORLD_CUP_2026_WINNER_REF') return false;
    if (filter === 'live') return m.status === 'live';
    if (filter === 'date' && selectedDate) return new Date(m.start_time).toLocaleDateString('vi-VN') === selectedDate;
    if (filter === 'unplayed' && selectedDate) {
      const matchDate = new Date(m.start_time).toLocaleDateString('vi-VN');
      return matchDate === selectedDate && m.status === 'scheduled';
    }
    return true;
  });

  const uniqueDates = [...new Set(matches.map(m => new Date(m.start_time).toLocaleDateString('vi-VN')))].sort((a, b) => {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  const getWeekday = (dateStr: string) => {
    const [d, m, y] = dateStr.split('/').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['CH', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
    return days[date.getDay()];
  };

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none";
  const labelCls = "block text-[10px] font-black text-slate-500 mb-1 uppercase";

  // 18:00 local time 16/06/2026 is 2026-06-16T11:00:00Z
  const CUTOFF_TIME = new Date('2026-06-16T11:00:00.000Z').getTime();

  const adminStats = useMemo(() => {
    // Filter matches that are finished, not Futsal, starting after the CUTOFF_TIME
    const targetMatches = matches.filter(m =>
      m.status === 'finished' &&
      m.league !== 'TIP Futsal league' &&
      new Date(m.start_time).getTime() >= CUTOFF_TIME
    );

    const targetMatchIds = targetMatches.map(m => m.id);
    const targetBets = allBets.filter(b => targetMatchIds.includes(b.match_id));

    let totalBetsAmount = 0;
    let totalPayout = 0;

    targetBets.forEach(bet => {
      const match = targetMatches.find(m => m.id === bet.match_id);
      if (!match) return;

      const res = calculateBetResult(
        bet.option,
        bet.amount,
        match.score_a,
        match.score_b,
        {
          handicap: match.handicap,
          rateA: match.rate_a,
          rateB: match.rate_b,
          teamAName: match.team_a_name,
          teamBName: match.team_b_name
        }
      );

      totalBetsAmount += bet.amount;
      totalPayout += res.payout;
    });

    // Filter refunds that occurred after CUTOFF_TIME
    const targetRefunds = refunds.filter(r =>
      new Date(r.refunded_at).getTime() >= CUTOFF_TIME
    );
    const totalRefundsAmount = targetRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // House profit/loss = -totalPayout - totalRefundsAmount
    const houseProfit = -totalPayout - totalRefundsAmount;

    return {
      totalBetsAmount,
      totalPayout,
      totalRefundsAmount,
      houseProfit,
      matchesCount: targetMatches.length,
      betsCount: targetBets.length
    };
  }, [matches, allBets, refunds]);

  const remainingFund = contributedValue + adminStats.houseProfit;

  return (

    <div className="min-h-screen bg-[#080808] relative overflow-hidden text-white font-sans">
      {/* BACKGROUND STADIUM */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 blur-sm pointer-events-none" style={{ backgroundImage: 'url("/world_cup_bg.png")' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />

      <div className="relative z-10 max-w-5xl mx-auto px-3 md:px-6 py-6 md:py-10">

        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-xl border border-white/20 shrink-0">⚙️</div>
            <h1 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic">QUẢN LÝ <span className="text-emerald-500">TRẬN ĐẤU</span></h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex bg-black/40 backdrop-blur-xl p-1 rounded-full border border-white/10">
              <button onClick={() => setActiveTab('matches')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${activeTab === 'matches' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Trận Đấu</button>
              <button onClick={() => setActiveTab('outright')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${activeTab === 'outright' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Vô Địch</button>
            </div>
            <button onClick={() => setAdminAuthenticated(false)} className="px-4 md:px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">THOÁT</button>
            <button onClick={() => setIsAdding(true)} className="px-4 md:px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/40">+ THÊM</button>
          </div>
        </div>

        {activeTab === 'matches' ? (
          <div className="space-y-8">
            {/* HOUSE PROFIT/LOSS SUMMARY (SINCE 18:00 16/06) */}
            <div className="bg-gradient-to-br from-indigo-950/20 via-slate-900/50 to-black/40 rounded-3xl border border-white/10 p-5 md:p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    📊 Thống kê tài chính admin
                  </span>
                  <h3 className="text-base font-black text-white uppercase tracking-tight italic">
                    Tổng <span className="text-emerald-500">(Từ 18h00 ngày 16/06)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tính từ sau trận Iran vs New Zealand (không tính các trận và hoàn điểm trước thời điểm này)
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-slate-400 text-[11px] font-bold">
                  <div>Đóng góp: <span className="text-white font-black">{adminStats.matchesCount} trận</span></div>
                  <div className="w-[1px] h-3 bg-white/10" />
                  <div>Lượt: <span className="text-white font-black">{adminStats.betsCount}</span></div>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tổng  */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Tổng </p>
                  <p className="text-lg md:text-xl font-black text-white mt-1 font-mono">{formatVND(adminStats.totalBetsAmount)}</p>
                </div>

                {/* Thặng dư */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Thặng dư</p>
                  <p className={`text-lg md:text-xl font-black mt-1 font-mono ${adminStats.totalPayout >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {adminStats.totalPayout > 0 ? '+' : ''}{formatVND(adminStats.totalPayout)}
                  </p>
                </div>

                {/* Hoàn bảo hiểm */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Bảo hiểm đã hoàn</p>
                  <p className="text-lg md:text-xl font-black text-amber-400 mt-1 font-mono">{formatVND(adminStats.totalRefundsAmount)}</p>
                </div>

                {/* Thặng dư Host */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-center bg-gradient-to-br from-black/60 to-emerald-950/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Thặng dư host (Thực tế)</p>
                  <p className={`text-lg md:text-xl font-black mt-1 font-mono ${adminStats.houseProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {adminStats.houseProfit > 0 ? '+' : ''}{formatVND(adminStats.houseProfit)}
                  </p>
                </div>
              </div>

              {/* Fund Section */}
              <div className="relative z-10 mt-5 pt-5 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* (Input) */}
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                  <label htmlFor="contributed-fund-input" className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">
                    Input
                  </label>
                  <div className="relative flex items-center mt-1">
                    <input
                      id="contributed-fund-input"
                      type="text"
                      value={contributedInput}
                      onChange={handleContributedChange}
                      placeholder="Nhập ..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-base font-black text-white outline-none focus:border-emerald-500/50 transition-all font-mono text-center"
                    />
                    {contributedValue > 0 && (
                      <span className="absolute right-4 text-xs font-bold text-slate-500 pointer-events-none">

                      </span>
                    )}
                  </div>
                </div>

                {/* Còn lại (Display) */}
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center flex flex-col justify-between bg-gradient-to-br from-black/60 to-indigo-950/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500/10 rounded-bl-full pointer-events-none" />
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Còn lại</p>
                  <p className={`text-lg md:text-xl font-black mt-3.5 font-mono ${remainingFund >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {remainingFund > 0 ? '+' : ''}{formatVND(remainingFund)}
                  </p>
                </div>
              </div>
            </div>

            {/* DATE SCROLLER BAR */}
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl md:rounded-[40px] border border-white/10 p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              {/* Filter buttons row */}
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex p-1 bg-black/40 rounded-full border border-white/5">
                  <button onClick={() => setFilter('date')} className={`px-3 md:px-5 py-2 rounded-full text-[9px] font-black uppercase ${filter === 'date' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>THEO NGÀY</button>
                  <button onClick={() => setFilter('unplayed')} className={`px-3 md:px-5 py-2 rounded-full text-[9px] font-black uppercase ${filter === 'unplayed' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>CHƯA ĐÁ</button>
                  <button onClick={() => setFilter('live')} className={`px-3 md:px-5 py-2 rounded-full text-[9px] font-black uppercase ${filter === 'live' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>ĐANG ĐÁ</button>
                  <button onClick={() => setFilter('all')} className={`px-3 md:px-5 py-2 rounded-full text-[9px] font-black uppercase ${filter === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>TẤT CẢ</button>
                </div>
                <button onClick={fetchMatches} className="w-8 h-8 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/20 text-xs shrink-0">🔄</button>
              </div>

              {/* Date scroller row */}
              <div className={`flex-1 flex items-center gap-2 md:gap-3 relative overflow-hidden group ${(filter !== 'date' && filter !== 'unplayed') ? 'invisible pointer-events-none' : ''}`}>
                <button onClick={() => scrollerRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} className="p-1 opacity-40 hover:opacity-100 transition-opacity shrink-0">◀</button>
                <div ref={scrollerRef} className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1">
                  {uniqueDates.map(d => {
                    const isActive = selectedDate === d && (filter === 'date' || filter === 'unplayed');
                    return (
                      <button key={d} onClick={() => { setSelectedDate(d); }} className={`min-w-[55px] md:min-w-[65px] h-12 md:h-14 rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all border ${isActive ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-900/40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                        <span className="text-[7px] font-black opacity-60 uppercase mb-0.5">{getWeekday(d)}</span>
                        <span className="text-xs md:text-sm font-black">{d.split('/')[0]}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => scrollerRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} className="p-1 opacity-40 hover:opacity-100 transition-opacity shrink-0">▶</button>
              </div>
            </div>

            {/* ADD/EDIT FORM */}
            {(isAdding || editingMatch?.id) && (
              <div className="bg-[#111]/90 backdrop-blur-3xl border border-white/10 rounded-3xl md:rounded-[40px] p-5 md:p-10 animate-in fade-in zoom-in-95">
                <h2 className="text-lg md:text-xl font-black mb-6 md:mb-8 uppercase text-center italic">{editingMatch?.id ? 'CHỈNH SỬA TRẬN ĐẤU' : 'THÊM TRẬN ĐẤU MỚI'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-[10px] font-black text-emerald-500 italic">ĐÔI A</p>
                    <input className={inputCls} placeholder="Tên Đội A" value={editingMatch?.team_a_name || ''} onChange={e => setEditingMatch({ ...editingMatch, team_a_name: e.target.value })} />
                    <input className={inputCls} placeholder="Mã Cờ (vd: br, ar, vn)" value={editingMatch?.team_a_code || ''} onChange={e => setEditingMatch({ ...editingMatch, team_a_code: e.target.value.toLowerCase() })} />
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-[10px] font-black text-rose-500 italic">ĐỘI B</p>
                    <input className={inputCls} placeholder="Tên Đội B" value={editingMatch?.team_b_name || ''} onChange={e => setEditingMatch({ ...editingMatch, team_b_name: e.target.value })} />
                    <input className={inputCls} placeholder="Mã Cờ (vd: fr, de, en)" value={editingMatch?.team_b_code || ''} onChange={e => setEditingMatch({ ...editingMatch, team_b_code: e.target.value.toLowerCase() })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-6 md:mt-8">
                  <div>
                    <label className={labelCls}>Kèo được chấp - {editingMatch?.team_a_name || 'Đội A'}</label>
                    <input
                      type="number"
                      step="0.25"
                      className={inputCls}
                      placeholder="Trống = Cửa Trên"
                      value={(editingMatch?.handicap !== undefined && (editingMatch.handicap < 0 || editingMatch.favorite_team === 'teamB') && editingMatch.handicap !== 0) ? Math.abs(editingMatch.handicap) : ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val === 0) {
                          setEditingMatch({
                            ...editingMatch,
                            handicap: 0,
                            favorite_team: 'teamA'
                          });
                        } else {
                          setEditingMatch({
                            ...editingMatch,
                            favorite_team: 'teamB',
                            handicap: -Math.abs(val)
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Kèo được chấp - {editingMatch?.team_b_name || 'Đội B'}</label>
                    <input
                      type="number"
                      step="0.25"
                      className={inputCls}
                      placeholder="Trống = Cửa Trên"
                      value={(editingMatch?.handicap !== undefined && editingMatch.handicap > 0 && editingMatch.favorite_team === 'teamA') ? Math.abs(editingMatch.handicap) : ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val === 0) {
                          setEditingMatch({
                            ...editingMatch,
                            handicap: 0,
                            favorite_team: 'teamA'
                          });
                        } else {
                          setEditingMatch({
                            ...editingMatch,
                            favorite_team: 'teamA',
                            handicap: Math.abs(val)
                          });
                        }
                      }}
                    />
                  </div>
                  <div><label className={labelCls}>Ăn A</label><input type="number" step="0.01" className={inputCls} value={editingMatch?.rate_a || 1} onChange={e => setEditingMatch({ ...editingMatch, rate_a: parseFloat(e.target.value) })} /></div>
                  <div><label className={labelCls}>Ăn B</label><input type="number" step="0.01" className={inputCls} value={editingMatch?.rate_b || 1} onChange={e => setEditingMatch({ ...editingMatch, rate_b: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="mt-6 md:mt-8 flex gap-3 md:gap-4">
                  <button onClick={handleSaveMatch} className="flex-1 bg-emerald-600 py-3 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm">LƯU TRẬN ĐẤU</button>
                  {editingMatch?.id && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (editingMatch.id) {
                          await handleResetMatch(editingMatch.id);
                          setEditingMatch(null);
                          setIsAdding(false);
                        }
                      }}
                      className="px-6 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 text-amber-400 hover:text-white py-3 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm transition-all"
                    >
                      Reset
                    </button>
                  )}
                  <button onClick={() => { setIsAdding(false); setEditingMatch(null); }} className="px-6 md:px-10 bg-white/5 py-3 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm">HỦY</button>
                </div>
              </div>
            )}

            {/* MATCH LIST */}
            <div className="grid grid-cols-1 gap-4">
              {filteredMatches.map(m => {
                const isLive = m.status === 'live' || (m.status !== 'finished' && new Date(m.start_time) <= new Date());
                const mStatus = isLive ? 'live' : m.status;
                return (
                  <div key={m.id} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl md:rounded-[35px] p-4 md:p-6 group hover:bg-white/[0.08] transition-all">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-8">
                      <div className="flex items-center gap-3 md:gap-5">
                        {/* FLAGS & SCORE VERTICAL */}
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-10 h-10 md:w-14 md:h-14 bg-black/40 rounded-xl md:rounded-2xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform shrink-0"><img src={`https://flagcdn.com/w160/${m.team_a_code?.toLowerCase()}.png`} className="w-full h-full object-cover" /></div>
                          <div className="flex flex-col gap-1 items-center bg-black/60 p-1 md:p-1.5 rounded-lg md:rounded-xl border border-white/10 min-w-[28px] md:min-w-[32px]">
                            <input type="number" className="w-7 md:w-8 h-5 md:h-6 bg-transparent text-[10px] md:text-[11px] font-black text-emerald-400 text-center outline-none" value={localScores[m.id]?.a ?? m.score_a} onChange={e => setLocalScores({ ...localScores, [m.id]: { a: parseInt(e.target.value), b: localScores[m.id]?.b ?? m.score_b } })} />
                            <div className="w-3 md:w-4 h-[1px] bg-white/10" />
                            <input type="number" className="w-7 md:w-8 h-5 md:h-6 bg-transparent text-[10px] md:text-[11px] font-black text-emerald-400 text-center outline-none" value={localScores[m.id]?.b ?? m.score_b} onChange={e => setLocalScores({ ...localScores, [m.id]: { a: localScores[m.id]?.a ?? m.score_a, b: parseInt(e.target.value) } })} />
                          </div>
                          <div className="w-10 h-10 md:w-14 md:h-14 bg-black/40 rounded-xl md:rounded-2xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform shrink-0"><img src={`https://flagcdn.com/w160/${m.team_b_code?.toLowerCase()}.png`} className="w-full h-full object-cover" /></div>
                        </div>
                        {/* TEAM INFO */}
                        <div className="min-w-0">
                          <h3 className="text-xs md:text-base font-black text-white group-hover:text-emerald-400 transition-colors uppercase italic tracking-tight truncate">{m.team_a_name} <span className="text-[9px] md:text-[10px] opacity-40 mx-0.5 md:mx-1">vs</span> {m.team_b_name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-4 mt-1 md:mt-1.5">
                            <span className="text-[8px] md:text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-indigo-500/20 uppercase tracking-widest">KÈO: {m.handicap}</span>
                            <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest ${isLive ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>{mStatus}</span>
                            <span className="text-[8px] md:text-[9px] font-black text-slate-500 italic tracking-widest opacity-60">{new Date(m.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      {/* ACTIONS */}
                      <div className="flex gap-2 md:gap-3 justify-end md:justify-start shrink-0">
                        {localScores[m.id] && <button onClick={() => handleQuickUpdateResult(m)} className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-emerald-500 text-black rounded-full shadow-lg shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all text-[10px] md:text-xs">✅</button>}
                        <button onClick={() => setEditingMatch(m)} className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all text-[10px] md:text-xs" title="Sửa trận đấu">✏️</button>
                        <button
                          onClick={() => handleExportMatchBets(m)}
                          title="Xuất Excel cược trận này"
                          className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-white/10 hover:bg-emerald-600 hover:text-white rounded-full border border-white/10 transition-all text-[10px] md:text-xs"
                        >
                          📥
                        </button>
                        <button onClick={() => handleDeleteMatch(m.id)} className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-white/10 hover:bg-rose-500 hover:text-white rounded-full border border-white/10 transition-all text-[10px] md:text-xs" title="Xóa trận đấu">🗑️</button>
                        {m.status === 'finished' && (
                          <button
                            onClick={() => handleResetMatch(m.id)}
                            className="px-3 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 text-amber-400 hover:text-white rounded-full text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all"
                          >
                            Reset
                          </button>
                        )}
                        {m.status !== 'finished' && (
                          <div className="flex items-center">
                            <select
                              value={m.betting_open === true ? 'open' : (m.betting_open === false ? 'closed' : 'auto')}
                              onChange={(e) => handleUpdateBettingStatus(m.id, e.target.value)}
                              className="bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[9px] md:text-[11px] font-black text-slate-300 focus:border-emerald-500 outline-none cursor-pointer hover:border-white/20 transition-colors h-9 md:h-11"
                            >
                              <option value="auto">🔄 Tự động (30m)</option>
                              <option value="open">🟢 Mở cược (Ghi đè)</option>
                              <option value="closed">🔴 Đóng cược (Ghi đè)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* OUTRIGHT WINNER TAB */
          <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl md:rounded-[40px] p-5 md:p-10 animate-in fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-10 gap-4 md:gap-6 border-b border-white/5 pb-4 md:pb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                <h2 className="text-base md:text-xl font-black uppercase tracking-widest text-emerald-500 italic">CÀI ĐẶT NHÀ VÔ ĐỊCH</h2>
              </div>
              <button onClick={handleDeleteWinner} className="px-4 md:px-6 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-full text-[9px] md:text-[10px] font-black uppercase transition-all shadow-lg hover:shadow-rose-900/40">
                ⚠️ HỦY VÔ ĐỊCH
              </button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
              {ALL_TEAMS.map(team => (
                <button key={team} onClick={() => handleSetWinner(team)} className="bg-white/5 border border-white/5 py-3 md:py-4 px-2 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase hover:bg-emerald-600 transition-all truncate text-slate-400 hover:text-white">
                  {team}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
