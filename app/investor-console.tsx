"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listApplications, metadataAssetUrl, StartupApplication } from "@/lib/api";
import { BIG5_KEY, Decision } from "@/lib/data";
import { toApplicationView } from "./live-application";
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
}

function DeckPanel({ live }: { live: StartupApplication }) {
  const meta = live.metadata;
  if (!meta) return null;
  return (
    <div className="mb-5">
      <div className="eyebrow mb-2">Pitch deck</div>
      <div className="rounded-lg border border-line bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(160px,2fr)_3fr]">
          <div>
            {meta.first_slide_available ? (
              // Served by the authenticated backend asset endpoint.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={metadataAssetUrl(live.id, "first-slide")}
                alt={`First slide of ${meta.deck_filename}`}
                className="aspect-video w-full rounded-md border border-line bg-page object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-line bg-page px-4 text-center font-mono text-xs text-mut">
                {meta.status === "processing" ? "Generating preview…" : "Preview unavailable"}
              </div>
            )}
            {meta.deck_available && (
              <a
                href={metadataAssetUrl(live.id, "deck")}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-semibold text-navy hover:underline"
              >
                Open {meta.deck_filename} ↗
              </a>
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

export function InvestorConsole({
  initialApplications,
  initialBackendError,
}: InvestorConsoleProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialApplications[0]?.id ?? null,
  );
  const [applications, setApplications] =
    useState<StartupApplication[]>(initialApplications);
  const [backendError, setBackendError] = useState<string | null>(initialBackendError);
  const [decisions, setDecisions] = useState<Record<string, Decision | undefined>>({});

  const live =
    applications.find((application) => application.id === selectedId) ?? applications[0];
  const app = live ? toApplicationView(live) : null;
  const decided = Object.values(decisions).filter(Boolean).length;

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
          href="/apply"
          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy hover:text-navy"
        >
          Apply →
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
              (Date.now() - new Date(application.created_at).getTime()) / 3_600_000;
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
              <div className="eyebrow">
                {app.track === "outbound" ? "Discovered by scan" : "Applied directly"}
                {live.status === "processing" && " · diligence running"}
              </div>
              <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{app.company}</h1>
              <p className="mt-1 max-w-2xl text-[15px] text-sub">{app.oneLiner}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-mut">
                <span>{app.sector}</span>
                <span>{app.location}</span>
              </div>

              <div className="mt-6 grid gap-8 xl:grid-cols-[6fr_5fr]">
                {/* left: founders + team */}
                <section>
                  <div className="eyebrow mb-2">Founders</div>
                  <div className="mb-4 rounded-lg border border-line bg-card px-4">
                    <AxisHeader axis={app.axes.find((a) => a.name === "Founder")!} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {app.founders.map((f, i) => (
                      <FounderCard key={f.name} founder={f} color={FOUNDER_COLORS[i]} />
                    ))}
                  </div>
                  <div className="mt-2 font-mono text-[10px] leading-relaxed text-mut">
                    <p>{BIG5_KEY}</p>
                    <p>dashed: successful-founder benchmark (McCarthy et al. 2023)</p>
                  </div>

                  <TeamPanel ensemble={app.ensemble} founders={app.founders} />
                </section>

                {/* right: deck + market + idea-vs-market */}
                <section className="min-w-0 xl:border-l xl:border-line xl:pl-8">
                  <DeckPanel live={live} />
                  <div className="eyebrow mb-2">Market</div>
                  <MarketPanel axis={app.axes.find((a) => a.name === "Market")!} sizing={app.sizing} />
                  <div className="mt-4">
                    <CompetitorsPanel competitors={app.competitors} />
                  </div>

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
    </div>
  );
}
