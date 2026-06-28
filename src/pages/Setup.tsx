import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { Check } from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  DEFAULT_AUTONOMY,
  loadAutonomyPrefs,
  loadSetupPrefs,
  saveAutonomyPrefs,
  type AutonomyPrefs,
  type SetupPrefs,
} from "../lib/preferences";

export default function Setup() {
  const me = useQuery(api.profiles.getMyProfile);
  const pipeline = useQuery(api.queries.listPipeline, {}) ?? [];
  const ingest = useQuery(api.inbound.getIngestInfo, {});
  const ensureToken = useAction(api.inbound.ensureIngestToken);
  // Connector state is owned by the Integrations page; Setup only reads it.
  const [setup] = useState<SetupPrefs>(() => loadSetupPrefs());
  const [autonomy, setAutonomy] = useState<AutonomyPrefs>(() => loadAutonomyPrefs());
  const [minting, setMinting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => saveAutonomyPrefs(autonomy), [autonomy]);

  const profileDone = Boolean(me?.profile?.companyName && me.profile.product);
  const webhookDone = Boolean(ingest?.url);
  const integrationCount = Object.values(setup).filter(Boolean).length;
  const autonomyDone = autonomy.mode !== "auto_send" || autonomy.minScore >= 50;
  // Credit only a real account the user worked, not the seeded demo accounts.
  const firstAccountDone = pipeline.some((a: any) => !a.isDemo);
  const readyToInvite =
    profileDone && webhookDone && integrationCount >= 2 && autonomyDone && firstAccountDone;
  const steps = useMemo(
    () => [
      profileDone,
      webhookDone,
      integrationCount >= 2,
      autonomyDone,
      firstAccountDone,
    ],
    [profileDone, webhookDone, integrationCount, autonomyDone, firstAccountDone]
  );
  const complete = steps.filter(Boolean).length;

  async function generateWebhook() {
    setMinting(true);
    try {
      await ensureToken();
    } finally {
      setMinting(false);
    }
  }

  function markSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard can be blocked in some embedded contexts */
    }
  }

  const samplePayload = JSON.stringify(
    {
      email: "buyer@acme.com",
      source: "website_demo_request",
      note: "Interested in reducing speed-to-lead.",
    },
    null,
    2
  );

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex h-12 items-center justify-between border-b border-border bg-bg px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mono-label shrink-0 text-tertiary">Setup</span>
          <span className="h-4 w-px bg-border" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight">Customer launch checklist</h1>
        </div>
        <span className="mono-label tnum text-tertiary">{complete} / {steps.length} ready</span>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-7">
        <div className="cell mb-5 p-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mono-label">Launch state</p>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-secondary">
                {readyToInvite
                  ? "This workspace is safe to put in front of a first customer: inbound, review, and action rules are all set."
                  : "Quorum is customer-ready when it knows what you sell, receives inbound leads, has action destinations, and has clear autonomy rules."}
              </p>
            </div>
            <div className="min-w-[220px]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className={`mono-label ${readyToInvite ? "text-good" : "text-warn"}`}>
                  {readyToInvite ? "invite-ready" : "finish setup"}
                </span>
                <span className="mono-label tnum text-tertiary">{complete} / {steps.length}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden border border-border bg-bg">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${(complete / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
          <section className="cell divide-y divide-border">
            <ChecklistRow
              done={profileDone}
              label="Seller profile"
              desc="The AI rep uses this to pitch the right product."
              action={<Link className="btn-secondary h-9 px-3 text-[12px]" to="/settings">Edit profile</Link>}
            />
            <ChecklistRow
              done={webhookDone}
              label="Inbound source"
              desc={webhookDone ? "Webhook ready. Copy it for your forms, CRM, or email forwarding." : "Generate a webhook for forms, CRM, or email forwarding."}
              action={
                webhookDone ? (
                  <button
                    type="button"
                    className="btn-secondary flex h-9 items-center gap-1.5 px-3 text-[12px]"
                    onClick={() => copyText("webhook", ingest?.url ?? "")}
                  >
                    {copied === "webhook" ? (
                      <>
                        <Check size={13} strokeWidth={2.4} className="text-good" /> Copied
                      </>
                    ) : (
                      "Copy URL"
                    )}
                  </button>
                ) : (
                  <button className="btn-primary h-9 px-3 text-[12px]" onClick={generateWebhook} disabled={minting}>
                    {minting ? "Generating…" : "Generate webhook"}
                  </button>
                )
              }
            />
            <ChecklistRow
              done={integrationCount >= 2}
              label="Action destinations"
              desc={`${integrationCount} of 4 destinations marked connected. Start with Slack and email.`}
              action={<Link className="btn-secondary h-9 px-3 text-[12px]" to="/integrations">Open Integrations</Link>}
            />
            <ChecklistRow
              done={autonomyDone}
              label="Autonomy rules"
              desc={autonomy.mode === "auto_send" ? `Auto-send over score ${autonomy.minScore}.` : "Human approval required before outreach sends."}
              action={<Link className="btn-secondary h-9 px-3 text-[12px]" to="/settings">Edit rules</Link>}
            />
            <ChecklistRow
              done={firstAccountDone}
              label="First worked account"
              desc={firstAccountDone ? `${pipeline.length} accounts available.` : "Run a sample account or paste a work email."}
              action={<Link className="btn-primary h-9 px-3 text-[12px]" to="/pipeline">Work account</Link>}
            />
          </section>

          <aside className="space-y-4">
            <div className="cell p-4">
              <span className="plus plus-tl" />
              <span className="plus plus-tr" />
              <span className="plus plus-bl" />
              <span className="plus plus-br" />
              <p className="mono-label">Recommended launch mode</p>
              <p className="mt-2 text-[13px] leading-relaxed text-secondary">
                Start with approval required, so every customer-facing message waits in Review.
                Move to auto-send after a week of accepted drafts.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  className="btn-primary h-9 px-4"
                  onClick={() => {
                    setAutonomy(DEFAULT_AUTONOMY);
                    markSaved();
                  }}
                >
                  Apply review-first preset
                </button>
                {saved && (
                  <span className="mono-label flex items-center gap-1 text-good">
                    <Check size={12} strokeWidth={2.4} /> applied
                  </span>
                )}
              </div>
              <Link
                to="/integrations"
                className="mono-label mt-3 inline-block normal-case tracking-normal text-accent-soft transition-colors hover:text-text"
              >
                Connect your destinations in Integrations →
              </Link>
            </div>

            <div className="cell p-4">
              <span className="plus plus-tl" />
              <span className="plus plus-tr" />
              <span className="plus plus-bl" />
              <span className="plus plus-br" />
              <p className="mono-label">First customer handoff</p>
              <ol className="mt-3 space-y-2 text-[12px] leading-relaxed text-secondary">
                <li><span className="text-text">1.</span> Paste five real inbound emails in Pipeline.</li>
                <li><span className="text-text">2.</span> Review every generated draft before approving.</li>
                <li><span className="text-text">3.</span> Connect Slack and email in Integrations, then invite one design partner.</li>
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn-primary h-9 px-3 text-[12px]" to="/pipeline">
                  Run first lead
                </Link>
                <Link className="btn-secondary h-9 px-3 text-[12px]" to="/review">
                  Open Review
                </Link>
              </div>
            </div>

            <div className="cell p-4">
              <span className="plus plus-tl" />
              <span className="plus plus-tr" />
              <span className="plus plus-bl" />
              <span className="plus plus-br" />
              <div className="flex items-center justify-between gap-3">
                <p className="mono-label">Webhook contract</p>
                <button
                  type="button"
                  className="mono-label rounded border border-border px-2 py-1 normal-case tracking-normal text-secondary transition-colors hover:border-border-strong hover:text-text"
                  onClick={() => copyText("payload", samplePayload)}
                >
                  {copied === "payload" ? "copied" : "copy payload"}
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded border border-border bg-bg p-3 text-[11px] leading-relaxed text-secondary">
                {samplePayload}
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ChecklistRow({
  done,
  label,
  desc,
  action,
}: {
  done: boolean;
  label: string;
  desc: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
            done ? "border-good bg-good/10 text-good" : "border-border text-tertiary"
          }`}
        >
          {done ? (
            <Check size={12} strokeWidth={2.6} />
          ) : (
            <span className="h-1.5 w-1.5 bg-tertiary" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-text">{label}</p>
          <p className="mt-1 truncate text-[12px] text-tertiary">{desc}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
