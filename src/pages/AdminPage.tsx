import React, { useState, useEffect, useRef, useContext } from 'react';
import { Match } from '../types';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';

const AdminPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'date' | 'live' | 'all'>('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [localScores, setLocalScores] = useState<Record<string, { a: number, b: number }>>({});

  const scrollerRef = useRef<HTMLDivElement>(null);
  const ctx = useContext(AppContext);
  if (!ctx) return null;
  const { setAdminAuthenticated } = ctx;

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
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
        const startingDate = dates.find(d => d.startsWith('12/06')) || dates[0];
        setSelectedDate(startingDate);
      }
    }
    setLoading(false);
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;

    // Extract ONLY the fields that should go to the DB
    const payload = {
      team_a_name: editingMatch.team_a_name,
      team_b_name: editingMatch.team_b_name,
      team_a_icon: editingMatch.team_a_icon || '⚽',
      team_b_icon: editingMatch.team_b_icon || '⚽',
      team_a_code: editingMatch.team_a_code,
      team_b_code: editingMatch.team_b_code,
      stadium: editingMatch.stadium,
      league: editingMatch.league,
      start_time: editingMatch.start_time,
      commentator: editingMatch.commentator,
      status: editingMatch.status,
      handicap: editingMatch.handicap,
      rate_a: editingMatch.rate_a,
      rate_b: editingMatch.rate_b,
      score_a: editingMatch.score_a,
      score_b: editingMatch.score_b,
      favorite_team: editingMatch.favorite_team
    };

    const id = editingMatch.id;
    let error;

    if (id) {
      const { error: err } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('matches')
        .insert([payload]);
      error = err;
    }

    if (!error) {
      setEditingMatch(null);
      setIsAdding(false);
      fetchMatches();
      alert('Đã lưu thành công!');
    } else {
      console.error('Supabase Save Error:', error);
      alert(`Lỗi (${error.code}): ${error.message}`);
    }
  };

  const handleQuickUpdateResult = async (match: Match) => {
    const scores = localScores[match.id];
    if (!scores) return;

    const { error } = await supabase
      .from('matches')
      .update({
        score_a: scores.a,
        score_b: scores.b,
        status: 'finished'
      })
      .eq('id', match.id);

    if (!error) {
      alert(`Đã cập nhật tỷ số trận ${match.team_a_name} - ${match.team_b_name}`);
      // Clear local buffer to let DB values take over
      setLocalScores(prev => {
        const next = { ...prev };
        delete next[match.id];
        return next;
      });
      fetchMatches();
    } else {
      console.error('Quick Update Error:', error);
      alert(`Lỗi (${error.code}): ${error.message}`);
    }
  };

  const handleResetMatch = async (match: Match) => {
    if (!window.confirm(`Bạn có chắc muốn đưa trận ${match.team_a_name} - ${match.team_b_name} về trạng thái chờ? (Tỷ số sẽ bị xóa)`)) return;

    const { error } = await supabase
      .from('matches')
      .update({
        score_a: 0,
        score_b: 0,
        status: 'scheduled'
      })
      .eq('id', match.id);

    if (!error) {
      fetchMatches();
    } else {
      console.error('Reset Match Error:', error);
      alert(`Lỗi (${error.code}): ${error.message}`);
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa trận đấu này?')) return;
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (!error) {
      fetchMatches();
    } else {
      console.error('Delete Match Error:', error);
      alert(`Lỗi (${error.code}): ${error.message}`);
    }
  };

  const uniqueDates = [...new Set(matches.map(m => new Date(m.start_time).toLocaleDateString('vi-VN')))].sort((a, b) => {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  const filteredMatches = matches.filter(m => {
    if (filter === 'live') return m.status === 'live';
    if (filter === 'date' && selectedDate) {
      return new Date(m.start_time).toLocaleDateString('vi-VN') === selectedDate;
    }
    if (filter === 'all') return true;
    return true;
  });

  const scrollPrev = () => {
    scrollerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollNext = () => {
    scrollerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 outline-none transition-all focus:bg-white/10";
  const labelCls = "block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider";

  // Convert UTC ISO string → local datetime-local input value (YYYY-MM-DDTHH:mm)
  const toLocalDatetime = (isoStr: string) => {
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  // Convert datetime-local input value → UTC ISO string
  const toUTCIso = (localStr: string) => new Date(localStr).toISOString();

  return (
    <div className="min-h-screen relative overflow-hidden text-white pb-24 px-6 pt-12">
      {/* Immersive Background */}
      <div
        className="fixed inset-0 z-0 opacity-40 blur-sm pointer-events-none"
        style={{
          backgroundImage: 'url("/world_cup_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black uppercase tracking-widest text-emerald-400 drop-shadow-lg flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 rounded-xl shadow-inner">⚙️</span>
            Quản Lý Trận Đấu
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAdminAuthenticated(false)}
              className="bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold px-6 py-3 rounded-xl transition-all border border-white/5 uppercase tracking-wider"
            >
              Thoát Admin
            </button>
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingMatch({
                  team_a_name: '',
                  team_b_name: '',
                  team_a_code: '',
                  team_b_code: '',
                  status: 'scheduled',
                  handicap: 0,
                  rate_a: 90,
                  rate_b: 90,
                  score_a: 0,
                  score_b: 0,
                  start_time: new Date().toISOString(),
                  favorite_team: 'teamA'
                });
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-95 uppercase tracking-wider"
            >
              + Thêm Trận Mới
            </button>
          </div>
        </div>

        {/* Modal-ish Form */}
        {(isAdding || editingMatch?.id) && (
          <div className="bg-[#1e293b]/90 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-10 mb-12 shadow-2xl animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500" />

            <h2 className="text-2xl font-black mb-10 flex items-center justify-center gap-4">
              <span className="w-12 h-1 bg-emerald-500 rounded-full" />
              {editingMatch?.id ? 'CHỈNH SỬA TRẬN ĐẤU' : 'THÊM TRẬN ĐẤU MỚI'}
              <span className="w-12 h-1 bg-rose-500 rounded-full" />
            </h2>

            {/* Battle Layout - 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
              {/* VS Divider */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 z-0 pointer-events-none opacity-20">
                <div className="w-[1px] h-64 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                <span className="text-4xl font-black text-white italic">VS</span>
                <div className="w-[1px] h-64 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
              </div>

              {/* TEAM A COLUMN */}
              <div className="space-y-6 relative z-10 bg-emerald-500/5 p-6 rounded-[32px] border border-emerald-500/10">
                <div className="flex items-center gap-3 mb-2 underline decoration-emerald-500/30 underline-offset-8">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Đội A (TRÊN)</h3>
                </div>

                <div>
                  <label className={labelCls}>Tên Đội</label>
                  <input
                    className={inputCls}
                    placeholder="Nhập tên đội..."
                    value={editingMatch?.team_a_name || ''}
                    onChange={e => setEditingMatch(prev => ({ ...prev, team_a_name: e.target.value }))}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className={labelCls}>Mã QG (Flag)</label>
                    <input
                      className={inputCls}
                      placeholder="Mã ISO (mx, za...)"
                      value={editingMatch?.team_a_code || ''}
                      onChange={e => setEditingMatch(prev => ({ ...prev, team_a_code: e.target.value.toLowerCase() }))}
                    />
                  </div>
                  <div className="w-14 h-11 mt-6 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                    {editingMatch?.team_a_code ? (
                      <img src={`https://flagcdn.com/w40/${editingMatch.team_a_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                    ) : '🏁'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Kèo Chấp (0 nếu chấp)</label>
                    <input
                      className={inputCls}
                      type="number"
                      step="0.25"
                      placeholder="0.0"
                      value={editingMatch?.favorite_team === 'teamB' ? editingMatch?.handicap : 0}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (val > 0) {
                          setEditingMatch(prev => ({ ...prev, favorite_team: 'teamB', handicap: val }));
                        } else {
                          setEditingMatch(prev => ({ ...prev, favorite_team: 'teamA', handicap: 0 }));
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Tỉ số A</label>
                    <input
                      className={inputCls}
                      type="number"
                      value={editingMatch?.score_a ?? 0}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setEditingMatch(prev => ({ ...prev, score_a: isNaN(val) ? 0 : val }));
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Tỷ lệ ăn A (%)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={editingMatch?.rate_a || 0}
                    onChange={e => setEditingMatch(prev => ({ ...prev, rate_a: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* TEAM B COLUMN */}
              <div className="space-y-6 relative z-10 bg-rose-500/5 p-6 rounded-[32px] border border-rose-500/10">
                <div className="flex items-center gap-3 mb-2 underline decoration-rose-500/30 underline-offset-8">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                  <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest">Đội B (DƯỚI)</h3>
                </div>

                <div>
                  <label className={labelCls}>Tên Đội</label>
                  <input
                    className={inputCls}
                    placeholder="Nhập tên đội..."
                    value={editingMatch?.team_b_name || ''}
                    onChange={e => setEditingMatch(prev => ({ ...prev, team_b_name: e.target.value }))}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className={labelCls}>Mã QG (Flag)</label>
                    <input
                      className={inputCls}
                      placeholder="Mã ISO (mx, za...)"
                      value={editingMatch?.team_b_code || ''}
                      onChange={e => setEditingMatch(prev => ({ ...prev, team_b_code: e.target.value.toLowerCase() }))}
                    />
                  </div>
                  <div className="w-14 h-11 mt-6 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                    {editingMatch?.team_b_code ? (
                      <img src={`https://flagcdn.com/w40/${editingMatch.team_b_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                    ) : '🏁'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Kèo Chấp (0 nếu chấp)</label>
                    <input
                      className={inputCls}
                      type="number"
                      step="0.25"
                      placeholder="0.0"
                      value={editingMatch?.favorite_team === 'teamA' ? editingMatch?.handicap : 0}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (val > 0) {
                          setEditingMatch(prev => ({ ...prev, favorite_team: 'teamA', handicap: val }));
                        } else {
                          setEditingMatch(prev => ({ ...prev, favorite_team: 'teamB', handicap: 0 }));
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Tỉ số B</label>
                    <input
                      className={inputCls}
                      type="number"
                      value={editingMatch?.score_b ?? 0}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setEditingMatch(prev => ({ ...prev, score_b: isNaN(val) ? 0 : val }));
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Tỷ lệ ăn B (%)</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={editingMatch?.rate_b || 0}
                    onChange={e => setEditingMatch(prev => ({ ...prev, rate_b: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            {/* SHARED FIELDS */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-8">
              <div>
                <label className={labelCls}>Thời gian bắt đầu</label>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={editingMatch?.start_time ? toLocalDatetime(editingMatch.start_time) : ''}
                  onChange={e => setEditingMatch(prev => ({ ...prev, start_time: toUTCIso(e.target.value) }))}
                />
              </div>

              <div>
                <label className={labelCls}>Trạng thái</label>
                <div className="flex gap-2">
                  {['scheduled', 'live', 'finished'].map(s => (
                    <button
                      key={s}
                      onClick={() => setEditingMatch(prev => ({ ...prev, status: s }))}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingMatch?.status === s
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                        }`}
                    >
                      {s === 'scheduled' ? 'Sắp đá' : s === 'live' ? 'Đang đá' : 'Kết thúc'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button
                onClick={handleSaveMatch}
                className="flex-[2] bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black py-5 rounded-3xl shadow-xl transition-all uppercase tracking-[0.2em] active:scale-95 text-sm"
              >
                LƯU TRẬN ĐẤU
              </button>
              <button
                onClick={() => { setEditingMatch(null); setIsAdding(false); }}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-bold py-5 rounded-3xl transition-all active:scale-95 border border-white/5 uppercase tracking-widest text-xs"
              >
                HỦY
              </button>
            </div>
          </div>
        )}

        {/* List of matches */}
        <div className="space-y-6">
          <div className="flex flex-row items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-[32px] border border-white/10 mb-8 flex-wrap">
            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('date')}
                className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'date' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                Theo Ngày
              </button>
              <button
                onClick={() => setFilter('live')}
                className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'live' ? 'bg-rose-600 text-white shadow-xl animate-pulse' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                Đang Đá
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'all' ? 'bg-slate-700 text-white shadow-xl' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                Tất Cả
              </button>
              <button
                onClick={fetchMatches}
                className="ml-2 w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                title="Làm mới dữ liệu"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span>
              </button>
            </div>

            {/* Date Scroller */}
            {filter === 'date' && (
              <div className="relative flex-1 w-full max-w-lg group px-10">
                <button
                  onClick={scrollPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-emerald-500/20 rounded-full text-white/50 hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100"
                >
                  ◀
                </button>

                <div
                  ref={scrollerRef}
                  className="w-full overflow-x-auto no-scrollbar flex items-center gap-3 scroll-smooth py-1"
                >
                  {uniqueDates.map((date) => {
                    const [d, m] = date.split('/');
                    const dateObj = new Date(2024, parseInt(m) - 1, parseInt(d));
                    const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' });

                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center min-w-[56px] py-1.5 rounded-xl border transition-all ${selectedDate === date
                          ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                          }`}
                      >
                        <span className={`text-[11px] font-black uppercase ${selectedDate === date ? 'text-emerald-400' : 'text-slate-500'}`}>{dayName}</span>
                        <span className={`text-lg font-black leading-tight ${selectedDate === date ? 'text-white' : 'text-slate-300'}`}>{d}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={scrollNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-emerald-500/20 rounded-full text-white/50 hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100"
                >
                  ▶
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading && matches.length === 0 ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {filteredMatches.map(m => (
                  <div key={m.id} className="bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[28px] p-6 flex items-center justify-between hover:bg-white/10 transition-all group ring-1 ring-white/5">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 bg-slate-900 rounded-xl overflow-hidden border border-white/5">
                          {m.team_a_code ? (
                            <img src={`https://flagcdn.com/w80/${m.team_a_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                          ) : '🏁'}
                        </div>
                        <div className="flex flex-col items-center justify-center bg-slate-900/80 rounded-xl p-1 gap-1 border border-white/5">
                          <input
                            type="number"
                            className="w-8 h-6 bg-[#111] border border-white/5 rounded text-[11px] font-black text-center text-emerald-400 focus:border-emerald-500 outline-none"
                            placeholder="0"
                            value={localScores[m.id]?.a ?? (m.status === 'scheduled' ? '' : m.score_a)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setLocalScores(prev => ({
                                ...prev,
                                [m.id]: {
                                  a: isNaN(val) ? 0 : val,
                                  b: prev[m.id]?.b ?? m.score_b
                                }
                              }));
                            }}
                          />
                          <div className="w-4 h-[1px] bg-slate-700/50" />
                          <input
                            type="number"
                            className="w-8 h-6 bg-[#111] border border-white/5 rounded text-[11px] font-black text-center text-emerald-400 focus:border-emerald-500 outline-none"
                            placeholder="0"
                            value={localScores[m.id]?.b ?? (m.status === 'scheduled' ? '' : m.score_b)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setLocalScores(prev => ({
                                ...prev,
                                [m.id]: {
                                  a: prev[m.id]?.a ?? m.score_a,
                                  b: isNaN(val) ? 0 : val
                                }
                              }));
                            }}
                          />
                        </div>
                        <div className="w-12 h-12 bg-slate-900 rounded-xl overflow-hidden border border-white/5">
                          {m.team_b_code ? (
                            <img src={`https://flagcdn.com/w80/${m.team_b_code.toLowerCase()}.png`} alt="" className="w-full h-full object-cover" />
                          ) : '🏁'}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-100 mb-1 group-hover:text-emerald-400 transition-colors">
                          {m.team_a_name} <span className="text-slate-600 font-medium px-1">vs</span> {m.team_b_name}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase tracking-tighter">
                            Kèo: {m.handicap}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${m.status === 'live' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                            {m.status}
                          </span>
                          <span className="text-[10px] font-black text-slate-500">
                            {new Date(m.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {localScores[m.id] && (
                        <button
                          onClick={() => handleQuickUpdateResult(m)}
                          className="w-11 h-11 flex items-center justify-center bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 hover:scale-110 transition-all text-sm shadow-lg shadow-emerald-500/30"
                          title="Lưu tỷ số"
                        >
                          ✅
                        </button>
                      )}
                      {m.status === 'finished' && (
                        <button
                          onClick={() => handleResetMatch(m)}
                          className="w-11 h-11 flex items-center justify-center bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500/20 hover:scale-110 transition-all text-sm border border-amber-500/10"
                          title="Reset trận đấu"
                        >
                          🔄
                        </button>
                      )}
                      <button
                        onClick={() => setEditingMatch(m)}
                        className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 hover:scale-110 transition-all text-sm border border-white/5"
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(m.id)}
                        className="w-11 h-11 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 hover:scale-110 transition-all text-sm border border-rose-500/10"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {filteredMatches.length === 0 && (
                  <div className="text-center py-20 bg-white/5 rounded-[32px] border border-dashed border-white/10">
                    <p className="text-slate-600 text-sm font-bold uppercase tracking-widest">Không có trận đấu nào trong ngày này</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
