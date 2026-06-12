export type BetOption = string;

export interface Match {
  id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_icon: string;
  team_b_icon: string;
  team_a_code?: string; // ISO country code
  team_b_code?: string; // ISO country code
  stadium: string;
  league: string;
  start_time: string;
  commentator: string;
  status: string; // 'scheduled', 'live', 'finished'
  handicap: number;
  rate_a: number;
  rate_b: number;
  score_a: number;
  score_b: number;
  favorite_team: BetOption;
  betting_open?: boolean | null; // Control betting override: true = force open, false = force closed, null/undefined = auto
  created_at?: string;
  dc13_handicap?: number;
  dc13_favorite_team?: BetOption;
  dc13_status?: string;
  dc13_score_a?: number;
  dc13_score_b?: number;
  dc13_handicap_set?: boolean;
  dc13_betting_open?: boolean | null;
}

export interface Bet {
  id: string;
  match_id: string;
  user_name: string;
  amount: number;
  option: BetOption;
  created_at: string;
}

export interface AppState {
  matches: Match[];
  bets: Bet[];
  is_loading: boolean;
}

export interface OutrightOption {
  id: string;
  tournament: string;
  team_name: string;
  team_code?: string;
  team_icon: string;
  is_winner?: boolean;
}

export interface OutrightBet {
  id: string;
  outright_id: string;
  user_name: string;
  amount: number;
  created_at: string;
}

// ─── DC_13 Types ──────────────────────────────────────────────────────────────
export interface DC13Match {
  id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_code?: string;
  team_b_code?: string;
  start_time: string;
  status: string;          // 'scheduled' | 'live' | 'finished'
  result: string | null;   // 'teamA' | 'teamB' | 'draw' | null
  betting_open?: boolean | null;
  created_at?: string;
}

export interface DC13Profile {
  id: string;
  email: string;
  full_name: string;
  created_at?: string;
}

export interface DC13Bet {
  id: string;
  match_id: string;
  user_id: string;
  user_name: string;
  chosen_team: string;   // 'teamA' | 'teamB'
  result: string;        // 'pending' | 'win' | 'loss'
  created_at: string;
  dc13_profiles?: {
    full_name: string;
  } | null;
}
