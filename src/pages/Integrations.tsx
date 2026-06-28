import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  CalendarClock,
  DatabaseZap,
  FileUp,
  Mail,
  MessageSquare,
  PlugZap,
  type LucideIcon,
  Webhook,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  loadSetupPrefs,
  saveSetupPrefs,
  type SetupPrefs,
} from "../lib/preferences";

type IntegrationKind = "destination" | "source" | "planned";
type StatusKey = "connected" | "not_connected" | "available" | "coming_soon";

const CUSTOMER_INTEGRATIONS: {
  name: string;
  role: string;
  desc: string;
  connection: string;
  kind: IntegrationKind;
  icon?: LucideIcon;
  logos?: { name: string; domain: string }[];
  setupKey?: keyof SetupPrefs;
  recommended?: boolean;
}[] = [
  {
    name: "Slack",
    role: "Team alerts",
    desc: "Post qualified accounts, risky accounts, and approval-needed nudges into the sales team’s workspace.",
    connection: "Slack workspace",
    kind: "destination",
    icon: MessageSquare,
    logos: [{ name: "Slack", domain: "slack.com" }],
    setupKey: "slackConnected",
    recommended: true,
  },
  {
    name: "Salesforce / HubSpot",
    role: "CRM",
    desc: "Create or update leads, contacts, opportunities, account notes, and committee activity after review.",
    connection: "CRM account",
    kind: "destination",
    icon: DatabaseZap,
    logos: [
      { name: "Salesforce", domain: "salesforce.com" },
      { name: "HubSpot", domain: "hubspot.com" },
    ],
    setupKey: "crmConnected",
    recommended: true,
  },
  {
    name: "Gmail / Outlook",
    role: "Email sending",
    desc: "Send approved committee outreach from the seller’s mailbox, with review rules before anything goes out.",
    connection: "Team mailbox",
    kind: "destination",
    icon: Mail,
    logos: [
      { name: "Gmail", domain: "gmail.com" },
      { name: "Outlook", domain: "outlook.live.com" },
    ],
    setupKey: "emailConnected",
    recommended: true,
  },
  {
    name: "Google / Outlook Calendar",
    role: "Meeting follow-up",
    desc: "Create follow-up meetings and next-step reminders after a buyer reply or approved handoff.",
    connection: "Calendar account",
    kind: "destination",
    icon: CalendarClock,
    logos: [
      { name: "Google Calendar", domain: "calendar.google.com" },
      { name: "Outlook", domain: "outlook.live.com" },
    ],
    setupKey: "calendarConnected",
  },
  {
    name: "Website forms",
    role: "Inbound source",
    desc: "Pipe demo requests, contact forms, and partner referrals into Quorum through a workspace webhook.",
    connection: "Webhook URL",
    kind: "source",
    icon: Webhook,
    recommended: true,
  },
  {
    name: "CSV import",
    role: "Manual source",
    desc: "Upload a lead list or paste inbound emails when a customer wants to test Quorum before connecting systems.",
    connection: "No OAuth required",
    kind: "source",
    icon: FileUp,
  },
  {
    name: "Apollo / Clay",
    role: "Prospecting data",
    desc: "Sync target accounts and people lists from existing prospecting workflows once the customer is ready.",
    connection: "Planned connector",
    kind: "planned",
    icon: PlugZap,
    logos: [
      { name: "Apollo", domain: "apollo.io" },
      { name: "Clay", domain: "clay.com" },
    ],
  },
];

const STATUS_COPY: Record<StatusKey, { label: string; className: string; dot: string }> = {
  connected: {
    label: "Connected",
    className: "bg-good/10 text-good",
    dot: "bg-good",
  },
  not_connected: {
    label: "Not connected",
    className: "bg-secondary/10 text-secondary",
    dot: "bg-tertiary",
  },
  available: {
    label: "Available",
    className: "bg-accent/15 text-accent-soft",
    dot: "bg-accent",
  },
  coming_soon: {
    label: "Coming soon",
    className: "bg-warn/10 text-warn",
    dot: "bg-warn",
  },
};

export default function Integrations() {
  const ingest = useQuery(api.inbound.getIngestInfo, {});
  const [setup, setSetup] = useState<SetupPrefs>(() => loadSetupPrefs());
  const [copied, setCopied] = useState(false);

  useEffect(() => saveSetupPrefs(setup), [setup]);

  const actionDestinations = CUSTOMER_INTEGRATIONS.filter((i) => i.kind === "destination");
  const connectedDestinations = actionDestinations.filter(
    (i) => i.setupKey && setup[i.setupKey]
  ).length;
  const webhookReady = Boolean(ingest?.url);
  const totalConnected = connectedDestinations + (webhookReady ? 1 : 0);

  async function copyWebhook() {
    if (!ingest?.url) return;
    try {
      await navigator.clipboard.writeText(ingest.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard can be blocked in embedded contexts */
    }
  }

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex h-12 items-center justify-between border-b border-border bg-[#0d0d0c]/80 px-5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mono-label text-tertiary">Integrations</span>
          <span className="h-4 w-px bg-border" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-text">
            Customer connections
          </h1>
        </div>
        <span className="mono-label tnum border border-border bg-surface/60 px-2 py-1 text-tertiary">
          {totalConnected} connected · {connectedDestinations} / {actionDestinations.length} destinations
        </span>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="cell mb-5 p-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mono-label">Connector policy</p>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-secondary">
                This page only shows systems a Quorum customer connects: their CRM, mailbox,
                calendar, team alerts, and inbound lead sources.
              </p>
            </div>
            <Link className="btn-primary h-9 px-4" to="/setup">
              Finish setup →
            </Link>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Summary
            label="Action destinations"
            value={`${connectedDestinations} / ${actionDestinations.length}`}
            detail="CRM, email, calendar, Slack"
          />
          <Summary
            label="Inbound sources"
            value={webhookReady ? "Webhook ready" : "Setup needed"}
            detail="Website forms and manual import"
          />
          <Summary
            label="Launch default"
            value="Review first"
            detail="Human approval before customer-facing actions"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CUSTOMER_INTEGRATIONS.map((integration) => {
            const isSetupConnected = integration.setupKey ? setup[integration.setupKey] : false;
            const isWebhook = integration.name === "Website forms";
            const statusKey: StatusKey = isSetupConnected || (isWebhook && webhookReady)
              ? "connected"
              : integration.kind === "planned"
                ? "coming_soon"
                : integration.kind === "source"
                  ? "available"
                  : "not_connected";
            const status = STATUS_COPY[statusKey];
            const Icon = integration.icon;

            return (
              <div
                key={integration.name}
                className="cell p-4 transition-colors duration-150 hover:border-border-strong"
              >
                <span className="plus plus-tl" />
                <span className="plus plus-tr" />
                <span className="plus plus-bl" />
                <span className="plus plus-br" />
                <div className="flex items-start justify-between gap-3">
                  <LogoStack logos={integration.logos} fallbackIcon={Icon} />
                  <span className={`pill shrink-0 ${status.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>
                <div className="mt-3 min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-[14px] font-semibold text-text">
                      {integration.name}
                    </p>
                    {integration.recommended && (
                      <span className="mono-label shrink-0 border border-accent/30 bg-accent/15 px-1 text-accent-soft">
                        start here
                      </span>
                    )}
                  </div>
                  <p className="mono-label truncate normal-case tracking-normal text-tertiary">
                    {integration.role}
                  </p>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-secondary">
                  {integration.desc}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <span className="mono-label normal-case tracking-normal text-tertiary">
                    {integration.connection}
                  </span>
                  <span className="mono-label normal-case tracking-normal text-secondary">
                    {integration.kind}
                  </span>
                </div>
                {integration.setupKey && (
                  <button
                    type="button"
                    onClick={() =>
                      setSetup((current) => ({
                        ...current,
                        [integration.setupKey!]: !current[integration.setupKey!],
                      }))
                    }
                    className={`mt-3 h-9 w-full rounded border px-3 text-[12px] font-medium transition-colors ${
                      isSetupConnected
                        ? "border-good/30 bg-good/10 text-good hover:border-good/50"
                        : "border-border bg-surface text-text hover:border-border-strong"
                    }`}
                  >
                    {isSetupConnected ? "Connected, mark off" : "Mark connected"}
                  </button>
                )}
                {isWebhook && (
                  webhookReady ? (
                    <button
                      type="button"
                      onClick={copyWebhook}
                      className="mt-3 h-9 w-full rounded border border-border bg-surface px-3 text-[12px] font-medium text-text transition-colors hover:border-border-strong"
                    >
                      {copied ? "Webhook copied ✓" : "Copy webhook URL"}
                    </button>
                  ) : (
                    <Link
                      className="mt-3 flex h-9 w-full items-center justify-center rounded border border-border bg-surface px-3 text-[12px] font-medium text-text transition-colors hover:border-border-strong"
                      to="/setup"
                    >
                      Generate webhook in setup
                    </Link>
                  )
                )}
                {integration.name === "CSV import" && (
                  <Link
                    className="mt-3 flex h-9 w-full items-center justify-center rounded border border-border bg-surface px-3 text-[12px] font-medium text-text transition-colors hover:border-border-strong"
                    to="/pipeline"
                  >
                    Import leads
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LogoStack({
  logos,
  fallbackIcon: Icon,
}: {
  logos?: { name: string; domain: string }[];
  fallbackIcon?: LucideIcon;
}) {
  if (logos?.length) {
    return (
      <div className="flex h-12 w-[82px] shrink-0 items-center">
        {logos.slice(0, 2).map((logo, index) => (
          <div
            key={logo.domain}
            className={`flex h-12 w-12 shrink-0 items-center justify-center border border-[#e8e8e8] bg-white p-2 shadow-[0_7px_18px_rgba(0,0,0,0.28)] ring-1 ring-black/5 ${
              index > 0 ? "-ml-4" : ""
            }`}
            style={{ zIndex: logos.length - index, transform: `translateY(${index === 0 ? -1 : 1}px)` }}
            title={logo.name}
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(logo.domain)}&sz=128`}
              alt={logo.name}
              className="h-8 w-8 object-contain"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface text-secondary">
      {Icon ? <Icon size={16} strokeWidth={1.9} /> : null}
    </div>
  );
}

function Summary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="cell px-4 py-3">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <p className="mono-label">{label}</p>
      <p className="mt-2 text-[15px] font-semibold text-text">{value}</p>
      <p className="mt-1 truncate text-[12px] text-tertiary">{detail}</p>
    </div>
  );
}
