"use client";

import type { ReactNode } from "react";
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
    (analysis.source_summary.linkedin_snapshots ?? 0) +
      (analysis.source_summary.linkedin_profile_snapshots ?? 0),
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

/* ── founder deep dive: every stored field, "–" when missing ── */

function dash(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

function Item({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-line py-1.5 last:border-b-0">
      <span className="w-36 shrink-0 pt-0.5 font-mono text-[10px] uppercase leading-relaxed text-mut">
        {label}
      </span>
      <span className="min-w-0 text-[13px] leading-relaxed">{value ?? "–"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="eyebrow">{title}</div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function ProfileLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <>–</>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="break-all text-navy hover:underline">
      {label} ↗
    </a>
  );
}

export function FounderDeepDive({
  founder,
  onClose,
}: {
  founder: ApplicationFounder;
  onClose: () => void;
}) {
  const analysis = founder.analysis;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/25"
      role="dialog"
      aria-modal="true"
      aria-labelledby="founder-deep-dive-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-card p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div>
            <div className="eyebrow">Founder deep dive</div>
            <h2 id="founder-deep-dive-title" className="mt-1 text-2xl font-bold">
              {founder.name}
            </h2>
            <p className="mt-1 text-sm text-sub">
              {dash(founder.role)}
              {analysis ? ` · ${displayRole(analysis.classification)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy"
            aria-label="Close founder deep dive"
          >
            Close
          </button>
        </div>

        <Section title="Application">
          <Item label="Role" value={dash(founder.role)} />
          <Item label="About" value={dash(founder.about)} />
          <Item label="Scrape job" value={dash(founder.job_status)} />
          <Item label="Job error" value={dash(founder.job_error)} />
        </Section>

        <Section title="Public profiles">
          <Item
            label="GitHub"
            value={
              <ProfileLink
                href={founder.github_handle ? `https://github.com/${founder.github_handle}` : null}
                label={founder.github_handle ?? ""}
              />
            }
          />
          <Item
            label="LinkedIn"
            value={<ProfileLink href={founder.linkedin_url} label="Profile" />}
          />
          <Item
            label="X"
            value={
              <ProfileLink
                href={founder.twitter_handle ? `https://x.com/${founder.twitter_handle}` : null}
                label={`@${founder.twitter_handle ?? ""}`}
              />
            }
          />
        </Section>

        <Section title="CV — from LinkedIn profile">
          <Item label="Headline" value={dash(founder.headline)} />
          <Item
            label="Current role"
            value={
              founder.current_position || founder.current_company
                ? `${dash(founder.current_position)} · ${dash(founder.current_company)}`
                : "–"
            }
          />
          <Item
            label="Experience"
            value={
              founder.years_experience != null ? `${founder.years_experience} years` : "–"
            }
          />
          <Item
            label="Highest degree"
            value={
              founder.highest_degree || founder.field_of_study
                ? `${dash(founder.highest_degree)} · ${dash(founder.field_of_study)}`
                : "–"
            }
          />
          <Item
            label="Location"
            value={
              founder.location_text
                ? `${founder.location_text}${founder.country_code ? ` (${founder.country_code})` : ""}`
                : "–"
            }
          />
          <Item label="Connections" value={dash(founder.connections_count)} />
          <Item label="Followers" value={dash(founder.follower_count)} />
          <Item
            label="CV scraped"
            value={founder.cv_scraped_at ? founder.cv_scraped_at.slice(0, 16).replace("T", " ") : "–"}
          />
        </Section>

        <Section title="Work history">
          {founder.experience?.length ? (
            founder.experience.map((entry, index) => (
              <div key={index} className="border-b border-line py-2 last:border-b-0">
                <div className="text-[13px] font-semibold">
                  {dash(entry.position)} · {dash(entry.company)}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-mut">
                  {dash(entry.start)} – {dash(entry.end)}
                  {entry.duration ? ` · ${entry.duration}` : ""}
                  {entry.employment_type ? ` · ${entry.employment_type}` : ""}
                </div>
                {entry.description && (
                  <p className="mt-1 text-xs leading-relaxed text-sub">{entry.description}</p>
                )}
              </div>
            ))
          ) : (
            <Item label="Entries" value="–" />
          )}
        </Section>

        <Section title="Education">
          {founder.education?.length ? (
            founder.education.map((entry, index) => (
              <div key={index} className="border-b border-line py-2 last:border-b-0">
                <div className="text-[13px] font-semibold">
                  {dash(entry.degree)} · {dash(entry.field)}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-mut">
                  {dash(entry.school)}
                  {entry.period ? ` · ${entry.period}` : ""}
                  {entry.grade ? ` · ${entry.grade}` : ""}
                </div>
              </div>
            ))
          ) : (
            <Item label="Entries" value="–" />
          )}
        </Section>

        <Section title="Skills">
          <p className="text-[13px] leading-relaxed">
            {founder.skills?.length ? founder.skills.join(" · ") : "–"}
          </p>
        </Section>

        <Section title="Personality analysis">
          {analysis ? (
            <>
              <div className="mb-2 mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ["Openness", analysis.openness],
                    ["Conscientiousness", analysis.conscientiousness],
                    ["Extraversion", analysis.extraversion],
                    ["Agreeableness", analysis.agreeableness],
                    ["Stability", analysis.emotional_stability],
                    ["Confidence", analysis.confidence],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-md border border-line bg-page p-2.5">
                    <div className="font-mono text-lg font-semibold text-navy">
                      {label === "Confidence" ? `${Math.round(value * 100)}%` : value.toFixed(1)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-sub">{label}</div>
                  </div>
                ))}
              </div>
              <Item label="Classification" value={displayRole(analysis.classification)} />
              <Item label="Summary" value={analysis.summary} />
              <Item label="Rationale" value={analysis.rationale} />
              <Item label="Model" value={dash(analysis.model)} />
              <Item
                label="Sources used"
                value={Object.entries(analysis.source_summary)
                  .map(([key, count]) => `${key.replace(/_/g, " ")}: ${count}`)
                  .join(" · ")}
              />
              <Item
                label="Analyzed"
                value={analysis.created_at.slice(0, 16).replace("T", " ")}
              />
            </>
          ) : (
            <Item label="Status" value="– no analysis yet" />
          )}
        </Section>
      </div>
    </div>
  );
}
