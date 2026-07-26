import type { MatchData } from "../detection/types";

export type ProviderSearchResult = {
  provider: string;
  externalId: string;
  league?: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
};

export interface MatchDataProvider {
  readonly id: string;
  readonly label: string;
  isAvailable(): boolean;
  searchMatches(query: {
    text?: string;
    league?: string;
    from?: string; // ISO date
    to?: string;
  }): Promise<ProviderSearchResult[]>;
  getMatchDetail(externalId: string): Promise<Partial<MatchData> | null>;
}

// Track providers hitting rate limits so the chain skips them for a while.
const cooldown = new Map<string, number>();
export function markCoolDown(providerId: string, ms = 60 * 60 * 1000) {
  cooldown.set(providerId, Date.now() + ms);
}
export function inCoolDown(providerId: string): boolean {
  const until = cooldown.get(providerId);
  return until != null && until > Date.now();
}
