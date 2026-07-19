"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Application,
  ARCHETYPES,
  Axis,
  BENCHMARK,
  BIG5_AXES,
  Claim,
  Competitor,
  Decision,
  Founder,
  HIGH_ODDS_COMBOS,
  IdeaAnalysis,
  Memo,
  SizingRow,
  TEAM_BENCH,
  TrustLevel,
} from "@/lib/data";

export const FOUNDER_COLORS = ["#2a78d6", "#008300", "#e87ba4"];

const TRAIT_NAMES = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Stability"];

/* ── small vocabulary ─────────────────────────────────────── */

const TRUST: Record<TrustLevel, { label: string; icon: string; cls: string }> = {
  verified: { label: "Verified", icon: "✓", cls: "text-good-text" },
  reported: { label: "Reported", icon: "○", cls: "text-[#8a5f00]" },
  contradicted: { label: "Contradicted", icon: "✕", cls: "text-critical" },
};

/* ── founder radar card ───────────────────────────────────── */

function RadarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-line bg-card px-2 py-1 font-mono text-[10px] shadow-sm">
      <span className="text-mut">{label}</span>{" "}
      <span className="font-semibold">{payload[0].value}</span>
      {payload[1] && <span className="text-mut"> · bench {payload[1].value}</span>}
    </div>
  );
}

function FounderRadar({ founder, color }: { founder: Founder; color: string }) {
  const data = BIG5_AXES.map((axis, i) => ({
    axis,
    v: founder.big5[i],
    bench: BENCHMARK[i],
  }));
  return (
    <div className="-mx-2 mt-1 h-[170px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={data}
          margin={{ top: 8, right: 24, bottom: 4, left: 24 }}
          accessibilityLayer={false}
        >
          <PolarGrid stroke="#e1e0d9" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 9, fill: "#898781", fontFamily: "var(--font-plex-mono)" }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name={founder.name} dataKey="v" stroke={color} fill={color} fillOpacity={0.14} strokeWidth={2} />
          <Radar
            name="Benchmark"
            dataKey="bench"
            stroke="#898781"
            strokeDasharray="4 3"
            fill="none"
            strokeWidth={1.5}
          />
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FounderCard({
  founder,
  color,
  onOpen,
}: {
  founder: Founder;
  color: string;
  onOpen?: () => void;
}) {
  return (
    <div
      className={`rounded-lg border border-line bg-card p-4 ${
        onOpen ? "cursor-pointer transition-colors hover:border-navy/60" : ""
      }`}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter") onOpen();
            }
          : undefined
      }
      aria-label={onOpen ? `Open founder deep dive for ${founder.name}` : undefined}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[15px] font-semibold leading-tight">{founder.name}</div>
          <div className="text-xs text-sub">
            {founder.role} · <span className="font-medium text-ink">{founder.archetype}</span>
          </div>
        </div>
        {founder.commitment && (
          <span className="eyebrow shrink-0 rounded border border-line px-1.5 py-0.5">
            {founder.commitment}
          </span>
        )}
      </div>

      <FounderRadar founder={founder} color={color} />

      <ul className="mt-1 space-y-1">
        {founder.signals.map((s) => (
          <li key={s} className="flex gap-1.5 text-xs text-sub">
            <span className="text-mut">›</span> {s}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
        <span className="eyebrow">Sources</span>
        {founder.corpusSources.map((source) => {
          const href = founder.sourceLinks?.[source];
          const classes =
            "rounded-sm border border-line bg-page px-1 py-px font-mono text-[9px] text-sub";
          return href ? (
            <a
              key={source}
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={`${classes} hover:border-navy hover:text-navy`}
              aria-label={`Open ${source} profile for ${founder.name}`}
            >
              {source.toUpperCase()}
            </a>
          ) : (
            <span key={source} className={classes}>
              {source.toUpperCase()}
            </span>
          );
        })}
        <span
          className="ml-auto flex items-center gap-1.5"
          title="Share of the tracked founder metrics (GitHub activity, publications, socials, …) we have data for"
        >
          <span className="h-[4px] w-14 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-navy"
              style={{ width: `${founder.profileCoverage}%` }}
            />
          </span>
          <span className="font-mono text-[10px] text-mut">
            {founder.profileCoverage >= 66 ? "high" : founder.profileCoverage >= 40 ? "medium" : "low"}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── team ensemble (computed from founder data) ───────────── */

function comboMissing(team: string[], roles: string[]) {
  const pool = [...team];
  const missing: string[] = [];
  for (const role of roles) {
    const i = pool.indexOf(role);
    if (i >= 0) pool.splice(i, 1);
    else missing.push(role);
  }
  return missing;
}

function fmtRoles(roles: string[]) {
  const counts = new Map<string, number>();
  for (const r of roles) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts].map(([r, n]) => (n > 1 ? `${r} ×${n}` : r)).join(" + ");
}

export function TeamPanel({
  ensemble,
  founders,
  note,
}: {
  ensemble: string;
  founders: Founder[];
  note?: string | null;
}) {
  const analyzed = founders.filter((f) => f.big5.some((v) => v > 0));
  const team = analyzed.map((f) => f.archetype);
  const evaluated = HIGH_ODDS_COMBOS.map((c) => ({ ...c, missing: comboMissing(team, c.roles) }));
  const matched = evaluated
    .filter((e) => e.missing.length === 0)
    .sort((a, b) => b.odds - a.odds)[0];
  const upgrade = evaluated
    .filter((e) => e.missing.length === 1 && (!matched || e.odds > matched.odds))
    .sort((a, b) => b.odds - a.odds)[0];
  const nearest = [...evaluated].sort(
    (a, b) => a.missing.length - b.missing.length || b.odds - a.odds,
  )[0];
  const teamMax = BIG5_AXES.map((_, i) => Math.max(...analyzed.map((f) => f.big5[i])));
  const gaps =
    analyzed.length > 0 ? TRAIT_NAMES.filter((_, i) => teamMax[i] < TEAM_BENCH[i]) : [];

  return (
    <div className="mt-5 rounded-lg border border-line bg-card p-4">
      <div className="eyebrow mb-1">Team ensemble</div>
      <div className="text-sm font-semibold">{ensemble}</div>

      {/* archetype configuration */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ARCHETYPES.map((a) => {
          const count = team.filter((t) => t === a).length;
          return (
            <span
              key={a}
              className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${
                count > 0 ? "bg-navy font-semibold text-white" : "border border-line text-mut"
              }`}
            >
              {a}
              {count > 1 && ` ×${count}`}
            </span>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 border-t border-line pt-3 sm:grid-cols-2">
        <div>
          <div className={`font-mono text-2xl font-bold leading-none ${matched ? "text-good-text" : "text-navy"}`}>
            {analyzed.length > 0 ? `${(matched ?? nearest).odds}×` : "–"}
          </div>
          <div className="eyebrow mt-1">Config odds</div>
          <p className="mt-1 text-xs leading-relaxed text-sub">
            {analyzed.length === 0 ? (
              "awaiting founder analyses"
            ) : matched ? (
              <>
                Matches <span className="font-semibold text-ink">{fmtRoles(matched.roles)}</span>
                {upgrade && (
                  <>
                    {" "}· one hire (<span className="font-semibold text-ink">{upgrade.missing[0]}</span>) from{" "}
                    {fmtRoles(upgrade.roles)} ({upgrade.odds}×)
                  </>
                )}
              </>
            ) : (
              <>
                Nearest: <span className="font-semibold text-ink">{fmtRoles(nearest.roles)}</span>
              </>
            )}
          </p>
        </div>

        <div>
          <div
            className={`text-lg font-bold leading-tight ${
              analyzed.length === 0 ? "text-mut" : gaps.length > 0 ? "text-[#8a5f00]" : "text-good-text"
            }`}
          >
            {analyzed.length === 0 ? "–" : gaps.length > 0 ? gaps.join(", ") : "None"}
          </div>
          <div className="eyebrow mt-1">Trait gap{gaps.length === 1 ? "" : "s"}</div>
          <p className="mt-1 text-xs leading-relaxed text-sub">
            {analyzed.length === 0
              ? "awaiting founder analyses"
              : gaps.length > 0
                ? "below the successful-team footprint"
                : "all five traits at successful-team level"}
          </p>
        </div>
      </div>
      {note && (
        <p className="mt-3 border-t border-line pt-2 text-xs leading-relaxed text-sub">{note}</p>
      )}
      <p className="mt-2 font-mono text-[9px] text-mut">Odds &amp; footprint: McCarthy et al. 2023</p>
    </div>
  );
}

/* ── 3-axis screening ─────────────────────────────────────── */

export function AxisHeader({ axis }: { axis: Axis }) {
  return (
    <div
      className={`group relative flex items-baseline gap-3 py-3 ${
        axis.note ? "cursor-help" : ""
      }`}
    >
      <span className="font-mono text-[28px] font-bold leading-none">{axis.score ?? "–"}</span>
      <span className="text-lg font-bold tracking-tight">{axis.name}</span>
      <span className="ml-auto font-mono text-[10px] text-mut">/ 100</span>
      {axis.note && (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-30 w-72 rounded-md border border-line bg-card p-3 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
        >
          <div className="eyebrow mb-1">Why this score</div>
          <p className="text-xs leading-relaxed text-sub">{axis.note}</p>
        </div>
      )}
    </div>
  );
}

/* ── market panel: axis + TAM/SAM/SOM deck-vs-computed ────── */

function usd(v: string) {
  const m = v.match(/([\d.]+)\s*([BMK]?)/i);
  if (!m) return 0;
  return parseFloat(m[1]) * ({ B: 1e9, M: 1e6, K: 1e3 }[m[2].toUpperCase()] ?? 1);
}

export function MarketPanel({ axis, sizing }: { axis: Axis; sizing: SizingRow[] }) {
  return (
    <>
      <div className="rounded-lg border border-line bg-card px-4">
        <AxisHeader axis={axis} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {sizing.map((row) => {
          const claimed = usd(row.claimed);
          const computed = usd(row.computed);
          const known = claimed > 0 && computed > 0;
          const over = known && claimed / computed >= 1.5;
          const under = known && computed > claimed;
          return (
            <div key={row.metric} className="rounded-lg border border-line bg-card px-3 py-2.5">
              <div className="eyebrow">{row.metric}</div>
              <div className="mt-1.5 font-mono text-[28px] font-bold leading-none">{row.claimed}</div>
              <div
                className={`mt-2.5 font-mono text-lg font-semibold leading-none ${
                  over ? "text-critical" : under ? "text-good-text" : "text-sub"
                }`}
              >
                {known ? `${over ? "▼" : under ? "▲" : "≈"} ` : ""}
                {row.computed}
              </div>
              {row.detail && (
                <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-sub" title={row.detail}>
                  {row.detail}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 font-mono text-[9px] text-mut">
        deck above · our estimate below — ▼ deck overstates · ▲ deck conservative · ≈ within range
      </p>
    </>
  );
}

/* ── competitors (max 3, memo: how each differs) ──────────── */

const THREAT = {
  high: { label: "HIGH", cls: "text-critical" },
  medium: { label: "MED", cls: "text-[#8a5f00]" },
  low: { label: "LOW", cls: "text-good-text" },
} as const;

export function CompetitorsPanel({ competitors }: { competitors: Competitor[] }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-1">
      {competitors.length === 0 && (
        <div className="py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-mut">–</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] font-semibold text-mut">NONE</span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-sub">No competitors identified yet.</p>
        </div>
      )}
      {competitors.slice(0, 3).map((c) => {
        const t = THREAT[c.threat];
        return (
          <div key={c.name} className="border-b border-line py-2.5 last:border-b-0">
            <div className="flex items-baseline gap-2">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-semibold hover:text-navy hover:underline"
                >
                  {c.name} ↗
                </a>
              ) : (
                <span className="text-[13px] font-semibold">{c.name}</span>
              )}
              <span className={`ml-auto shrink-0 font-mono text-[10px] font-semibold ${t.cls}`}>
                {t.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-sub">{c.angle}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ── idea-vs-market panel: axis + innovation reality check ── */

export function IdeaPanel({ axis, idea }: { axis: Axis; idea: IdeaAnalysis }) {
  return (
    <>
      <div className="rounded-lg border border-line bg-card px-4">
        <AxisHeader axis={axis} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-card px-3 py-2.5">
          <div className="eyebrow">The innovation</div>
          <p className="mt-1 text-[13px] leading-relaxed">{idea.innovation}</p>
        </div>
        <div className="rounded-lg border border-line bg-card px-3 py-2.5">
          <div className="eyebrow">Reality check</div>
          <p className="mt-1 text-[13px] leading-relaxed text-sub">{idea.realistic}</p>
        </div>
      </div>
    </>
  );
}

/* ── trust-scored claim (memo: Traction & KPIs) ───────────── */

export function ClaimRow({ claim }: { claim: Claim }) {
  const t = TRUST[claim.trust];
  return (
    <div className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] leading-snug">{claim.text}</p>
        <span className={`shrink-0 font-mono text-[10px] font-semibold ${t.cls}`}>
          {t.icon} {t.label.toUpperCase()}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-mut">
        <span className="rounded-sm border border-line bg-page px-1 py-px">{claim.source}</span>
        <span>conf {claim.confidence}%</span>
      </div>
    </div>
  );
}

/* ── investment memo (Appendix 1 required sections) ───────── */

const SWOT_META = [
  { key: "s", label: "Strength", cls: "text-good-text" },
  { key: "w", label: "Weakness", cls: "text-[#8a5f00]" },
  { key: "o", label: "Opportunity", cls: "text-navy" },
  { key: "r", label: "Risk", cls: "text-critical" },
] as const;

const RECOMMENDATION: Record<Decision, { label: string; cls: string }> = {
  fund: { label: "Fund $100K", cls: "text-good-text" },
  observe: { label: "Observe", cls: "text-[#8a5f00]" },
  pass: { label: "Pass", cls: "text-critical" },
};

export function MemoPanel({ memo, claims }: { memo: Memo; claims: Claim[] }) {
  const rec = memo.recommendation
    ? RECOMMENDATION[memo.recommendation]
    : { label: "Pending", cls: "text-mut" };
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-3">
        <span className={`text-lg font-bold tracking-tight ${rec.cls}`}>{rec.label}</span>
        <span className="ml-auto font-mono text-[28px] font-bold leading-none">
          {memo.score ?? "–"}
          <span className="text-[10px] font-semibold text-mut"> / 100</span>
        </span>
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        <div>
          <div className="eyebrow">Company snapshot</div>
          <p className="mt-1 text-[13px] leading-relaxed">{memo.snapshot}</p>
        </div>

        <div>
          <div className="eyebrow">Investment hypotheses</div>
          <ul className="mt-1.5 space-y-1.5">
            {memo.hypotheses.map((h) => {
              const t = h.trust ? TRUST[h.trust] : null;
              return (
                <li key={h.text} className="flex items-baseline gap-2">
                  <span className="text-mut">›</span>
                  <span className="min-w-0 text-[13px] leading-snug">{h.text}</span>
                  {t && (
                    <span className={`ml-auto shrink-0 font-mono text-[10px] font-semibold ${t.cls}`}>
                      {t.icon} {t.label.toUpperCase()}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="eyebrow">Traction &amp; KPIs</div>
        {claims.length === 0 ? (
          <p className="py-2.5 text-xs text-sub">
            No independently verifiable public traction or KPI evidence was found.
          </p>
        ) : (
          <div className="grid gap-x-8 sm:grid-cols-2">
            {claims.map((c) => (
              <ClaimRow key={c.text} claim={c} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="eyebrow">SWOT</div>
        <div className="mt-1.5 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {SWOT_META.map((m) => (
            <div key={m.key}>
              <div className={`font-mono text-[10px] font-semibold uppercase tracking-wide ${m.cls}`}>
                {m.label}
              </div>
              {memo.swot[m.key].length === 0 ? (
                <p className="text-xs leading-relaxed text-sub">–</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {memo.swot[m.key].map((item) => (
                    <li key={item} className="flex gap-1.5 text-xs leading-relaxed text-sub">
                      <span className="text-mut">›</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── decision rail (signature element) ────────────────────── */

const BUDGET_S = 24 * 3600;

function fmt(s: number) {
  const sign = s < 0 ? "-" : "";
  s = Math.abs(Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function DecisionRail({
  app,
  decision,
  onDecide,
}: {
  app: Application;
  decision: Decision | undefined;
  onDecide: (d: Decision | undefined) => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = app.firstSignalAgoH * 3600 + tick;
  const remaining = BUDGET_S - elapsed;
  const overdue = remaining < 0;
  const frac = Math.min(elapsed / BUDGET_S, 1);

  return (
    <footer className="border-t border-line bg-card">
      <div className="h-[3px] w-full bg-line">
        <div
          className={overdue ? "h-full bg-critical" : "h-full bg-navy"}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div>
          <div className="eyebrow">First signal → decision</div>
          <div
            className={`font-mono text-lg font-semibold tabular-nums leading-tight ${overdue ? "text-critical" : ""}`}
            suppressHydrationWarning
          >
            {fmt(elapsed)}
            <span className="text-mut"> / 24:00:00</span>
          </div>
        </div>
        <div className="hidden text-xs text-sub sm:block">
          <span className="font-semibold text-ink">{app.company}</span>
          {overdue && <span className="ml-2 font-mono text-[11px] font-semibold text-critical">OVER BUDGET</span>}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {decision ? (
            <>
              <span className="font-mono text-xs font-semibold uppercase tracking-wide">
                {decision === "fund" ? (
                  <span className="text-good-text">✓ Funded $100K</span>
                ) : decision === "observe" ? (
                  <span className="text-[#8a5f00]">◷ Observing</span>
                ) : (
                  <span className="text-critical">✕ Passed</span>
                )}
              </span>
              <button
                onClick={() => onDecide(undefined)}
                className="rounded-md border border-line px-3 py-2 text-xs text-sub hover:bg-page"
              >
                Undo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onDecide("observe")}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-sub hover:border-[#8a5f00] hover:text-[#8a5f00]"
              >
                Observe
              </button>
              <button
                onClick={() => onDecide("pass")}
                className="rounded-md bg-critical px-4 py-2 text-sm font-semibold text-white hover:bg-[#b52f2f]"
              >
                Pass
              </button>
              <button
                onClick={() => onDecide("fund")}
                className="rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-[#104281]"
              >
                Fund $100K
              </button>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
