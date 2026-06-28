const INTEGRATIONS = [
  {
    name: "Convex",
    role: "Backend · Realtime · Host",
    desc: "Reactive database and scheduler. Every panel is live Convex state — no polling.",
    status: "connected",
    core: true,
  },
  {
    name: "Fiber AI",
    role: "Data · Enrichment",
    desc: "email→person reverse lookup, company firmographics, and committee people-search.",
    status: "connected",
    core: true,
  },
  {
    name: "Orange Slice",
    role: "Data · LinkedIn",
    desc: "LinkedIn company snapshot — followers, founded year, HQ — folded into the brain.",
    status: "connected",
    core: true,
  },
  {
    name: "OpenAI",
    role: "Reasoning",
    desc: "Qualification scoring and persona-tuned committee outreach.",
    status: "connected",
    core: true,
  },
  {
    name: "Composio",
    role: "Actions · Slack",
    desc: "Fires the real Slack alert into #revenue when the loop closes.",
    status: "connected",
    core: false,
  },
  {
    name: "Firecrawl",
    role: "Brand",
    desc: "Extracts brand color + logo from the prospect domain for live theming.",
    status: "connected",
    core: false,
  },
  {
    name: "HydraDB",
    role: "Account brain",
    desc: "Temporal context graph synced at loop close (Convex is the fallback substrate).",
    status: "connected",
    core: false,
  },
  {
    name: "Vapi",
    role: "Voice",
    desc: "Real in-browser voice rep. Falls back to a server-streamed call when no key is set.",
    status: "fallback",
    core: false,
  },
];

export default function Integrations() {
  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="mono-label mb-1">Integrations</div>
          <h1 className="text-[18px] font-semibold tracking-tight">Connected services</h1>
        </div>
        <span className="mono-label tnum text-good">
          {INTEGRATIONS.filter((i) => i.status === "connected").length} connected
        </span>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((it) => (
            <div
              key={it.name}
              className="cell p-4 transition-colors duration-150 hover:border-border-strong"
            >
              <span className="plus plus-tl" />
              <span className="plus plus-tr" />
              <span className="plus plus-bl" />
              <span className="plus plus-br" />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface font-mono text-[13px] font-semibold text-text">
                    {it.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] font-semibold text-text">{it.name}</p>
                      {it.core && (
                        <span className="mono-label rounded border border-border px-1 text-tertiary">
                          core
                        </span>
                      )}
                    </div>
                    <p className="mono-label normal-case tracking-normal text-tertiary">
                      {it.role}
                    </p>
                  </div>
                </div>
                <span
                  className={`pill ${
                    it.status === "connected"
                      ? "bg-good/10 text-good"
                      : "bg-warn/10 text-warn"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      it.status === "connected" ? "bg-good" : "bg-warn"
                    }`}
                  />
                  {it.status === "connected" ? "Connected" : "Fallback"}
                </span>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-secondary">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
