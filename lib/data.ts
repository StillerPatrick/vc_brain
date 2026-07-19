export type TrustLevel = "verified" | "reported" | "contradicted";
export type Decision = "fund" | "observe" | "pass";

export interface Founder {
  name: string;
  role: string;
  /** FOALED archetype (McCarthy et al. 2023) */
  archetype: string;
  /** Big Five percentiles, order: OPN CON EXT AGR STA */
  big5: number[];
  /** Persistent Founder Score, 0–100 — survives across applications */
  founderScore: number;
  /** Optional label when a live backend value is not the persistent Founder Score. */
  scoreLabel?: string;
  signals: string[];
  /** share of the tracked founder metrics we have data for, 0–100 */
  profileCoverage: number;
  corpusSources: string[];
  /** Canonical profile URL for each source chip when available. */
  sourceLinks?: Record<string, string>;
}

/** One of the three screening axes — scored independently, never averaged.
 *  `score` is null while the analysis hasn't produced it yet. */
export interface Axis {
  name: string;
  score: number | null;
}

export interface Claim {
  text: string;
  trust: TrustLevel;
  source: string;
  confidence: number; // 0–100
}

/** TAM/SAM/SOM — the deck's claimed figure vs. our own bottom-up estimate. */
export interface SizingRow {
  metric: "TAM" | "SAM" | "SOM";
  claimed: string;
  computed: string;
}

/** Named competitors (memo: how each differs, who becomes a threat). Max 3 shown. */
export interface Competitor {
  name: string;
  angle: string;
  threat: "high" | "medium" | "low";
}

export interface IdeaAnalysis {
  /** what the actual innovation is, in plain language */
  innovation: string;
  /** does it survive scrutiny as-is — the reality check */
  realistic: string;
}

/** Investment memo, required sections per challenge Appendix 1.
 *  Snapshot covers Company snapshot + Problem & product; Traction & KPIs
 *  render from the application's `claims`. */
export interface Memo {
  /** overall application score + worded recommendation; null until analyses complete */
  score: number | null;
  recommendation: Decision | null;
  snapshot: string;
  hypotheses: { text: string; trust?: TrustLevel }[];
  swot: { s: string; w: string; o: string; r: string };
}

export interface Application {
  id: string;
  company: string;
  oneLiner: string;
  sector: string;
  location: string;
  track: "inbound" | "outbound";
  /** hours since first signal, at page load */
  firstSignalAgoH: number;
  founders: Founder[];
  ensemble: string;
  axes: Axis[];
  sizing: SizingRow[];
  competitors: Competitor[];
  idea: IdeaAnalysis;
  claims: Claim[];
  memo: Memo;
}

/** Successful-founder benchmark percentiles (McCarthy et al. 2023):
 *  high adventurousness/openness, low modesty, high activity level. */
export const BENCHMARK = [86, 64, 72, 41, 55];

/** Successful-team footprint (Fig. 2B): teams of successful startups score
 *  higher on the max of each domain across co-founders. */
export const TEAM_BENCH = [85, 70, 70, 55, 60];

export const ARCHETYPES = ["Fighter", "Operator", "Accomplisher", "Leader", "Engineer", "Developer"];

/** Founder-type configurations with elevated success odds (Fig. 2C, approx. odds ratios). */
export const HIGH_ODDS_COMBOS = [
  { roles: ["Leader", "Developer", "Developer"], odds: 12.9 },
  { roles: ["Developer", "Developer", "Operator"], odds: 8.6 },
  { roles: ["Engineer", "Leader", "Developer"], odds: 8.4 },
  { roles: ["Accomplisher", "Accomplisher", "Accomplisher"], odds: 2.9 },
  { roles: ["Developer", "Operator"], odds: 2.1 },
  { roles: ["Accomplisher", "Accomplisher"], odds: 1.8 },
];
export const BIG5_AXES = ["OPN", "CON", "EXT", "AGR", "STA"];
export const BIG5_KEY =
  "OPN Openness · CON Conscientiousness · EXT Extraversion · AGR Agreeableness · STA Emotional stability";
