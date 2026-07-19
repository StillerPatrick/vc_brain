"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, BIG5_KEY, Decision } from "@/lib/data";
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

export default function Home() {
  const [selectedId, setSelectedId] = useState(APPLICATIONS[0].id);
  const [decisions, setDecisions] = useState<Record<string, Decision | undefined>>({});
  const app = APPLICATIONS.find((a) => a.id === selectedId)!;
  const decided = Object.values(decisions).filter(Boolean).length;

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
          {APPLICATIONS.length - decided} to decide
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
          {APPLICATIONS.map((a) => {
            const d = decisions[a.id];
            const active = a.id === selectedId;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`block w-full border-b border-line px-4 py-3 text-left transition-colors ${
                  active ? "bg-card" : "hover:bg-card/60"
                }`}
                style={active ? { boxShadow: "inset 3px 0 0 var(--navy)" } : undefined}
              >
                <div className="truncate text-sm font-semibold">{a.company}</div>
                <div className="mt-0.5 truncate text-[11px] text-sub">
                  {a.sector} · {a.location}
                </div>
                <div className="mt-1 font-mono text-[10px]">
                  {d === "fund" ? (
                    <span className="text-good-text">✓ FUNDED</span>
                  ) : d === "observe" ? (
                    <span className="text-[#8a5f00]">◷ OBSERVING</span>
                  ) : d === "pass" ? (
                    <span className="text-critical">✕ PASSED</span>
                  ) : (
                    <span className="text-mut">⧗ {a.firstSignalAgoH.toFixed(1)}h in diligence</span>
                  )}
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── analysis ── */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-6">
            {/* header */}
            <div className="eyebrow">{app.track === "outbound" ? "Discovered by scan" : "Applied directly"}</div>
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

              {/* right: market + idea-vs-market */}
              <section className="min-w-0 xl:border-l xl:border-line xl:pl-8">
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
        </main>
      </div>

      <DecisionRail
        app={app}
        decision={decisions[app.id]}
        onDecide={(d) => setDecisions((prev) => ({ ...prev, [app.id]: d }))}
      />
    </div>
  );
}
