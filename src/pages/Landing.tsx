import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CalendarCheck,
  ChevronRight,
  Database,
  Inbox,
  MailCheck,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";

// Auth + the product live on the app subdomain. When the landing is served from
// the marketing root, hand sign-in/sign-up off to the product subdomain (where
// Convex Auth + Google OAuth origins are configured). On the app subdomain or
// localhost we stay in-app.
const APP_ORIGIN = "https://app.tryquorum.xyz";
function authUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const host = window.location.hostname;
  return host === "tryquorum.xyz" || host === "www.tryquorum.xyz"
    ? `${APP_ORIGIN}${path}`
    : path;
}

// Scroll-reveal wrapper used across sections.
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const LOOP = [
  { n: "01", icon: Inbox, label: "Ingest", body: "New inbound, a CSV, or a webhook lands in one queue. Every account starts the same way." },
  { n: "02", icon: BrainCircuit, label: "Build the brain", body: "Quorum researches the company, identifies committee gaps, and decides the next best move." },
  { n: "03", icon: ShieldCheck, label: "Review", body: "Drafts and risky actions wait behind a human gate before anything is customer-facing." },
  { n: "04", icon: Send, label: "Close the loop", body: "Approved work becomes CRM updates, messages, meetings, and team alerts with receipts." },
];

const PROBLEMS = [
  { title: "Speed to lead dies in handoffs", body: "A lead arrives, gets routed, sits in a queue, and the moment is gone before a human replies. The account cools while the work waits." },
  { title: "Sequencers think in contacts", body: "Engagement tools blast one inbox at a time. Real deals close across a buying committee, with memory of every prior touch." },
  { title: "AI without governance is dangerous", body: "Autonomous outreach with no review, no source of truth, and no receipts puts your brand and your pipeline at risk." },
];

const CHANNELS = [
  { key: "slack", label: "Slack", icon: MessageSquareText, body: "Qualified accounts, risky actions, and approval-needed nudges post straight into your revenue channel." },
  { key: "crm", label: "CRM", icon: Database, body: "Accounts, contacts, notes, and deals are created and kept in sync in HubSpot or Salesforce after review." },
  { key: "email", label: "Email", icon: MailCheck, body: "Persona-tuned outreach to the whole committee, sent from the seller's mailbox once a human approves it." },
  { key: "calendar", label: "Calendar", icon: CalendarCheck, body: "Meetings get booked and follow-ups scheduled the moment a prospect agrees, with the right context attached." },
] as const;

const MOAT = [
  { title: "Why not just use a CRM copilot?", body: "A copilot answers questions about one record. Quorum works the entire account: committee, memory, drafts, the next move, and the action itself." },
  { title: "Why not a sales engagement tool?", body: "Sequencers automate messages. Quorum reasons about accounts, committee coverage, timing, and the next safe action, with a human gate on every send." },
  { title: "Why now?", body: "Inbound volume outpaces headcount, and models are finally good enough to do real GTM work, as long as every action stays governed and auditable." },
];

const NAV = [
  { label: "Product", href: "#product" },
  { label: "Why", href: "#why" },
  { label: "Moat", href: "#moat" },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <Navbar />
      <Hero />
      <ProductPreview />
      <OperatingLoop />
      <Problem />
      <RealWork />
      <Moat />
      <CtaBand />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="Quorum">
          <img src="/quorum-logo.svg" alt="Quorum" className="h-6 w-auto" />
          <span className="hidden h-4 w-px bg-border md:block" />
          <span className="mono-label hidden text-tertiary md:block">AI account execution</span>
        </a>
        <nav className="hidden items-center gap-8 text-[13px] text-secondary md:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="transition-colors hover:text-text">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={authUrl("/signin")}
            className="hidden text-[13px] font-medium text-secondary transition-colors hover:text-text sm:inline"
          >
            Sign in
          </a>
          <a href={authUrl("/signin")} className="btn-primary h-9 rounded-none px-4 text-[13px]">
            Preview product
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative px-6 pb-16 pt-24 text-center sm:pt-28">
      <Reveal className="mx-auto max-w-[1300px]">
        <p className="mono-label text-accent-soft">_AI account execution</p>
        <h1 className="mx-auto mt-7 max-w-[1180px] text-balance text-[38px] font-semibold leading-[1.06] tracking-tight sm:text-[62px]">
          The <span className="text-accent">AI account executive</span> that works every inbound account.
        </h1>
        <p className="mx-auto mt-6 max-w-[68rem] text-balance text-[16px] leading-relaxed text-secondary sm:text-[18px]">
          Quorum turns a new lead into researched account context, a mapped buying committee, approved
          outreach, CRM updates, meetings, and team alerts. Humans review the risky work. Quorum handles the rest.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={authUrl("/signup")} className="btn-secondary h-12 rounded-none px-6 text-[14px]">
            Create workspace
          </a>
          <a href={authUrl("/signin")} className="btn-primary h-12 rounded-none px-6 text-[14px]">
            Preview product
            <ArrowRight size={16} strokeWidth={2.2} />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function ProductPreview() {
  return (
    <section className="relative z-10 px-6 pt-4">
      <Reveal className="mx-auto max-w-[1100px]">
        <BrowserFrame src="/shot-command.png" alt="Quorum account command center" />
        <p className="mono-label mt-4 text-center text-tertiary">
          one account, fully worked &middot; brain, committee, drafts, and receipts
        </p>
      </Reveal>
    </section>
  );
}

function OperatingLoop() {
  return (
    <section id="product" className="relative border-t border-border py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="mono-label text-accent-soft">The operating loop</p>
          <h2 className="mt-4 max-w-3xl text-balance text-[30px] font-semibold leading-tight tracking-tight sm:text-[42px]">
            Ingest a signal. Build the account brain. Hold for review. Close the loop.
          </h2>
        </Reveal>
        <div className="mt-12 cell overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
            {LOOP.map((step) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.n} className="group relative p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center border border-accent-subtle text-accent transition-colors group-hover:border-accent">
                      <Icon size={17} strokeWidth={2} />
                    </span>
                    <span className="mono-label tnum text-tertiary">{step.n}</span>
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-text">{step.label}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-secondary">{step.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section id="why" className="relative border-t border-border bg-bg/60 py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="mono-label text-accent-soft">The gap</p>
          <h2 className="mt-4 max-w-3xl text-balance text-[32px] font-semibold leading-tight tracking-tight sm:text-[46px]">
            Revenue teams bought a dozen tools. The work still falls between them.
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-secondary">
            CRM, enrichment, sequencers, and a copilot each own a slice. Nobody owns the account from
            the first signal to a booked meeting. Quorum does.
          </p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="cell h-full p-6 transition-colors hover:border-border-strong">
                <span className="mono-label tnum text-accent-soft">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-[18px] font-semibold leading-snug text-text">{p.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-secondary">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function RealWork() {
  const [active, setActive] = useState(0);
  return (
    <section className="relative border-t border-border py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="mono-label text-accent-soft">How it becomes real work</p>
          <h2 className="mt-4 max-w-3xl text-balance text-[32px] font-semibold leading-tight tracking-tight sm:text-[46px]">
            The account brain is only useful if actions land in the tools customers already use.
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-secondary">
            Every customer-facing action is connector-backed and review-gated, then written into your
            real systems with an auditable receipt. No screenshots of pretend work.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <Reveal>
            <div className="flex flex-col gap-2">
              {CHANNELS.map((c, i) => {
                const Icon = c.icon;
                const on = i === active;
                return (
                  <button
                    key={c.key}
                    onClick={() => setActive(i)}
                    className={`cell flex items-start gap-3 p-4 text-left transition-colors ${
                      on ? "border-accent" : "hover:border-border-strong"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${
                        on ? "border-accent text-accent" : "border-border text-tertiary"
                      }`}
                    >
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[14px] font-semibold ${on ? "text-text" : "text-secondary"}`}>
                        {c.label}
                      </span>
                      <span
                        className={`mt-1 block overflow-hidden text-[13px] leading-relaxed text-secondary transition-all ${
                          on ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        {c.body}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <BrowserFrame
              src={active === 0 ? "/shot-dealroom.png" : "/shot-command.png"}
              alt={`Quorum ${CHANNELS[active].label} action`}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Moat() {
  return (
    <section id="moat" className="relative border-t border-border bg-bg/60 py-24">
      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal>
          <p className="mono-label text-accent-soft">The moat</p>
          <h2 className="mt-4 max-w-4xl text-balance text-[32px] font-semibold leading-tight tracking-tight sm:text-[46px]">
            The hard part is not writing one good email. It is running the whole account loop{" "}
            <span className="text-accent">safely</span>.
          </h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {MOAT.map((m, i) => (
            <Reveal key={m.title} delay={i * 0.08}>
              <div className="cell h-full p-6 transition-colors hover:border-border-strong">
                <h3 className="text-[17px] font-semibold leading-snug text-text">{m.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-secondary">{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="relative border-t border-border">
      <div className="relative mx-auto max-w-[1180px] px-6 py-16">
        <Reveal>
          <div className="relative overflow-hidden">
            {/* halftone background */}
            <img
              src="/cta-bg.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
            />
            <div className="relative px-8 py-16 text-center sm:py-20">
              <h2 className="mx-auto max-w-3xl text-balance text-[32px] font-semibold leading-tight tracking-tight text-black sm:text-[48px]">
                Give Quorum a lead. Watch it build the next move.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-black/70">
                Drop one inbound and watch the account brain enrich, map the committee, draft outreach,
                and hold everything for your review.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={authUrl("/signin")}
                  className="inline-flex h-12 items-center gap-2 bg-black px-6 text-[14px] font-medium text-white transition-transform hover:-translate-y-px"
                >
                  Preview product
                  <ArrowRight size={16} strokeWidth={2.2} />
                </a>
                <a
                  href={authUrl("/signup")}
                  className="inline-flex h-12 items-center gap-2 border border-black/40 px-6 text-[14px] font-medium text-black transition-colors hover:border-black hover:bg-black/5"
                >
                  Create workspace
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border pt-16">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="flex flex-col items-start justify-between gap-6 pb-12 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <img src="/quorum-logo.svg" alt="Quorum" className="h-5 w-auto" />
            <span className="mono-label text-tertiary">Governed autonomy for revenue teams</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-secondary">
            <a href="#product" className="transition-colors hover:text-text">Product</a>
            <a href="#why" className="transition-colors hover:text-text">Why</a>
            <a href="#moat" className="transition-colors hover:text-text">Moat</a>
            <a href={authUrl("/signin")} className="transition-colors hover:text-text">Sign in</a>
            <a href={authUrl("/signup")} className="btn-primary h-9 rounded-none px-4 text-[12px]">
              Create workspace
            </a>
          </div>
        </div>
      </div>
      {/* Oversized brand wordmark */}
      <div className="pointer-events-none select-none px-4 pb-2">
        <img
          src="/footer-logo.svg"
          alt="Quorum"
          className="mx-auto w-full max-w-[1180px] opacity-[0.07] invert"
        />
      </div>
    </footer>
  );
}

// A neutral browser-chrome frame for product screenshots.
function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="cell overflow-hidden shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="mono-label ml-3 truncate text-tertiary">app.tryquorum.xyz</span>
      </div>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  );
}
