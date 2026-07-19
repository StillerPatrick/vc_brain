"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { submitApplication, uploadPitchDeck } from "@/lib/api";

interface Member {
  name: string;
  role: string;
  about: string;
  github: string;
  linkedin: string;
  x: string;
}

const EMPTY_MEMBER: Member = { name: "", role: "", about: "", github: "", linkedin: "", x: "" };
const MAX_TEAM = 3;

const BRANCHES = [
  "AI infra",
  "AI applications",
  "Dev tools",
  "Fintech",
  "Health",
  "Climate",
  "Robotics",
  "Consumer",
  "B2B SaaS",
  "Other",
];

const input =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-mut focus:border-navy";

function Field({
  label,
  children,
  hint,
  containerOnly = false,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  containerOnly?: boolean;
}) {
  const content = (
    <>
      <span className="eyebrow">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-mut">{hint}</p>}
    </>
  );

  if (containerOnly) return <div className="block">{content}</div>;

  return (
    <label className="block">
      {content}
    </label>
  );
}

export default function Apply() {
  const [company, setCompany] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [team, setTeam] = useState<Member[]>([{ ...EMPTY_MEMBER }]);
  const [deckName, setDeckName] = useState("");
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const deckInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setMember = (i: number, patch: Partial<Member>) =>
    setTeam((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-2xl rounded-lg border border-line bg-card p-8">
          <div className="font-mono text-3xl text-good-text">✓</div>
          <h1 className="mt-2 text-xl font-bold tracking-tight">
            Thanks{team[0]?.name ? ` ${team[0].name.split(" ")[0]}` : ""} for applying!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-sub">
            You&apos;ll have a decision within 24 hours.
          </p>
          {submitError && <p className="mt-4 text-xs text-critical">{submitError}</p>}
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-[#104281]"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b border-line bg-card px-6 py-3">
        <div className="flex items-baseline gap-2">
          <span className="inline-block size-2.5 rounded-[3px] bg-navy" aria-hidden />
          <span className="text-[15px] font-extrabold tracking-tight">VC BRAIN</span>
          <span className="eyebrow hidden md:inline">Application</span>
        </div>
        <Link
          href="/"
          className="ml-auto rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy hover:text-navy"
        >
          ← Home
        </Link>
      </header>

      <form
        className="mx-auto max-w-2xl px-6 py-10"
        onSubmit={async (e) => {
          e.preventDefault();
          if (team.some((member) => !member.github && !member.linkedin && !member.x)) {
            setSubmitError("Every founder needs at least one GitHub, LinkedIn, or X profile.");
            return;
          }
          setSubmitting(true);
          setSubmitError(null);
          try {
            const result = await submitApplication({
              company,
              one_liner: oneLiner || undefined,
              sector: sector || undefined,
              location: location || undefined,
              deck_filename: deckName || undefined,
              founders: team.map((member) => ({
                name: member.name,
                role: member.role || undefined,
                about: member.about || undefined,
                github: member.github || undefined,
                linkedin: member.linkedin || undefined,
                x: member.x || undefined,
              })),
            });
            setSubmitted(true);
            if (deckFile) {
              try {
                await uploadPitchDeck(result.application_id, deckFile);
              } catch (error) {
                setSubmitError(
                  error instanceof Error
                    ? `Application saved, but the pitch deck upload failed: ${error.message}`
                    : "Application saved, but the pitch deck upload failed.",
                );
              }
            }
          } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Submission failed");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Apply for 100K</h1>
        <p className="mt-1 text-[15px] text-sub">
          Team + deck. Decision within 24 hours.
        </p>

        {/* ── company ── */}
        <div className="mt-8 rounded-lg border border-line bg-card p-5">
          <div className="eyebrow mb-4">Startup</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <input
                className={input}
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Parsec Robotics"
              />
            </Field>
            <Field label="One-liner">
              <input
                className={input}
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                placeholder="What the company does"
              />
            </Field>
            <Field label="Branch">
              <select
                className={`${input} ${sector ? "" : "text-mut"}`}
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <option value="" disabled>
                  Select branch …
                </option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input
                className={input}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Berlin, DE"
              />
            </Field>
            <Field
              label="Pitch deck"
              hint="PDF only — claims in it will be verified against public sources."
              containerOnly
            >
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-page px-3 py-2 text-left text-sm text-sub hover:border-navy focus:border-navy focus:outline-none"
                onClick={() => deckInputRef.current?.click()}
              >
                <span className="font-mono text-[11px]">{deckName || "Upload PDF"}</span>
              </button>
              <input
                ref={deckInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                aria-label="Pitch deck PDF"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (
                    file &&
                    file.type !== "application/pdf" &&
                    !file.name.toLowerCase().endsWith(".pdf")
                  ) {
                    setDeckFile(null);
                    setDeckName("");
                    setSubmitError("Pitch deck must be a PDF file.");
                    e.target.value = "";
                    return;
                  }
                  setDeckFile(file);
                  setDeckName(file?.name ?? "");
                  setSubmitError(null);
                }}
              />
            </Field>
          </div>
        </div>

        {/* ── team ── */}
        <div className="mt-6 rounded-lg border border-line bg-card p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="eyebrow">Team</div>
            {team.length > 1 && (
              <span className="font-mono text-[10px] text-mut">
                {team.length} founder{team.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="space-y-5">
            {team.map((m, i) => (
              <div key={i} className="rounded-md border border-line bg-page p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] font-semibold text-mut">FOUNDER {i + 1}</span>
                  {team.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTeam((prev) => prev.filter((_, j) => j !== i))}
                      className="font-mono text-[10px] text-mut hover:text-critical"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name">
                    <input
                      className={input}
                      required
                      value={m.name}
                      onChange={(e) => setMember(i, { name: e.target.value })}
                      placeholder="Lena Okafor"
                    />
                  </Field>
                  <Field label="Role">
                    <input
                      className={input}
                      value={m.role}
                      onChange={(e) => setMember(i, { role: e.target.value })}
                      placeholder="CEO"
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="About" hint="Background, what you've shipped, why this problem.">
                    <textarea
                      className={`${input} min-h-20 resize-y`}
                      value={m.about}
                      onChange={(e) => setMember(i, { about: e.target.value })}
                      placeholder="Robotics PhD, built fleet tooling at …"
                    />
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="GitHub">
                    <input
                      className={input}
                      type="url"
                      value={m.github}
                      onChange={(e) => setMember(i, { github: e.target.value })}
                      placeholder="github.com/…"
                    />
                  </Field>
                  <Field label="LinkedIn">
                    <input
                      className={input}
                      type="url"
                      value={m.linkedin}
                      onChange={(e) => setMember(i, { linkedin: e.target.value })}
                      placeholder="linkedin.com/in/…"
                    />
                  </Field>
                  <Field label="X">
                    <input
                      className={input}
                      type="url"
                      value={m.x}
                      onChange={(e) => setMember(i, { x: e.target.value })}
                      placeholder="x.com/…"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          {team.length < MAX_TEAM && (
            <button
              type="button"
              onClick={() => setTeam((prev) => [...prev, { ...EMPTY_MEMBER }])}
              className="mt-4 rounded-md border border-line px-4 py-2 text-sm font-medium text-sub hover:border-navy hover:text-navy"
            >
              + Add co-founder
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="max-w-sm text-[11px] leading-relaxed text-mut">
            By applying you consent to a scan of the linked public profiles. Every claim is scored for trust —
            gaps are flagged, never guessed.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#104281] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </div>
        {submitError && <p className="mt-3 text-right text-xs text-critical">{submitError}</p>}
      </form>
    </div>
  );
}
