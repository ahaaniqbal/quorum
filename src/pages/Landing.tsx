import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  CalendarCheck,
  Check,
  ChevronRight,
  DatabaseZap,
  FileCheck2,
  MailCheck,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
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

const PROOF_EVENTS = [
  { time: "00:04", label: "Company enriched", detail: "funding, headcount, stack, location, source" },
  { time: "00:19", label: "Committee mapped", detail: "champion, buyer, technical owner, gaps" },
  { time: "00:43", label: "Review packet ready", detail: "drafts, rationale, confidence, risk" },
  { time: "01:10", label: "Actions prepared", detail: "CRM note, email, meeting, Slack alert" },
];

const OPERATING_LOOP = [
  {
    icon: DatabaseZap,
    label: "Ingest",
    owner: "Quorum",
    detail: "Website forms, CSVs, mailbox forwards, referrals, and webhooks enter one account queue.",
  },
  {
    icon: BrainCircuit,
    label: "Build Account Brain",
    owner: "AI",
    detail: "Quorum researches the company, identifies committee gaps, and decides the next best move.",
  },
  {
    icon: ShieldCheck,
    label: "Review Gate",
    owner: "You",
    detail: "Customer-facing work stops for approval with evidence, risk, confidence, and exact drafts.",
  },
  {
    icon: Workflow,
    label: "Close The Loop",
    owner: "Quorum",
    detail: "Approved work becomes CRM updates, outbound messages, booked meetings, and team alerts.",
  },
];

const PROBLEM_POINTS = [
  {
    label: "Speed-to-lead dies in handoffs",
    detail: "A buyer fills a form, a rep checks a CRM, another tool enriches, another drafts, another sends.",
  },
  {
    label: "Sequencers think in contacts",
    detail: "Real B2B buying happens across committees, budgets, authority, need, and timing.",
  },
  {
    label: "AI without governance is dangerous",
    detail: "Autonomous outreach needs memory, review gates, audit trails, and source-backed decisions.",
  },
];

const SYSTEMS = [
  { icon: MessageSquareText, label: "Slack", detail: "Qualified accounts, risky actions, and launch gaps land where the team already works." },
  { icon: FileCheck2, label: "CRM", detail: "Create and update leads, contacts, notes, opportunities, and account activity after review." },
  { icon: MailCheck, label: "Email", detail: "Send approved committee outreach from the seller’s mailbox, not a black-box bot." },
  { icon: CalendarCheck, label: "Calendar", detail: "Prepare follow-up meetings and reminders after buyer replies or handoffs." },
];

const MOAT = [
  "Account memory that changes after every lead, call, reply, review, and system action.",
  "Committee reasoning that maps buying roles instead of blasting one imported contact.",
  "Governed autonomy with review gates before anything customer-facing goes out.",
  "Execution audit trail across skipped, blocked, pending, approved, and completed actions.",
  "Integration layer that turns approved reasoning into real work across the customer stack.",
];

const OBJECTIONS = [
  {
    label: "Why not just use a CRM copilot?",
    detail: "A CRM copilot helps inside one database. Quorum runs the operating loop across inbox, CRM, calendar, Slack, and review.",
  },
  {
    label: "Why not a sales engagement tool?",
    detail: "Sequencers automate messages. Quorum reasons about accounts, committee coverage, timing, next move, and action safety.",
  },
  {
    label: "Why now?",
    detail: "Models can finally research, draft, classify risk, and call tools. The missing product is the governed system around that work.",
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen overflow-x-hidden text-text">
      <LandingHeader />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines opacity-90" />
        <div
          className="pointer-events-none absolute left-1/2 top-[-340px] h-[620px] w-[1100px] -translate-x-1/2 blur-[150px]"
          style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
        />
        <div className="relative mx-auto grid max-w-[1500px] gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,0.8fr)] lg:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.1] }}
            className="max-w-4xl"
          >
            <SectionLabel>AI account execution</SectionLabel>
            <h1 className="mt-5 max-w-5xl text-balance text-[42px] font-semibold leading-[0.95] tracking-[-0.055em] text-text sm:text-[70px] lg:text-[92px]">
              The AI account executive that works every inbound account.
            </h1>
            <p className="mt-6 max-w-3xl text-pretty text-[17px] leading-relaxed text-secondary sm:text-[20px]">
              Quorum turns a new lead into researched account context, a mapped buying committee,
              approved outreach, CRM updates, meetings, and team alerts. Humans review the risky work.
              Quorum handles the rest.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={authUrl("/signin")} className="btn-primary h-12 rounded-none px-5 text-[14px]">
                Explore Product Preview
                <ArrowRight size={16} strokeWidth={2.2} />
              </a>
              <a href={authUrl("/signup")} className="btn-secondary h-12 rounded-none px-5 text-[14px]">
                Create Workspace
              </a>
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-1 border border-border bg-[#0d0d0c] sm:grid-cols-3">
              <Metric value="1" label="account queue" />
              <Metric value="4" label="customer systems" />
              <Metric value="0" label="unsafe sends" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.175, 0.885, 0.32, 1.1] }}
            className="lg:pt-8"
          >
            <ProductProof />
          </motion.div>
        </div>
      </section>

      <section id="product" className="border-b border-border bg-[#0b0b0a]">
        <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1fr]">
            <div>
              <SectionLabel>What Quorum does</SectionLabel>
              <h2 className="mt-4 max-w-xl text-balance text-[34px] font-semibold leading-tight tracking-tight sm:text-[48px]">
                It replaces the messy first 48 hours after a qualified account appears.
              </h2>
            </div>
            <div className="grid gap-0 border border-border md:grid-cols-2">
              {OPERATING_LOOP.map((item, index) => (
                <LoopStep key={item.label} item={item} index={index + 1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="border-b border-border">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
          <div className="cell p-5 sm:p-7">
            <CellCorners />
            <SectionLabel>Why it exists</SectionLabel>
            <h2 className="mt-4 max-w-2xl text-balance text-[32px] font-semibold leading-tight tracking-tight sm:text-[44px]">
              Revenue teams bought a dozen tools. The work still falls between them.
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-secondary">
              The current stack records activity after humans do the work. Quorum is built for the gap before
              the activity exists: research, prioritization, committee coverage, safe drafting, review, and execution.
            </p>
          </div>
          <div className="grid gap-3">
            {PROBLEM_POINTS.map((point, index) => (
              <ProblemRow key={point.label} point={point} index={index + 1} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-[#0b0b0a]">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-16">
          <div>
            <SectionLabel>How it becomes real work</SectionLabel>
            <h2 className="mt-4 max-w-xl text-balance text-[32px] font-semibold leading-tight tracking-tight sm:text-[44px]">
              The account brain is only useful if actions land in the tools customers already use.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-secondary">
              Quorum is not a demo chatbot. It is an execution layer with connectors, approvals,
              source confidence, and a complete account memory behind every action.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SYSTEMS.map((system) => (
              <SystemTile key={system.label} system={system} />
            ))}
          </div>
        </div>
      </section>

      <section id="moat" className="border-b border-border">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8 lg:py-16">
          <div className="cell p-5 sm:p-7">
            <CellCorners />
            <SectionLabel>Why this can be a company</SectionLabel>
            <h2 className="mt-4 max-w-3xl text-balance text-[32px] font-semibold leading-tight tracking-tight sm:text-[44px]">
              The hard part is not writing one good email. It is running the whole account loop safely.
            </h2>
            <div className="mt-7 divide-y divide-border border-y border-border">
              {MOAT.map((item) => (
                <div key={item} className="flex items-start gap-3 py-4">
                  <Check size={16} strokeWidth={2.2} className="mt-1 shrink-0 text-good" />
                  <p className="text-[14px] leading-relaxed text-secondary">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {OBJECTIONS.map((objection) => (
              <ObjectionRow key={objection.label} objection={objection} />
            ))}
          </div>
        </div>
      </section>

      <section id="workspace" className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-70" />
        <div className="relative mx-auto grid max-w-[1500px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8 lg:py-16">
          <div>
            <SectionLabel>Start here</SectionLabel>
            <h2 className="mt-4 max-w-2xl text-balance text-[34px] font-semibold leading-tight tracking-tight sm:text-[52px]">
              Give Quorum a lead. Watch it build the next move.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-secondary">
              The first product motion should feel simple: connect sources, review the account brain,
              approve customer-facing work, then let actions land in the stack.
            </p>
          </div>
          <WorkspaceCTA />
        </div>
      </section>
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/landing" className="flex min-w-0 items-center gap-3" aria-label="Quorum landing page">
          <img src="/quorum-logo.svg" alt="" className="h-6 w-auto" />
          <span className="hidden h-4 w-px bg-border sm:block" />
          <span className="mono-label hidden text-tertiary sm:block">AI account execution</span>
        </Link>
        <nav className="hidden items-center gap-5 text-[13px] text-secondary md:flex">
          <a href="#product" className="transition-colors hover:text-text">Product</a>
          <a href="#why" className="transition-colors hover:text-text">Why</a>
          <a href="#moat" className="transition-colors hover:text-text">Moat</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href={authUrl("/signin")} className="hidden h-9 items-center border border-border bg-surface px-3 text-[12px] font-medium text-secondary transition-colors hover:border-border-strong hover:text-text sm:inline-flex">
            Sign in
          </a>
          <a href={authUrl("/signup")} className="btn-primary h-9 rounded-none px-3">
            Create Workspace
            <ArrowRight size={14} strokeWidth={2.2} />
          </a>
        </div>
      </div>
    </header>
  );
}

function ProductProof() {
  return (
    <div className="cell overflow-hidden bg-[#0d0d0c]">
      <CellCorners />
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-bg">
              <Sparkles size={17} strokeWidth={2} className="text-accent-soft" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-text">Aegis</p>
              <p className="mono-label truncate normal-case tracking-normal text-tertiary">
                new inbound · same company · high intent
              </p>
            </div>
          </div>
          <span className="mono-label tnum text-good">87% confidence</span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_210px]">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="mono-label">Account execution timeline</p>
            <span className="mono-label text-accent-soft">01:10 elapsed</span>
          </div>
          <div className="mt-4 space-y-3">
            {PROOF_EVENTS.map((event) => (
              <TimelineEvent key={event.time} event={event} />
            ))}
          </div>
        </div>
        <div className="border-t border-border p-4 sm:p-5 lg:border-l lg:border-t-0">
          <p className="mono-label">Review packet</p>
          <div className="mt-4 border border-accent/30 bg-transparent p-3">
            <MailCheck size={17} strokeWidth={2.1} className="text-accent-soft" />
            <p className="mt-3 text-[13px] font-semibold text-text">9 drafts held</p>
            <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
              Nothing customer-facing sends until a human approves it.
            </p>
          </div>
          <div className="mt-3 border border-border bg-bg/40 p-3">
            <Radio size={17} strokeWidth={2.1} className="text-good" />
            <p className="mt-3 text-[13px] font-semibold text-text">Brain live</p>
            <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
              Memory updates after each review, reply, and action.
            </p>
          </div>
          <div className="mt-3 border border-border bg-bg/40 p-3">
            <TriangleAlert size={17} strokeWidth={2.1} className="text-warn" />
            <p className="mt-3 text-[13px] font-semibold text-text">1 gap flagged</p>
            <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
              Primary buyer is unverified. Review before sending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ event }: { event: (typeof PROOF_EVENTS)[number] }) {
  return (
    <div className="grid grid-cols-[54px_1fr] gap-3 border border-border bg-bg/40 p-3">
      <span className="mono-label tnum text-accent-soft">{event.time}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-text">{event.label}</p>
        <p className="mt-1 truncate text-[12px] text-tertiary">{event.detail}</p>
      </div>
    </div>
  );
}

function LoopStep({ item, index }: { item: (typeof OPERATING_LOOP)[number]; index: number }) {
  const Icon = item.icon;
  const desktopBorders =
    index === 1 || index === 3
      ? "md:border-r"
      : "";
  const desktopBottomBorder = index <= 2 ? "md:border-b" : "";

  return (
    <div className={`border-b border-border p-4 last:border-b-0 md:border-b-0 ${desktopBorders} ${desktopBottomBorder}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-accent-subtle text-accent-soft">
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="mono-label tnum text-tertiary">0{index}</span>
      </div>
      <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-text">{item.label}</h3>
      <p className="mt-2 font-mono text-[12px] text-accent-soft">{item.owner}</p>
      <p className="mt-3 max-w-[42ch] text-[13px] leading-relaxed text-secondary">{item.detail}</p>
    </div>
  );
}

function ProblemRow({
  point,
  index,
}: {
  point: (typeof PROBLEM_POINTS)[number];
  index: number;
}) {
  return (
    <div className="grid gap-3 border border-border bg-[#0d0d0c] p-4 sm:grid-cols-[58px_1fr]">
      <span className="mono-label tnum text-accent-soft">0{index}</span>
      <div>
        <p className="text-[15px] font-semibold text-text">{point.label}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-secondary">{point.detail}</p>
      </div>
    </div>
  );
}

function SystemTile({ system }: { system: (typeof SYSTEMS)[number] }) {
  const Icon = system.icon;
  return (
    <div className="cell p-4 sm:p-5">
      <CellCorners />
      <Icon size={18} strokeWidth={2} className="text-accent-soft" />
      <p className="mt-4 text-[16px] font-semibold text-text">{system.label}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-secondary">{system.detail}</p>
    </div>
  );
}

function ObjectionRow({ objection }: { objection: (typeof OBJECTIONS)[number] }) {
  return (
    <div className="border border-border bg-[#0d0d0c] p-4">
      <p className="text-[15px] font-semibold text-text">{objection.label}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-secondary">{objection.detail}</p>
    </div>
  );
}

function WorkspaceCTA() {
  return (
    <div className="cell p-5 sm:p-6">
      <CellCorners />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>Workspace</SectionLabel>
          <h2 className="mt-2 max-w-lg text-[24px] font-semibold tracking-tight text-text">
            Create the first account brain
          </h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-secondary">
            The dedicated auth page handles guest preview, Google, and email access. Start there,
            then Quorum drops you directly into the product workspace.
          </p>
        </div>
        <a
          href={authUrl("/signin")}
          className="h-9 border border-border bg-surface px-3 text-[12px] text-secondary transition-colors hover:border-border-strong hover:text-text"
        >
          Sign in
        </a>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a href={authUrl("/signup")} className="btn-primary h-12 rounded-none px-5 text-[14px]">
          Create Workspace
          <ArrowRight size={16} strokeWidth={2.2} />
        </a>
        <a href={authUrl("/signin")} className="btn-secondary h-12 rounded-none px-5 text-[14px]">
          Explore Product Preview
          <ChevronRight size={16} strokeWidth={2.2} />
        </a>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-[12px] leading-relaxed text-tertiary">
          Guest preview remains one click away on the sign-in page, so reviewers can inspect
          the seeded workspace without creating an account.
        </p>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-b border-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="font-mono text-[28px] leading-none text-text tnum">{value}</p>
      <p className="mt-2 mono-label normal-case tracking-normal text-tertiary">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="mono-label text-accent-soft">{children}</p>;
}

function CellCorners() {
  return (
    <>
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
    </>
  );
}
