"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  FounderAssessment,
  HIGH_ODDS_COMBOS,
  IdeaAnalysis,
  MarketAssessment,
  Memo,
  OverallAssessment,
  ProductFitAssessment,
  SizingRow,
  TEAM_BENCH,
  TrustLevel,
} from "@/lib/data";

export const FOUNDER_COLORS = ["#2a78d6", "#008300", "#e87ba4"];

/** Small external-link marker — replaces the "↗" text glyph. */
export function ExternalIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block shrink-0 opacity-60"
      aria-hidden
    >
      <path d="M7 17L17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

const TRAIT_NAMES = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Stability"];

/* ── overall investment score ─────────────────────────────── */

export function OverallScorePanel({
  assessment,
}: {
  assessment: OverallAssessment | null;
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!showExplanation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowExplanation(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showExplanation]);

  const components: Array<{
    key: string;
    label: string;
    weight: number;
    score: number | null;
    contribution: number | null;
  }> = assessment?.components ?? [
    { key: "team", label: "Team", weight: 0.4, score: null, contribution: null },
    { key: "market", label: "Market", weight: 0.3, score: null, contribution: null },
    {
      key: "product_market_fit",
      label: "Product–Market Fit",
      weight: 0.3,
      score: null,
      contribution: null,
    },
  ];

  return (
    <>
      <section className="mt-6 rounded-lg border border-line bg-card">
        <div className="grid lg:grid-cols-[240px_1fr]">
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
            <div className="eyebrow">Overall investment score</div>
            <div className="mt-2 flex items-end gap-2">
              <span
                className={`font-mono text-5xl font-bold leading-none ${
                  assessment ? "text-navy" : "text-mut"
                }`}
              >
                {assessment?.score ?? "–"}
              </span>
              <span className="pb-1 font-mono text-xs text-mut">/ 100</span>
            </div>
            <div
              className={`mt-3 text-sm font-semibold ${
                assessment
                  ? assessment.passesThreshold
                    ? "text-good-text"
                    : "text-critical"
                  : "text-mut"
              }`}
            >
              {assessment?.verdict ?? "Pending"}
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm leading-relaxed text-sub">
              {assessment?.rationale ??
                "Combines the Team, Market, and Product–Market Fit scores as their analyses complete."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {components.map((component) => (
                <div key={component.key} className="rounded-md bg-page px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold">{component.label}</span>
                    <span className="font-mono text-xs font-bold">
                      {component.contribution ?? "–"}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-mut">
                    {component.score ?? "–"}/100 × {Math.round(component.weight * 100)}%
                  </div>
                </div>
              ))}
            </div>
            {assessment && (
              <button
                type="button"
                onClick={() => setShowExplanation(true)}
                className="mt-3 text-xs font-semibold text-navy hover:underline"
              >
                How is the overall score calculated?
              </button>
            )}
          </div>
        </div>
      </section>
      {assessment && showExplanation && (
        <OverallScoreExplanation
          assessment={assessment}
          onClose={() => setShowExplanation(false)}
        />
      )}
    </>
  );
}

function OverallScoreExplanation({
  assessment,
  onClose,
}: {
  assessment: OverallAssessment;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/25"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overall-score-explanation-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-card p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div>
            <div className="eyebrow">Overall score methodology</div>
            <h2 id="overall-score-explanation-title" className="mt-1 text-2xl font-bold">
              How we reached {assessment.score}/100
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sub">
              This weighted score summarizes the three independent diligence axes. Team receives a modest premium because execution quality affects whether the market and product opportunity can be captured.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy"
            aria-label="Close overall score explanation"
          >
            Close
          </button>
        </div>

        <section className="mt-7">
          <div className="eyebrow">Formula</div>
          <p className="mt-2 rounded-md bg-page p-3 font-mono text-xs leading-relaxed">
            Team × 40% + Market × 30% + Product–Market Fit × 30%
          </p>
          <p className="mt-2 text-xs leading-relaxed text-sub">
            The inputs remain separate 0–100 assessments. The weighted contributions are added and rounded to the nearest whole number; no LLM can adjust the final result.
          </p>
        </section>

        <section className="mt-6">
          <div className="eyebrow">This application</div>
          <div className="mt-2 rounded-md border border-line px-4">
            {assessment.components.map((component) => (
              <div key={component.key} className="border-b border-line py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-semibold">{component.label}</span>
                  <span className="font-mono text-sm font-bold">+{component.contribution} pts</span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-sub">
                  {component.score}/100 × {Math.round(component.weight * 100)}% weight
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-md bg-page p-3 font-mono text-xs">
            {assessment.components.map((item) => item.contribution).join(" + ")} = {assessment.score}/100
          </p>
        </section>

        <section className="mt-6 rounded-md border border-line bg-page p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow">Decision threshold</div>
              <p className="mt-1 text-sm text-sub">
                Investment review begins at {assessment.threshold}/100; 75+ is a strong candidate.
              </p>
            </div>
            <span className={`text-right font-mono text-sm font-bold ${assessment.passesThreshold ? "text-good-text" : "text-critical"}`}>
              {assessment.verdict.toUpperCase()}
            </span>
          </div>
        </section>

        <p className="mt-5 text-xs leading-relaxed text-mut">
          This score supports screening; it does not replace investment-committee judgment, legal diligence, financial diligence, or direct customer reference checks.
        </p>
      </aside>
    </div>
  );
}

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

export function TeamPanel({ ensemble, founders }: { ensemble: string; founders: Founder[] }) {
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
      <p className="mt-2 font-mono text-[9px] text-mut">Odds &amp; footprint: McCarthy et al. 2023</p>
    </div>
  );
}

/* ── 3-axis screening ─────────────────────────────────────── */

export function AxisHeader({ axis }: { axis: Axis }) {
  return (
    <div className="flex items-baseline gap-1.5 py-3">
      <span className="font-mono text-[28px] font-bold leading-none">{axis.score ?? "–"}</span>
      <span className="font-mono text-[10px] text-mut">/ 100</span>
      <span className="ml-auto text-lg font-bold tracking-tight">{axis.name}</span>
    </div>
  );
}

/** Shared factor-bar grid — the uniform "important factors" presentation
 *  used by the Founder, Market, and Idea vs Market score boxes. */
function FactorBars({
  items,
}: {
  items: Array<{ key: string; label: string; score: number | null; maxScore: number }>;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {items.map((component) => (
        <div key={component.key}>
          <div className="flex justify-between gap-2 font-mono text-[9px] text-mut">
            <span>{component.label}</span>
            <span>
              {component.score ?? "–"}/{component.maxScore}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-navy"
              style={{
                width: `${((component.score ?? 0) / component.maxScore) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const FOUNDER_FACTOR_PLACEHOLDERS = [
  { key: "individual_quality", label: "Individual quality", score: null, maxScore: 100 },
  { key: "configuration", label: "Configuration", score: null, maxScore: 100 },
  { key: "diversity", label: "Diversity", score: null, maxScore: 100 },
  { key: "trait_coverage", label: "Trait coverage", score: null, maxScore: 100 },
];

const MARKET_FACTOR_PLACEHOLDERS = [
  { key: "tam", label: "TAM scale", score: null, maxScore: 25 },
  { key: "sam", label: "SAM scale", score: null, maxScore: 25 },
  { key: "som", label: "SOM scale", score: null, maxScore: 30 },
  { key: "evidence", label: "Sizing evidence", score: null, maxScore: 8 },
  { key: "traction", label: "Market traction", score: null, maxScore: 7 },
  { key: "competition", label: "Competitive room", score: null, maxScore: 5 },
];

const PMF_FACTOR_PLACEHOLDERS = [
  { key: "customer_pull", label: "Customer pull", score: null, maxScore: 40 },
  { key: "reality_check", label: "Reality check", score: null, maxScore: 30 },
  { key: "swot", label: "SWOT balance", score: null, maxScore: 20 },
  { key: "competition", label: "Competitive position", score: null, maxScore: 10 },
];

/** Uniform axis verdict (brief: rated bullish, neutral, or bear). */
function axisVerdict(
  score: number | null | undefined,
  threshold = 50,
): { label: string; tone: "good" | "neutral" | "bad" } | null {
  if (score == null) return null;
  if (score >= 70) return { label: "BULLISH", tone: "good" };
  if (score >= threshold) return { label: "NEUTRAL", tone: "neutral" };
  return { label: "BEARISH", tone: "bad" };
}

function VerdictChip({
  verdict,
}: {
  verdict: { label: string; tone: "good" | "neutral" | "bad" } | null;
}) {
  if (!verdict) {
    return (
      <span className="rounded bg-page px-2 py-0.5 font-mono text-[10px] font-bold text-mut">
        PENDING
      </span>
    );
  }
  const tone =
    verdict.tone === "good"
      ? "bg-good/10 text-good-text"
      : verdict.tone === "neutral"
        ? "bg-warn/15 text-[#8a5f00]"
        : "bg-critical/10 text-critical";
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${tone}`}>
      {verdict.label}
    </span>
  );
}

/** Founder axis box — same anatomy as the Market and Idea boxes:
 *  axis header, short rationale, factor bars. */
export function FounderScorePanel({
  axis,
  assessment,
}: {
  axis: Axis;
  assessment: FounderAssessment | null;
}) {
  return (
    <div className="mb-4 rounded-lg border border-line bg-card px-4">
      <AxisHeader axis={axis} />
      <div className="border-t border-line py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase text-mut">Hybrid team score</span>
          <VerdictChip verdict={axisVerdict(axis.score)} />
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-sub">
          {assessment?.rationale ?? "–"}
        </p>
        <FactorBars items={assessment?.factors ?? FOUNDER_FACTOR_PLACEHOLDERS} />
        <p className="mt-2 font-mono text-[9px] text-mut">
          components per McCarthy et al. 2023 · LLM adjustment bounded to ±10
        </p>
      </div>
    </div>
  );
}

/* ── market panel: axis + TAM/SAM/SOM deck-vs-computed ────── */

function usd(v: string) {
  const m = v.match(/([\d.]+)\s*([BMK]?)/i);
  if (!m) return 0;
  return parseFloat(m[1]) * ({ B: 1e9, M: 1e6, K: 1e3 }[m[2].toUpperCase()] ?? 1);
}

function ExpandableMarketDetail({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const detailId = useId();

  useEffect(() => {
    const paragraph = paragraphRef.current;
    if (!paragraph) return;

    const checkOverflow = () => {
      const lineHeight = Number.parseFloat(window.getComputedStyle(paragraph).lineHeight);
      setOverflows(paragraph.scrollHeight > lineHeight * 3 + 1);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(paragraph);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="mt-2">
      <p
        ref={paragraphRef}
        id={detailId}
        className={`${expanded ? "" : "line-clamp-3"} text-[10px] leading-relaxed text-sub`}
      >
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          className="mt-1 text-[10px] font-semibold text-navy hover:underline"
          aria-controls={detailId}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Read full text"}
        </button>
      )}
    </div>
  );
}

export function MarketPanel({
  axis,
  sizing,
  assessment,
}: {
  axis: Axis;
  sizing: SizingRow[];
  assessment: MarketAssessment | null;
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!showExplanation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowExplanation(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showExplanation]);

  return (
    <>
      <div className="rounded-lg border border-line bg-card px-4">
        <AxisHeader axis={axis} />
        <div className="border-t border-line py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase text-mut">
              €{(assessment?.investmentAmountEur ?? 100_000).toLocaleString("en-US")} check
            </span>
            <VerdictChip verdict={axisVerdict(axis.score, assessment?.threshold)} />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-sub">
            {assessment?.rationale ?? "–"}
          </p>
          <FactorBars items={assessment?.components ?? MARKET_FACTOR_PLACEHOLDERS} />
          <p className="mt-2 font-mono text-[9px] text-mut">
            investment threshold {assessment?.threshold ?? "–"}/100 · market sizes carry 80% of
            score
          </p>
          {assessment && (
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="mt-3 text-xs font-semibold text-navy hover:underline"
            >
              How is this score calculated?
            </button>
          )}
        </div>
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
              {row.detail && <ExpandableMarketDetail text={row.detail} />}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 font-mono text-[9px] text-mut">
        deck above · our estimate below — ▼ deck overstates · ▲ deck conservative · ≈ within range
      </p>
      {assessment && showExplanation && (
        <MarketScoreExplanation
          assessment={assessment}
          onClose={() => setShowExplanation(false)}
        />
      )}
    </>
  );
}

function MarketScoreExplanation({
  assessment,
  onClose,
}: {
  assessment: MarketAssessment;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/25"
      role="dialog"
      aria-modal="true"
      aria-labelledby="market-score-explanation-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-card p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div>
            <div className="eyebrow">Market score methodology</div>
            <h2 id="market-score-explanation-title" className="mt-1 text-2xl font-bold">
              How we reached {Math.round(assessment.components.reduce((total, item) => total + item.score, 0))}/100
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sub">
              The metric runs only after TAM, SAM, SOM, and agentic market research are complete.
              It tests whether the market opportunity supports a €{assessment.investmentAmountEur.toLocaleString("en-US")} investment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy"
            aria-label="Close market score explanation"
          >
            Close
          </button>
        </div>

        <section className="mt-7">
          <div className="eyebrow">Formula</div>
          <p className="mt-2 rounded-md bg-page p-3 font-mono text-xs leading-relaxed">
            TAM (25) + SAM (25) + SOM (30) + evidence (8) + traction (7) + competition (5) = 100
          </p>
          <p className="mt-2 text-xs leading-relaxed text-sub">
            Market size contributes 80 points. Estimates use a logarithmic scale so a tenfold increase matters consistently without allowing one very large number to dominate the result.
          </p>
        </section>

        <section className="mt-6">
          <div className="eyebrow">Market-size ranges</div>
          <div className="mt-2 overflow-hidden rounded-md border border-line">
            {[
              ["TAM", "$10M", "$10B", "25"],
              ["SAM", "$1M", "$1B", "25"],
              ["SOM", "$100K", "$100M", "30"],
            ].map(([metric, zero, full, points]) => (
              <div key={metric} className="grid grid-cols-[48px_1fr_1fr_52px] gap-3 border-b border-line px-3 py-2.5 text-xs last:border-b-0">
                <span className="font-semibold">{metric}</span>
                <span className="text-sub">0 pts at {zero}</span>
                <span className="text-sub">full at {full}</span>
                <span className="text-right font-mono">/{points}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="eyebrow">This company</div>
          <div className="mt-2 rounded-md border border-line px-4">
            {assessment.components.map((component) => (
              <div key={component.key} className="border-b border-line py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-semibold">{component.label}</span>
                  <span className="font-mono text-sm font-bold">
                    {component.score} / {component.maxScore}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-sub">{component.explanation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-md border border-line bg-page p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow">Decision rule</div>
              <p className="mt-1 text-sm text-sub">
                Rounded total must reach {assessment.threshold}/100.
              </p>
            </div>
            <span className={`font-mono text-lg font-bold ${assessment.worthInvesting ? "text-good-text" : "text-critical"}`}>
              {assessment.worthInvesting ? "INVEST" : "PASS"}
            </span>
          </div>
        </section>
      </aside>
    </div>
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
                  {c.name} <ExternalIcon />
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

export function IdeaPanel({
  axis,
  idea,
  assessment,
}: {
  axis: Axis;
  idea: IdeaAnalysis;
  assessment: ProductFitAssessment | null;
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!showExplanation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowExplanation(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showExplanation]);

  return (
    <>
      <div className="rounded-lg border border-line bg-card px-4">
        <AxisHeader axis={axis} />
        <div className="border-t border-line py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase text-mut">PMF evidence proxy</span>
            <VerdictChip verdict={axisVerdict(axis.score, assessment?.threshold)} />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-sub">
            {assessment?.rationale ?? "–"}
          </p>
          <FactorBars items={assessment?.components ?? PMF_FACTOR_PLACEHOLDERS} />
          <p className="mt-2 font-mono text-[9px] text-mut">
            screening threshold {assessment?.threshold ?? "–"}/100 · customer pull carries 40% of
            score
          </p>
          {assessment && (
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="mt-3 text-xs font-semibold text-navy hover:underline"
            >
              How is this score calculated?
            </button>
          )}
        </div>
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
      {assessment && showExplanation && (
        <ProductFitExplanation
          assessment={assessment}
          onClose={() => setShowExplanation(false)}
        />
      )}
    </>
  );
}

function ProductFitExplanation({
  assessment,
  onClose,
}: {
  assessment: ProductFitAssessment;
  onClose: () => void;
}) {
  const score = Math.round(
    assessment.components.reduce((total, component) => total + component.score, 0),
  );
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/25"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-fit-explanation-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-card p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div>
            <div className="eyebrow">Product–market fit methodology</div>
            <h2 id="product-fit-explanation-title" className="mt-1 text-2xl font-bold">
              How we reached {score}/100
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sub">
              This is a pre-investment evidence proxy. It combines observed customer pull with the agentic reality check, sourced SWOT, and competitive pressure; only actual retention and customer behavior can confirm PMF.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy"
            aria-label="Close product-market fit explanation"
          >
            Close
          </button>
        </div>

        <section className="mt-7">
          <div className="eyebrow">Balanced formula</div>
          <p className="mt-2 rounded-md bg-page p-3 font-mono text-xs leading-relaxed">
            customer pull (40) + reality check (30) + SWOT balance (20) + competitive position (10) = 100
          </p>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-sub">
            <p><strong className="text-ink">40% customer pull:</strong> verified retention, repeat usage, revenue, and adoption receive the most weight.</p>
            <p><strong className="text-ink">30% reality check:</strong> problem urgency, differentiation, feasibility, and adoption friction are researched and scored.</p>
            <p><strong className="text-ink">20% SWOT:</strong> sourced strengths and opportunities are balanced against weaknesses and threats by impact.</p>
            <p><strong className="text-ink">10% competition:</strong> direct competitor threat reduces the available score.</p>
          </div>
        </section>

        <section className="mt-6">
          <div className="eyebrow">This company</div>
          <div className="mt-2 rounded-md border border-line px-4">
            {assessment.components.map((component) => (
              <div key={component.key} className="border-b border-line py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-semibold">{component.label}</span>
                  <span className="font-mono text-sm font-bold">{component.score} / {component.maxScore}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-sub">{component.explanation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="eyebrow">Why these weights</div>
          <div className="mt-2 space-y-2">
            {assessment.methodologySources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-line px-3 py-2.5 text-xs font-medium hover:border-navy hover:text-navy"
              >
                {source.title} <ExternalIcon />
              </a>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-md border border-line bg-page p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow">Screening threshold</div>
              <p className="mt-1 text-sm text-sub">Promising evidence begins at {assessment.threshold}/100; strong evidence begins at 70.</p>
            </div>
            <span className={`text-right font-mono text-sm font-bold ${assessment.passesThreshold ? "text-good-text" : "text-critical"}`}>
              {assessment.verdict.toUpperCase()}
            </span>
          </div>
        </section>
      </aside>
    </div>
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

export function MemoPanel({ memo, claims }: { memo: Memo; claims: Claim[] }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div>
        <div className="eyebrow">Investment hypotheses</div>
        {memo.hypotheses.length === 0 ? (
          <p className="mt-1 text-xs text-sub">No hypotheses derived yet.</p>
        ) : (
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
        )}
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

export function DecisionRail({
  app,
  decision,
  onDecide,
}: {
  app: Application;
  decision: Decision | undefined;
  onDecide: (d: Decision | undefined) => void;
}) {
  const assessment = app.overallAssessment;
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-bold tracking-tight">{app.company}</span>
          <span className="font-mono text-lg font-semibold leading-tight">
            {assessment?.score ?? "–"}
            <span className="text-mut"> / 100</span>
          </span>
          <span
            className={`text-sm font-semibold ${
              assessment
                ? assessment.passesThreshold
                  ? "text-good-text"
                  : "text-critical"
                : "text-mut"
            }`}
          >
            {assessment?.verdict ?? "Pending"}
          </span>
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
                className="rounded-md border border-critical/40 px-4 py-2 text-sm font-medium text-critical hover:border-critical hover:bg-critical/5"
              >
                Pass
              </button>
              <button
                onClick={() => onDecide("fund")}
                className="rounded-md bg-good-text px-5 py-2 text-sm font-semibold text-white hover:bg-[#005200]"
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
