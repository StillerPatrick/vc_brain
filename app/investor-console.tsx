"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteApplication,
  listApplications,
  metadataAssetUrl,
  rerunApplication,
  restartStartupResearch,
  StartupApplication,
  StartupResearchSource,
} from "@/lib/api";
import { BIG5_KEY, Decision } from "@/lib/data";
import { FounderDeepDive, toApplicationView } from "./live-application";
import {
  AxisHeader,
  CompetitorsPanel,
  DecisionRail,
  FounderCard,
  FOUNDER_COLORS,
  IdeaPanel,
  MarketPanel,
  MemoPanel,
  TeamPanel,
} from "./ui";

interface InvestorConsoleProps {
  initialApplications: StartupApplication[];
  initialBackendError: string | null;
  initialTime: number;
}

function ResearchStatusPanel({ live }: { live: StartupApplication }) {
  const metadata = live.metadata;
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  if (!metadata) return null;

  const extractingDeck = metadata.status === "processing" && !metadata.company_name;
  const activelyRunning =
    extractingDeck ||
    (metadata.research_status === "processing" && metadata.research_started_at != null) ||
    restarting;
  const completed = metadata.research_status === "completed" && !restarting;

  const restart = async () => {
    setRestarting(true);
    setRestartError(null);
    try {
      await restartStartupResearch(live.id);
    } catch (error) {
      setRestarting(false);
      setRestartError(error instanceof Error ? error.message : "Could not start research");
    }
  };

  return (
    <div
      className={`mb-5 rounded-lg border px-4 py-3 ${
        activelyRunning
          ? "border-navy/30 bg-[#f2f7ff]"
          : completed
            ? "border-[#b8d9bc] bg-[#f1f8f2]"
            : metadata.research_status === "failed"
              ? "border-critical/30 bg-[#fff5f5]"
              : "border-line bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="relative flex size-3 shrink-0">
          {activelyRunning && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-navy opacity-30" />
          )}
          <span
            className={`relative inline-flex size-3 rounded-full ${
              activelyRunning
                ? "bg-navy"
                : completed
                  ? "bg-good-text"
                  : metadata.research_status === "failed"
                    ? "bg-critical"
                    : "bg-mut"
            }`}
          />
        </span>
        <div>
          <div className="text-[13px] font-bold">
            {activelyRunning
              ? extractingDeck
                ? "Pitch deck analysis is working"
                : "Research agent is working"
              : completed
                ? "Research complete"
                : metadata.research_status === "failed"
                  ? "Research failed"
                  : "Research not started"}
          </div>
          <div className="mt-0.5 font-mono text-[9px] text-sub">
            {activelyRunning
              ? extractingDeck
                ? "Reading deck · extracting company and market claims"
                : "Searching · reading sources · calculating markets"
              : completed && metadata.research_completed_at
                ? `Finished ${new Date(metadata.research_completed_at).toISOString().replace("T", " ").slice(0, 16)} UTC`
                : metadata.research_error ?? "Ready to research this deck"}
          </div>
        </div>
        {!activelyRunning && (
          <button
            type="button"
            onClick={() => void restart()}
            className="ml-auto rounded-md border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-navy hover:border-navy"
          >
            {completed ? "Refresh research" : "Run research"}
          </button>
        )}
      </div>
      {restartError && <p className="mt-2 text-xs text-critical">{restartError}</p>}
    </div>
  );
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
    <div className="mt-5">
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
                    {source.domain} ↗
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
        <div className="flex items-baseline gap-2">
          <span className="inline-block size-2.5 rounded-[3px] bg-navy" aria-hidden />
          <span className="text-[15px] font-extrabold tracking-tight">VC BRAIN</span>
          <span className="eyebrow hidden md:inline">Investor console</span>
        </div>
        <span className="ml-auto font-mono text-[11px] text-mut">
          {Math.max(0, applications.length - decided)} to decide
        </span>
        <Link
          href="/"
          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy hover:text-navy"
        >
          ← Home
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── queue ── */}
        <aside className="w-[248px] shrink-0 overflow-y-auto border-r border-line">
          <div className="eyebrow px-4 pb-1 pt-4">Pipeline</div>
          {applications.map((application) => {
            const d = decisions[application.id];
            const active = application.id === (live?.id ?? null);
            const hours =
              (initialTime - new Date(application.created_at).getTime()) / 3_600_000;
            return (
              <button
                key={application.id}
                onClick={() => setSelectedId(application.id)}
                className={`block w-full border-b border-line px-4 py-3 text-left transition-colors ${
                  active ? "bg-card" : "hover:bg-card/60"
                }`}
                style={active ? { boxShadow: "inset 3px 0 0 var(--navy)" } : undefined}
              >
                <div className="truncate text-sm font-semibold">{application.company}</div>
                <div className="mt-0.5 truncate text-[11px] text-sub">
                  {application.sector ?? "Unspecified"} · {application.location ?? "Unknown"}
                </div>
                <div className="mt-1 font-mono text-[10px]">
                  {d === "fund" ? (
                    <span className="text-good-text">✓ FUNDED</span>
                  ) : d === "observe" ? (
                    <span className="text-[#8a5f00]">◷ OBSERVING</span>
                  ) : d === "pass" ? (
                    <span className="text-critical">✕ PASSED</span>
                  ) : application.status === "processing" ? (
                    <span className="text-navy">◷ LIVE DILIGENCE</span>
                  ) : (
                    <span className="text-mut">⧗ {Math.max(0, hours).toFixed(1)}h in diligence</span>
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
              {/* header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow">
                    {app.track === "outbound" ? "Discovered by scan" : "Applied directly"}
                    {live.status === "processing" && " · diligence running"}
                  </div>
                  <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{app.company}</h1>
                </div>
                <div className="flex shrink-0 gap-2 pt-4">
                  <button
                    type="button"
                    onClick={handleRerun}
                    disabled={live.status === "processing"}
                    title={
                      live.status === "processing"
                        ? `Diligence running for ${live.company}`
                        : `Re-run scraping & analysis for ${live.company}`
                    }
                    aria-label={
                      live.status === "processing"
                        ? "Diligence running"
                        : "Re-run scraping and analysis"
                    }
                    className={`rounded-md border p-2 ${
                      live.status === "processing"
                        ? "cursor-default border-navy/40 text-navy"
                        : "border-line text-sub hover:border-navy hover:text-navy"
                    }`}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={live.status === "processing" ? "animate-spin" : undefined}
                      aria-hidden
                    >
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    title={`Delete ${live.company} from the database`}
                    aria-label="Delete this application from the database"
                    className="rounded-md border border-line p-2 text-sub hover:border-critical hover:text-critical"
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

              <ResearchStatusPanel live={live} />
              <DeckPanel live={live} />

              <div className="mt-6 grid gap-8 xl:grid-cols-[6fr_5fr]">
                {/* left: founders + team */}
                <section>
                  <div className="eyebrow mb-2">Founders</div>
                  <div className="mb-4 rounded-lg border border-line bg-card px-4">
                    <AxisHeader axis={app.axes.find((a) => a.name === "Founder")!} />
                  </div>
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

                  <TeamPanel ensemble={app.ensemble} founders={app.founders} note={app.teamNote} />
                </section>

                {/* right: market + idea-vs-market */}
                <section className="min-w-0 xl:border-l xl:border-line xl:pl-8">
                  <div className="eyebrow mb-2">Market</div>
                  <MarketPanel axis={app.axes.find((a) => a.name === "Market")!} sizing={app.sizing} />
                  <div className="mt-4">
                    <div className="eyebrow mb-2">Top 3 competitors</div>
                    <CompetitorsPanel competitors={app.competitors} />
                  </div>
                  <ResearchSourcesPanel live={live} />

                  <div className="eyebrow mb-2 mt-5">Idea vs market</div>
                  <IdeaPanel axis={app.axes.find((a) => a.name === "Idea vs Market")!} idea={app.idea} />
                </section>
              </div>

              {/* full-width memo below the split */}
              <div className="mt-10 border-t border-line pt-6">
                <div className="eyebrow mb-2">Investment memo</div>
                <MemoPanel memo={app.memo} claims={app.claims} />
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
                <Link
                  href="/apply"
                  className="mt-4 inline-block rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-[#104281]"
                >
                  Apply
                </Link>
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
