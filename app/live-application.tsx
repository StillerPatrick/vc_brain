"use client";

import { useEffect, useState } from "react";
import { ApplicationFounder, StartupApplication } from "@/lib/api";
import { Founder } from "@/lib/data";
import { FOUNDER_COLORS, FounderCard } from "./ui";

function displayRole(role: string) {
  return role === "dev" ? "Developer" : role.charAt(0).toUpperCase() + role.slice(1);
}

function coverageNote(error: string | null) {
  if (!error) return undefined;
  if (error.toLowerCase().includes("no public posts were visible")) {
    return "X data is currently unavailable. The analysis uses the other available sources.";
  }
  return "Some public profile data is currently unavailable. The analysis uses the other available sources.";
}

function founderView(founder: ApplicationFounder): Founder | null {
  const analysis = founder.analysis;
  if (!analysis) return null;
  const sources = [
    analysis.source_summary.github_snapshots ? "GitHub" : null,
    analysis.source_summary.linkedin_snapshots ? "LinkedIn" : null,
    analysis.source_summary.twitter_snapshots ? "X" : null,
  ].filter((source): source is string => Boolean(source));
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
    profileCoverage: Math.round((sources.length / 3) * 100),
    corpusSources: sources,
    sourceLinks: {
      ...(founder.github_handle
        ? { GitHub: `https://github.com/${founder.github_handle}` }
        : {}),
      ...(founder.linkedin_url ? { LinkedIn: founder.linkedin_url } : {}),
      ...(founder.twitter_handle
        ? { X: `https://x.com/${founder.twitter_handle}` }
        : {}),
    },
  };
}

const TRAITS: Array<[string, keyof NonNullable<ApplicationFounder["analysis"]>]> = [
  ["Openness", "openness"],
  ["Conscientiousness", "conscientiousness"],
  ["Extraversion", "extraversion"],
  ["Agreeableness", "agreeableness"],
  ["Emotional stability", "emotional_stability"],
];

function FounderDeepDive({
  founder,
  onClose,
}: {
  founder: ApplicationFounder;
  onClose: () => void;
}) {
  const analysis = founder.analysis;
  if (!analysis) return null;
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
              {founder.role ?? "Founder"} · {displayRole(analysis.classification)}
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

        <section className="mt-7">
          <div className="eyebrow">Big Five assessment</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TRAITS.map(([label, key]) => (
              <div key={key} className="rounded-md border border-line bg-page p-3">
                <div className="font-mono text-xl font-semibold text-navy">
                  {Number(analysis[key]).toFixed(1)}<span className="text-xs text-mut">/5</span>
                </div>
                <div className="mt-1 text-[11px] text-sub">{label}</div>
              </div>
            ))}
            <div className="rounded-md border border-line bg-page p-3">
              <div className="font-mono text-xl font-semibold text-navy">
                {Math.round(analysis.confidence * 100)}<span className="text-xs text-mut">%</span>
              </div>
              <div className="mt-1 text-[11px] text-sub">Analysis confidence</div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="eyebrow">Evidence-based assessment</div>
          <p className="mt-2 text-sm leading-6 text-sub">{analysis.rationale}</p>
        </section>

        <section className="mt-7">
          <div className="eyebrow">Evidence coverage</div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              ["GitHub", analysis.source_summary.github_snapshots ?? 0],
              ["LinkedIn", analysis.source_summary.linkedin_snapshots ?? 0],
              ["X", analysis.source_summary.twitter_snapshots ?? 0],
            ].map(([label, count]) => (
              <div key={String(label)} className="rounded-md border border-line bg-page p-3">
                <div className="font-mono text-lg font-semibold">{count}</div>
                <div className="text-[11px] text-sub">{label} snapshots</div>
              </div>
            ))}
          </div>
          {coverageNote(founder.job_error) && (
            <p className="mt-3 rounded-md bg-page px-3 py-2 text-[11px] text-mut">
              {coverageNote(founder.job_error)}
            </p>
          )}
        </section>

        <section className="mt-7 border-t border-line pt-5">
          <div className="eyebrow">Public profiles</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {founder.github_handle && (
              <a
                href={`https://github.com/${founder.github_handle}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-navy hover:border-navy"
              >
                GitHub
              </a>
            )}
            {founder.linkedin_url && (
              <a
                href={founder.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-navy hover:border-navy"
              >
                LinkedIn
              </a>
            )}
            {founder.twitter_handle && (
              <a
                href={`https://x.com/${founder.twitter_handle}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-navy hover:border-navy"
              >
                X
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function LiveApplicationView({ application }: { application: StartupApplication }) {
  const team = application.team_categorization;
  const [deepDiveFounder, setDeepDiveFounder] = useState<ApplicationFounder | null>(null);

  useEffect(() => {
    if (!deepDiveFounder) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeepDiveFounder(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deepDiveFounder]);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="eyebrow">Live backend application · {application.status}</div>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{application.company}</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-sub">
          {application.one_liner ?? "No company one-liner supplied."}
        </p>
        <div className="mt-2 flex gap-4 font-mono text-[11px] text-mut">
          <span>{application.sector ?? "Sector not supplied"}</span>
          <span>{application.location ?? "Location not supplied"}</span>
        </div>

        <section className="mt-6">
          <div className="eyebrow mb-2">Founders</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {application.founders.map((founder, index) => {
              const view = founderView(founder);
              return view ? (
                <div key={founder.user_id}>
                  <FounderCard
                    founder={view}
                    color={FOUNDER_COLORS[index]}
                    coverageNote={coverageNote(founder.job_error)}
                    onDeepDive={() => setDeepDiveFounder(founder)}
                  />
                </div>
              ) : (
                <div key={founder.user_id} className="rounded-lg border border-line bg-card p-4">
                  <div className="font-semibold">{founder.name}</div>
                  <div className="mt-1 text-xs text-sub">{founder.role ?? "Founder"}</div>
                  <div className="mt-5 font-mono text-xs text-mut">
                    {application.status === "processing" ? "Analysis in progress…" : "Analysis unavailable"}
                  </div>
                  {founder.job_error && (
                    <p className="mt-3 rounded-md bg-page px-3 py-2 text-[11px] text-mut">
                      {coverageNote(founder.job_error)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-line bg-card p-4">
          <div className="eyebrow">Team categorization</div>
          {team ? (
            <>
              <div className="mt-1 text-lg font-semibold">{team.ensemble}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="font-mono text-2xl font-bold text-navy">
                    {team.configuration_odds ?? "—"}×
                  </div>
                  <div className="eyebrow mt-1">Configuration odds</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {team.matched_roles.length
                      ? team.matched_roles.map(displayRole).join(" + ")
                      : `Nearest: ${team.nearest_roles.map(displayRole).join(" + ")}`}
                  </div>
                  <div className="eyebrow mt-1">Configuration</div>
                </div>
                <div>
                  <div className={team.trait_gaps.length ? "text-[#8a5f00]" : "text-good-text"}>
                    {team.trait_gaps.join(", ") || "None"}
                  </div>
                  <div className="eyebrow mt-1">Trait gaps</div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 font-mono text-xs text-mut">Waiting for founder analyses…</p>
          )}
        </section>
      </div>
      {deepDiveFounder && (
        <FounderDeepDive founder={deepDiveFounder} onClose={() => setDeepDiveFounder(null)} />
      )}
    </main>
  );
}
