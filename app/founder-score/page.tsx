"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FounderScoreResult, getFounderScore, startFounderScore } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-mut focus:border-navy";

export default function FounderScorePage() {
  const [name, setName] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [x, setX] = useState("");
  const [result, setResult] = useState<FounderScoreResult | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (
      !userId ||
      result?.founder_score != null ||
      result?.job_status === "failed"
    ) return;
    const timer = window.setInterval(() => {
      getFounderScore(userId).then(setResult).catch((reason) => setError(String(reason)));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [result?.founder_score, result?.job_status, userId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const accepted = await startFounderScore({ name: name || undefined, github: github || undefined, linkedin: linkedin || undefined, x: x || undefined });
      setUserId(accepted.user_id);
      setResult(await getFounderScore(accepted.user_id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start founder research.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-page">
      <header className="flex items-center gap-4 border-b border-line bg-card px-6 py-3">
        <Link href="/" className="text-[15px] font-extrabold tracking-tight">VC BRAIN</Link>
        <span className="eyebrow">Founder score</span>
        <Link href="/apply" className="ml-auto text-xs font-semibold text-sub hover:text-navy">Full application</Link>
      </header>
      <div className="mx-auto grid max-w-4xl gap-6 px-6 py-10 md:grid-cols-[1fr_0.9fr]">
        <form onSubmit={submit} className="rounded-lg border border-line bg-card p-5">
          <div className="eyebrow">Independent research</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Score a founder before a deck exists.</h1>
          <p className="mt-2 text-sm leading-relaxed text-sub">Add at least one public profile. No company, startup description, or pitch deck is required.</p>
          <label className="mt-5 block text-xs font-semibold">Name (optional)<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="mt-3 block text-xs font-semibold">GitHub<input className={inputClass} placeholder="github.com/username" value={github} onChange={(event) => setGithub(event.target.value)} /></label>
          <label className="mt-3 block text-xs font-semibold">LinkedIn<input className={inputClass} placeholder="linkedin.com/in/name" value={linkedin} onChange={(event) => setLinkedin(event.target.value)} /></label>
          <label className="mt-3 block text-xs font-semibold">X<input className={inputClass} placeholder="x.com/username" value={x} onChange={(event) => setX(event.target.value)} /></label>
          {error && <p className="mt-3 text-xs text-critical">{error}</p>}
          <button disabled={submitting} className="mt-5 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Starting research…" : "Calculate founder score"}</button>
        </form>
        <aside className="rounded-lg border border-line bg-card p-5">
          <div className="eyebrow">How the 0–100 score works</div>
          <p className="mt-2 text-sm leading-relaxed text-sub">It evaluates the individual public footprint, not the startup. It does not use school, employer prestige, funding history, or a deck.</p>
          <ul className="mt-4 space-y-3 text-sm text-sub">
            <li><strong className="text-ink">70% benchmark fit.</strong> Observed Big Five traits compared with the successful-founder benchmark.</li>
            <li><strong className="text-ink">20% evidence confidence.</strong> How specific and consistent the retrieved evidence is.</li>
            <li><strong className="text-ink">10% research coverage.</strong> Whether GitHub, LinkedIn, and X produced public evidence.</li>
          </ul>
          {result && <div className="mt-6 border-t border-line pt-4">
            {result.founder_score == null ? <div><p className="text-sm text-sub">Research status: {result.job_status ?? "starting"}.</p>{result.job_error && <p className="mt-2 text-xs leading-relaxed text-critical">{result.job_error}</p>}</div> : <><div className="font-mono text-4xl font-semibold text-navy">{result.founder_score}<span className="text-base text-mut">/100</span></div><p className="mt-1 text-sm text-sub">{result.analysis?.summary}</p><div className="mt-4 space-y-2">{Object.entries(result.components ?? {}).map(([key, component]) => <div key={key}><div className="flex justify-between text-xs"><span>{component.label}</span><span>{component.score}/100 · {Math.round(component.weight * 100)}%</span></div><p className="mt-0.5 text-[11px] leading-relaxed text-mut">{component.explanation}</p></div>)}</div></>}
          </div>}
        </aside>
      </div>
    </main>
  );
}
