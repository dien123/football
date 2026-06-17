import { BetOption, Match } from '../types';

export type BetOutcome = 'WIN_FULL' | 'WIN_HALF' | 'PUSH' | 'LOSS_HALF' | 'LOSS_FULL';

export interface CalculationResult {
  outcome: BetOutcome;
  payout: number;
}

/**
 * Calculates the outcome and payout for a bet based on Asian Handicap logic.
 */
export const calculateBetResult = (
  option: BetOption,
  amount: number,
  scoreA: number,
  scoreB: number,
  matchData: {
    handicap: number;
    rateA: number;
    rateB: number;
    teamAName?: string;
    teamBName?: string;
  }
): CalculationResult => {
  const { handicap, rateA, rateB, teamAName } = matchData;
  const diff = scoreA - scoreB;
  const effectiveScore = diff - handicap;

  let outcome: BetOutcome = 'PUSH';

  // Backward compatibility: match team name OR the legacy 'teamA' label
  const isBetOnTeamA = option === 'teamA' || (teamAName && option === teamAName);
  const rate = isBetOnTeamA ? rateA : rateB;

  if (isBetOnTeamA) {
    if (effectiveScore >= 0.5) outcome = 'WIN_FULL';
    else if (effectiveScore === 0.25) outcome = 'WIN_HALF';
    else if (effectiveScore === 0) outcome = 'PUSH';
    else if (effectiveScore === -0.25) outcome = 'LOSS_HALF';
    else outcome = 'LOSS_FULL';
  } else {
    // Bet on Team B
    if (effectiveScore <= -0.5) outcome = 'WIN_FULL';
    else if (effectiveScore === -0.25) outcome = 'WIN_HALF';
    else if (effectiveScore === 0) outcome = 'PUSH';
    else if (effectiveScore === 0.25) outcome = 'LOSS_HALF';
    else outcome = 'LOSS_FULL';
  }

  let payout = 0;
  switch (outcome) {
    case 'WIN_FULL':
      payout = (amount * rate) / 100;
      break;
    case 'WIN_HALF':
      payout = (amount * rate) / 200;
      break;
    case 'PUSH':
      payout = 0;
      break;
    case 'LOSS_HALF':
      payout = -amount / 2;
      break;
    case 'LOSS_FULL':
      payout = -amount;
      break;
  }

  return {
    outcome,
    payout: Math.round(payout),
  };
};

export const getOutcomeLabel = (outcome: BetOutcome): string => {
  switch (outcome) {
    case 'WIN_FULL': return 'Thắng';
    case 'WIN_HALF': return 'Thắng nửa';
    case 'PUSH': return 'Hòa ';
    case 'LOSS_HALF': return 'Thua nửa';
    case 'LOSS_FULL': return 'Thua';
    default: return '';
  }
};

export const getOutcomeColorCls = (outcome: BetOutcome): string => {
  switch (outcome) {
    case 'WIN_FULL': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'WIN_HALF': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'PUSH': return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    case 'LOSS_HALF': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    case 'LOSS_FULL': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    default: return 'text-slate-400';
  }
};

export const isMatchBettingLocked = (match: Match): boolean => {
  // Trận đấu đã kết thúc thì luôn khóa
  if (match.status === 'finished') return true;

  // Ghi đè thủ công từ Admin
  if (match.betting_open === true) return false;  // Force Open
  if (match.betting_open === false) return true; // Force Closed

  // Mặc định tự động theo thời gian thực
  const LOCK_MINUTES = 30;
  const now = new Date().getTime();
  const kick = new Date(match.start_time).getTime();
  const diffMinutes = (kick - now) / 60000;
  return diffMinutes <= LOCK_MINUTES;
};
