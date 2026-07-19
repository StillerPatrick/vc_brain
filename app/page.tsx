import Link from "next/link";
import { Logo } from "./logo";

const STEPS = [
  {
    number: "01",
    title: "Apply",
    copy: "Deck + team. Five minutes. No warm intro, no meeting, no network required.",
  },
  {
    number: "02",
    title: "Screening",
    copy: "Who you are as builders, how big your market really is, and whether your idea holds up inside it.",
  },
  {
    number: "03",
    title: "Diligence",
    copy: "Your traction, market numbers, and background are checked against public evidence — what can't be proven is marked open, not held against you.",
  },
  {
    number: "04",
    title: "Decision",
    copy: "A $100K yes or no — with the evidence and the rationale attached.",
  },
];

const FAIR_SHOT = [
  {
    title: "Judged on what you build",
    copy: "Your shipped work, your code, and your public footprint carry the score — research-backed founder signals, not pedigree.",
    note: "Founder model: McCarthy et al. 2023, Scientific Reports",
  },
  {
    title: "First-time founders welcome",
    copy: "No funding history, no famous employer, no accelerator badge required. The screening is built for the cold start.",
    note: "Cold-start scoring from public footprint",
  },
  {
    title: "You'll know why",
    copy: "Yes or no, you see what counted — your strengths, the open gaps, and where every conclusion came from.",
    note: "No black box · every conclusion sourced",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* ── header ── */}
      <header className="flex items-center gap-4 border-b border-line bg-card px-6 py-3">
        <Link href="/" aria-label="Oceana home">
          <Logo />
        </Link>
        <span className="eyebrow hidden md:inline">$100K checks · 24 hours</span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/console"
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy hover:text-navy"
          >
            Console
          </Link>
          <Link
            href="/apply"
            className="rounded-md bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#104281]"
          >
            Apply
          </Link>
        </div>
      </header>

      {/* ── hero ── */}
      <section className="relative overflow-hidden">
        {/* drifting ocean-toned orbs behind the hero */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="landing-orb absolute -left-32 -top-24 size-[480px] rounded-full opacity-60 blur-[110px]"
            style={{ background: "#a5cbea" }}
          />
          <div
            className="landing-orb absolute -right-40 top-16 size-[520px] rounded-full opacity-40 blur-[120px]"
            style={{ background: "#2a78d6", animationDuration: "17s", animationDirection: "reverse" }}
          />
          <div
            className="landing-orb absolute -bottom-48 left-1/3 size-[420px] rounded-full opacity-30 blur-[110px]"
            style={{ background: "#7fd4c1", animationDuration: "22s" }}
          />
          <div
            className="landing-orb absolute bottom-0 right-1/4 size-64 rounded-full opacity-20 blur-[90px]"
            style={{ background: "#ff7f63", animationDuration: "14s", animationDirection: "reverse" }}
          />
        </div>
        <div className="relative mx-auto max-w-[880px] px-6 pb-16 pt-20 text-center sm:pt-28">
        <div className="eyebrow">Applications open · decisions within 24 hours</div>
        <h1 className="mt-4 text-balance text-[clamp(2.6rem,7vw,4.5rem)] font-bold leading-[1.02] tracking-tight">
          $100K for your idea.
          <span className="block text-navy">Decision in 24 hours.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-sub">
          Upload your deck, add your team. We screen the work you&apos;ve actually
          done — your code, your track record, your market — not who you know.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/apply"
            className="rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#104281]"
          >
            Apply now
          </Link>
          <a
            href="#how"
            className="rounded-md border border-line px-6 py-2.5 text-sm font-semibold text-sub hover:border-navy hover:text-navy"
          >
            How it works
          </a>
        </div>
        <p className="mt-4 font-mono text-[10px] text-mut">
          Minimum application: pitch deck + founders.
          </p>
        </div>
      </section>

      {/* ── the 24 hours ── */}
      <section id="how" className="border-t border-line bg-card px-6 py-16">
        <div className="mx-auto max-w-[880px]">
          <div className="eyebrow mb-2">What happens in the 24 hours</div>
          <div className="divide-y divide-line border-y border-line">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="grid gap-2 py-5 sm:grid-cols-[64px_180px_1fr] sm:items-baseline"
              >
                <span className="font-mono text-[10px] font-semibold text-navy">
                  {step.number}
                </span>
                <h2 className="text-lg font-bold tracking-tight">{step.title}</h2>
                <p className="text-sm leading-relaxed text-sub">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── fair shot ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[880px]">
          <div className="eyebrow mb-2">A fair shot</div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            No Stanford degree? No OpenAI badge?
            <span className="text-navy"> Apply anyway.</span>
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FAIR_SHOT.map((item) => (
              <div key={item.title} className="rounded-lg border border-line bg-card p-4">
                <h3 className="text-[15px] font-semibold leading-tight">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-sub">{item.copy}</p>
                <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] text-mut">
                  {item.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── investor strip ── */}
      <section className="border-t border-line bg-card px-6 py-10">
        <div className="mx-auto flex max-w-[880px] flex-wrap items-center gap-4">
          <div>
            <div className="eyebrow">For investors</div>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-sub">
              Every application arrives scored across the three axes, with an
              evidence-backed memo and every source attached.
            </p>
          </div>
          <Link
            href="/console"
            className="ml-auto rounded-md border border-line px-5 py-2 text-sm font-semibold hover:border-navy hover:text-navy"
          >
            Open console
          </Link>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-line px-6 py-6">
        <div className="mx-auto flex max-w-[880px] flex-wrap items-center gap-4">
          <Logo />
          <p className="ml-auto font-mono text-[10px] text-mut">
            AI-assisted diligence · human investment judgment
          </p>
        </div>
      </footer>
    </main>
  );
}
