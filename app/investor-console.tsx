"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteApplication,
  listApplications,
  metadataAssetUrl,
  rerunApplication,
  StartupApplication,
  StartupResearchSource,
} from "@/lib/api";
import { BIG5_KEY, Decision } from "@/lib/data";
import { FounderDeepDive, toApplicationView } from "./live-application";
import { Logo } from "./logo";
import {
  CompetitorsPanel,
  DecisionRail,
  ExternalIcon,
  FounderCard,
  FOUNDER_COLORS,
  FounderScorePanel,
  IdeaPanel,
  MarketPanel,
  MemoPanel,
  OverallScorePanel,
  TeamPanel,
} from "./ui";

interface InvestorConsoleProps {
  initialApplications: StartupApplication[];
  initialBackendError: string | null;
  initialTime: number;
}

/** Combined status + action: what the re-run button shows in each state. */
function rerunState(live: StartupApplication) {
  const metadata = live.metadata;
  const extractingDeck = metadata?.status === "processing" && !metadata.company_name;
  const researching =
    metadata?.research_status === "processing" && metadata.research_started_at != null;
  const running = live.status === "processing" || extractingDeck || researching;
  if (running) {
    return {
      running: true,
      failed: false,
      title: extractingDeck ? "Analyzing pitch deck" : "Diligence running",
      detail: extractingDeck
        ? "reading deck · extracting claims"
        : "scraping · researching · scoring",
    };
  }
  if (metadata?.research_status === "failed") {
    return {
      running: false,
      failed: true,
      title: "Research failed — re-run",
      detail: metadata.research_error ?? "the research agent stopped early",
    };
  }
  return {
    running: false,
    failed: false,
    title: "Re-run diligence",
    detail:
      metadata?.research_status === "completed"
        ? "research complete · re-scrape & re-score"
        : "re-scrape & re-analyze this application",
  };
}

function DeckPanel({ live }: { live: StartupApplication }) {
  const meta = live.metadata;
  if (!meta) return null;
  return (
    <div className="mt-6">
      <div className="eyebrow mb-2">Pitch deck</div>
      <div className="rounded-lg border border-line bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(160px,1fr)_2fr]">
          <div>
            {meta.first_slide_available ? (
              meta.deck_available ? (
                <a
                  href={metadataAssetUrl(live.id, "deck")}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${meta.deck_filename}`}
                  className="group block rounded-md focus:outline-none focus:ring-2 focus:ring-navy/40"
                >
                  {/* Served by the authenticated backend asset endpoint. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={metadataAssetUrl(live.id, "first-slide")}
                    alt={`First slide of ${meta.deck_filename}`}
                    className="aspect-video w-full rounded-md border border-line bg-page object-contain transition group-hover:border-navy/50 group-hover:opacity-90"
                  />
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={metadataAssetUrl(live.id, "first-slide")}
                  alt={`First slide of ${meta.deck_filename}`}
                  className="aspect-video w-full rounded-md border border-line bg-page object-contain"
                />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-line bg-page px-4 text-center font-mono text-xs text-mut">
                {meta.status === "processing" ? "Generating preview…" : "Preview unavailable"}
              </div>
            )}
          </div>
          <div>
            {meta.summary_sentences ? (
              <div className="space-y-2 text-[13px] leading-relaxed text-sub">
                {meta.summary_sentences.map((sentence, index) => (
                  <p key={`${index}-${sentence}`}>{sentence}</p>
                ))}
              </div>
            ) : meta.status === "processing" ? (
              <p className="font-mono text-xs text-mut">Extracting the company summary…</p>
            ) : (
              <p className="text-xs text-critical">
                {meta.error ?? "Metadata extraction failed."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchSourcesPanel({ live }: { live: StartupApplication }) {
  const metadata = live.metadata;
  if (!metadata) return null;
  const sources: StartupResearchSource[] = metadata.research_sources;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="eyebrow">Research sources</div>
        {sources.length > 0 && (
          <span className="rounded-full bg-page px-2 py-0.5 font-mono text-[9px] text-mut">
            {sources.length} crucial
          </span>
        )}
      </div>
      {sources.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="group min-w-0 rounded-lg border border-line bg-card p-3 transition hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-page font-mono text-xs font-bold uppercase text-mut">
                  <span>{source.domain.charAt(0)}</span>
                  {source.favicon_url && (
                    // Favicons are supplied by Tavily or resolved from the source origin.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={source.favicon_url}
                      alt=""
                      className="absolute inset-0 size-full bg-white object-contain p-1.5"
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold group-hover:text-navy">
                    {source.title}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[9px] text-mut">
                    {source.domain} <ExternalIcon />
                  </div>
                </div>
              </div>
              {source.excerpt && (
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-sub">
                  {source.excerpt}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {source.supports.map((label) => (
                  <span
                    key={label}
                    className="rounded-sm border border-line bg-page px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wide text-sub"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      ) : metadata.research_status === "processing" && metadata.research_started_at ? (
        <div className="rounded-lg border border-dashed border-line bg-card p-4 font-mono text-xs text-mut">
          Research agent is searching and reading market sources…
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-card p-4 text-xs text-critical">
          {metadata.research_error ?? "No research sources were retained."}
        </div>
      )}
    </div>
  );
}

export function InvestorConsole({
  initialApplications,
  initialBackendError,
  initialTime,
}: InvestorConsoleProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialApplications[0]?.id ?? null,
  );
  const [applications, setApplications] =
    useState<StartupApplication[]>(initialApplications);
  const [backendError, setBackendError] = useState<string | null>(initialBackendError);
  const [decisions, setDecisions] = useState<Record<string, Decision | undefined>>({});
  const [deepDiveUserId, setDeepDiveUserId] = useState<string | null>(null);

  const live =
    applications.find((application) => application.id === selectedId) ?? applications[0];
  const app = live ? toApplicationView(live, initialTime) : null;
  const decided = Object.values(decisions).filter(Boolean).length;
  const deepDiveFounder =
    live?.founders.find((founder) => founder.user_id === deepDiveUserId) ?? null;

  useEffect(() => {
    if (!deepDiveUserId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeepDiveUserId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deepDiveUserId]);

  const handleRerun = async () => {
    if (!live) return;
    try {
      await rerunApplication(live.id);
      setApplications(await listApplications());
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Backend unavailable");
    }
  };

  const handleDelete = async () => {
    if (!live) return;
    if (!window.confirm(`Delete ${live.company} and all its scraped data?`)) return;
    try {
      await deleteApplication(live.id);
      const next = await listApplications();
      setApplications(next);
      setSelectedId(next[0]?.id ?? null);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Backend unavailable");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const next = await listApplications();
        if (!cancelled) {
          setApplications(next);
          setSelectedId((current) => current ?? next[0]?.id ?? null);
          setBackendError(null);
        }
      } catch (error) {
        if (!cancelled) setBackendError(error instanceof Error ? error.message : "Backend unavailable");
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* ── top bar ── */}
      <header className="flex items-center gap-4 border-b border-line bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="eyebrow hidden md:inline">Investor console</span>
        </div>
        <span className="ml-auto font-mono text-[11px] text-mut">
          {Math.max(0, applications.length - decided)} to decide
        </span>
        <Link
          href="/"
          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy hover:text-navy"
        >
          Home
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── queue ── */}
        <aside className="w-[288px] shrink-0 overflow-y-auto border-r border-line">
          <div className="eyebrow px-4 pb-1 pt-4">Pipeline</div>
          {applications.map((application) => {
            const d = decisions[application.id];
            const active = application.id === (live?.id ?? null);
            return (
              <button
                key={application.id}
                onClick={() => setSelectedId(application.id)}
                className={`block w-full border-b border-line px-4 py-3 text-left transition-colors ${
                  active ? "bg-card" : "hover:bg-card/60"
                }`}
                style={active ? { boxShadow: "inset 3px 0 0 var(--navy)" } : undefined}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{application.company}</span>
                  <span
                    className={`shrink-0 font-mono text-sm font-bold ${
                      application.overall_score
                        ? application.overall_score.passes_threshold
                          ? "text-good-text"
                          : "text-critical"
                        : "text-mut"
                    }`}
                    title={
                      application.overall_score
                        ? `Overall investment score: ${application.overall_score.score}/100 · ${application.overall_score.verdict}`
                        : "Overall score pending"
                    }
                  >
                    {application.overall_score?.score ?? "–"}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-sub">
                  {application.sector ?? "Unspecified"} · {application.location ?? "Unknown"}
                </div>
                <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px]">
                  {application.status === "processing" && (
                    <span className="text-navy">◷ LIVE DILIGENCE</span>
                  )}
                  <span className="ml-auto" />
                  {d === "fund" ? (
                    <span className="font-semibold text-good-text">✓ FUNDED</span>
                  ) : d === "observe" ? (
                    <span className="font-semibold text-[#8a5f00]">◷ OBSERVING</span>
                  ) : d === "pass" ? (
                    <span className="font-semibold text-critical">✕ PASSED</span>
                  ) : (
                    <span className="rounded-sm border border-line px-1.5 py-px font-semibold text-sub">
                      OPEN
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {backendError && (
            <div className="border-b border-line px-4 py-2 font-mono text-[9px] text-critical">
              Backend: {backendError}
            </div>
          )}
          {applications.length === 0 && !backendError && (
            <div className="px-4 py-3 font-mono text-[10px] text-mut">
              No applications yet.
            </div>
          )}
        </aside>

        {/* ── analysis ── */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {app && live ? (
            <div className="mx-auto max-w-[1400px] px-6 py-6">
              {/* 1 · company identity */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow">
                    {app.track === "outbound" ? "Discovered by scan" : "Applied directly"}
                    {live.status === "processing" && " · diligence running"}
                  </div>
                  <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{app.company}</h1>
                </div>
                <div className="flex shrink-0 items-stretch gap-2 pt-4">
                  {(() => {
                    const state = rerunState(live);
                    return (
                      <button
                        type="button"
                        onClick={handleRerun}
                        disabled={state.running}
                        title={
                          state.running
                            ? `Diligence running for ${live.company}`
                            : `Re-run scraping, research & analysis for ${live.company}`
                        }
                        className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2 text-left ${
                          state.running
                            ? "cursor-default border-navy/40 bg-[#f2f7ff]"
                            : state.failed
                              ? "border-critical/40 bg-[#fff5f5] hover:border-critical"
                              : "border-line bg-card hover:border-navy"
                        }`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`shrink-0 ${
                            state.failed ? "text-critical" : "text-navy"
                          } ${state.running ? "animate-spin" : ""}`}
                          aria-hidden
                        >
                          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                          <path d="M21 3v6h-6" />
                        </svg>
                        <span className="min-w-0">
                          <span
                            className={`block text-[12px] font-bold leading-tight ${
                              state.failed ? "text-critical" : ""
                            }`}
                          >
                            {state.title}
                          </span>
                          <span className="mt-0.5 block max-w-[240px] truncate font-mono text-[9px] text-sub">
                            {state.detail}
                          </span>
                        </span>
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={handleDelete}
                    title={`Delete ${live.company} from the database`}
                    aria-label="Delete this application from the database"
                    className="flex items-center rounded-md border border-line px-3 text-sub hover:border-critical hover:text-critical"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 6h18" />
                      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="mt-1 max-w-2xl text-[15px] text-sub">{app.oneLiner}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-mut">
                <span>{app.sector}</span>
                <span>{app.location}</span>
              </div>

              {/* 2 · score overview */}
              <OverallScorePanel assessment={app.overallAssessment} />

              <DeckPanel live={live} />

              {/* 3 · the three screening axes */}
              <div className="mt-6 grid gap-8 xl:grid-cols-[6fr_5fr]">
                {/* left: founders + team */}
                <section>
                  <div className="eyebrow mb-2">Founders</div>
                  <FounderScorePanel
                    axis={app.axes.find((a) => a.name === "Founder")!}
                    assessment={app.founderAssessment}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    {app.founders.map((f, i) => (
                      <FounderCard
                        key={f.name}
                        founder={f}
                        color={FOUNDER_COLORS[i]}
                        onOpen={() => setDeepDiveUserId(live.founders[i]?.user_id ?? null)}
                      />
                    ))}
                  </div>
                  <div className="mt-2 font-mono text-[10px] leading-relaxed text-mut">
                    <p>{BIG5_KEY}</p>
                    <p>dashed: successful-founder benchmark (McCarthy et al. 2023)</p>
                  </div>

                  <TeamPanel ensemble={app.ensemble} founders={app.founders} />
                </section>

                {/* right: market + idea-vs-market */}
                <section className="min-w-0 xl:border-l xl:border-line xl:pl-8">
                  <div className="eyebrow mb-2">Market</div>
                  <MarketPanel
                    axis={app.axes.find((a) => a.name === "Market")!}
                    sizing={app.sizing}
                    assessment={app.marketAssessment}
                  />
                  <div className="mt-4">
                    <div className="eyebrow mb-2">Competitors</div>
                    <CompetitorsPanel competitors={app.competitors} />
                  </div>

                  <div className="eyebrow mb-2 mt-5">Idea vs market</div>
                  <IdeaPanel
                    axis={app.axes.find((a) => a.name === "Idea vs Market")!}
                    idea={app.idea}
                    assessment={app.productFitAssessment}
                  />
                </section>
              </div>

              {/* 4 · investment memo */}
              <div className="mt-10 border-t border-line pt-6">
                <div className="eyebrow mb-2">Investment memo</div>
                <MemoPanel memo={app.memo} claims={app.claims} />
              </div>

              {/* 5 · sources & methodology */}
              <div className="mt-10 border-t border-line pt-6">
                <ResearchSourcesPanel live={live} />
                <div className="mt-6">
                  <div className="eyebrow mb-2">Methodology</div>
                  <div className="space-y-1 rounded-lg border border-line bg-card p-4 font-mono text-[10px] leading-relaxed text-mut">
                    <p>
                      Market sizing, competitors, SWOT and traction claims: agentic web research —
                      sources above.
                    </p>
                    <p>
                      Scores support screening; they do not replace investment-committee judgment
                      or formal diligence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="eyebrow">Pipeline empty</div>
                <p className="mt-2 max-w-sm text-sm text-sub">
                  {backendError
                    ? `Backend unavailable: ${backendError}`
                    : "No applications yet — the first application appears here after it is submitted."}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {app && (
        <DecisionRail
          app={app}
          decision={decisions[app.id]}
          onDecide={(d) => setDecisions((prev) => ({ ...prev, [app.id]: d }))}
        />
      )}
      {deepDiveFounder && (
        <FounderDeepDive
          founder={deepDiveFounder}
          onClose={() => setDeepDiveUserId(null)}
        />
      )}
    </div>
  );
}
