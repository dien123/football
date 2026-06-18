import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { Match, DC13Bet, DC13Profile } from '../types';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import DC13AuthModal from '../components/DC13AuthModal';
import { formatVND, normalizeBetAmount } from '../utils/format';

const PENALTY_AMOUNT = 5000;
const ADMIN_PIN = 'DC13123';
const INACTIVE_USERS = ['ThaoNguyen_DC13', 'Ân Nguyễn_DC13', 'ndhphuc_DC13'];

const DC13_TEAMS = [
  { name: "Argentina", code: "ar" },
  { name: "Pháp", code: "fr" },
  { name: "Brazil", code: "br" },
  { name: "Tây Ban Nha", code: "es" },
  { name: "Anh", code: "gb-eng" },
  { name: "Đức", code: "de" },
  { name: "Hà Lan", code: "nl" },
  { name: "Bồ Đào Nha", code: "pt" },
  { name: "Uruguay", code: "uy" },
  { name: "Bỉ", code: "be" },
  { name: "Croatia", code: "hr" },
  { name: "Colombia", code: "co" },
  { name: "Nhật Bản", code: "jp" },
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
  { name: "Jordan", code: "jo" },
  { name: "Uzbekistan", code: "uz" },
  { name: "Cape Verde", code: "cv" },
  { name: "New Zealand", code: "nz" },
  { name: "Haiti", code: "ht" },
  { name: "Curaçao", code: "cw" },
];

// ─── Helper: Check if betting is locked ──────────────────────────────────────
const isDC13BettingLocked = (match: Match): boolean => {
  const status = match.dc13_status || match.status || 'scheduled';
  if (status === 'finished') return true;
  if (!match.dc13_handicap_set) return true; // Khóa nếu chưa set kèo
  if (match.dc13_betting_open === true) return false;
  if (match.dc13_betting_open === false) return true;
  const LOCK_MINUTES = 30;
  const now = Date.now();
  const kick = new Date(match.start_time).getTime();
  return (kick - now) / 60000 <= LOCK_MINUTES;
};

// ─── Helper: Check if user is inactive (stopped playing but keeps data) ──────
const checkIsInactiveUser = async (userId: string, fullName: string | null, user: any): Promise<boolean> => {
  if (fullName && INACTIVE_USERS.includes(fullName)) return true;
  if (user?.user_metadata?.full_name && INACTIVE_USERS.includes(user.user_metadata.full_name)) return true;
  
  const { data: profile } = await supabase
    .from('dc13_profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
    
  if (profile?.full_name && INACTIVE_USERS.includes(profile.full_name)) {
    return true;
  }
  return false;
};

// ─── Player Stats Type ───────────────────────────────────────────────────────
interface PlayerStats {
  user_id?: string;
  user_name: string;
  total_bets: number;
  wins: number;
  losses: number;
  pending: number;
  total_penalty: number; // negative number
}

// ─── Skeleton Component for Match Card ──────────────────────────────────────
const MatchCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-pulse">
      {/* Skeleton header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between gap-3 bg-slate-900/20">
        <div className="flex items-center gap-2">
          {/* Status badge skeleton */}
          <div className="w-16 h-5 bg-slate-800 rounded-full animate-pulse" />
          {/* Time skeleton */}
          <div className="w-24 h-4 bg-slate-800/60 rounded" />
        </div>
        {/* Right badge skeleton */}
        <div className="w-20 h-5 bg-slate-800/60 rounded-full" />
      </div>

      {/* Teams display skeleton */}
      <div className="px-5 py-5 md:py-6">
        <div className="flex items-center justify-between gap-3">
          {/* Team A */}
          <div className="flex-1 flex flex-col items-center">
            {/* Flag flag skeleton */}
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800/80 rounded-2xl border border-white/5 mb-2" />
            {/* Team name skeleton */}
            <div className="w-20 h-4 bg-slate-800/80 rounded mb-1.5" />
            {/* Bet count skeleton */}
            <div className="w-12 h-3 bg-slate-800/60 rounded mb-1.5" />
            {/* Handicap skeleton */}
            <div className="w-24 h-4 bg-slate-800/60 rounded" />
          </div>

          {/* VS skeleton */}
          <div className="px-3 text-center">
            <div className="text-xl font-bold text-slate-700 italic">VS</div>
          </div>

          {/* Team B */}
          <div className="flex-1 flex flex-col items-center">
            {/* Flag flag skeleton */}
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800/80 rounded-2xl border border-white/5 mb-2" />
            {/* Team name skeleton */}
            <div className="w-20 h-4 bg-slate-800/80 rounded mb-1.5" />
            {/* Bet count skeleton */}
            <div className="w-12 h-3 bg-slate-800/60 rounded mb-1.5" />
            {/* Handicap skeleton */}
            <div className="w-24 h-4 bg-slate-800/60 rounded" />
          </div>
        </div>

        {/* Bet button skeleton */}
        <div className="w-full h-11 bg-slate-800/50 rounded-xl mt-4" />
      </div>
    </div>
  );
};

// ─── Skeleton Component for Admin Match Row ─────────────────────────────────
const AdminMatchRowSkeleton: React.FC = () => {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 md:p-5 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-10 h-10 bg-slate-800/80 rounded-xl border border-white/5" />
            <div className="w-10 h-10 bg-slate-800/80 rounded-xl border border-white/5" />
          </div>
          <div className="space-y-2">
            <div className="w-32 h-4 bg-slate-800/80 rounded" />
            <div className="flex gap-2">
              <div className="w-10 h-3.5 bg-slate-800/60 rounded-full" />
              <div className="w-20 h-3.5 bg-slate-800/60 rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end shrink-0">
          <div className="w-16 h-9 bg-slate-800/60 rounded-xl" />
          <div className="w-9 h-9 bg-slate-800/60 rounded-xl" />
          <div className="w-9 h-9 bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DC13Page Component
// ═══════════════════════════════════════════════════════════════════════════════
const DC13Page: React.FC = () => {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'matches' | 'stats' | 'rules' | 'admin' | 'outright'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<DC13Bet[]>([]);
  const [profiles, setProfiles] = useState<DC13Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);

  // Outright state variables
  const [outrightBets, setOutrightBets] = useState<any[]>([]);
  const [outrightWinner, setOutrightWinner] = useState<string | null>(null);
  const [outrightBettingOn, setOutrightBettingOn] = useState<any | null>(null);
  const [outrightSubmitting, setOutrightSubmitting] = useState(false);
  const [editingOutrightBet, setEditingOutrightBet] = useState<any | null>(null);
  const [editOutrightAmount, setEditOutrightAmount] = useState<number | ''>('');
  const [outrightSearch, setOutrightSearch] = useState('');
  const [showOutrightRules, setShowOutrightRules] = useState(false);

  // Date Filtering
  const [filter, setFilter] = useState<'date' | 'live' | 'all' | 'unplayed'>('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const adminScrollerRef = useRef<HTMLDivElement>(null);

  // Filter change handlers with local cardsLoading skeleton triggers
  const handleSelectDate = (date: string) => {
    if (date === selectedDate) return;
    setCardsLoading(true);
    setSelectedDate(date);
    setTimeout(() => {
      setCardsLoading(false);
    }, 350);
  };

  const handleFilterChange = (newFilter: 'date' | 'live' | 'all' | 'unplayed') => {
    if (newFilter === filter) return;
    setCardsLoading(true);
    setFilter(newFilter);
    setTimeout(() => {
      setCardsLoading(false);
    }, 350);
  };

  // Auth & modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingBetMatch, setPendingBetMatch] = useState<Match | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [betMatch, setBetMatch] = useState<Match | null>(null);
  //const [showRuleModal, setShowRuleModal] = useState(true);
  const [leaderboardTab, setLeaderboardTab] = useState<'standings' | 'overview'>('standings');

  // Admin
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [dc13KeoType, setDc13KeoType] = useState<'unset' | 'draw' | 'handicap'>('unset');
  const [handicapInputA, setHandicapInputA] = useState<string>('');
  const [handicapInputB, setHandicapInputB] = useState<string>('');
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [resultModal, setResultModal] = useState<Match | null>(null);
  const [resultScoreA, setResultScoreA] = useState<number>(0);
  const [resultScoreB, setResultScoreB] = useState<number>(0);

  const ctx = useContext(AppContext);
  if (!ctx) return null;
  const { session, user, fullName } = ctx;

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('start_time', { ascending: true });

    if (data) {
      // Exclude TIP Futsal league
      const wcMatches = data.filter(m => m.league !== 'TIP Futsal league');
      setMatches(wcMatches);
    }
  }, []);

  // Auto-set the initial selected date if not set yet, matching MatchPage behavior
  const initialDateSetRef = useRef(false);
  useEffect(() => {
    if (matches.length > 0 && !selectedDate && !initialDateSetRef.current) {
      initialDateSetRef.current = true;
      const wcDates = [...new Set(matches.map(m => new Date(m.start_time).toLocaleDateString('vi-VN')))].sort((a, b) => {
        const [da, ma, ya] = a.split('/').map(Number);
        const [db, mb, yb] = b.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      });

      const today = new Date();
      const parsedDates = wcDates.map(dStr => {
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

      const startingDate = startingDateObj?.str || wcDates[wcDates.length - 1] || wcDates[0];
      setSelectedDate(startingDate);
    }
  }, [matches, selectedDate]);

  const fetchBets = useCallback(async () => {
    const { data } = await supabase
      .from('dc13_bets')
      .select('*, dc13_profiles(full_name)')
      .order('created_at', { ascending: false });
    if (data) {
      const filtered = data.filter((b: any) =>
        b.user_name !== 'Lâm Mỹ Linh' &&
        b.dc13_profiles?.full_name !== 'Lâm Mỹ Linh'
      );
      setBets(filtered as any);
    }
  }, []);

  const fetchDC13OutrightData = useCallback(async () => {
    try {
      const { data: betsData } = await supabase
        .from('dc13_outright_bets')
        .select('*');
      if (betsData) {
        const filtered = betsData.filter((b: any) => b.user_name !== 'Lâm Mỹ Linh');
        setOutrightBets(filtered);
      }

      const { data: winData } = await supabase
        .from('dc13_outright_winner')
        .select('team_name')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (winData) {
        setOutrightWinner(winData.team_name);
      } else {
        setOutrightWinner(null);
      }
    } catch (err) {
      console.error('Error fetching dc13 outright data:', err);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('dc13_profiles')
      .select('*');
    if (data) {
      const filtered = data.filter((p: DC13Profile) => p.full_name !== 'Lâm Mỹ Linh');
      setProfiles(filtered as DC13Profile[]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMatches(), fetchBets(), fetchDC13OutrightData(), fetchProfiles()]).finally(() => setLoading(false));
  }, [fetchMatches, fetchBets, fetchDC13OutrightData, fetchProfiles]);

  // const handleCloseRuleModal = () => {
  //   setShowRuleModal(false);
  // };

  // Real-time changes listener
  useEffect(() => {
    const channelMatches = supabase
      .channel('public:matches_dc13')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    const channelBets = supabase
      .channel('public:dc13_bets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dc13_bets' }, () => {
        fetchBets();
      })
      .subscribe();

    const channelOutrightBets = supabase
      .channel('public:dc13_outright_bets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dc13_outright_bets' }, () => {
        fetchDC13OutrightData();
      })
      .subscribe();

    const channelOutrightWinner = supabase
      .channel('public:dc13_outright_winner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dc13_outright_winner' }, () => {
        fetchDC13OutrightData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelMatches);
      supabase.removeChannel(channelBets);
      supabase.removeChannel(channelOutrightBets);
      supabase.removeChannel(channelOutrightWinner);
    };
  }, [fetchMatches, fetchBets, fetchDC13OutrightData]);

  // ─── DC13 Profile auto-create ──────────────────────────────────────────────
  const ensureDC13Profile = async () => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('dc13_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const pName = fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';
      await supabase.from('dc13_profiles').insert({
        id: user.id,
        email: user.email || '',
        full_name: pName,
      });
      if (ctx?.refreshFullName) {
        await ctx.refreshFullName();
      }
    }
  };

  // ─── Outright Handlers & Calculations ──────────────────────────────────────
  const handlePlaceDC13OutrightBet = async () => {
    if (!outrightBettingOn || !user) {
      if (!user) setShowAuthModal(true);
      return;
    }
    const isInactive = await checkIsInactiveUser(user.id, fullName, user);
    if (isInactive) {
      alert('Tài khoản của bạn đã dừng tham gia giải đấu DC 13!');
      setOutrightBettingOn(null);
      return;
    }
    const alreadyBet = outrightBets.some(b => b.user_id === user.id && b.team_name === outrightBettingOn.name);
    if (alreadyBet) {
      alert(`Bạn đã dự đoán đội ${outrightBettingOn.name} rồi!`);
      setOutrightBettingOn(null);
      return;
    }
    setOutrightSubmitting(true);
    try {
      await ensureDC13Profile();
      const pName = fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Người dùng';
      const { error } = await supabase.from('dc13_outright_bets').insert([{
        user_id: user.id,
        user_name: pName,
        team_name: outrightBettingOn.name,
        amount: 20000,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      alert(`Đã gửi dự đoán thành công!`);
      setOutrightBettingOn(null);
      fetchDC13OutrightData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setOutrightSubmitting(false);
    }
  };

  const handleUpdateDC13OutrightBet = async () => {
    if (!editingOutrightBet || !user) return;
    const isInactive = await checkIsInactiveUser(user.id, fullName, user);
    if (isInactive) {
      alert('Tài khoản của bạn đã dừng tham gia giải đấu DC 13!');
      setEditingOutrightBet(null);
      setEditOutrightAmount('');
      return;
    }
    const betVal = normalizeBetAmount(Number(editOutrightAmount));
    if (!editOutrightAmount || Number(editOutrightAmount) < 20) {
      alert('Gía trị tối thiểu là 20đ');
      return;
    }
    setOutrightSubmitting(true);
    try {
      const { error } = await supabase
        .from('dc13_outright_bets')
        .update({ amount: betVal })
        .eq('id', editingOutrightBet.id);

      if (error) throw error;
      alert('Cập nhật lượt dự đoán thành công!');
      setEditingOutrightBet(null);
      setEditOutrightAmount('');
      fetchDC13OutrightData();
    } catch (err: any) {
      alert('Lỗi khi sửa lượt dự đoán: ' + err.message);
    } finally {
      setOutrightSubmitting(false);
    }
  };

  const handleDeleteDC13OutrightBet = async (betId: string) => {
    if (!user) return;
    const isInactive = await checkIsInactiveUser(user.id, fullName, user);
    if (isInactive) {
      alert('Tài khoản của bạn đã dừng tham gia giải đấu DC 13!');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa lượt dự đoán này?')) return;
    try {
      const { error } = await supabase
        .from('dc13_outright_bets')
        .delete()
        .eq('id', betId);

      if (error) throw error;
      alert('Đã xóa lượt dự đoán thành công!');
      fetchDC13OutrightData();
    } catch (err: any) {
      alert('Lỗi khi xóa lượt dự đoán: ' + err.message);
    }
  };

  const handleSetDC13OutrightWinner = async (teamName: string | null) => {
    if (!adminAuthed) return;
    try {
      if (!teamName) {
        if (!window.confirm('Bạn có muốn xóa đội vô địch hiện tại?')) return;
        const { error } = await supabase.from('dc13_outright_winner').delete().neq('team_name', '');
        if (error) throw error;
        alert('Đã xóa đội vô địch thành công!');
      } else {
        // Clear previous winners first to prevent multiple active rows
        await supabase.from('dc13_outright_winner').delete().neq('team_name', '');
        const { error } = await supabase.from('dc13_outright_winner').insert([{
          team_name: teamName,
          updated_at: new Date().toISOString()
        }]);
        if (error) throw error;
        alert(`Đã cập nhật đội vô địch: ${teamName}`);
      }
      fetchDC13OutrightData();
    } catch (err: any) {
      alert('Lỗi khi cập nhật đội vô địch: ' + err.message);
    }
  };


  const getDC13TeamFlag = (teamName: string) => {
    const team = DC13_TEAMS.find(t => t.name === teamName);
    return team ? team.code : '';
  };



  // ─── Bet Handlers ──────────────────────────────────────────────────────────
  const handleBetClick = (match: Match) => {
    if (!session) {
      setPendingBetMatch(match);
      setShowAuthModal(true);
      return;
    }
    setBetMatch(match);
    setShowBetModal(true);
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    await ensureDC13Profile();
    if (pendingBetMatch) {
      setBetMatch(pendingBetMatch);
      setShowBetModal(true);
      setPendingBetMatch(null);
    }
  };

  const handlePlaceBet = async (chosenTeam: string) => {
    if (!betMatch || !user) return;

    const isInactive = await checkIsInactiveUser(user.id, fullName, user);
    if (isInactive) {
      alert('Tài khoản của bạn đã dừng tham gia giải đấu DC 13!');
      setShowBetModal(false);
      setBetMatch(null);
      return;
    }

    // Check if match betting is locked 30m before kickoff
    if (isDC13BettingLocked(betMatch)) {
      if (!betMatch.dc13_handicap_set) {
        alert('Trận đấu này chưa được thiết lập kèo, không thể dự đoán!');
      } else {
        alert('Trận đấu này đã khóa dự đoán!');
      }
      return;
    }

    // Ensure profile exists
    await ensureDC13Profile();
    // Re-fetch profile if missing
    let displayName = fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown';
    const { data: profile } = await supabase
      .from('dc13_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.full_name) {
      displayName = profile.full_name;
    }

    const existingBet = bets.find(b => b.match_id === betMatch.id && b.user_id === user.id);
    const chosenTeamName = chosenTeam === 'teamA' ? betMatch.team_a_name : betMatch.team_b_name;

    if (existingBet) {
      // Edit existing bet
      const { error } = await supabase
        .from('dc13_bets')
        .update({
          chosen_team: chosenTeamName,
          user_name: displayName
        })
        .eq('id', existingBet.id);

      if (error) {
        alert(`Lỗi khi sửa dự đoán: ${error.message}`);
        return;
      }
    } else {
      // Insert new bet
      const { error } = await supabase.from('dc13_bets').insert({
        match_id: betMatch.id,
        user_id: user.id,
        user_name: displayName,
        chosen_team: chosenTeamName,
        result: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          alert('Bạn đã bet trận này rồi! Mỗi trận chỉ được bet 1 lần.');
        } else {
          alert(`Lỗi: ${error.message}`);
        }
        return;
      }
    }

    setShowBetModal(false);
    setBetMatch(null);
    fetchBets();
  };

  const handleDeleteBet = async (betId: string) => {
    if (!user) return;
    const isInactive = await checkIsInactiveUser(user.id, fullName, user);
    if (isInactive) {
      alert('Tài khoản của bạn đã dừng tham gia giải đấu DC 13!');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn hủy dự đoán cho trận đấu này?')) return;
    const { error } = await supabase
      .from('dc13_bets')
      .delete()
      .eq('id', betId);

    if (error) {
      alert(`Lỗi khi hủy dự đoán: ${error.message}`);
    } else {
      fetchBets();
    }
  };

  // ─── Admin: Set result for a match ──────────────────────────────────────────
  const handleSetResult = async (match: Match, scoreA: number, scoreB: number) => {
    // Validate scores
    if (scoreA < 0 || scoreB < 0) {
      alert('Tỷ số không được âm!');
      return;
    }

    // Update match scores and status in 'matches'
    const { error: matchErr } = await supabase
      .from('matches')
      .update({ dc13_status: 'finished', dc13_score_a: scoreA, dc13_score_b: scoreB })
      .eq('id', match.id);

    if (matchErr) {
      alert(`Lỗi cập nhật trận: ${matchErr.message}`);
      return;
    }

    const dc13Handicap = Number(match.dc13_handicap || 0);
    const effectiveScore = (scoreA - scoreB) - dc13Handicap;
    const teamAName = match.team_a_name;
    const teamBName = match.team_b_name;

    // Calculate and update bet results in DB (without restricting to 'pending' in case of corrections)
    if (effectiveScore > 0) {
      await supabase.from('dc13_bets').update({ result: 'win' }).eq('match_id', match.id).in('chosen_team', ['teamA', teamAName]);
      await supabase.from('dc13_bets').update({ result: 'loss' }).eq('match_id', match.id).in('chosen_team', ['teamB', teamBName]);
    } else if (effectiveScore < 0) {
      await supabase.from('dc13_bets').update({ result: 'loss' }).eq('match_id', match.id).in('chosen_team', ['teamA', teamAName]);
      await supabase.from('dc13_bets').update({ result: 'win' }).eq('match_id', match.id).in('chosen_team', ['teamB', teamBName]);
    } else {
      await supabase.from('dc13_bets').update({ result: 'draw' }).eq('match_id', match.id);
    }

    setResultModal(null);
    setResultScoreA(0);
    setResultScoreB(0);
    alert('Đã cập nhật kết quả thành công!');
    fetchMatches();
    fetchBets();
  };

  // ─── Admin: Save match ─────────────────────────────────────────────────────
  const handleSaveMatch = async () => {
    if (!editingMatch) return;
    const { id, ...payload } = editingMatch;

    if (!payload.team_a_name || !payload.team_b_name || !payload.start_time) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    let error;
    if (id) {
      delete (payload as any).status;
      delete (payload as any).score_a;
      delete (payload as any).score_b;
      if (payload.dc13_status === 'scheduled') {
        payload.dc13_score_a = 0;
        payload.dc13_score_b = 0;
      }
      const { error: err } = await supabase.from('matches').update(payload).eq('id', id);
      error = err;
    } else {
      // Create new match in main table
      const newPayload = {
        ...payload,
        league: payload.league || 'FIFA WORLD CUP 2026',
        team_a_icon: payload.team_a_icon || '⚽',
        team_b_icon: payload.team_b_icon || '⚽',
        dc13_handicap: payload.dc13_handicap || 0,
        dc13_favorite_team: payload.dc13_favorite_team || 'teamA',
        dc13_status: payload.dc13_status || 'scheduled',
        dc13_score_a: payload.dc13_score_a || 0,
        dc13_score_b: payload.dc13_score_b || 0,
        dc13_handicap_set: payload.dc13_handicap_set ?? false
      };
      const { error: err } = await supabase.from('matches').insert([newPayload]);
      error = err;
    }

    if (!error) {
      // Resolve bets if finished and edited
      if (id && payload.dc13_status === 'finished' && payload.dc13_score_a !== undefined && payload.dc13_score_b !== undefined) {
        const scoreA = Number(payload.dc13_score_a);
        const scoreB = Number(payload.dc13_score_b);
        const dc13Handicap = Number(payload.dc13_handicap || 0);
        const effectiveScore = (scoreA - scoreB) - dc13Handicap;

        const match = matches.find(m => m.id === id);
        const teamAName = match?.team_a_name || payload.team_a_name || '';
        const teamBName = match?.team_b_name || payload.team_b_name || '';

        if (effectiveScore > 0) {
          await supabase.from('dc13_bets').update({ result: 'win' }).eq('match_id', id).in('chosen_team', ['teamA', teamAName]);
          await supabase.from('dc13_bets').update({ result: 'loss' }).eq('match_id', id).in('chosen_team', ['teamB', teamBName]);
        } else if (effectiveScore < 0) {
          await supabase.from('dc13_bets').update({ result: 'loss' }).eq('match_id', id).in('chosen_team', ['teamA', teamAName]);
          await supabase.from('dc13_bets').update({ result: 'win' }).eq('match_id', id).in('chosen_team', ['teamB', teamBName]);
        } else {
          await supabase.from('dc13_bets').update({ result: 'draw' }).eq('match_id', id);
        }
      }

      setEditingMatch(null);
      setIsAddingMatch(false);
      setDc13KeoType('unset');
      setHandicapInputA('');
      setHandicapInputB('');
      fetchMatches();
      fetchBets();
      alert('Đã lưu thành công!');
    } else {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Xóa trận đấu này?')) return;
    await supabase.from('matches').delete().eq('id', id);
    fetchMatches();
    fetchBets();
  };

  const handleResetMatchDirect = async (matchId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn reset trận đấu này về "Sắp đá"? Mọi tỷ số và lượt bet sẽ bị xóa!')) return;

    const { error: matchErr } = await supabase
      .from('matches')
      .update({
        dc13_status: 'scheduled',
        dc13_score_a: 0,
        dc13_score_b: 0
      })
      .eq('id', matchId);

    if (matchErr) {
      alert(`Lỗi khi reset trận đấu: ${matchErr.message}`);
      return;
    }

    await supabase.from('dc13_bets').delete().eq('match_id', matchId);

    alert('Đã reset trận đấu về "Sắp đá" và xóa mọi kết quả, lượt dự đoán thành công!');
    fetchMatches();
    fetchBets();
  };

  const handleUpdateBettingStatus = async (matchId: string, status: string) => {
    let value: boolean | null = null;
    if (status === 'open') value = true;
    else if (status === 'closed') value = false;
    const { error } = await supabase.from('matches').update({ dc13_betting_open: value }).eq('id', matchId);
    if (!error) fetchMatches();
    else alert(`Lỗi: ${error.message}`);
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

  const handleExportMatchBets = (match: Match) => {
    const matchBets = resolvedBets.filter(b => b.match_id === match.id);
    if (matchBets.length === 0) {
      alert('Trận đấu này chưa có ai dự đoán!');
      return;
    }

    let csv = 'ID Lượt dự đoán,Tài Khoản,Họ Tên Đầy Đủ,Đội Chọn,Kết Quả Bet,Thời Gian Dự Đoán\n';

    matchBets.forEach(b => {
      const resolvedName = b.dc13_profiles?.full_name || b.user_name || 'N/A';
      const displayName = b.isVirtual ? `${resolvedName} (Mặc định)` : resolvedName;
      let chosenTeamName = b.chosen_team;
      if (chosenTeamName === 'teamA') chosenTeamName = match.team_a_name;
      else if (chosenTeamName === 'teamB') chosenTeamName = match.team_b_name;
      let statusStr = 'Đang chờ';
      if (b.result === 'win') statusStr = 'Thắng';
      else if (b.result === 'loss') statusStr = 'Thua';
      else if (b.result === 'draw') statusStr = 'Hòa';

      const timeStr = new Date(b.created_at).toLocaleString('vi-VN');

      const escapedName = displayName.includes(',') ? `"${displayName}"` : displayName;
      const escapedTeamName = chosenTeamName.includes(',') ? `"${chosenTeamName}"` : chosenTeamName;

      csv += `${b.id},${b.user_name},${escapedName},${escapedTeamName},${statusStr},${timeStr}\n`;
    });

    const fileName = `Bets_${match.team_a_name}_vs_${match.team_b_name}.csv`;
    exportToCSV(csv, fileName);
  };

  const handleExportAllBets = () => {
    if (resolvedBets.length === 0) {
      alert('Không có dữ liệu dự đoán nào!');
      return;
    }

    let csv = 'Trận Đấu,Thời Gian Trận Đấu,ID Lượt dự đoán,Tài Khoản,Họ Tên Đầy Đủ,Đội Chọn,Kết Quả Bet,Thời Gian Dự Đoán\n';

    resolvedBets.forEach(b => {
      const match = matches.find(m => m.id === b.match_id);
      if (!match) return;

      const matchName = `${match.team_a_name} vs ${match.team_b_name}`;
      const matchTime = new Date(match.start_time).toLocaleString('vi-VN');
      const resolvedName = b.dc13_profiles?.full_name || b.user_name || 'N/A';
      const displayName = b.isVirtual ? `${resolvedName} (Mặc định)` : resolvedName;
      let chosenTeamName = b.chosen_team;
      if (chosenTeamName === 'teamA') chosenTeamName = match.team_a_name;
      else if (chosenTeamName === 'teamB') chosenTeamName = match.team_b_name;

      let statusStr = 'Đang chờ';
      if (b.result === 'win') statusStr = 'Thắng';
      else if (b.result === 'loss') statusStr = 'Thua';
      else if (b.result === 'draw') statusStr = 'Hòa';

      const timeStr = new Date(b.created_at).toLocaleString('vi-VN');

      const escapedMatchName = matchName.includes(',') ? `"${matchName}"` : matchName;
      const escapedName = displayName.includes(',') ? `"${displayName}"` : displayName;
      const escapedTeamName = chosenTeamName.includes(',') ? `"${chosenTeamName}"` : chosenTeamName;

      csv += `${escapedMatchName},${matchTime},${b.id},${b.user_name},${escapedName},${escapedTeamName},${statusStr},${timeStr}\n`;
    });

    exportToCSV(csv, 'Tat_Ca_Bets_DC13.csv');
  };

  const handleExportOutrightBets = () => {
    if (outrightBets.length === 0) {
      alert('Không có dữ liệu dự đoán vô địch nào!');
      return;
    }

    let csv = 'ID Lượt dự đoán,Tài Khoản,Đội Tuyển Chọn,Gía Trị,Kết Quả Dự Đoán,Thắng Chia Quỹ,Tổng Thực Nhận,Thời Gian Dự Đoán\n';

    outrightBets.forEach(b => {
      let statusStr = 'Chờ kết quả';
      let estWinnings = 0;
      let estTotal = 0;

      if (outrightWinner && outrightWinner !== '__LOCKED__') {
        if (b.team_name === outrightWinner) {
          const winBets = outrightBets.filter(x => x.team_name === outrightWinner);
          const winCount = winBets.length;
          const winPool = winBets.reduce((sum, x) => sum + x.amount, 0);
          const netPool = totalOutrightPool - winPool;
          estWinnings = winCount > 0 ? netPool / winCount : 0;
          estTotal = b.amount + estWinnings;
          statusStr = 'Thắng';
        } else {
          estWinnings = -b.amount;
          estTotal = 0;
          statusStr = 'Thua';
        }
      } else {
        const teamBets = outrightBets.filter(x => x.team_name === b.team_name);
        const teamCount = teamBets.length;
        const teamTotalBet = teamBets.reduce((sum, x) => sum + x.amount, 0);
        estWinnings = teamCount > 0 ? (totalOutrightPool - teamTotalBet) / teamCount : 0;
        estTotal = b.amount + estWinnings;
        statusStr = 'Chờ kết quả (Dự kiến)';
      }

      const timeStr = new Date(b.created_at).toLocaleString('vi-VN');
      const escapedName = b.user_name.includes(',') ? `"${b.user_name}"` : b.user_name;
      const escapedTeamName = b.team_name.includes(',') ? `"${b.team_name}"` : b.team_name;

      csv += `${b.id},${escapedName},${escapedTeamName},${b.amount},${statusStr},${Math.round(estWinnings)},${Math.round(estTotal)},${timeStr}\n`;
    });

    exportToCSV(csv, 'Tat_Ca_Bets_Vo_Dich_DC13.csv');
  };

  // ─── Date Filtering Helpers ─────────────────────────────────────────────────
  const uniqueDates = [...new Set(matches.map(m => new Date(m.start_time).toLocaleDateString('vi-VN')))].sort((a, b) => {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  const getWeekday = (dateStr: string) => {
    const [d, m, y] = dateStr.split('/').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['CN', 'T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7'];
    return days[date.getDay()];
  };

  const filteredMatches = matches.filter(m => {
    const dc13Status = m.dc13_status || m.status || 'scheduled';
    const isLive = dc13Status === 'live' || (dc13Status !== 'finished' && new Date(m.start_time) <= new Date());
    const isUnplayed = dc13Status === 'scheduled' && new Date(m.start_time) > new Date();

    if (filter === 'live') return isLive;
    if (filter === 'date' && selectedDate) {
      return new Date(m.start_time).toLocaleDateString('vi-VN') === selectedDate;
    }
    if (filter === 'unplayed' && selectedDate) {
      const matchDate = new Date(m.start_time).toLocaleDateString('vi-VN');
      return matchDate === selectedDate && isUnplayed;
    }
    return true; // 'all'
  });

  const getMatchResult = (match: Match): 'teamA' | 'teamB' | 'draw' | null => {
    const status = match.dc13_status || 'scheduled';
    const scoreA = match.dc13_score_a ?? 0;
    const scoreB = match.dc13_score_b ?? 0;
    if (status !== 'finished') return null;

    const handicap = match.dc13_handicap || 0;
    const effectiveScore = (scoreA - scoreB) - handicap;
    if (effectiveScore > 0) return 'teamA';
    if (effectiveScore < 0) return 'teamB';
    return 'draw';
  };

  // ─── Resolved Bets with Underdog Fallback for Forgotten Bets ────────────────
  const resolvedBets = useMemo(() => {
    const list = [...bets].filter(b => b.user_name !== 'Lâm Mỹ Linh' && b.dc13_profiles?.full_name !== 'Lâm Mỹ Linh');

    // Threshold start time: 2026-06-15T11:00:00Z (18:00:00+07:00)
    const threshold = new Date('2026-06-15T11:00:00Z').getTime();

    // Compile active player user_ids who have ever placed a bet in DC13
    const activePlayerIds = new Set(bets.map(b => b.user_id));
    matches.forEach(match => {
      // Rule applies if match has locked betting AND starts on or after threshold
      const matchStartTime = new Date(match.start_time).getTime();
      const timeToKick = (matchStartTime - Date.now()) / 60000;
      const isWithin30MinsOrStarted = timeToKick <= 30;
      if (isDC13BettingLocked(match) && match.dc13_handicap_set && isWithin30MinsOrStarted && matchStartTime >= threshold) {
        // Find who has bet on this match
        const bettedUserIds = new Set(bets.filter(b => b.match_id === match.id).map(b => b.user_id));

        // For each active player who forgot to bet
        profiles.forEach(profile => {
          if (profile.full_name === 'Lâm Mỹ Linh') return; // Exclude Lâm Mỹ Linh!
          if (activePlayerIds.has(profile.id) && !bettedUserIds.has(profile.id)) {
            // Stop virtual/default bets for inactive users for matches starting on or after 2026-06-18T10:00:00Z
            if (INACTIVE_USERS.includes(profile.full_name)) {
              const matchStartTime = new Date(match.start_time).getTime();
              const inactiveThreshold = new Date('2026-06-18T10:00:00Z').getTime();
              if (matchStartTime >= inactiveThreshold) {
                return; // Do not generate virtual/default bet for them
              }
            }

            // Determine underdog team
            const favorite = match.dc13_favorite_team || 'teamA';
            const underdogTeamName = favorite === 'teamA' ? match.team_b_name : match.team_a_name;

            // Add virtual bet
            list.push({
              id: `virtual-${match.id}-${profile.id}`,
              match_id: match.id,
              user_id: profile.id,
              user_name: profile.full_name,
              chosen_team: underdogTeamName,
              result: 'pending', // Will be calculated dynamically if finished
              created_at: match.start_time,
              isVirtual: true
            } as any);
          }
        });
      }
    });

    return list;
  }, [bets, profiles, matches]);

  // ─── Stats Calculation ─────────────────────────────────────────────────────
  const playerStats: PlayerStats[] = (() => {
    const map: Record<string, PlayerStats> = {};
    resolvedBets.forEach(bet => {
      const match = matches.find(m => m.id === bet.match_id);
      let effectiveResult = bet.result;

      // Dynamic calculation for finished matches with pending bets
      if (effectiveResult === 'pending' && match && (match.dc13_status || 'scheduled') === 'finished') {
        const diff = (match.dc13_score_a ?? 0) - (match.dc13_score_b ?? 0);
        const handicap = match.dc13_handicap || 0;
        const effectiveScore = diff - handicap;
        if (effectiveScore > 0) {
          effectiveResult = (bet.chosen_team === 'teamA' || bet.chosen_team === match.team_a_name) ? 'win' : 'loss';
        } else if (effectiveScore < 0) {
          effectiveResult = (bet.chosen_team === 'teamB' || bet.chosen_team === match.team_b_name) ? 'win' : 'loss';
        } else {
          effectiveResult = 'draw';
        }
      }

      const userId = bet.user_id;
      const resolvedName = bet.dc13_profiles?.full_name || bet.user_name || 'Unknown';

      if (!map[userId]) {
        map[userId] = { user_id: userId, user_name: resolvedName, total_bets: 0, wins: 0, losses: 0, pending: 0, total_penalty: 0 };
      }
      const s = map[userId];
      s.total_bets++;
      if (effectiveResult === 'win') s.wins++;
      else if (effectiveResult === 'loss') {
        s.losses++;
        s.total_penalty -= PENALTY_AMOUNT;
      } else if (effectiveResult === 'draw') {
        // draw: no win, no penalty
      } else {
        s.pending++;
      }
    });

    return Object.values(map).sort((a, b) => {
      // Prioritize wins descending, then losses ascending (fewer losses), then total bets descending
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (b.total_bets !== a.total_bets) return b.total_bets - a.total_bets;
      return 0;
    });
  })();

  const standingsContainerRef = useRef<HTMLDivElement>(null);
  const [standingsHeight, setStandingsHeight] = useState<number | null>(null);

  useEffect(() => {
    const measureHeight = () => {
      if (standingsContainerRef.current) {
        const height = standingsContainerRef.current.offsetHeight;
        if (height > 0) {
          setStandingsHeight(height);
        }
      }
    };

    // Measure initially and on dependency updates
    measureHeight();

    if (typeof ResizeObserver !== 'undefined' && standingsContainerRef.current) {
      const observer = new ResizeObserver(() => {
        measureHeight();
      });
      observer.observe(standingsContainerRef.current);
      return () => observer.disconnect();
    }
  }, [leaderboardTab, playerStats]);

  const finishedMatches = useMemo(() => {
    return matches.filter(m =>
      m.league !== 'TIP Futsal league' &&
      (m.dc13_status || 'scheduled') === 'finished'
    ).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()); // Newest first
  }, [matches]);

  // ─── Prize Predictions Calculation ──────────────────────────────────────────
  const prizeStandings = (() => {
    // Only rank players who have at least 1 win for wins prizes
    const playersWithWins = playerStats.filter(p => p.wins > 0);
    const sortedByWins = [...playersWithWins].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.total_bets - a.total_bets;
    });

    // Only rank players who have at least 1 loss for losses prizes
    const playersWithLosses = playerStats.filter(p => p.losses > 0);
    const sortedByLosses = [...playersWithLosses].sort((a, b) => {
      if (b.losses !== a.losses) return b.losses - a.losses;
      return b.total_bets - a.total_bets;
    });

    const first = sortedByWins.length > 0 ? sortedByWins[0] : null;
    const second = sortedByWins.length > 1 ? sortedByWins[1] : null;
    const third = sortedByWins.length > 2 ? sortedByWins[2] : null;
    const raspberry = sortedByLosses.length > 0 ? sortedByLosses[0] : null;

    return { first, second, third, raspberry };
  })();

  // ─── My bets with effective results computed ──────────────────────────────
  const myBetsWithResult = user ? resolvedBets.filter(b => b.user_id === user.id).map(bet => {
    const match = matches.find(m => m.id === bet.match_id);
    let effectiveResult = bet.result;

    if (effectiveResult === 'pending' && match && (match.dc13_status || 'scheduled') === 'finished') {
      const diff = (match.dc13_score_a ?? 0) - (match.dc13_score_b ?? 0);
      const handicap = match.dc13_handicap || 0;
      const effectiveScore = diff - handicap;
      if (effectiveScore > 0) {
        effectiveResult = (bet.chosen_team === 'teamA' || bet.chosen_team === match.team_a_name) ? 'win' : 'loss';
      } else if (effectiveScore < 0) {
        effectiveResult = (bet.chosen_team === 'teamB' || bet.chosen_team === match.team_b_name) ? 'win' : 'loss';
      } else {
        effectiveResult = 'draw';
      }
    }

    return { ...bet, effectiveResult };
  }) : [];

  const myBets = user ? resolvedBets.filter(b => b.user_id === user.id) : [];
  const myBetMatchIds = new Set(myBets.map(b => b.match_id));

  // ─── Outright Pool Derived Variables ───────────────────────────────────────
  const totalOutrightPool = outrightBets.reduce((sum, b) => sum + b.amount, 0);
  const winnerOutrightPool = (outrightWinner && outrightWinner !== '__LOCKED__')
    ? outrightBets.filter(b => b.team_name === outrightWinner).reduce((sum, b) => sum + b.amount, 0)
    : 0;
  const netOutrightPool = totalOutrightPool - winnerOutrightPool;

  const myOutrightBets = user ? outrightBets.filter(b => b.user_id === user.id) : [];

  const isOutrightLocked = !!outrightWinner;

  // ─── Styles ────────────────────────────────────────────────────────────────
  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none transition-all";
  const labelCls = "block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest";

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#080808] relative overflow-hidden text-white font-sans">
      {/* Background Stadium */}
      <div
        className="fixed inset-0 z-0 opacity-60 blur-sm pointer-events-none"
        style={{
          backgroundImage: 'url("/world_cup_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      {/* BG Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-cyan-500/15 via-teal-500/10 to-transparent rounded-full blur-[160px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-50px] left-[-50px] w-[500px] h-[350px] bg-teal-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-3 md:px-6 py-6 md:py-10">
        {/* ═══ HEADER ═══ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-cyan-500/15 to-teal-500/15 border border-cyan-500/30 rounded-full px-5 py-2.5 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:border-cyan-400/50 transition-all duration-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-cyan-300">GIẢI ĐẤU NỘI BỘ DC 13</span>
          </div>
          <h1 className="text-3xl md:text-7xl font-extrabold uppercase tracking-tight italic drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <span className="block w-full bg-gradient-to-r from-cyan-300 via-teal-300 to-blue-400 bg-clip-text text-transparent">
              DC13 - CHAMPIONSHIP
            </span>
          </h1>
        </div>

        {/* ═══ SUB-TAB NAVIGATION ═══ */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-slate-950/60 backdrop-blur-2xl p-1.5 rounded-full border border-white/[0.08] gap-1.5 flex-wrap justify-center shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
            {([
              { key: 'matches', label: '📅 Lịch & Bet' },
              { key: 'outright', label: '🏆 Dự đoán Vô Địch' },
              { key: 'stats', label: '📊 Thống Kê' },
              { key: 'rules', label: '📋 Thể Lệ' },
              { key: 'admin', label: '⚙️ Admin' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 md:px-6 py-2.5 rounded-full text-[12px] md:text-[13px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500 via-cyan-600 to-teal-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] transform scale-[1.03]'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: MATCHES & BET                                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            {/* User login status */}
            {!session && (
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 text-center">
                <p className="text-lg text-slate-400">
                  <button onClick={() => setShowAuthModal(true)} className="text-cyan-400 font-black underline underline-offset-2 hover:text-cyan-300 transition-colors">
                    Đăng nhập
                  </button>
                  {' '}để bắt đầu bet trận đấu
                </p>
              </div>
            )}

            {/* My stats quick view */}
            {session && myBetsWithResult.length > 0 && (
              <div className="bg-gradient-to-r from-[#0f2441]/80 via-[#0a182b]/80 to-slate-900/80 backdrop-blur-3xl border border-cyan-500/30 rounded-3xl p-5 flex items-center justify-between gap-5 flex-wrap shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.06)] hover:border-cyan-400/50 transition-all duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-base border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">👤</div>
                  <div>
                    <p className="text-base font-extrabold text-white tracking-wide">{fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
                    <p className="text-[11px] text-cyan-400/70 font-black uppercase tracking-wider mt-0.5">DC 13 Player</p>
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                  <div className="bg-slate-950/40 px-4 py-2 rounded-2xl border border-white/[0.03]">
                    <p className="text-xl font-extrabold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">{myBetsWithResult.filter(b => b.effectiveResult === 'win').length}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase mt-0.5 tracking-wider">Thắng</p>
                  </div>
                  <div className="bg-slate-950/40 px-4 py-2 rounded-2xl border border-white/[0.03]">
                    <p className="text-xl font-extrabold text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]">{myBetsWithResult.filter(b => b.effectiveResult === 'loss').length}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase mt-0.5 tracking-wider">Thua</p>
                  </div>
                  <div className="bg-slate-950/40 px-4 py-2 rounded-2xl border border-white/[0.03]">
                    <p className="text-xl font-extrabold text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]">
                      {formatVND(-myBetsWithResult.filter(b => b.effectiveResult === 'loss').length * PENALTY_AMOUNT)} điểm
                    </p>
                    <p className="text-[10px] font-black text-slate-500 uppercase mt-0.5 tracking-wider">Tổng phạt</p>
                  </div>
                </div>
              </div>
            )}

            {/* Date/Status Filters & Scroller */}
            <div className="flex flex-col lg:flex-row items-center gap-6 bg-slate-900/60 backdrop-blur-xl p-4 rounded-[32px] border border-cyan-500/20 mb-6 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 shrink-0 bg-slate-950/40 p-1 rounded-2xl border border-white/[0.03]">
                <button
                  onClick={() => handleFilterChange('date')}
                  className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${filter === 'date' ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-cyan-400/30 shadow-[0_4px_15px_rgba(6,182,212,0.4)]' : 'border-transparent text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                >
                  Theo Ngày
                </button>
                <button
                  onClick={() => handleFilterChange('unplayed')}
                  className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${filter === 'unplayed' ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-cyan-400/30 shadow-[0_4px_15px_rgba(6,182,212,0.4)]' : 'border-transparent text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                >
                  Chưa Đá
                </button>
                <button
                  onClick={() => handleFilterChange('live')}
                  className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${filter === 'live' ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-400/30 shadow-[0_4px_15px_rgba(244,63,94,0.4)] animate-pulse' : 'border-transparent text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'}`}
                >
                  Đang Đá
                </button>
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${filter === 'all' ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white border-slate-500/30 shadow-[0_4px_15px_rgba(71,85,105,0.4)]' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                >
                  Tất Cả
                </button>
              </div>

              {/* Date Scroller - always rendered for stable height, hidden when not date/unplayed filter */}
              <div className={`flex-1 flex items-center gap-2.5 w-full max-w-2xl min-w-0 ${(filter !== 'date' && filter !== 'unplayed') || uniqueDates.length === 0 ? 'invisible' : ''}`} style={{ minHeight: '42px' }}>
                <button
                  onClick={() => scrollerRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                  className="shrink-0 w-8 h-8 flex items-center justify-center bg-slate-950/60 border border-white/5 hover:border-cyan-500/30 rounded-full text-white/50 hover:text-cyan-400 transition-all text-xs shadow-sm"
                >
                  ◀
                </button>

                <div
                  ref={scrollerRef}
                  className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3 scroll-smooth py-1"
                >
                  {uniqueDates.map((date) => {
                    const [d] = date.split('/');
                    const isActive = selectedDate === date;
                    return (
                      <button
                        key={date}
                        onClick={() => handleSelectDate(date)}
                        className={`flex flex-col items-center min-w-[55px] py-1.5 rounded-xl border transition-all shrink-0 ${isActive
                          ? 'bg-gradient-to-b from-cyan-500/25 to-cyan-600/10 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)] text-white scale-[1.02]'
                          : 'bg-slate-950/50 border-white/[0.04] hover:bg-cyan-500/15 hover:border-cyan-500/40 hover:text-cyan-400 shadow-sm'
                          }`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-wide ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>{getWeekday(date)}</span>
                        <span className={`text-xs font-black leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>{d}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => scrollerRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                  className="shrink-0 w-8 h-8 flex items-center justify-center bg-slate-950/60 border border-white/5 hover:border-cyan-500/30 rounded-full text-white/50 hover:text-cyan-400 transition-all text-xs shadow-sm"
                >
                  ▶
                </button>
              </div>
            </div>

            {loading || cardsLoading ? (
              <div className="space-y-4">
                <MatchCardSkeleton />
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-4">⚽</p>
                <p className="font-black uppercase tracking-widest text-sm">Chưa có trận đấu nào</p>
                <p className="text-xs mt-1 text-slate-600">Admin hãy thêm trận đấu trong tab Admin</p>
              </div>
            ) : (
              <div className={filter === 'all' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                {filteredMatches.map(match => {
                  const locked = isDC13BettingLocked(match);
                  const alreadyBet = myBetMatchIds.has(match.id);
                  const myBet = myBets.find(b => b.match_id === match.id);
                  const matchBets = resolvedBets.filter(b => b.match_id === match.id);
                  const teamABets = matchBets.filter(b => b.chosen_team === 'teamA' || b.chosen_team === match.team_a_name).length;
                  const teamBBets = matchBets.filter(b => b.chosen_team === 'teamB' || b.chosen_team === match.team_b_name).length;
                  const computedResult = getMatchResult(match);

                  const dc13Status = match.dc13_status || match.status || 'scheduled';
                  const isLive = dc13Status === 'live' || (dc13Status !== 'finished' && new Date(match.start_time) <= new Date());
                  const isFinished = dc13Status === 'finished';

                  return (
                    <div key={match.id} className="flex flex-col h-full bg-slate-950/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl md:rounded-3xl overflow-hidden group hover:border-cyan-500/40 hover:bg-slate-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_45px_rgba(6,182,212,0.18)] transition-all duration-300">
                      {/* Match header info */}
                      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap bg-slate-900/20">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${isLive ? 'bg-rose-500 text-white animate-pulse' :
                            isFinished ? 'bg-slate-700 text-slate-400' :
                              'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}>
                            {isLive ? '🔴 LIVE' : isFinished ? 'Kết thúc' : 'Sắp đá'}
                          </span>
                          <span className="text-[12px] text-slate-400 font-bold">
                            {new Date(match.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            {' • '}
                            {new Date(match.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!locked && !alreadyBet && (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/25 uppercase tracking-widest animate-pulse">
                            Đang mở bet
                          </span>
                        )}
                        {alreadyBet && (
                          <span className={`text-[10px] font-black bg-cyan-500/10 px-2.5 py-1 rounded-full border uppercase tracking-widest ${myBet?.isVirtual ? 'text-amber-500 border-amber-500/25' : 'text-cyan-400 border-cyan-500/25'}`}>
                            {myBet?.isVirtual ? '🔒 Mặc định' : '✓ Đã bet'}
                          </span>
                        )}
                      </div>

                      {/* Teams display */}
                      <div className="px-5 py-5 md:py-6 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3">
                          {/* Team A */}
                          <div className="flex-1 text-center">
                            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto bg-slate-900 rounded-2xl overflow-hidden border border-white/10 mb-2 group-hover:border-cyan-500/40 shadow-inner transition-all duration-300">
                              {match.team_a_code ? (
                                <img src={`https://flagcdn.com/w160/${match.team_a_code.toLowerCase()}.png`} className="w-full h-full object-cover" alt={match.team_a_name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">⚽</div>
                              )}
                            </div>
                            <p className="text-sm md:text-base font-black text-white uppercase tracking-tight min-h-[40px] md:min-h-[48px] flex items-center justify-center">{match.team_a_name}</p>
                            <p className="text-[13px] text-slate-500 font-bold mt-0.5">{teamABets} bet{teamABets !== 1 ? 's' : ''}</p>
                            <div className="mt-1.5">
                              {!match.dc13_handicap_set ? (
                                <span className="text-[9px] font-black text-rose-500/80 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 uppercase tracking-widest">Chưa có kèo</span>
                              ) : match.dc13_handicap === 0 || match.dc13_handicap === undefined ? (
                                <span className="text-[9px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">Đồng banh</span>
                              ) : match.dc13_favorite_team === 'teamB' ? (
                                <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Được chấp +{Math.abs(match.dc13_handicap)}</span>
                              ) : null}
                            </div>
                          </div>

                          {/* VS / Result */}
                          <div className="flex flex-col items-center px-3 self-start pt-3.5 md:pt-4">
                            {isFinished && computedResult ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-lg font-black text-slate-300">{(match.dc13_score_a ?? 0)} - {(match.dc13_score_b ?? 0)}</div>
                                <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${computedResult === 'draw' ? 'bg-slate-700 text-slate-300' :
                                  'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                  }`}>
                                  {computedResult === 'draw' ? 'HÒA' :
                                    computedResult === 'teamA' ? `${match.team_a_name} WIN` :
                                      `${match.team_b_name} WIN`}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                                {isLive && <div className="text-sm font-black text-rose-500 mb-1">{(match.dc13_score_a ?? 0)} - {(match.dc13_score_b ?? 0)}</div>}
                                <span className="text-xl md:text-2xl font-black text-slate-400 group-hover:text-cyan-300 transition-colors duration-300 italic">VS</span>
                              </div>
                            )}
                          </div>

                          {/* Team B */}
                          <div className="flex-1 text-center">
                            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto bg-slate-900 rounded-2xl overflow-hidden border border-white/10 mb-2 group-hover:border-cyan-500/40 shadow-inner transition-all duration-300">
                              {match.team_b_code ? (
                                <img src={`https://flagcdn.com/w160/${match.team_b_code.toLowerCase()}.png`} className="w-full h-full object-cover" alt={match.team_b_name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">⚽</div>
                              )}
                            </div>
                            <p className="text-sm md:text-base font-black text-white uppercase tracking-tight min-h-[40px] md:min-h-[48px] flex items-center justify-center">{match.team_b_name}</p>
                            <p className="text-[13px] text-slate-500 font-bold mt-0.5">{teamBBets} bet{teamBBets !== 1 ? 's' : ''}</p>
                            <div className="mt-1.5">
                              {!match.dc13_handicap_set ? (
                                <span className="text-[9px] font-black text-rose-500/80 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 uppercase tracking-widest">Chưa có kèo</span>
                              ) : match.dc13_handicap === 0 || match.dc13_handicap === undefined ? (
                                <span className="text-[9px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">Đồng banh</span>
                              ) : match.dc13_favorite_team === 'teamA' ? (
                                <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Được chấp +{Math.abs(match.dc13_handicap)}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Real-time Match Betting Statistics */}
                        <div className="mt-4 bg-slate-900/40 backdrop-blur-md border border-white/[0.05] rounded-2xl p-4 shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-indigo-500 via-emerald-500 to-rose-500" />

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg shrink-0">📊</span>
                              <div>
                                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-200 leading-tight">
                                  Thống kê lượng Dự đoán
                                </h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Cập nhật thời gian thực</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 font-mono sm:justify-end">
                              <div>
                                <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5 tracking-wider font-sans">Tổng lượt</p>
                                <p className="text-xs font-black text-indigo-400">{(teamABets + teamBBets)} lượt</p>
                              </div>
                            </div>
                          </div>

                          {/* Distribution Bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                              <span className="text-indigo-400 truncate max-w-[48%]">
                                {match.team_a_name}: {teamABets} lượt ({(teamABets + teamBBets) > 0 ? Math.round((teamABets / (teamABets + teamBBets)) * 100) : 0}%)
                              </span>
                              <span className="text-rose-400 truncate max-w-[48%] text-right">
                                {match.team_b_name}: {teamBBets} lượt ({(teamABets + teamBBets) > 0 ? Math.round((teamBBets / (teamABets + teamBBets)) * 100) : 0}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-l-full transition-all duration-500"
                                style={{ width: `${(teamABets + teamBBets) > 0 ? (teamABets / (teamABets + teamBBets)) * 100 : 50}%` }}
                              />
                              <div
                                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-500"
                                style={{ width: `${(teamABets + teamBBets) > 0 ? (teamABets / (teamABets + teamBBets)) * 100 : 50}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Actions Block */}
                        <div className="mt-auto pt-4 w-full">
                          {/* My bet info */}
                          {myBet && (() => {
                            let effRes = myBet.result;
                            if (effRes === 'pending' && (match.dc13_status || 'scheduled') === 'finished') {
                              const diff = (match.dc13_score_a ?? 0) - (match.dc13_score_b ?? 0);
                              const handicap = match.dc13_handicap || 0;
                              const effectiveScore = diff - handicap;
                              if (effectiveScore > 0) {
                                effRes = (myBet.chosen_team === 'teamA' || myBet.chosen_team === match.team_a_name) ? 'win' : 'loss';
                              } else if (effectiveScore < 0) {
                                effRes = (myBet.chosen_team === 'teamB' || myBet.chosen_team === match.team_b_name) ? 'win' : 'loss';
                              } else {
                                effRes = 'draw';
                              }
                            }

                            return (
                              <div className="space-y-2">
                                <div className={`p-3 rounded-xl border text-center text-xs font-bold ${effRes === 'win' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  effRes === 'loss' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                    effRes === 'draw' ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' :
                                      'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                  }`}>
                                  Bạn chọn: <span className="font-black">{myBet.chosen_team === 'teamA' ? match.team_a_name : myBet.chosen_team === 'teamB' ? match.team_b_name : myBet.chosen_team}</span>
                                  {myBet.isVirtual && <span className="text-[10px] text-amber-500 font-extrabold uppercase ml-1">(Mặc định)</span>}
                                  {effRes === 'win' && ' — ✅ THẮNG (0 điểm)'}
                                  {effRes === 'loss' && ` — ❌ THUA (-${formatVND(PENALTY_AMOUNT)} điểm)`}
                                  {effRes === 'draw' && ' — 🤝 HÒA (0 điểm)'}
                                  {effRes === 'pending' && ' — ⏳ Đang chờ kết quả'}
                                </div>
                                {!locked && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleBetClick(match)}
                                      className="flex-1 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-500/20 font-black text-[10px] uppercase tracking-widest transition-all"
                                    >
                                      Sửa dự đoán ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBet(myBet.id)}
                                      className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 font-black text-[10px] uppercase tracking-widest transition-all"
                                    >
                                      Hủy dự đoán 🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Bet button */}
                          {!locked && !alreadyBet && (
                            <button
                              onClick={() => handleBetClick(match)}
                              className="w-full block mx-auto py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-900/40 hover:shadow-cyan-900/60 active:scale-[0.98] transition-all"
                            >
                              Bet 🎯
                            </button>
                          )}

                          {/* Locked bet banner */}
                          {locked && !alreadyBet && (match.dc13_status || 'scheduled') !== 'finished' && (
                            <div className="py-3 rounded-xl bg-white/5 border border-white/5 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {!match.dc13_handicap_set ? '🔒 Chưa có kèo' : '🔒 Đã khóa bet'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bet list for this match */}
                      {matchBets.length > 0 && (() => {
                        const betsA = matchBets.filter(b => b.chosen_team === 'teamA' || b.chosen_team === match.team_a_name);
                        const betsB = matchBets.filter(b => b.chosen_team === 'teamB' || b.chosen_team === match.team_b_name);

                        return (
                          <div className="px-5 pb-5 border-t border-white/5 pt-4">
                            <p className="text-[12px] font-black text-slate-300 uppercase tracking-widest mb-3">Danh sách ({matchBets.length})</p>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Bets on Team A */}
                              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-1">
                                  <span className="text-[12px] font-bold text-slate-300 uppercase tracking-wider truncate">{match.team_a_name}</span>
                                  <span className="text-[12px] font-black text-cyan-400">{betsA.length}</span>
                                </div>
                                <div className="space-y-1 max-h-36 overflow-y-auto pr-1 text-[12px]">
                                  {betsA.map(b => {
                                    let effRes = b.result;
                                    const dc13Status = match.dc13_status || 'scheduled';
                                    if (effRes === 'pending' && dc13Status === 'finished') {
                                      const diff = (match.dc13_score_a ?? 0) - (match.dc13_score_b ?? 0);
                                      const handicap = match.dc13_handicap || 0;
                                      const effectiveScore = diff - handicap;
                                      if (effectiveScore > 0) effRes = 'win';
                                      else if (effectiveScore < 0) effRes = 'loss';
                                      else effRes = 'draw';
                                    }

                                    return (
                                      <div key={b.id} className="flex items-center justify-between py-1 border-b border-white/[0.03] last:border-0">
                                        <span className="font-bold text-slate-300 truncate mr-1">
                                          {b.dc13_profiles?.full_name || b.user_name}
                                          {b.isVirtual && <span className="text-amber-500/70 text-[8px] ml-1 font-black uppercase tracking-wider">(Mặc định)</span>}
                                          {user && b.user_id === user.id && <span className="text-cyan-400 text-[8px] ml-1 font-black uppercase tracking-wider">(Bạn)</span>}
                                        </span>
                                        <span className="shrink-0 text-[9px]">
                                          {effRes === 'win' && <span className="text-emerald-400 font-bold">Thắng ✅</span>}
                                          {effRes === 'loss' && <span className="text-rose-400 font-bold">Thua ❌</span>}
                                          {effRes === 'draw' && <span className="text-slate-400 font-bold">Hòa 🤝</span>}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {betsA.length === 0 && <p className="text-[9px] text-slate-600 italic text-center py-2">Chưa có ai bet...</p>}
                                </div>
                              </div>

                              {/* Bets on Team B */}
                              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-1">
                                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider truncate">{match.team_b_name}</span>
                                  <span className="text-[12px] font-black text-cyan-400">{betsB.length}</span>
                                </div>
                                <div className="space-y-1 max-h-36 overflow-y-auto pr-1 text-[12px]">
                                  {betsB.map(b => {
                                    let effRes = b.result;
                                    const dc13Status = match.dc13_status || 'scheduled';
                                    if (effRes === 'pending' && dc13Status === 'finished') {
                                      const diff = (match.dc13_score_a ?? 0) - (match.dc13_score_b ?? 0);
                                      const handicap = match.dc13_handicap || 0;
                                      const effectiveScore = diff - handicap;
                                      if (effectiveScore > 0) effRes = 'loss';
                                      else if (effectiveScore < 0) effRes = 'win';
                                      else effRes = 'draw';
                                    }

                                    return (
                                      <div key={b.id} className="flex items-center justify-between py-1 border-b border-white/[0.03] last:border-0">
                                        <span className="font-bold text-slate-300 truncate mr-1">
                                          {b.dc13_profiles?.full_name || b.user_name}
                                          {b.isVirtual && <span className="text-amber-500/70 text-[8px] ml-1 font-black uppercase tracking-wider">(Mặc định)</span>}
                                          {user && b.user_id === user.id && <span className="text-cyan-400 text-[8px] ml-1 font-black uppercase tracking-wider">(Bạn)</span>}
                                        </span>
                                        <span className="shrink-0 text-[9px]">
                                          {effRes === 'win' && <span className="text-emerald-400 font-bold">Thắng ✅</span>}
                                          {effRes === 'loss' && <span className="text-rose-400 font-bold">Thua ❌</span>}
                                          {effRes === 'draw' && <span className="text-slate-400 font-bold">Hòa 🤝</span>}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {betsB.length === 0 && <p className="text-[9px] text-slate-600 italic text-center py-2">Chưa có ai bet...</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
                }
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: OUTRIGHT CHAMPION WINNER PREDICTION                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'outright' && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Header Banner & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Outright Status */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Trạng thái dự đoán</span>
                    {isOutrightLocked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                        🔴 ĐÃ ĐÓNG CỬA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider animate-pulse">
                        🟢 ĐANG MỞ dự đoán
                      </span>
                    )}
                  </div>
                  <div className="text-3xl">🏁</div>
                </div>

                {/* Total Pool */}
                <div className="bg-gradient-to-br from-cyan-950/40 to-slate-950 border border-cyan-500/20 rounded-3xl p-6 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tổng quỹ dự đoán vô địch</span>
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
                      {formatVND(totalOutrightPool)} điểm
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Quỹ chia (thua): {formatVND(netOutrightPool)} điểm
                    </span>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>

                {/* My outright bets */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Bạn đã dự đoán vô địch</span>
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                      {formatVND(myOutrightBets.reduce((sum, b) => sum + b.amount, 0))} điểm
                    </span>
                  </div>
                  <div className="text-3xl">🎟️</div>
                </div>

                {/* Winner Status / Champion */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Đội vô địch chính thức</span>
                    {outrightWinner && outrightWinner !== '__LOCKED__' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-8 h-5 rounded overflow-hidden border border-white/20 shrink-0 bg-slate-800">
                          <img src={`https://flagcdn.com/w80/${getDC13TeamFlag(outrightWinner).toLowerCase()}.png`} className="w-full h-full object-cover" alt={outrightWinner} />
                        </div>
                        <span className="text-sm font-black text-emerald-400 uppercase tracking-wide truncate max-w-[80px]">{outrightWinner}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm font-bold block mt-1">⏳ Chờ xác định...</span>
                    )}
                  </div>
                  <div className="text-3xl">🏆</div>
                </div>
              </div>

              {/* 2. Simplified Rules / Formula Explanation Toggle Card */}
              <div className="bg-gradient-to-br from-[#0b1329] to-slate-950 border border-cyan-500/25 rounded-3xl p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.4)] relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 text-9xl text-cyan-500/5 select-none pointer-events-none font-bold">∑</div>
                <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                  <h3 className="text-base font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <span>💡 LUẬT CHƠI & CÔNG THỨC CHIA QUỸ CỰC DỄ HIỂU</span>
                  </h3>
                  <button
                    onClick={() => setShowOutrightRules(!showOutrightRules)}
                    className="px-4 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-white border border-cyan-500/20 text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    {showOutrightRules ? 'Thu Gọn ✕' : 'Xem Chi Tiết ➡️'}
                  </button>
                </div>

                <p className="text-base text-slate-300 leading-relaxed mt-2 font-medium">
                  Đặt dự đoán cho đội bạn tin là nhà vô địch. Mỗi lượt dự đoán vô địch được cố định ở mức <strong className="text-cyan-400">20 điểm</strong>. Người dự đoán sai sẽ mất gốc, toàn bộ số điểm thua đó được chia đều theo đầu người cho những người dự đoán đúng.
                </p>

                {showOutrightRules && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-white/5 relative z-10 animate-in fade-in duration-300">
                    {/* Left: General Steps */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">3 Bước Tính Giải Thưởng Đơn Giản</h4>

                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[10px] font-black text-cyan-400 shrink-0 mt-0.5">1</div>
                        <div>
                          <p className="text-xs font-black text-slate-200">Xác định Quỹ Thua (Losing Pool)</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Tổng số của tất cả những người dự đoán sai đội vô địch.</p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[10px] font-black text-cyan-400 shrink-0 mt-0.5">2</div>
                        <div>
                          <p className="text-xs font-black text-slate-200">Xác định Số Người Thắng (N)</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Tổng số người chơi dự đoán chính xác đội vô địch.</p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[10px] font-black text-cyan-400 shrink-0 mt-0.5">3</div>
                        <div>
                          <p className="text-xs font-black text-slate-200">Cách tính điểm nhận của bạn</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Mỗi người thắng nhận lại 20.000đ gốc + phần chia đều từ Quỹ Thua.</p>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 mt-2 font-mono text-[11px] text-cyan-300">
                            Thắng = Quỹ Thua / N
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Concrete Example */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>✏️ Ví dụ thực tế dễ hiểu</span>
                      </h4>

                      <div className="space-y-2.5 text-xs text-slate-300">
                        <p>Giả sử có tổng cộng 50 người tham gia dự đoán vô địch:</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          <li>Có <strong className="text-slate-200">10 người</strong> dự đoán đúng Argentina vô địch.</li>
                          <li>Có <strong className="text-slate-200">40 người</strong> dự đoán sai.</li>
                          <li>Tổng Quỹ Thua là: <strong className="text-slate-200">40 người × 20.000đ = 800.000đ</strong></li>
                        </ul>

                        <div className="border-t border-white/5 my-2.5" />

                        <p className="font-bold text-slate-200">Mỗi người dự đoán đúng Argentina nhận được:</p>
                        <div className="space-y-1.5 pl-2 border-l-2 border-cyan-500/40">
                          <p>• Thắng chia đều:</p>
                          <p className="font-black text-cyan-400 text-sm">800.000đ (Quỹ Thua) / 10 người = 80.000đ</p>

                          <p className="mt-1">• Tổng thực nhận mang về (bao gồm gốc):</p>
                          <p className="font-black text-emerald-400 text-sm">20.000đ (gốc) + 80.000đ (thắng) = 100.000đ</p>
                        </div>
                        <p className="text-[10px] text-slate-500 italic mt-2">⚠️ Lưu ý: Nếu dự đoán sai, bạn sẽ mất hoàn toàn 20.000đ gốc của mình.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Search & Teams Grid */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🏟️ DANH SÁCH ĐỘI TUYỂN</span>
                    </h3>
                    <p className="text-[12px] text-slate-400 mt-1">Chọn đội tuyển bạn dự đoán sẽ vô địch để đặt dự đoán (20).</p>
                  </div>

                  {/* Search input */}
                  <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">🔍</span>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-white/10 rounded-full pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition-all"
                      placeholder="Tìm kiếm đội tuyển..."
                      value={outrightSearch}
                      onChange={(e) => setOutrightSearch(e.target.value)}
                    />
                    {outrightSearch && (
                      <button onClick={() => setOutrightSearch('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-white text-xs">✕</button>
                    )}
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {DC13_TEAMS.filter(t => t.name.toLowerCase().includes(outrightSearch.toLowerCase())).map(team => {
                    const teamBets = outrightBets.filter(b => b.team_name === team.name);
                    const teamTotalBet = teamBets.reduce((sum, b) => sum + b.amount, 0);
                    const hasOwnBetOnTeam = user && outrightBets.some(b => b.user_id === user.id && b.team_name === team.name);

                    return (
                      <button
                        key={team.name}
                        disabled={isOutrightLocked || !!hasOwnBetOnTeam}
                        onClick={() => {
                          if (!session) {
                            setShowAuthModal(true);
                          } else {
                            setOutrightBettingOn(team);
                          }
                        }}
                        className={`flex flex-col items-center p-4 rounded-2xl border bg-gradient-to-b from-white/[0.02] to-white/[0.04] text-center transition-all ${isOutrightLocked
                          ? 'border-white/[0.03] opacity-60 cursor-not-allowed'
                          : hasOwnBetOnTeam
                            ? 'border-emerald-500/40 bg-emerald-500/5 cursor-not-allowed'
                            : 'border-white/[0.08] hover:border-cyan-500/40 hover:bg-cyan-500/5 active:scale-[0.98]'
                          }`}
                      >
                        {/* Flag image */}
                        <div className="w-12 h-8 rounded-lg overflow-hidden border border-white/20 shadow-md mb-2.5 shrink-0 bg-slate-800">
                          <img src={`https://flagcdn.com/w80/${team.code.toLowerCase()}.png`} className="w-full h-full object-cover" alt={team.name} />
                        </div>

                        <span className="text-xs font-black text-white uppercase tracking-tight line-clamp-1">{team.name}</span>

                        {/* Bet Stats on Team */}
                        <div className="mt-2 space-y-0.5">
                          {hasOwnBetOnTeam ? (
                            <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1">
                              <span>✓</span> Bạn đã chọn
                            </span>
                          ) : (
                            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Đã dự đoán</span>
                          )}
                          <span className="block text-[11px] font-black text-cyan-400">
                            {teamTotalBet > 0 ? `${formatVND(teamTotalBet)} điểm` : '0 điểm'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Bets list */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>📋 DANH SÁCH LƯỢT DỰ ĐOÁN CỦA CỘNG ĐỒNG</span>
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full">{outrightBets.length} lượt</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tất cả các lượt dự đoán của các thành viên.</p>
                  </div>
                  {outrightBets.length > 0 && (
                    <button
                      onClick={handleExportOutrightBets}
                      className="px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600 border border-cyan-500/20 text-cyan-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      📥 Xuất Excel
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/[0.01]">
                        <th className="py-4 px-6">Người dự đoán</th>
                        <th className="py-4 px-4">Đội lựa chọn</th>
                        <th className="py-4 px-4 text-right">Tổng dự đoán</th>
                        <th className="py-4 px-4 text-right">Thắng dự kiến</th>
                        <th className="py-4 px-4 text-right">Tổng thực nhận(gồm gốc)</th>
                        <th className="py-4 px-6 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {outrightBets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                            Chưa có lượt dự đoán vô địch nào được ghi nhận
                          </td>
                        </tr>
                      ) : (
                        outrightBets.map(bet => {
                          const isOwnBet = user && bet.user_id === user.id;
                          const teamBets = outrightBets.filter(b => b.team_name === bet.team_name);
                          const teamCount = teamBets.length;
                          const teamTotalBet = teamBets.reduce((sum, b) => sum + b.amount, 0);

                          // Winnings & payout calculations
                          let estWinnings = 0;
                          let estTotal = 0;
                          let statusColor = 'text-cyan-400';

                          if (outrightWinner && outrightWinner !== '__LOCKED__') {
                            if (bet.team_name === outrightWinner) {
                              const winBets = outrightBets.filter(b => b.team_name === outrightWinner);
                              const winCount = winBets.length;
                              const winPool = winBets.reduce((sum, b) => sum + b.amount, 0);
                              const netPool = totalOutrightPool - winPool;
                              estWinnings = winCount > 0 ? netPool / winCount : 0;
                              estTotal = bet.amount + estWinnings;
                              statusColor = 'text-emerald-400 font-bold';
                            } else {
                              estWinnings = -bet.amount;
                              estTotal = 0;
                              statusColor = 'text-rose-400 font-bold';
                            }
                          } else {
                            // Estimated winnings: (totalPool - teamPool) / teamCount
                            estWinnings = teamCount > 0 ? (totalOutrightPool - teamTotalBet) / teamCount : 0;
                            estTotal = bet.amount + estWinnings;
                            statusColor = 'text-cyan-400';
                          }

                          return (
                            <tr key={bet.id} className={`text-xs transition-colors hover:bg-white/[0.02] ${isOwnBet ? 'bg-cyan-500/[0.02]' : ''}`}>
                              <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                                <span>{bet.user_name}</span>
                                {isOwnBet && (
                                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0">BẠN</span>
                                )}
                              </td>
                              <td className="py-4 px-4 font-semibold text-slate-300">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-4 rounded overflow-hidden border border-white/20 shrink-0 bg-slate-800">
                                    <img src={`https://flagcdn.com/w80/${getDC13TeamFlag(bet.team_name).toLowerCase()}.png`} className="w-full h-full object-cover" alt={bet.team_name} />
                                  </div>
                                  <span className="uppercase tracking-wide">{bet.team_name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-bold text-slate-300">
                                {formatVND(bet.amount)} điểm
                              </td>
                              <td className="py-4 px-4 text-right font-mono">
                                <span className={statusColor}>
                                  {estWinnings >= 0 ? '+' : ''}{formatVND(estWinnings)} điểm
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-black text-emerald-400">
                                {formatVND(estTotal)} điểm
                              </td>
                              <td className="py-4 px-6 text-right">
                                {(isOwnBet || adminAuthed) && !isOutrightLocked && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleDeleteDC13OutrightBet(bet.id)}
                                      className="w-7 h-7 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg flex items-center justify-center border border-white/5 transition-all text-[11px]"
                                      title="Xóa lượt dự đoán"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: STATISTICS                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Prize Forecast Panel */}
              <div className="bg-gradient-to-br from-[#0c1f38]/60 to-slate-950/60 border border-cyan-500/25 rounded-3xl p-5 md:p-6 shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between gap-4 mb-5 flex-wrap border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-xl drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">🔮</span>
                    <h3 className="text-xs font-black text-cyan-300 uppercase tracking-widest">Dự kiến Giải Thưởng DC 13</h3>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2 flex items-center gap-2 shadow-inner">
                    <span className="text-sm">💰</span>
                    <span className="text-[12px] font-black text-cyan-400/80 uppercase tracking-wider">Tổng (IC nhận):</span>
                    <span className="text-base font-extrabold text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                      {formatVND(playerStats.reduce((sum, p) => sum + Math.abs(p.total_penalty), 0))} điểm
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Hạng Nhất */}
                  <div className="bg-gradient-to-b from-amber-500/15 via-amber-600/5 to-slate-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[90px] shadow-[0_0_25px_rgba(245,158,11,0.08)] hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.18)] hover:scale-[1.02] transition-all duration-300">
                    <div>
                      <p className="text-[11px] font-black text-amber-400/80 uppercase tracking-wider flex items-center gap-1.5">🥇 GIẢI NHẤT (300 điểm)</p>
                      <p className="text-sm font-black text-white mt-1.5 tracking-wide">
                        {prizeStandings.first ? prizeStandings.first.user_name : 'Chưa có'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-bold">
                      <span className="text-slate-400">{prizeStandings.first ? `${prizeStandings.first.wins} trận thắng` : ''}</span>
                    </div>
                  </div>

                  {/* Hạng Nhì */}
                  <div className="bg-gradient-to-b from-slate-300/15 via-slate-400/5 to-slate-950/20 border border-slate-400/30 rounded-2xl p-4 flex flex-col justify-between min-h-[90px] shadow-[0_0_25px_rgba(148,163,184,0.08)] hover:border-slate-300 hover:shadow-[0_0_30px_rgba(148,163,184,0.18)] hover:scale-[1.02] transition-all duration-300">
                    <div>
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">🥈 GIẢI NHÌ (200 điểm)</p>
                      <p className="text-sm font-black text-white mt-1.5 tracking-wide">
                        {prizeStandings.second ? prizeStandings.second.user_name : 'Chưa có'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-bold">
                      <span className="text-slate-400">{prizeStandings.second ? `${prizeStandings.second.wins} trận thắng` : ''}</span>
                    </div>
                  </div>

                  {/* Hạng Ba */}
                  <div className="bg-gradient-to-b from-amber-850/20 via-amber-900/5 to-slate-950/20 border border-amber-900/30 rounded-2xl p-4 flex flex-col justify-between min-h-[90px] shadow-[0_0_25px_rgba(120,53,4,0.08)] hover:border-amber-700 hover:shadow-[0_0_30px_rgba(120,53,4,0.18)] hover:scale-[1.02] transition-all duration-300">
                    <div>
                      <p className="text-[11px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5">🥉 GIẢI BA (100 điểm)</p>
                      <p className="text-sm font-black text-white mt-1.5 tracking-wide">
                        {prizeStandings.third ? prizeStandings.third.user_name : 'Chưa có'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-bold">
                      <span className="text-slate-400">{prizeStandings.third ? `${prizeStandings.third.wins} trận thắng` : ''}</span>
                    </div>
                  </div>

                  {/* Mâm Xôi Vàng */}
                  <div className="bg-gradient-to-b from-rose-500/15 via-rose-600/5 to-slate-950/20 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[90px] shadow-[0_0_25px_rgba(244,63,94,0.08)] hover:border-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.18)] hover:scale-[1.02] transition-all duration-300">
                    <div>
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">🍋 MÂM XÔI VÀNG (100K điểm)</p>
                      <p className="text-sm font-black text-white mt-1.5 tracking-wide">
                        {prizeStandings.raspberry ? prizeStandings.raspberry.user_name : 'Chưa có'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-bold">
                      <span className="text-slate-400">{prizeStandings.raspberry ? `${prizeStandings.raspberry.losses} trận thua` : ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              {playerStats.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-slate-950/30 border border-white/[0.04] rounded-3xl">
                  <p className="text-4xl mb-4">📊</p>
                  <p className="font-black uppercase tracking-widest text-sm">Chưa có dữ liệu thống kê</p>
                </div>
              ) : (
                <div className="bg-slate-950/40 border border-white/[0.06] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/20 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🏆</span>
                      <h2 className="text-sm font-black uppercase tracking-widest text-cyan-300">Bảng Xếp Hạng DC 13</h2>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => setLeaderboardTab('standings')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${leaderboardTab === 'standings' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        Bảng xếp hạng
                      </button>
                      <button
                        onClick={() => setLeaderboardTab('overview')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${leaderboardTab === 'overview' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        Bảng tổng quan
                      </button>
                    </div>
                  </div>

                  <div ref={standingsContainerRef} className={leaderboardTab === 'standings' ? 'block' : 'hidden'}>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] font-black text-slate-300 uppercase tracking-widest border-b border-white/5 bg-slate-900/10">
                            <th className="py-3 px-5 text-left">#</th>
                            <th className="py-3 px-5 text-left">Người chơi</th>
                            <th className="py-3 px-5 text-center">Tổng bet</th>
                            <th className="py-3 px-5 text-center">Thắng</th>
                            <th className="py-3 px-5 text-center">Thua</th>
                            <th className="py-3 px-5 text-center">Đang chờ</th>
                            <th className="py-3 px-5 text-right">Tổng phạt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerStats.map((p, i) => {
                            const isCurrentUser = p.user_id === user?.id;
                            return (
                              <tr key={p.user_name} className={`border-b border-white/5 transition-colors ${isCurrentUser ? 'bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-300 font-extrabold' : 'hover:bg-white/[0.03]'}`}>
                                <td className="py-3.5 px-5">
                                  <span className={`w-7 h-7 inline-flex items-center justify-center rounded-lg text-[10px] font-black ${i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-white/5 text-slate-500'
                                    }`}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                  </span>
                                </td>
                                <td className={`py-3.5 px-5 font-black ${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>{p.user_name} {isCurrentUser && '(Bạn)'}</td>
                                <td className="py-3.5 px-5 text-center font-bold text-slate-400">{p.total_bets}</td>
                                <td className="py-3.5 px-5 text-center font-black text-emerald-400">{p.wins}</td>
                                <td className="py-3.5 px-5 text-center font-black text-rose-400">{p.losses}</td>
                                <td className="py-3.5 px-5 text-center font-bold text-slate-500">{p.pending}</td>
                                <td className={`py-3.5 px-5 text-right font-black ${p.total_penalty < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                  {p.total_penalty === 0 ? '0 điểm' : `${formatVND(p.total_penalty)} điểm`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-1 p-2">
                      {playerStats.map((p, i) => {
                        const isCurrentUser = p.user_id === user?.id;
                        return (
                          <div key={p.user_name} className={`rounded-xl p-3 flex items-center gap-3 border transition-colors ${isCurrentUser ? 'bg-cyan-500/10 border-cyan-500/25' : 'bg-white/[0.02] border-transparent'}`}>
                            <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-400' :
                              i === 1 ? 'bg-slate-400/20 text-slate-300' :
                                i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-white/5 text-slate-500'
                              }`}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-black truncate ${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>{p.user_name} {isCurrentUser && '(Bạn)'}</p>
                              <div className="flex gap-3 mt-0.5">
                                <span className="text-[9px] text-emerald-400 font-bold">W:{p.wins}</span>
                                <span className="text-[9px] text-rose-400 font-bold">L:{p.losses}</span>
                                <span className="text-[9px] text-slate-500 font-bold">P:{p.pending}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-black ${p.total_penalty < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {p.total_penalty === 0 ? '0 điểm' : `${formatVND(p.total_penalty)} điểm`}
                              </p>
                              <p className="text-[8px] text-slate-500 font-bold">{p.total_bets} trận</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={leaderboardTab === 'overview' ? 'block' : 'hidden'}>
                    {/* Bảng tổng quan (Overview Matrix) */}
                    <div
                      style={{ maxHeight: standingsHeight ? `${standingsHeight}px` : '550px' }}
                      className="overflow-auto custom-scrollbar p-2 relative"
                    >
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-slate-900/10">
                            <th className="py-3 px-4 text-left font-black uppercase text-slate-400 sticky top-0 left-0 bg-[#09101b] z-30 whitespace-nowrap min-w-[180px] shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">Trận đấu</th>
                            {playerStats.map(p => (
                              <th key={p.user_id} className="py-3 px-3 text-center font-black uppercase text-cyan-300 whitespace-nowrap min-w-[90px] border-l border-white/5 bg-[#09101b] sticky top-0 z-20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]">
                                {p.user_name.replace('_DC13', '')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {finishedMatches.length === 0 ? (
                            <tr>
                              <td colSpan={playerStats.length + 1} className="py-10 text-center text-slate-500 italic">
                                Chưa có trận đấu nào kết thúc.
                              </td>
                            </tr>
                          ) : (
                            finishedMatches.map(match => {
                              const dateStr = new Date(match.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                              return (
                                <tr key={match.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                  <td className="py-3 px-4 text-left font-black text-slate-300 sticky left-0 bg-[#09101b] z-10 whitespace-nowrap min-w-[180px] border-r border-white/5">
                                    <span className="text-[10px] text-slate-500 font-mono mr-2">{dateStr}</span>
                                    {match.team_a_name} vs {match.team_b_name}
                                  </td>
                                  {playerStats.map(p => {
                                    const bet = resolvedBets.find(b => b.user_id === p.user_id && b.match_id === match.id);
                                    let statusText = '-';
                                    let cellCls = 'text-slate-600 border border-transparent';

                                    if (bet) {
                                      let effectiveResult = bet.result;
                                      if (effectiveResult === 'pending' && match.dc13_status === 'finished') {
                                        const diff = (match.dc13_score_a ?? 0) - (match.dc13_score_b ?? 0);
                                        const handicap = match.dc13_handicap || 0;
                                        const effectiveScore = diff - handicap;
                                        if (effectiveScore > 0) {
                                          effectiveResult = (bet.chosen_team === 'teamA' || bet.chosen_team === match.team_a_name) ? 'win' : 'loss';
                                        } else if (effectiveScore < 0) {
                                          effectiveResult = (bet.chosen_team === 'teamB' || bet.chosen_team === match.team_b_name) ? 'win' : 'loss';
                                        } else {
                                          effectiveResult = 'draw';
                                        }
                                      }

                                      if (effectiveResult === 'win') {
                                        statusText = 'W';
                                        cellCls = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-black rounded-lg';
                                      } else if (effectiveResult === 'loss') {
                                        statusText = 'L';
                                        cellCls = 'bg-rose-500/15 text-rose-400 border border-rose-500/20 font-black rounded-lg';
                                      } else if (effectiveResult === 'draw') {
                                        statusText = 'D';
                                        cellCls = 'bg-slate-800/40 text-slate-400 border border-white/5 rounded-lg';
                                      }
                                    }

                                    return (
                                      <td key={p.user_id} className="py-2 px-1.5 text-center border-l border-white/5">
                                        <div className={`py-1 px-1 text-[10px] uppercase font-black tracking-wider text-center max-w-[50px] mx-auto ${cellCls}`} title={statusText === 'W' ? 'Thắng' : statusText === 'L' ? 'Thua' : statusText === 'D' ? 'Hòa' : 'Chưa đặt'}>
                                          {statusText}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: RULES                                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'rules' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-950/45 border border-cyan-500/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <span className="text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">📋</span>
                <h2 className="text-lg font-black uppercase tracking-tight text-cyan-300">Thể Lệ Giải Đấu DC 13</h2>
              </div>

              {/* Penalty Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  1. Cách chơi & Tính thưởng
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3.5">
                  <div className="bg-slate-900/40 border border-white/[0.04] rounded-2xl p-4 hover:border-cyan-500/20 transition-all duration-300 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-black text-cyan-400 mb-1.5">🎯 CÁCH CHƠI ĐƠN GIẢN</p>
                      <p className="text-sm text-slate-400 font-semibold leading-relaxed">
                        Người chơi chỉ cần chọn 1 trong 2 đội thắng (Đội A hoặc Đội B) cho mỗi trận đấu. Hệ thống không yêu cầu nhập giá trị dự đoán. Đóng dự đoán tự động trước giờ bóng lăn 30 phút.
                      </p>
                    </div>
                    <div className="text-[12px] text-amber-400 font-bold border-t border-white/5 pt-2.5 mt-3 leading-relaxed">
                      ⚠️ Luật bổ sung (từ 18:00 ngày 15/06/2026): Nếu quên bet/không chọn đội trước giờ khóa, hệ thống sẽ tự động xếp bạn vào cửa đội kèo dưới (được chấp).
                    </div>
                  </div>
                  <div className="bg-slate-900/40 border border-white/[0.04] rounded-2xl p-4 hover:border-rose-500/20 transition-all duration-300 shadow-sm">
                    <p className="text-sm font-black text-rose-400 mb-1.5">💸 PHẠT ĐIỂM THUA CUỢC</p>
                    <ul className="text-sm text-slate-400 font-semibold leading-relaxed list-disc pl-4 space-y-1">
                      <li>Mỗi trận đoán <span className="text-rose-400 font-black">Sai (Thua)</span>: Phạt <span className="text-rose-400 font-black">-{formatVND(PENALTY_AMOUNT)} điểm</span>.</li>
                      <li>Đoán <span className="text-emerald-400 font-black">Đúng (Thắng)</span>: <span className="text-emerald-400 font-black">0 điểm</span> (thắng không được điểm, nhưng không bị trừ phạt).</li>
                      <li>Trận đấu kết quả <span className="text-slate-300 font-bold">Hòa</span>: <span className="text-slate-300 font-bold">0 điểm</span> (không mất điểm phạt).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Prizes Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  2. Giải thưởng chung cuộc
                </h3>
                <p className="text-sm text-slate-400 font-bold italic pl-3.5">
                  * Điều kiện nhận giải: Người chơi phải tham gia dự đoán <span className="text-cyan-400 underline">tất cả các trận đấu</span> trong suốt mùa giải.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3.5">
                  {/* Top Winners */}
                  <div className="bg-gradient-to-br from-cyan-950/20 to-transparent border border-cyan-500/15 rounded-2xl p-5 space-y-4 shadow-sm hover:border-cyan-500/30 transition-all duration-300">
                    <p className="text-xs font-black text-cyan-400 uppercase tracking-widest">🏆 Bảng Vàng Cao Thủ (Thắng Nhiều Nhất)</p>
                    <div className="space-y-3 border-b border-white/5 pb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">🥇 Giải Nhất:</span>
                        <span className="font-black text-cyan-300 text-sm">300 điểm</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">🥈 Giải Nhì:</span>
                        <span className="font-black text-cyan-300 text-sm">200 điểm</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">🥉 Giải Ba:</span>
                        <span className="font-black text-cyan-300 text-sm">100 điểm</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-slate-500 font-bold leading-normal">
                      (Giá trị giải thưởng trên có thể thay đổi tùy thuộc vào tổng số quỹ IC nhận được thực tế).
                    </p>
                  </div>

                  {/* Raspberry */}
                  <div className="bg-gradient-to-br from-rose-950/20 to-transparent border border-rose-500/15 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-rose-500/30 transition-all duration-300">
                    <div>
                      <p className="text-base font-black text-rose-400 uppercase tracking-widest mb-3">🍋 Giải Mâm Xôi Vàng (Thua Nhiều Nhất)</p>
                      <p className="text-sm text-slate-400 font-semibold leading-relaxed">
                        Dành tặng riêng cho "cao thủ ngược" có số trận đoán <span className="text-rose-400 font-black">Sai (Thua) nhiều nhất</span> trong cả giải đấu.
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                      <span className="font-bold text-rose-300">🎁 Phần thưởng:</span>
                      <span className="font-black text-rose-400 text-sm">100 điểm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fund Usage Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  3. Quỹ Nhậu & Nước uống liên hoan 🍻
                </h3>
                <div className="pl-3.5">
                  <div className="bg-gradient-to-br from-amber-950/35 via-amber-900/10 to-transparent border border-amber-500/20 rounded-2xl p-5 hover:border-amber-400/40 transition-all duration-300 shadow-[0_4px_20px_rgba(245,158,11,0.1)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.2)]">
                    <p className="text-lg font-black text-amber-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                      🍺 Nâng Ly Bia, Trao Gắn Kết!
                    </p>
                    <p className="text-base text-slate-100 font-bold leading-relaxed">
                      Toàn bộ số quỹ còn lại sau khi trừ đi phần thưởng cho các cao thủ sẽ được "trưng dụng triệt để" để tổ chức một bữa nâng ly nhậu hoành tráng 🍻 hoặc order nước ngọt, trà sữa tràn trề 🥤 cho toàn thể anh chị em đã tham gia dự đoán!
                    </p>
                    <p className="text-base text-amber-300/80 font-black mt-3 italic">
                      * Quỹ nhiều nhậu to, quỹ ít nhậu nhỏ, quan trọng nhất là tinh thần vui vẻ bên nhau sau những trận cầu rực lửa! 🎉🥂
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: ADMIN                                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'admin' && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {!adminAuthed ? (
                /* Admin PIN */
                <div className="flex items-center justify-center py-16">
                  <div className="w-full max-w-sm bg-slate-800/80 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-br from-cyan-500 to-teal-600 px-6 py-8 text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-sm border border-white/30">🔒</div>
                      <h2 className="text-xl font-black text-white">Admin DC 13</h2>
                      <p className="text-cyan-100 text-sm mt-1 opacity-80">Nhập mã PIN để tiếp tục</p>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (adminPin === ADMIN_PIN) { setAdminAuthed(true); setAdminPinError(''); }
                      else { setAdminPinError('Mật khẩu không chính xác!'); setAdminPin(''); }
                    }} className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Mật khẩu Admin</label>
                        <input
                          type="password"
                          className={`w-full bg-slate-900 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 border ${adminPinError ? 'border-rose-500' : 'border-slate-700'} focus:border-cyan-500 outline-none transition-all`}
                          placeholder="••••••"
                          value={adminPin}
                          onChange={(e) => setAdminPin(e.target.value)}
                          autoFocus
                        />
                        {adminPinError && <p className="text-rose-400 text-[10px] font-bold mt-2">⚠️ {adminPinError}</p>}
                      </div>
                      <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-600/20 transition-all active:scale-[0.98]">
                        Đăng nhập
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* Admin Panel */
                <div className="space-y-6">
                  {/* Admin header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-xl border border-cyan-500/30">⚙️</div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-tight italic text-cyan-400">Quản Lý DC 13</h2>
                        <p className="text-[12px] text-slate-500 font-bold mt-0.5">
                          Tổng : <span className="text-cyan-400 font-black">{playerStats.reduce((sum, p) => sum + Math.abs(p.total_penalty), 0).toLocaleString('vi-VN')} điểm</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={handleExportAllBets}
                        className="px-5 py-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        📊 Xuất Tất Cả Bets
                      </button>
                      <button
                        onClick={handleExportOutrightBets}
                        className="px-5 py-2 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/20 text-purple-400 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        🏆 Xuất Bets Vô Địch
                      </button>
                      <button onClick={() => setAdminAuthed(false)} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                        Thoát
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingMatch(true);
                          setEditingMatch({
                            status: 'scheduled',
                            dc13_status: 'scheduled',
                            dc13_score_a: 0,
                            dc13_score_b: 0,
                            dc13_handicap: 0,
                            dc13_favorite_team: 'teamA',
                            dc13_handicap_set: false
                          });
                          setDc13KeoType('unset');
                          setHandicapInputA('');
                          setHandicapInputB('');
                        }}
                        className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-900/40"
                      >
                        + Thêm Trận
                      </button>
                    </div>
                  </div>

                  {/* Add/Edit Match Form */}
                  {(isAddingMatch || editingMatch?.id) && (
                    <div className="bg-[#111]/90 backdrop-blur-3xl border border-cyan-500/20 rounded-3xl p-5 md:p-8 animate-in fade-in zoom-in-95">
                      <h3 className="text-base font-black mb-6 uppercase text-center italic text-cyan-400">
                        {editingMatch?.id ? 'Chỉnh Sửa Trận Đấu' : 'Thêm Trận Đấu Mới'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-cyan-400 italic">ĐỘI A</p>
                          <div>
                            <label className={labelCls}>Tên đội A</label>
                            <input className={inputCls} placeholder="Tên Đội A" value={editingMatch?.team_a_name || ''} onChange={e => setEditingMatch({ ...editingMatch, team_a_name: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>Mã cờ A</label>
                            <input className={inputCls} placeholder="Mã Cờ (vd: br, ar, vn)" value={editingMatch?.team_a_code || ''} onChange={e => setEditingMatch({ ...editingMatch, team_a_code: e.target.value.toLowerCase() })} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-rose-400 italic">ĐỘI B</p>
                          <div>
                            <label className={labelCls}>Tên đội B</label>
                            <input className={inputCls} placeholder="Tên Đội B" value={editingMatch?.team_b_name || ''} onChange={e => setEditingMatch({ ...editingMatch, team_b_name: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>Mã cờ B</label>
                            <input className={inputCls} placeholder="Mã Cờ (vd: fr, de, en)" value={editingMatch?.team_b_code || ''} onChange={e => setEditingMatch({ ...editingMatch, team_b_code: e.target.value.toLowerCase() })} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div>
                          <label className={labelCls}>Thời gian thi đấu</label>
                          <input type="datetime-local" className={inputCls} value={editingMatch?.start_time ? new Date(editingMatch.start_time).toISOString().slice(0, 16) : ''} onChange={e => setEditingMatch({ ...editingMatch, start_time: new Date(e.target.value).toISOString() })} />
                        </div>
                        <div>
                          <label className={labelCls}>Trạng thái (DC 13)</label>
                          <select
                            className={inputCls}
                            value={editingMatch?.dc13_status || 'scheduled'}
                            onChange={e => {
                              const newStatus = e.target.value;
                              if (newStatus === 'scheduled') {
                                setEditingMatch({
                                  ...editingMatch,
                                  dc13_status: newStatus,
                                  dc13_score_a: 0,
                                  dc13_score_b: 0
                                });
                              } else {
                                setEditingMatch({
                                  ...editingMatch,
                                  dc13_status: newStatus
                                });
                              }
                            }}
                          >
                            <option value="scheduled">Sắp đá</option>
                            <option value="live">Đang đá</option>
                            <option value="finished">Kết thúc</option>
                          </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className={labelCls}>Kèo DC13</label>
                          <select
                            className={inputCls}
                            value={dc13KeoType}
                            onChange={e => {
                              if (!editingMatch) return;
                              const val = e.target.value as 'unset' | 'draw' | 'handicap';
                              setDc13KeoType(val);
                              if (val === 'unset') {
                                setHandicapInputA('');
                                setHandicapInputB('');
                                setEditingMatch({
                                  ...editingMatch,
                                  dc13_handicap_set: false,
                                  dc13_handicap: 0,
                                  dc13_favorite_team: 'teamA'
                                });
                              } else if (val === 'draw') {
                                setHandicapInputA('');
                                setHandicapInputB('');
                                setEditingMatch({
                                  ...editingMatch,
                                  dc13_handicap_set: true,
                                  dc13_handicap: 0,
                                  dc13_favorite_team: 'teamA'
                                });
                              } else {
                                const initialHandicap = editingMatch.dc13_handicap || 0.5;
                                if (initialHandicap < 0 || editingMatch.dc13_favorite_team === 'teamB') {
                                  setHandicapInputA(String(Math.abs(initialHandicap)));
                                  setHandicapInputB('');
                                } else {
                                  setHandicapInputA('');
                                  setHandicapInputB(String(Math.abs(initialHandicap)));
                                }
                                setEditingMatch({
                                  ...editingMatch,
                                  dc13_handicap_set: true,
                                  dc13_handicap: initialHandicap,
                                  dc13_favorite_team: editingMatch.dc13_favorite_team || 'teamA'
                                });
                              }
                            }}
                          >
                            <option value="unset">🔴 Chưa set kèo (Khóa )</option>
                            <option value="draw">🤝 Đồng banh (0)</option>
                            <option value="handicap">⚽ Có kèo chấp (Nhập tỷ lệ)</option>
                          </select>
                        </div>
                        {dc13KeoType === 'handicap' && (
                          <>
                            <div>
                              <label className={labelCls}>Kèo được chấp - {editingMatch?.team_a_name || 'Đội A'}</label>
                              <input
                                type="number"
                                step="0.25"
                                className={inputCls}
                                placeholder="Trống = Cửa Trên (0)"
                                value={handicapInputA}
                                onChange={e => {
                                  const valStr = e.target.value;
                                  setHandicapInputA(valStr);
                                  setHandicapInputB('');
                                  const val = parseFloat(valStr);
                                  if (isNaN(val) || val === 0) {
                                    setEditingMatch({
                                      ...editingMatch,
                                      dc13_handicap: 0,
                                      dc13_favorite_team: 'teamA'
                                    });
                                  } else {
                                    setEditingMatch({
                                      ...editingMatch,
                                      dc13_favorite_team: 'teamB',
                                      dc13_handicap: -Math.abs(val)
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
                                placeholder="Trống = Cửa Trên (0)"
                                value={handicapInputB}
                                onChange={e => {
                                  const valStr = e.target.value;
                                  setHandicapInputB(valStr);
                                  setHandicapInputA('');
                                  const val = parseFloat(valStr);
                                  if (isNaN(val) || val === 0) {
                                    setEditingMatch({
                                      ...editingMatch,
                                      dc13_handicap: 0,
                                      dc13_favorite_team: 'teamA'
                                    });
                                  } else {
                                    setEditingMatch({
                                      ...editingMatch,
                                      dc13_favorite_team: 'teamA',
                                      dc13_handicap: Math.abs(val)
                                    });
                                  }
                                }}
                              />
                            </div>
                          </>
                        )}
                        {editingMatch?.id && (
                          <>
                            <div>
                              <label className={labelCls}>Tỷ số Đội A (DC 13)</label>
                              <input type="number" className={inputCls} placeholder="Tỷ số Đội A" value={editingMatch?.dc13_score_a ?? 0} onChange={e => setEditingMatch({ ...editingMatch, dc13_score_a: Number(e.target.value) })} />
                            </div>
                            <div>
                              <label className={labelCls}>Tỷ số Đội B (DC 13)</label>
                              <input type="number" className={inputCls} placeholder="Tỷ số Đội B" value={editingMatch?.dc13_score_b ?? 0} onChange={e => setEditingMatch({ ...editingMatch, dc13_score_b: Number(e.target.value) })} />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="mt-6 flex gap-3 flex-wrap">
                        <button onClick={handleSaveMatch} className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-cyan-900/40 transition-all">
                          Lưu Trận Đấu
                        </button>
                        {editingMatch?.id && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (editingMatch.id) {
                                await handleResetMatchDirect(editingMatch.id);
                                setIsAddingMatch(false);
                                setEditingMatch(null);
                                setDc13KeoType('unset');
                                setHandicapInputA('');
                                setHandicapInputB('');
                              }
                            }}
                            className="px-6 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 text-amber-400 hover:text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                          >
                            Reset Trận Đấu
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setIsAddingMatch(false);
                            setEditingMatch(null);
                            setDc13KeoType('unset');
                            setHandicapInputA('');
                            setHandicapInputB('');
                          }}
                          className="px-8 bg-white/5 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all hover:bg-white/10"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Date/Status Filters & Scroller for Admin matches */}
                  <div className="flex flex-col md:flex-row items-center gap-6 bg-white/5 backdrop-blur-md p-3 rounded-[32px] border border-white/10 mb-6">
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleFilterChange('date')}
                        className={`px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'date' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        Theo Ngày
                      </button>
                      <button
                        onClick={() => handleFilterChange('unplayed')}
                        className={`px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'unplayed' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/40' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        Chưa Đá
                      </button>
                      <button
                        onClick={() => handleFilterChange('live')}
                        className={`px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'live' ? 'bg-rose-600 text-white shadow-xl animate-pulse' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        Đang Đá
                      </button>
                      <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-slate-700 text-white shadow-xl' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        Tất Cả
                      </button>
                    </div>

                    {/* Date Scroller - always rendered for stable height */}
                    <div className={`flex-1 flex items-center gap-2.5 w-full max-w-2xl min-w-0 ${(filter !== 'date' && filter !== 'unplayed') || uniqueDates.length === 0 ? 'invisible' : ''}`} style={{ minHeight: '42px' }}>
                      <button
                        onClick={() => adminScrollerRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                        className="shrink-0 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-cyan-500/20 rounded-full text-white/50 hover:text-cyan-400 transition-all text-xs"
                      >
                        ◀
                      </button>

                      <div
                        ref={adminScrollerRef}
                        className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3 scroll-smooth py-1"
                      >
                        {uniqueDates.map((date) => {
                          const [d] = date.split('/');
                          const isActive = selectedDate === date;
                          return (
                            <button
                              key={date}
                              onClick={() => handleSelectDate(date)}
                              className={`flex flex-col items-center min-w-[55px] py-1.5 rounded-xl border transition-all shrink-0 ${isActive
                                ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] text-white'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                                }`}
                            >
                              <span className={`text-[8px] font-black uppercase tracking-wide ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>{getWeekday(date)}</span>
                              <span className={`text-xs font-black leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>{d}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => adminScrollerRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                        className="shrink-0 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-cyan-500/20 rounded-full text-white/50 hover:text-cyan-400 transition-all text-xs"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Match list */}
                  <div className="space-y-3">
                    {cardsLoading ? (
                      <>
                        <AdminMatchRowSkeleton />
                        <AdminMatchRowSkeleton />
                        <AdminMatchRowSkeleton />
                      </>
                    ) : filteredMatches.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <p className="font-black uppercase tracking-widest text-sm">Chương trình không tìm thấy trận đấu nào</p>
                      </div>
                    ) : (
                      filteredMatches.map(m => {
                        const matchBets = bets.filter(b => b.match_id === m.id);
                        const computedResult = getMatchResult(m);
                        const dbStatus = m.dc13_status || m.status || 'scheduled';
                        const isLive = dbStatus === 'live' || (dbStatus !== 'finished' && new Date(m.start_time) <= new Date());
                        const mStatus = isLive ? 'live' : dbStatus;
                        return (
                          <div key={m.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 md:p-5 hover:bg-white/[0.06] transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              {/* Match info */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-10 h-10 bg-black/40 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                    {m.team_a_code && <img src={`https://flagcdn.com/w160/${m.team_a_code.toLowerCase()}.png`} className="w-full h-full object-cover" />}
                                  </div>
                                  <div className="w-10 h-10 bg-black/40 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                    {m.team_b_code && <img src={`https://flagcdn.com/w160/${m.team_b_code.toLowerCase()}.png`} className="w-full h-full object-cover" />}
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-tight truncate">
                                    {m.team_a_name} <span className="text-slate-500 mx-1 text-[9px]">🏆</span> {m.team_b_name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isLive ? 'bg-rose-500 text-white animate-pulse' :
                                      mStatus === 'finished' ? 'bg-slate-700 text-slate-400' :
                                        'bg-cyan-500/20 text-cyan-400'
                                      }`}>{mStatus}</span>
                                    <span className="text-[9px] text-slate-500 font-bold">
                                      {new Date(m.start_time).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[12px] text-slate-600 font-bold">{matchBets.length} bet(s)</span>
                                    {mStatus === 'finished' && (
                                      <span className="text-[9px] font-black text-slate-400">
                                        Tỷ số: {m.dc13_score_a ?? 0} - {m.dc13_score_b ?? 0}
                                      </span>
                                    )}
                                    {computedResult && (
                                      <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        {computedResult === 'draw' ? 'HÒA' : computedResult === 'teamA' ? `${m.team_a_name} WIN` : `${m.team_b_name} WIN`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 justify-end shrink-0 flex-wrap">
                                {mStatus !== 'finished' && (
                                  <button onClick={() => setResultModal(m)} className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-500/20">
                                    Kết Quả
                                  </button>
                                )}
                                {mStatus === 'finished' && (
                                  <button onClick={() => handleResetMatchDirect(m.id)} className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-amber-500/20">
                                    Reset
                                  </button>
                                )}
                                <button
                                  onClick={() => handleExportMatchBets(m)}
                                  title="Xuất Excel dự đoán trận này"
                                  className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-cyan-500 hover:text-white rounded-xl border border-white/10 transition-all text-xs"
                                >
                                  📥
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMatch(m);
                                    if (!m.dc13_handicap_set) {
                                      setDc13KeoType('unset');
                                      setHandicapInputA('');
                                      setHandicapInputB('');
                                    } else if (m.dc13_handicap === 0 || m.dc13_handicap === undefined) {
                                      setDc13KeoType('draw');
                                      setHandicapInputA('');
                                      setHandicapInputB('');
                                    } else {
                                      setDc13KeoType('handicap');
                                      if (m.dc13_handicap < 0 || m.dc13_favorite_team === 'teamB') {
                                        setHandicapInputA(String(Math.abs(m.dc13_handicap)));
                                        setHandicapInputB('');
                                      } else {
                                        setHandicapInputA('');
                                        setHandicapInputB(String(Math.abs(m.dc13_handicap)));
                                      }
                                    }
                                  }}
                                  className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all text-xs"
                                >
                                  ✏️
                                </button>
                                <button onClick={() => handleDeleteMatch(m.id)} className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl border border-white/10 transition-all text-xs">🗑️</button>
                                {mStatus !== 'finished' && (
                                  <select
                                    value={m.dc13_betting_open === true ? 'open' : (m.dc13_betting_open === false ? 'closed' : 'auto')}
                                    onChange={(e) => handleUpdateBettingStatus(m.id, e.target.value)}
                                    className="bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[9px] font-black text-slate-300 focus:border-cyan-500 outline-none cursor-pointer h-9"
                                  >
                                    <option value="auto">🔄 Auto (30m)</option>
                                    <option value="open">🟢 Mở bet</option>
                                    <option value="closed">🔴 Đóng bet</option>
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Outright Admin Winner Selection Card */}
                  <div className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] border border-cyan-500/20 rounded-3xl p-6 shadow-xl space-y-4 mt-6">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <span>🏆 Quản Lý Đội Vô Địch (Outright)</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="space-y-2">
                        <label className={labelCls}>Chọn Đội Tuyển Vô Địch / Khóa </label>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                if (window.confirm(`Bạn có chắc chắn muốn đặt ${val} là đội vô địch?`)) {
                                  handleSetDC13OutrightWinner(val);
                                }
                              }
                            }}
                            value={outrightWinner && outrightWinner !== '__LOCKED__' ? outrightWinner : ''}
                            className="flex-1 min-w-[150px] bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:border-cyan-500 outline-none"
                          >
                            <option value="">-- Chọn đội vô địch --</option>
                            {DC13_TEAMS.map(team => (
                              <option key={team.name} value={team.name}>{team.name}</option>
                            ))}
                          </select>

                          {isOutrightLocked ? (
                            <button
                              onClick={() => {
                                if (window.confirm('Bạn có muốn mở khóa cổng nhận chọn vô địch?')) {
                                  handleSetDC13OutrightWinner(null);
                                }
                              }}
                              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0"
                            >
                              🔓 Mở khóa cổng
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (window.confirm('Bạn có chắc chắn muốn khóa cổng nhận chọn vô địch?')) {
                                  handleSetDC13OutrightWinner('__LOCKED__');
                                }
                              }}
                              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0"
                            >
                              🔒 Khóa cổng
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 italic">Đặt đội vô địch hoặc khóa sẽ dừng cổng nhận . Đóng/mở khóa cổng nhận bất kỳ lúc nào.</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái hiện tại</span>
                        {outrightWinner ? (
                          outrightWinner === '__LOCKED__' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-amber-500 uppercase">🔒 Cổng nhận đã khóa</span>
                              <span className="text-[10px] font-bold text-slate-500">(Chưa chọn đội vô địch)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-5 rounded overflow-hidden border border-white/20 shrink-0 bg-slate-800">
                                <img src={`https://flagcdn.com/w80/${getDC13TeamFlag(outrightWinner).toLowerCase()}.png`} className="w-full h-full object-cover" alt={outrightWinner} />
                              </div>
                              <span className="text-sm font-black text-emerald-400 uppercase">{outrightWinner}</span>
                              <span className="text-[10px] font-bold text-slate-500">(Đội vô địch chính thức)</span>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-emerald-400 font-bold block">🟢 Cổng nhận đang mở...</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </>
          )
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* Auth Modal (separate login model for DC_13) */}
      <DC13AuthModal
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingBetMatch(null); }}
        onSuccess={handleAuthSuccess}
      />

      {/* New Underdog Default Bet Rule Popup Modal */}
      {/* {showRuleModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={handleCloseRuleModal} />
          <div className="relative z-10 w-full max-w-lg bg-[#0e1726]/95 border border-cyan-500/35 rounded-[32px] overflow-hidden shadow-2xl p-8 text-center shadow-[0_0_50px_rgba(6,182,212,0.25)] animate-in zoom-in-95 duration-300">

            <button
              onClick={handleCloseRuleModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-cyan-400 transition-colors text-xl p-1 rounded-full hover:bg-white/5"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>

   
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              📢
            </div>

      
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
              Thông Báo Luật Bet Mới
            </h3>

            <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                Áp dụng từ 18:00 hôm nay (15/06/2026)
              </span>
            </div>

         
            <div className="space-y-4 text-left bg-slate-950/40 p-5 rounded-2xl border border-white/[0.04] mb-6">
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                Để đảm bảo tính công bằng và sự tham gia đầy đủ của toàn bộ người chơi trong giải đấu <span className="text-cyan-400 font-bold">DC13 Bet Championship</span>, Ban tổ chức áp dụng luật bổ sung sau:
              </p>
              <div className="flex gap-3 items-start border-t border-white/5 pt-4">
                <span className="text-rose-400 text-lg">⚠️</span>
                <p className="text-sm text-slate-300 leading-relaxed font-semibold">
                  Nếu người chơi <span className="text-rose-400 font-black">quên không bet</span> hoặc <span className="text-rose-400 font-black">không chọn kèo</span> trước thời điểm đóng  (30 phút trước giờ bóng lăn), hệ thống sẽ <span className="text-cyan-400 font-black">tự động xếp người chơi đó vào cửa đội kèo dưới (đội được chấp)</span> cho trận đấu đó.
                </p>
              </div>
            </div>

           
            <button
              onClick={handleCloseRuleModal}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-cyan-600 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.4)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.6)] transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Đã hiểu & Đồng ý
            </button>
          </div>
        </div>
      )} */}

      {/* DC13 Bet Modal */}
      {showBetModal && betMatch && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setShowBetModal(false); setBetMatch(null); }} />
          <div className="relative z-10 w-full max-w-md bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-cyan-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-cyan-500 to-teal-600 px-8 py-8 text-center">
              <button onClick={() => { setShowBetModal(false); setBetMatch(null); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg">✕</button>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 backdrop-blur-sm border border-white/30">🎯</div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Chọn Đội</h2>
              <p className="text-cyan-100 text-[14px] mt-2 opacity-80 uppercase font-bold tracking-widest">DC 13 • Thua -{PENALTY_AMOUNT.toLocaleString('vi-VN')} điểm</p>
            </div>

            {/* Match info */}
            <div className="px-8 pt-6 pb-2">
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-center">
                <p className="text-sm font-black text-white uppercase">
                  {betMatch.team_a_name} <span className="text-cyan-400 px-2">vs</span> {betMatch.team_b_name}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  {new Date(betMatch.start_time).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Rules */}
            <div className="px-8 py-3">
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <p className="text-[14px] text-slate-400 font-bold text-center">
                  ⚠️ Thua = <span className="text-rose-400 font-black">-{PENALTY_AMOUNT.toLocaleString('vi-VN')} điểm</span> • Thắng = <span className="text-emerald-400 font-black">0 điểm</span>
                </p>
              </div>
            </div>

            {/* Team selection buttons */}
            <div className="px-8 pb-6 space-y-3">
              <button
                onClick={() => handlePlaceBet('teamA')}
                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-cyan-600 border border-white/10 hover:border-cyan-500 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                {betMatch.team_a_code && (
                  <div className="w-8 h-6 rounded overflow-hidden border border-white/20">
                    <img src={`https://flagcdn.com/w80/${betMatch.team_a_code.toLowerCase()}.png`} className="w-full h-full object-cover" />
                  </div>
                )}
                <span>
                  {betMatch.team_a_name} {betMatch.dc13_handicap === 0 || betMatch.dc13_handicap === undefined ? '(0)' : betMatch.dc13_favorite_team === 'teamB' ? `(+${Math.abs(betMatch.dc13_handicap)})` : ''}
                </span>
              </button>
              <button
                onClick={() => handlePlaceBet('teamB')}
                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-cyan-600 border border-white/10 hover:border-cyan-500 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                {betMatch.team_b_code && (
                  <div className="w-8 h-6 rounded overflow-hidden border border-white/20">
                    <img src={`https://flagcdn.com/w80/${betMatch.team_b_code.toLowerCase()}.png`} className="w-full h-full object-cover" />
                  </div>
                )}
                <span>
                  {betMatch.team_b_name} {betMatch.dc13_handicap === 0 || betMatch.dc13_handicap === undefined ? '(0)' : betMatch.dc13_favorite_team === 'teamA' ? `(+${Math.abs(betMatch.dc13_handicap)})` : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Result Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setResultModal(null); setResultScoreA(0); setResultScoreB(0); }} />
          <div className="relative z-10 w-full max-w-md bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-cyan-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-cyan-500 to-teal-600 px-8 py-8 text-center relative">
              <button onClick={() => { setResultModal(null); setResultScoreA(0); setResultScoreB(0); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg">✕</button>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 backdrop-blur-sm border border-white/30">🏆</div>
              <h2 className="text-xl font-black text-white uppercase">Chọn Kết Quả</h2>
              <p className="text-cyan-100 text-sm mt-1">{resultModal.team_a_name} vs {resultModal.team_b_name}</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Score Input */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Nhập tỷ số trận đấu</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    {resultModal.team_a_code && (
                      <div className="w-10 h-7 rounded overflow-hidden border border-white/20">
                        <img src={`https://flagcdn.com/w80/${resultModal.team_a_code.toLowerCase()}.png`} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight truncate max-w-[80px]">{resultModal.team_a_name}</p>
                    <input
                      type="number"
                      min={0}
                      value={resultScoreA}
                      onChange={e => setResultScoreA(Math.max(0, Number(e.target.value)))}
                      className="w-16 h-14 bg-slate-900 rounded-xl text-center text-2xl font-black text-white border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all"
                    />
                  </div>
                  <span className="text-2xl font-black text-slate-500 mt-6">-</span>
                  <div className="flex flex-col items-center gap-1.5">
                    {resultModal.team_b_code && (
                      <div className="w-10 h-7 rounded overflow-hidden border border-white/20">
                        <img src={`https://flagcdn.com/w80/${resultModal.team_b_code.toLowerCase()}.png`} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight truncate max-w-[80px]">{resultModal.team_b_name}</p>
                    <input
                      type="number"
                      min={0}
                      value={resultScoreB}
                      onChange={e => setResultScoreB(Math.max(0, Number(e.target.value)))}
                      className="w-16 h-14 bg-slate-900 rounded-xl text-center text-2xl font-black text-white border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              {/* Result Preview & Confirm */}
              <div className="space-y-4">
                {(() => {
                  const handicapVal = resultModal.dc13_handicap || 0;
                  const favoriteTeamName = handicapVal > 0 ? resultModal.team_a_name : (handicapVal < 0 ? resultModal.team_b_name : '');
                  const handicapText = handicapVal === 0 ? 'Đồng banh (0)' : `${favoriteTeamName} chấp ${Math.abs(handicapVal)}`;

                  const effectiveScore = (resultScoreA - resultScoreB) - handicapVal;
                  let predictedWinnerStr = '';
                  let predictedWinnerColor = '';
                  if (effectiveScore > 0) {
                    predictedWinnerStr = `${resultModal.team_a_name} thắng kèo`;
                    predictedWinnerColor = 'text-emerald-400';
                  } else if (effectiveScore < 0) {
                    predictedWinnerStr = `${resultModal.team_b_name} thắng kèo`;
                    predictedWinnerColor = 'text-emerald-400';
                  } else {
                    predictedWinnerStr = 'Hòa kèo (0 điểm)';
                    predictedWinnerColor = 'text-slate-400';
                  }

                  return (
                    <div className="p-4 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center bg-slate-900/50 border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kèo trận đấu</p>
                      <p className="text-xs font-bold text-white">{handicapText}</p>
                      <div className="w-full border-t border-white/5 my-1.5" />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kết quả kèo dự kiến</p>
                      <p className={`text-sm font-black uppercase tracking-tight ${predictedWinnerColor}`}>{predictedWinnerStr}</p>
                    </div>
                  );
                })()}

                <button
                  onClick={() => handleSetResult(resultModal, resultScoreA, resultScoreB)}
                  className="w-full py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                >
                  Xác nhận kết quả
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outright Bet Placement Modal */}
      {outrightBettingOn && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setOutrightBettingOn(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-cyan-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-cyan-500 to-teal-600 px-8 py-8 text-center">
              <button onClick={() => setOutrightBettingOn(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg">✕</button>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 backdrop-blur-sm border border-white/30">🏆</div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Dự Đoán Đội Vô Địch</h2>
              <p className="text-cyan-100 text-[12px] mt-2 opacity-80 uppercase font-bold tracking-widest">DC 13 • Outright Winner</p>
            </div>

            {/* Selected Team Info */}
            <div className="px-8 pt-6 pb-2">
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center gap-4">
                <div className="w-16 h-10 rounded-lg overflow-hidden border border-white/20 shadow-md shrink-0 bg-slate-800">
                  <img src={`https://flagcdn.com/w160/${outrightBettingOn.code.toLowerCase()}.png`} className="w-full h-full object-cover" alt={outrightBettingOn.name} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Đội tuyển chọn</span>
                  <span className="text-base font-black text-white uppercase truncate block">{outrightBettingOn.name}</span>
                </div>
              </div>
            </div>

            {/* Input field */}
            <div className="px-8 py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Gía trị dự đoán (đ)</label>
                <div className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-mono font-bold flex justify-between items-center">
                  <span>Số cố định:</span>
                  <span className="text-cyan-400 text-lg">20đ</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 italic">Mỗi lượt dự đoán vô địch được cố định là 20đ theo luật chơi mới.</p>
              </div>

              {/* Estimated Rewards display */}
              {(() => {
                const teamBetsCount = outrightBets.filter(b => b.team_name === outrightBettingOn.name).length;
                const newTeamBetsCount = teamBetsCount + 1;
                const totalBetsCount = outrightBets.length;
                const newTotalBetsCount = totalBetsCount + 1;
                const estWinnings = newTeamBetsCount > 0 ? (20000 * (newTotalBetsCount - newTeamBetsCount)) / newTeamBetsCount : 0;
                const estTotal = 20000 + estWinnings;

                return (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Điểm dự đoán (Gốc):</span>
                      <span className="font-mono text-slate-200 font-bold">20 điểm</span>
                    </div>
                    <div className="flex justify-between items-center text-cyan-400">
                      <span>Điểm thắng chia quỹ dự kiến:</span>
                      <span className="font-mono font-black">+{formatVND(Math.round(estWinnings))} điểm</span>
                    </div>
                    <div className="border-t border-white/5 my-2 pt-2 flex justify-between items-center text-emerald-400 font-bold">
                      <span>Tổng thực nhận dự kiến:</span>
                      <span className="font-mono font-black text-sm">{formatVND(Math.round(estTotal))} điểm</span>
                    </div>
                    <p className="text-[9px] text-slate-500 text-center italic mt-1">Lưu ý: Đây là số liệu dự kiến nếu đội tuyển này vô địch, dựa trên số lượng hiện tại.</p>
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setOutrightBettingOn(null)}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
              >
                Hủy
              </button>
              <button
                disabled={outrightSubmitting}
                onClick={handlePlaceDC13OutrightBet}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-black uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {outrightSubmitting ? 'Đang gửi...' : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outright Edit Bet Modal */}
      {editingOutrightBet && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditingOutrightBet(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#1a1a1a] rounded-[32px] shadow-2xl border border-cyan-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-cyan-500 to-teal-600 px-8 py-8 text-center">
              <button onClick={() => setEditingOutrightBet(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-lg">✕</button>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 backdrop-blur-sm border border-white/30">✏️</div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Sửa Lượt Dự Đoán</h2>
              <p className="text-cyan-100 text-[12px] mt-2 opacity-80 uppercase font-bold tracking-widest">DC 13 • Chỉnh sửa giá trị dự đoán</p>
            </div>

            {/* Selected Team Info */}
            <div className="px-8 pt-6 pb-2">
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center gap-4">
                <div className="w-16 h-10 rounded-lg overflow-hidden border border-white/20 shadow-md shrink-0 bg-slate-800">
                  <img src={`https://flagcdn.com/w160/${getDC13TeamFlag(editingOutrightBet.team_name).toLowerCase()}.png`} className="w-full h-full object-cover" alt={editingOutrightBet.team_name} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Đội tuyển đã chọn</span>
                  <span className="text-base font-black text-white uppercase truncate block">{editingOutrightBet.team_name}</span>
                </div>
              </div>
            </div>

            {/* Input field */}
            <div className="px-8 py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Gía trị dự đoán mới (điểm)</label>
                <input
                  type="number"
                  min={20}
                  step={10}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-base focus:border-cyan-500 outline-none transition-all font-mono font-bold"
                  placeholder="Ví dụ: 100"
                  value={editOutrightAmount}
                  onChange={e => {
                    const val = e.target.value;
                    setEditOutrightAmount(val === '' ? '' : Number(val));
                  }}
                />
                <p className="text-[10px] text-slate-500 mt-1.5 italic">Dự đoán tối thiểu 20 điểm.</p>
              </div>

              {/* Estimated Rewards display */}
              {Number(editOutrightAmount) >= 20 && (() => {
                const refBet = normalizeBetAmount(Number(editOutrightAmount));
                const oldAmount = editingOutrightBet.amount;
                const diff = refBet - oldAmount;

                const teamPool = outrightBets.filter(b => b.team_name === editingOutrightBet.team_name).reduce((sum, b) => sum + b.amount, 0);
                const totalPool = outrightBets.reduce((sum, b) => sum + b.amount, 0);

                const newTotalPool = totalPool + diff;
                const newTeamPool = teamPool + diff;

                const estTotal = newTeamPool > 0 ? (refBet * newTotalPool) / newTeamPool : refBet;
                const estWinnings = estTotal - refBet;

                return (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Gía trị dự đoán mới (Gốc):</span>
                      <span className="font-mono text-slate-200 font-bold">{formatVND(refBet)} điểm</span>
                    </div>
                    <div className="flex justify-between items-center text-cyan-400">
                      <span>Điểm thắng chia quỹ dự kiến:</span>
                      <span className="font-mono font-black">+{formatVND(estWinnings)} điểm</span>
                    </div>
                    <div className="border-t border-white/5 my-2 pt-2 flex justify-between items-center text-emerald-400 font-bold">
                      <span>Tổng thực nhận dự kiến:</span>
                      <span className="font-mono font-black text-sm">{formatVND(estTotal)} điểm</span>
                    </div>
                    <p className="text-[9px] text-slate-500 text-center italic mt-1">Dự tính dựa trên tổng quỹ dự đoán hiện tại nếu bạn đổi thành dự đoán mới.</p>
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setEditingOutrightBet(null)}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
              >
                Hủy
              </button>
              <button
                disabled={outrightSubmitting || !editOutrightAmount || Number(editOutrightAmount) < 20}
                onClick={handleUpdateDC13OutrightBet}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-black uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {outrightSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DC13Page;
