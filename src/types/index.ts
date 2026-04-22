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
  created_at?: string;
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
