"use client";

import { ApplicationFounder, StartupApplication } from "@/lib/api";
import { Application, Founder } from "@/lib/data";

function displayRole(role: string) {
  return role === "dev" ? "Developer" : role.charAt(0).toUpperCase() + role.slice(1);
}

function marketSize(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "$ –";
  const magnitude = [
    { minimum: 1_000_000_000_000, suffix: "T" },
    { minimum: 1_000_000_000, suffix: "B" },
    { minimum: 1_000_000, suffix: "M" },
    { minimum: 1_000, suffix: "K" },
  ].find((item) => Math.abs(value) >= item.minimum);
  if (!magnitude) return `$${Number(value.toFixed(1))}`;
  const compact = Number((value / magnitude.minimum).toFixed(1));
  return `$${compact}${magnitude.suffix}`;
}

function founderView(founder: ApplicationFounder, status: StartupApplication["status"]): Founder {
  const analysis = founder.analysis;
  // tabs show every profile the founder supplied, linked to the profile
  const sourceLinks: Record<string, string> = {
    ...(founder.github_handle
      ? { GitHub: `https://github.com/${founder.github_handle}` }
      : {}),
    ...(founder.linkedin_url ? { LinkedIn: founder.linkedin_url } : {}),
    ...(founder.twitter_handle ? { X: `https://x.com/${founder.twitter_handle}` } : {}),
  };
  const provided = Object.keys(sourceLinks);
  if (!analysis) {
    return {
      name: founder.name,
      role: founder.role ?? "Founder",
      archetype: "–",
      big5: [0, 0, 0, 0, 0],
      founderScore: 0,
      signals: [status === "processing" ? "Analysis in progress…" : "Analysis unavailable"],
      profileCoverage: 0,
      corpusSources: provided,
      sourceLinks,
    };
  }
  // coverage still reflects which sources actually delivered data
  const withData = [
    analysis.source_summary.github_snapshots,
    analysis.source_summary.linkedin_snapshots,
    analysis.source_summary.twitter_snapshots,
  ].filter(Boolean).length;
  return {
    name: founder.name,
    role: founder.role ?? "Founder",
    archetype: displayRole(analysis.classification),
    big5: [
      analysis.openness * 20,
      analysis.conscientiousness * 20,
      analysis.extraversion * 20,
      analysis.agreeableness * 20,
      analysis.emotional_stability * 20,
    ],
    founderScore: Math.round(analysis.confidence * 100),
    scoreLabel: "confidence",
    signals: [analysis.summary],
    profileCoverage: Math.round((withData / 3) * 100),
    corpusSources: provided,
    sourceLinks,
  };
}

/** Map a live backend application onto the dossier shape. Sections the
 *  backend doesn't produce yet render as empty ("–") in the same widgets. */
export function toApplicationView(live: StartupApplication, currentTime: number): Application {
  const hours =
    Math.round(((currentTime - new Date(live.created_at).getTime()) / 3_600_000) * 10) / 10;
  const metadata = live.metadata;
  return {
    id: live.id,
    company: metadata?.company_name ?? live.company,
    oneLiner: live.one_liner ?? "No company one-liner supplied.",
    sector: live.sector ?? "Sector not supplied",
    location: live.location ?? "Location not supplied",
    track: "inbound",
    firstSignalAgoH: Math.max(0, hours),
    founders: live.founders.map((founder) => founderView(founder, live.status)),
    ensemble: live.team_categorization?.ensemble ?? "–",
    axes: [
      { name: "Founder", score: null },
      { name: "Market", score: null },
      { name: "Idea vs Market", score: null },
    ],
    sizing: [
      {
        metric: "TAM",
        claimed: marketSize(metadata?.tam),
        computed: marketSize(metadata?.estimated_tam),
        detail: metadata?.market_sizing?.tam.rationale,
      },
      {
        metric: "SAM",
        claimed: marketSize(metadata?.sam),
        computed: marketSize(metadata?.estimated_sam),
        detail: metadata?.market_sizing?.sam.rationale,
      },
      {
        metric: "SOM",
        claimed: marketSize(metadata?.som),
        computed: marketSize(metadata?.estimated_som),
        detail: metadata?.market_sizing?.som.rationale,
      },
    ],
    competitors: metadata?.competitors?.map((competitor) => ({
      name: competitor.name,
      angle: competitor.differentiation,
      threat: competitor.threat,
      url: competitor.website_url,
    })) ?? [],
    idea: { innovation: "–", realistic: "–" },
    claims: metadata?.traction_kpis?.map((kpi) => ({
      text: kpi.text,
      trust: kpi.trust,
      source: kpi.source_urls.length > 0
        ? new URL(kpi.source_urls[0]).hostname.replace(/^www\./, "")
        : "web research",
      confidence: kpi.confidence,
    })) ?? [],
    memo: {
      score: null,
      recommendation: null,
      snapshot: metadata?.summary_sentences?.join(" ") ?? "–",
      hypotheses: metadata?.investment_hypotheses?.map((item) => ({
        text: item.text,
      })) ?? [],
      swot: {
        s: metadata?.swot_strengths?.map((item) => item.text) ?? [],
        w: metadata?.swot_weaknesses?.map((item) => item.text) ?? [],
        o: metadata?.swot_opportunities?.map((item) => item.text) ?? [],
        r: metadata?.swot_threats?.map((item) => item.text) ?? [],
      },
    },
  };
}
