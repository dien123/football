import React, { useState, useEffect, useMemo, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Match, Bet, BetOption } from '../types';
import MatchCard from '../components/MatchCard';
import MatchDetail from '../components/MatchDetail';
import BetModal from '../components/BetModal';
import AuthModal from '../components/AuthModal';
import { AppContext } from '../App';
import { calculateBetResult } from '../utils/betLogic';
import { formatVND } from '../utils/format';

interface TeamStat {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

const FUTSAL_TEAMS = ['DC13', 'DC23', 'DC33', 'DC43'];

const FutsalLeaguePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'results'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [view, setView] = useState<'grid' | 'detail'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<BetOption>('teamA');
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const ctx = useContext(AppContext);
  if (!ctx) return null;
  const { session, user } = ctx;

  useEffect(() => {
    fetchFutsalData();
    const channel = supabase
      .channel('futsal-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchFutsalData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => fetchFutsalData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshTrigger]);

  const fetchFutsalData = async () => {
    setLoading(true);
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('league', 'TIP Futsal league')
      .order('start_time', { ascending: true });

    if (matchesData) {
      setMatches(matchesData);

      const finishedIds = matchesData.filter(m => m.status === 'finished').map(m => m.id);
      if (finishedIds.length > 0) {
        const { data: betsData } = await supabase
          .from('bets')
          .select('*')
          .in('match_id', finishedIds);
        setAllBets(betsData || []);
      }
    }
    setLoading(false);
  };

  const standings = useMemo(() => {
    const stats: Record<string, TeamStat> = {};
    FUTSAL_TEAMS.forEach(name => {
      stats[name] = { name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
    });

    matches.filter(m => m.status === 'finished').forEach(m => {
      const teamA = stats[m.team_a_name];
      const teamB = stats[m.team_b_name];
      if (!teamA || !teamB) return;

      teamA.played++; teamB.played++;
      teamA.gf += m.score_a; teamA.ga += m.score_b;
      teamB.gf += m.score_b; teamB.ga += m.score_a;

      if (m.score_a > m.score_b) { teamA.won++; teamA.points += 3; teamB.lost++; }
      else if (m.score_a < m.score_b) { teamB.won++; teamB.points += 3; teamA.lost++; }
      else { teamA.drawn++; teamB.drawn++; teamA.points += 1; teamB.points += 1; }
    });

    return Object.values(stats).sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  }, [matches]);

  const resultStats = useMemo(() => {
    const userStats: Record<string, any> = {};
    allBets.forEach(bet => {
      const match = matches.find(m => m.id === bet.match_id);
      if (!match) return;
      const res = calculateBetResult(bet.option, bet.amount, match.score_a, match.score_b, {
        handicap: match.handicap,
        rateA: match.rate_a,
        rateB: match.rate_b,
        teamAName: match.team_a_name,
        teamBName: match.team_b_name
      });
      if (!userStats[bet.user_name]) userStats[bet.user_name] = { name: bet.user_name, wins: 0, profit: 0 };
      if (res.outcome.includes('WIN')) userStats[bet.user_name].wins++;
      userStats[bet.user_name].profit += res.payout;
    });
    return Object.values(userStats).sort((a, b) => b.wins - a.wins || b.profit - a.profit);
  }, [allBets, matches]);

  const handleMatchClick = (id: string) => {
    const m = matches.find(x => x.id === id);
    if (m) { setSelectedMatch(m); setView('detail'); window.scrollTo(0, 0); }
  };

  const handleSaveBet = async (userName: string, amount: number, option: BetOption) => {
    if (!selectedMatch || !user) return;

    // Store actual team name
    const finalOption = option === 'teamA' ? selectedMatch.team_a_name : selectedMatch.team_b_name;

    const { error } = await supabase.from('bets').insert({
      match_id: selectedMatch.id, user_name: userName, amount, option: finalOption, user_id: user.id
    });
    if (error) alert(error.message);
    else { setModalOpen(false); setRefreshTrigger(t => t + 1); alert('Đặt  thành công!'); }
  };

  if (loading && matches.length === 0) return <div className="p-20 text-center text-emerald-500 font-bold">ĐANG TẢI...</div>;

  return (
    <div className="min-h-screen relative overflow-hidden text-white pb-20 bg-[#020617]">
      {/* Dynamic Background for Futsal - Deep Midnight Blue */}
      <div
        className="fixed inset-0 z-0 opacity-100"
        style={{
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #172554 100%)',
        }}
      />
      <div
        className="fixed inset-0 z-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #1d4ed8 0%, transparent 60%)',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="py-12 flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4  uppercase">TIP FUTSAL LEAGUE 2026</h1>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {(['matches', 'standings', 'results'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setView('grid'); }}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                {tab === 'matches' ? 'Trận Đấu' : tab === 'standings' ? 'Bảng Xếp Hạng' : 'Kết Quả'}
              </button>
            ))}
          </div>
        </div>

        {view === 'grid' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'matches' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {matches.map(m => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    onBet={handleMatchClick}
                    customClass="bg-white/15 border-2 border-white/20 hover:bg-white/25 hover:border-emerald-500/50 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                  />
                ))}
              </div>
            )}

            {activeTab === 'standings' && (
              <div className="bg-white/10 rounded-[32px] border-2 border-white/20 overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.05)] backdrop-blur-xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-black/40 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-6 py-5 w-16 text-center">#</th>
                      <th className="px-4 py-5">Đội Bóng</th>
                      <th className="px-4 py-5 text-center">Trận</th>
                      <th className="px-4 py-5 text-center">T - H - B</th>
                      <th className="px-4 py-5 text-center">HS</th>
                      <th className="px-6 py-5 text-center text-emerald-400">Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-bold text-[14px]">
                    {standings.map((t, idx) => (
                      <tr key={t.name} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-4 text-white uppercase italic font-black">{t.name}</td>
                        <td className="px-4 py-4 text-center text-slate-400">{t.played}</td>
                        <td className="px-4 py-4 text-center text-slate-400">{t.won} - {t.drawn} - {t.lost}</td>
                        <td className="px-4 py-4 text-center font-mono">{t.gf - t.ga > 0 ? `+${t.gf - t.ga}` : t.gf - t.ga}</td>
                        <td className="px-6 py-4 text-center text-emerald-400 text-lg font-black">{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'results' && (
              <div className="space-y-12">
                <div className="bg-white/10 rounded-[32px] border-2 border-white/20 overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.05)] backdrop-blur-xl">
                  <div className="bg-amber-500/10 px-8 py-5 border-b border-amber-500/20">
                    <h3 className="text-amber-500 font-black uppercase tracking-widest text-xs">Bảng Vàng Cao Thủ Futsal</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {resultStats.map((u, i) => (
                      <div key={u.name} className="px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">{i + 1}</span>
                          <span className="text-white font-black uppercase">{u.name}</span>
                        </div>
                        <div className="flex gap-8 items-center">
                          <div className="text-right"><div className="text-[10px] text-slate-500 uppercase font-black">Thắng</div><div className="text-white font-bold">{u.wins}</div></div>
                          <div className="text-right"><div className="text-[10px] text-slate-500 uppercase font-black">Tổng Lãi</div><div className={`font-mono font-bold ${u.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatVND(u.profit)}</div></div>
                        </div>
                      </div>
                    ))}
                    {resultStats.length === 0 && <div className="p-10 text-center text-slate-600 font-bold uppercase text-xs">Chưa có kết quả...</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          selectedMatch && (
            <MatchDetail
              match={selectedMatch}
              onBack={() => setView('grid')}
              onBet={(opt) => { if (!session) setAuthModalOpen(true); else { setSelectedOption(opt); setModalOpen(true); } }}
              onEditBet={() => { }}
              refreshTrigger={refreshTrigger}
              isAdmin={false}
              currentUserId={user?.id}
              currentFullName={user?.user_metadata?.full_name}
            />
          )
        )}
      </div>

      {selectedMatch && (
        <BetModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          match={selectedMatch}
          option={selectedOption}
          onSave={handleSaveBet}
          initialUserName={user?.user_metadata?.full_name}
        />
      )}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default FutsalLeaguePage;
