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
  signals: string[];
  /** share of the tracked founder metrics we have data for, 0–100 */
  profileCoverage: number;
  corpusSources: string[];
}

/** One of the three screening axes — scored independently, never averaged. */
export interface Axis {
  name: string;
  score: number;
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
  /** overall application score + worded recommendation (Decision box: memo + score) */
  score: number;
  recommendation: Decision;
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

/* Companies below are real YC Spring 2026 startups (public directory data:
 * names, one-liners, founders, backgrounds). All scores, Big Five values,
 * sizing estimates, claims and memo content are illustrative mock analysis. */
export const APPLICATIONS: Application[] = [
  {
    id: "ploy",
    company: "Ploy",
    oneLiner: "Turns your website into your company's growth engine.",
    sector: "Martech",
    location: "San Francisco, US",
    track: "outbound",
    firstSignalAgoH: 3.8,
    founders: [
      {
        name: "Bryant Chou",
        role: "Founder / CTO",
        archetype: "Leader",
        big5: [87, 76, 62, 57, 71],
        founderScore: 91,
        signals: [
          "Webflow co-founder & CTO · 2013–2025",
          "Infra served ~1.5% of the internet",
          "Vungle co-founder → IPO",
        ],
        profileCoverage: 92,
        corpusSources: ["X", "LinkedIn", "Press"],
      },
    ],
    ensemble: "Solo Leader",
    axes: [
      { name: "Founder", score: 91 },
      { name: "Market", score: 72 },
      { name: "Idea vs Market", score: 76 },
    ],
    sizing: [
      { metric: "TAM", claimed: "$22B", computed: "$26B" },
      { metric: "SAM", claimed: "$3.4B", computed: "$2.9B" },
      { metric: "SOM", claimed: "$50M", computed: "$45M" },
    ],
    competitors: [
      {
        name: "Mutiny",
        angle: "Web personalization for growth teams — same buyer, earlier product",
        threat: "high",
      },
      {
        name: "Webflow",
        angle: "Owns the website layer; founder's own alma mater could extend into growth",
        threat: "medium",
      },
      {
        name: "Framer",
        angle: "AI site builder moving up-market, design-led not growth-led",
        threat: "medium",
      },
    ],
    idea: {
      innovation:
        "The website stops being a brochure and becomes an autonomous growth surface — continuously testing, personalizing, and converting without a growth team.",
      realistic:
        "Credible: the founder built the category-defining website platform for 12 years. Risk is distribution overlap with Webflow itself and Mutiny's head start with growth teams.",
    },
    claims: [
      {
        text: "Co-founder & CTO of Webflow, 2013–2025",
        trust: "verified",
        source: "LINKEDIN + PRESS",
        confidence: 99,
      },
      {
        text: "Vungle co-founder through IPO",
        trust: "verified",
        source: "CRUNCHBASE",
        confidence: 97,
      },
      {
        text: "20 design partners signed pre-launch",
        trust: "reported",
        source: "DECK P.7",
        confidence: 55,
      },
    ],
    memo: {
      score: 82,
      recommendation: "fund",
      snapshot:
        "Company websites are static brochures while growth budgets flow to ads. Ploy turns the website itself into the growth engine — founded solo by Webflow's co-founder/CTO, whose infrastructure served roughly 1.5% of the internet.",
      hypotheses: [
        { text: "Category-defining pedigree: 12y building the website platform itself", trust: "verified" },
        { text: "Second-time founder with a prior IPO (Vungle)", trust: "verified" },
        { text: "Websites as agentic growth surface is an unowned category", trust: "reported" },
      ],
      swot: {
        s: "Founder Score 91 — highest in pipeline, fully verified track record",
        w: "Solo founder; design-partner traction is deck-only so far",
        o: "Growth tooling is fragmented; no incumbent owns the website-as-engine wedge",
        r: "Mutiny has the growth-team relationships; Webflow could bundle a lite version",
      },
    },
  },
  {
    id: "agentphone",
    company: "AgentPhone",
    oneLiner: "Phone numbers for AI agents — telephony infrastructure for voice and messaging.",
    sector: "AI infra",
    location: "New York, US",
    track: "inbound",
    firstSignalAgoH: 9.4,
    founders: [
      {
        name: "Manav Modi",
        role: "Co-founder",
        archetype: "Developer",
        big5: [83, 66, 78, 52, 64],
        founderScore: 70,
        signals: [
          "Vogue app redesign · 100K → 1M users",
          "BS Computer Engineering · UIUC",
          "X · agent-infra builds in public",
        ],
        profileCoverage: 64,
        corpusSources: ["X", "LinkedIn"],
      },
      {
        name: "Meet Modi",
        role: "Co-founder",
        archetype: "Engineer",
        big5: [88, 74, 49, 58, 61],
        founderScore: 74,
        signals: [
          "Meta · WhatsApp agent infra, 280M businesses",
          "BS CS & Linguistics · UCLA",
          "GitHub · telephony tooling",
        ],
        profileCoverage: 71,
        corpusSources: ["GitHub", "LinkedIn"],
      },
    ],
    ensemble: "Developer + Engineer",
    axes: [
      { name: "Founder", score: 72 },
      { name: "Market", score: 61 },
      { name: "Idea vs Market", score: 70 },
    ],
    sizing: [
      { metric: "TAM", claimed: "$58B", computed: "$41B" },
      { metric: "SAM", claimed: "$4B", computed: "$2.6B" },
      { metric: "SOM", claimed: "$80M", computed: "$60M" },
    ],
    competitors: [
      {
        name: "Twilio",
        angle: "Owns the rails — could ship agent-native numbers on existing scale",
        threat: "high",
      },
      {
        name: "Bland AI",
        angle: "AI voice agents; owns the conversation layer, not the number",
        threat: "medium",
      },
      {
        name: "Telnyx",
        angle: "Developer telephony, no agent identity layer",
        threat: "low",
      },
    ],
    idea: {
      innovation:
        "Agents as first-class telecom subscribers: a phone number, voice, and messaging identity issued to software, not people.",
      realistic:
        "The team ran exactly this problem at WhatsApp scale, which is rare. But the wedge only holds if agent-native features (identity, consent, rate control) stay ahead of Twilio bolting them on.",
    },
    claims: [
      {
        text: "Built WhatsApp business-agent infra serving 280M+ businesses",
        trust: "verified",
        source: "LINKEDIN + PRESS",
        confidence: 90,
      },
      {
        text: "$12K MRR from 40 developer teams",
        trust: "reported",
        source: "DECK P.8",
        confidence: 55,
      },
      {
        text: "\"Only agent-native phone provider\"",
        trust: "contradicted",
        source: "WEB SCAN",
        confidence: 35,
      },
    ],
    memo: {
      score: 73,
      recommendation: "fund",
      snapshot:
        "AI agents are becoming economic actors but can't hold a phone number. AgentPhone sells telephony built for agents — numbers, voice, messaging — from a team that ran WhatsApp's business-agent infrastructure at Meta.",
      hypotheses: [
        { text: "Team shipped this exact infra at Meta scale (280M businesses)", trust: "verified" },
        { text: "Agent-native identity is a new primitive incumbents don't own", trust: "reported" },
        { text: "Early developer revenue suggests real pull ($12K MRR)", trust: "reported" },
      ],
      swot: {
        s: "Rare, directly relevant infra pedigree — verified via LinkedIn and press",
        w: "Revenue is deck-only; uniqueness claim contradicted by web scan",
        o: "Every agent platform needs a comms identity layer; nobody owns it yet",
        r: "Twilio ships agent features on existing rails and commoditizes the wedge",
      },
    },
  },
  {
    id: "cohesion",
    company: "Cohesion",
    oneLiner: "AI agents that automate research for institutional investors.",
    sector: "Fintech",
    location: "New York, US",
    track: "inbound",
    firstSignalAgoH: 18.6,
    founders: [
      {
        name: "Devon Krapcho",
        role: "CEO",
        archetype: "Accomplisher",
        big5: [72, 86, 74, 49, 68],
        founderScore: 68,
        signals: [
          "5y hedge fund analyst · Long Path Partners",
          "Covered software equities",
          "Substack · earnings breakdowns",
        ],
        profileCoverage: 69,
        corpusSources: ["LinkedIn", "Substack"],
      },
      {
        name: "Matthew McBrien",
        role: "Co-founder",
        archetype: "Engineer",
        big5: [80, 72, 42, 54, 63],
        founderScore: 65,
        signals: ["AWS Security · Amazon", "GitHub · infra tooling", "Low public footprint"],
        profileCoverage: 41,
        corpusSources: ["GitHub", "LinkedIn"],
      },
      {
        name: "Matt Munns",
        role: "Co-founder",
        archetype: "Developer",
        big5: [84, 61, 55, 60, 57],
        founderScore: 66,
        signals: ["T. Rowe Price · AI for investors", "Shipped internal analyst tools", "LinkedIn only"],
        profileCoverage: 33,
        corpusSources: ["LinkedIn"],
      },
    ],
    ensemble: "Accomplisher + Engineer + Developer",
    axes: [
      { name: "Founder", score: 67 },
      { name: "Market", score: 58 },
      { name: "Idea vs Market", score: 63 },
    ],
    sizing: [
      { metric: "TAM", claimed: "$12B", computed: "$9B" },
      { metric: "SAM", claimed: "$1.8B", computed: "$1B" },
      { metric: "SOM", claimed: "$40M", computed: "$30M" },
    ],
    competitors: [
      {
        name: "AlphaSense",
        angle: "$4B incumbent in market intelligence — breadth over agent depth",
        threat: "high",
      },
      {
        name: "Hebbia",
        angle: "AI research for finance, overlapping ICP and well funded",
        threat: "medium",
      },
      {
        name: "Fintool",
        angle: "Earnings-focused AI analyst, narrower scope",
        threat: "low",
      },
    ],
    idea: {
      innovation:
        "An agentic teammate that tracks earnings, filings, podcasts, and social chatter continuously — research as an always-on process, not a query.",
      realistic:
        "Buyer-insider founding team is the edge; the space is crowded and defensibility rests on workflow depth per fund, not the underlying models.",
    },
    claims: [
      {
        text: "CEO covered software 5+ years at Long Path Partners",
        trust: "verified",
        source: "LINKEDIN",
        confidence: 95,
      },
      {
        text: "3 hedge funds in paid pilots",
        trust: "reported",
        source: "DECK P.5",
        confidence: 55,
      },
      {
        text: "\"Fastest-growing AI research tool for funds\"",
        trust: "contradicted",
        source: "WEB SCAN",
        confidence: 30,
      },
    ],
    memo: {
      score: 67,
      recommendation: "observe",
      snapshot:
        "Institutional investors drown in earnings calls, filings, podcasts, and social chatter. Cohesion's agents track all of it and deliver analyst-grade research — built by a hedge-fund analyst with two fintech engineers.",
      hypotheses: [
        { text: "Founder is the buyer: 5y as the analyst this replaces", trust: "verified" },
        { text: "Paid pilots suggest willingness to pay at fund level", trust: "reported" },
        { text: "Always-on agent coverage beats query-based incumbents", trust: "reported" },
      ],
      swot: {
        s: "Domain-insider CEO with verified coverage track record",
        w: "Two of three founders have thin public footprints (33–41% coverage)",
        o: "Funds pay heavily for research tooling; agent-native rebuild is early",
        r: "AlphaSense and Hebbia can outspend on the same ICP",
      },
    },
  },
  {
    id: "rentahuman",
    company: "RentAHuman",
    oneLiner: "Marketplace for AI agents to hire humans.",
    sector: "Marketplace",
    location: "San Francisco, US",
    track: "outbound",
    firstSignalAgoH: 26.1,
    founders: [
      {
        name: "Alexander Liteplo",
        role: "Solo founder",
        archetype: "Developer",
        big5: [93, 48, 85, 35, 52],
        founderScore: 61,
        signals: [
          "RentAHuman.ai · 500k users in 2 wks",
          "Featured in Forbes, Wired, Futurism",
          "Serial builder · rapid launches",
        ],
        profileCoverage: 57,
        corpusSources: ["X", "Press", "HN"],
      },
    ],
    ensemble: "Solo Developer",
    axes: [
      { name: "Founder", score: 60 },
      { name: "Market", score: 47 },
      { name: "Idea vs Market", score: 52 },
    ],
    sizing: [
      { metric: "TAM", claimed: "$120B", computed: "$30B" },
      { metric: "SAM", claimed: "$6B", computed: "$2B" },
      { metric: "SOM", claimed: "$25M", computed: "$28M" },
    ],
    competitors: [
      {
        name: "Payman",
        angle: "AI-to-human payments with the same agent-employer thesis",
        threat: "high",
      },
      {
        name: "Mechanical Turk",
        angle: "Amazon's human-task rails — no agent interface, but instant scale if added",
        threat: "medium",
      },
      {
        name: "Prolific",
        angle: "Human workforce for AI, research-focused",
        threat: "low",
      },
    ],
    idea: {
      innovation:
        "Inverts the gig economy: the AI agent is the employer, and humans become callable endpoints for physical-world tasks.",
      realistic:
        "The launch proved viral curiosity, not durable demand — repeat usage and task quality are unproven, and the TAM framing assumes agents route real labor spend soon.",
    },
    claims: [
      {
        text: "500k users within 2 weeks of launch",
        trust: "verified",
        source: "PRESS + ANALYTICS",
        confidence: 88,
      },
      {
        text: "$20K MRR two weeks post-launch",
        trust: "reported",
        source: "PRESS QUOTE",
        confidence: 60,
      },
      {
        text: "40% of tasks completed in under an hour",
        trust: "reported",
        source: "DECK P.6",
        confidence: 45,
      },
    ],
    memo: {
      score: 55,
      recommendation: "pass",
      snapshot:
        "When an AI agent hits a task that needs hands, it stalls. RentAHuman is a marketplace where agents hire humans as API endpoints — 500k users and $20K MRR within two weeks of a viral launch, but durability is unproven.",
      hypotheses: [
        { text: "Launch virality is real and externally verified", trust: "verified" },
        { text: "Agent-as-employer is early positioning in a real coming market", trust: "reported" },
        { text: "Revenue quality unclear — novelty spike vs. recurring demand", trust: "reported" },
      ],
      swot: {
        s: "Proven distribution instinct — three national press features in two weeks",
        w: "Solo founder; trait profile far from benchmark on 3 of 5 domains",
        o: "If agents do route labor spend, the early marketplace wins big",
        r: "TAM overstated ~4×; Payman targets the same wedge with payments rails",
      },
    },
  },
];
