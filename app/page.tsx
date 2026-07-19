import Link from "next/link";

function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-lg bg-[#102e4a]" aria-hidden="true">
        <span className="absolute left-2 top-2 h-5 w-1.5 rounded-full bg-[#ff8667]" />
        <span className="absolute left-[17px] top-3 h-4 w-1.5 rounded-full bg-white" />
        <span className="absolute left-6 top-[18px] h-2.5 w-1.5 rounded-full bg-[#8db7db]" />
      </span>
      <span className="text-[15px] font-extrabold tracking-[-0.035em]">VC BRAIN</span>
    </span>
  );
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

const sources = [
  { initials: "WB", name: "World Bank", use: "Market sizing", color: "#126e82" },
  { initials: "TC", name: "TechCrunch", use: "Competitive landscape", color: "#e85d46" },
  { initials: "CB", name: "Crunchbase", use: "Company intelligence", color: "#3b6fc4" },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f7f6f2] text-[#101b24]">
      <header className="relative z-40 border-b border-[#102e4a]/10 bg-[#f7f6f2]/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="VC Brain home"><Logo /></Link>
          <nav className="ml-auto hidden items-center gap-8 text-[13px] font-semibold text-[#40515e] md:flex" aria-label="Main navigation">
            <a href="#product" className="hover:text-[#102e4a]">Product</a>
            <a href="#workflow" className="hover:text-[#102e4a]">Workflow</a>
            <a href="#evidence" className="hover:text-[#102e4a]">Evidence</a>
          </nav>
          <Link href="/console" className="ml-auto hidden rounded-full px-4 py-2 text-[13px] font-semibold hover:bg-white md:ml-7 md:inline-flex">Investor login</Link>
          <Link href="/apply" className="ml-2 inline-flex items-center gap-2 rounded-full bg-[#102e4a] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#1c4668]">
            Apply <Arrow />
          </Link>
        </div>
      </header>

      <section className="relative px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24 lg:px-12 lg:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-[#dceaf7]/70 blur-[100px]" />
        <div className="relative mx-auto max-w-[1400px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#102e4a]/12 bg-white/70 px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#536675]">
            <span className="size-1.5 rounded-full bg-[#e9694d]" /> Venture diligence, re-engineered
          </div>
          <h1 className="mx-auto mt-7 max-w-[1160px] text-balance text-[clamp(3.25rem,7.7vw,7.6rem)] font-semibold leading-[0.88] tracking-[-0.072em] text-[#102e4a]">
            Investment decisions,
            <span className="block text-[#4c7191]">with the evidence attached.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-[#586975] sm:text-xl">
            One clear view across the pitch deck, founder signals, market potential, competitors, and every source that matters.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/console" className="group inline-flex items-center gap-3 rounded-full bg-[#102e4a] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(16,46,74,0.14)] transition hover:-translate-y-0.5 hover:bg-[#1c4668]">
              Enter investor console <span className="transition-transform group-hover:translate-x-1"><Arrow /></span>
            </Link>
            <Link href="/apply" className="inline-flex items-center gap-3 rounded-full border border-[#102e4a]/15 bg-white/70 px-6 py-3.5 text-sm font-bold transition hover:border-[#102e4a]/35 hover:bg-white">
              Submit a company <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="product" className="px-3 pb-20 sm:px-8 sm:pb-28 lg:px-12">
        <div className="relative mx-auto max-w-[1320px] rounded-[1.75rem] bg-[#102e4a] p-3 shadow-[0_35px_100px_rgba(16,46,74,0.2)] sm:rounded-[2.25rem] sm:p-5 lg:p-7">
          <div className="absolute -right-2 -top-5 z-20 flex items-center gap-2 rounded-full bg-[#ff8667] px-4 py-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#532417] shadow-xl sm:right-8 sm:top-5">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#7b2f1d] opacity-30" /><span className="relative size-2 rounded-full bg-[#7b2f1d]" /></span>
            Research agent active
          </div>
          <div className="overflow-hidden rounded-[1.15rem] bg-[#f4f4ef] sm:rounded-[1.5rem]">
            <div className="flex h-14 items-center border-b border-[#102e4a]/10 px-4 sm:px-6">
              <Logo />
              <span className="ml-auto rounded-full bg-[#dcead8] px-3 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#35613b]">Diligence complete</span>
            </div>
            <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-[0.72fr_1.28fr] lg:gap-5 lg:p-7">
              <aside className="rounded-xl border border-[#102e4a]/10 bg-white p-5 sm:rounded-2xl sm:p-6">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7a8892]">Current opportunity</p>
                <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] text-[#102e4a]">Aurora AI</h2>
                <p className="mt-1 text-xs text-[#6c7b85]">AI infrastructure · Berlin</p>
                <div className="mt-6 rounded-xl bg-[#eef3f6] p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold">Decision signal</span><span className="rounded-full bg-[#ffdfd7] px-2.5 py-1 text-[9px] font-extrabold text-[#8f3e2d]">INVEST</span></div>
                  <div className="mt-4 flex items-end gap-1" aria-hidden="true">
                    {[38, 55, 48, 68, 62, 82, 78, 91].map((height, index) => <span key={index} className="flex-1 rounded-sm bg-[#4c7191]" style={{ height }} />)}
                  </div>
                </div>
                <div className="mt-5 border-t border-[#102e4a]/10 pt-5">
                  <p className="text-xs font-bold">Founder signal: strong</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#647681]">Complementary technical and commercial profiles with consistent execution evidence.</p>
                </div>
              </aside>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-[#102e4a]/10 bg-white p-5 sm:rounded-2xl sm:p-6">
                  <div className="flex items-center justify-between"><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7a8892]">Market potential</p><span className="text-[#4d6f8b]">↗</span></div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[["TAM", "$8.2B"], ["SAM", "$1.4B"], ["SOM", "$92M"]].map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-[#edf3f8] p-3"><p className="font-mono text-[8px] text-[#70808c]">{key}</p><p className="mt-1 text-base font-extrabold text-[#102e4a] sm:text-lg">{value}</p></div>
                    ))}
                  </div>
                  <p className="mt-5 text-[11px] leading-relaxed text-[#5d707c]">Bottom-up estimate based on addressable enterprise teams, verified pricing, and adoption assumptions.</p>
                </article>
                <article className="rounded-xl border border-[#102e4a]/10 bg-[#dceaf7] p-5 sm:rounded-2xl sm:p-6">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#5f7485]">Investment hypothesis</p>
                  <p className="mt-5 text-lg font-bold leading-snug tracking-[-0.025em] text-[#102e4a]">Workflow depth can turn an early technical lead into durable enterprise retention.</p>
                  <div className="mt-5 flex items-center gap-2 text-[10px] font-semibold text-[#506b7e]"><span className="size-2 rounded-full bg-[#4c7191]" /> 4 supporting signals</div>
                </article>
                <article className="rounded-xl border border-[#102e4a]/10 bg-[#ffdfd7] p-5 sm:rounded-2xl sm:p-6">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#835f56]">Key risk</p>
                  <p className="mt-5 text-lg font-bold leading-snug tracking-[-0.025em] text-[#51291f]">Enterprise sales motion remains early and the category is consolidating quickly.</p>
                  <div className="mt-5 rounded-lg bg-white/55 px-3 py-2 text-[10px] font-semibold text-[#6d473d]">Validate with 3 customer references</div>
                </article>
                <article className="rounded-xl border border-[#102e4a]/10 bg-white p-5 sm:rounded-2xl sm:p-6">
                  <div className="flex items-center justify-between"><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7a8892]">Evidence trail</p><span className="rounded-full bg-[#edf1f3] px-2 py-1 text-[8px] font-bold">18 SOURCES</span></div>
                  <div className="mt-4 space-y-3">
                    {sources.slice(0, 2).map((source) => <div key={source.name} className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: source.color }}>{source.initials}</span><div><p className="text-[11px] font-bold">{source.name}</p><p className="text-[9px] text-[#7b8991]">{source.use}</p></div><span className="ml-auto text-xs text-[#829099]">↗</span></div>)}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#102e4a]/10 bg-white px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-y-7 lg:grid-cols-4">
          {[["01", "Deck intelligence"], ["02", "Founder diligence"], ["03", "Market research"], ["04", "Investment memo"]].map(([number, label]) => (
            <div key={number} className="flex items-center gap-3"><span className="font-mono text-[9px] text-[#e26449]">{number}</span><span className="text-xs font-bold sm:text-sm">{label}</span></div>
          ))}
        </div>
      </section>

      <section id="workflow" className="px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-6 lg:grid-cols-2">
            <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.17em] text-[#e26449]">The workflow</p><h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-[#102e4a] sm:text-7xl">Less hunting.<br />More thinking.</h2></div>
            <p className="max-w-xl self-end text-lg leading-relaxed text-[#5d6d78] lg:justify-self-end">The agent handles the repetitive diligence work and keeps every important source. Your team stays focused on the judgment only investors can make.</p>
          </div>
          <div className="mt-16 divide-y divide-[#102e4a]/12 border-y border-[#102e4a]/12">
            {[
              ["01", "Submit", "Pitch deck and founder profiles enter one workspace."],
              ["02", "Investigate", "Agents analyze the company, founders, market, and competition."],
              ["03", "Interrogate", "Review assumptions, inspect sources, and sharpen the hypothesis."],
              ["04", "Decide", "Share one concise, evidence-backed investment view."],
            ].map(([number, title, copy]) => (
              <div key={number} className="grid gap-3 py-7 sm:grid-cols-[80px_0.7fr_1.3fr] sm:items-center sm:py-9">
                <span className="font-mono text-[10px] text-[#e26449]">{number}</span><h3 className="text-2xl font-bold tracking-[-0.035em] text-[#102e4a] sm:text-3xl">{title}</h3><p className="max-w-xl text-sm leading-relaxed text-[#667680] sm:text-base">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="evidence" className="bg-[#102e4a] px-5 py-24 text-white sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto grid max-w-[1320px] items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.17em] text-[#ff9a80]">Transparent by design</p>
            <h2 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-7xl">Trust the work.<br />Check the work.</h2>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/65">Every material conclusion keeps its evidence attached. Open the original source behind market sizing, competition, traction, and the final investment thesis.</p>
            <div className="mt-9 grid grid-cols-2 gap-4 border-t border-white/15 pt-7">
              <div><p className="text-3xl font-bold">TAM / SAM / SOM</p><p className="mt-1 text-xs text-white/50">Calculated separately</p></div>
              <div><p className="text-3xl font-bold">Source-first</p><p className="mt-1 text-xs text-white/50">Every crucial link preserved</p></div>
            </div>
          </div>
          <div className="rounded-[1.75rem] bg-[#173b5b] p-4 sm:p-7">
            <div className="rounded-2xl bg-[#f7f6f2] p-5 text-[#101b24] sm:p-7">
              <div className="flex items-end justify-between border-b border-[#102e4a]/10 pb-5"><div><p className="font-mono text-[8px] uppercase tracking-[0.17em] text-[#7b8992]">Research sources</p><h3 className="mt-2 text-xl font-bold">Evidence behind the view</h3></div><span className="rounded-full bg-[#dcead8] px-2.5 py-1 font-mono text-[8px] font-bold text-[#35613b]">VERIFIED</span></div>
              <div className="divide-y divide-[#102e4a]/10">
                {sources.map((source) => (
                  <div key={source.name} className="flex items-center gap-4 py-5"><span className="grid size-10 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: source.color }}>{source.initials}</span><div><p className="text-sm font-bold">{source.name}</p><p className="mt-0.5 text-[10px] text-[#75848d]">{source.use}</p></div><span className="ml-auto text-[#6f808b]">↗</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-[1320px] rounded-[1.75rem] bg-[#dceaf7] px-6 py-16 text-center sm:rounded-[2.25rem] sm:px-12 sm:py-24">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.17em] text-[#55758f]">Your next decision starts here</p>
          <h2 className="mx-auto mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-[#102e4a] sm:text-7xl">Find the signal before everyone else.</h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3"><Link href="/console" className="rounded-full bg-[#102e4a] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#1c4668]">Open investor console →</Link><Link href="/apply" className="rounded-full border border-[#102e4a]/15 bg-white/50 px-7 py-3.5 text-sm font-bold hover:bg-white">Apply for funding</Link></div>
        </div>
      </section>

      <footer className="border-t border-[#102e4a]/10 px-5 py-9 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 sm:flex-row sm:items-center"><Logo /><p className="text-xs text-[#74818a] sm:ml-auto">AI-assisted diligence. Human investment judgment.</p><div className="flex gap-5 text-xs font-bold"><Link href="/apply">For founders</Link><Link href="/console">Investor console</Link></div></div>
      </footer>
    </main>
  );
}
