// Real Fiber AI client (required sponsor). All calls are best-effort: they
// return null on any failure so the curated/derived data stands in and the demo
// never breaks. Auth: x-api-key header + apiKey in body (Fiber accepts either).

const BASE = "https://api.fiber.ai/v1";

function fiberKey(): string | undefined {
  return process.env.FIBER_API_KEY;
}

async function fiberPost(path: string, body: any): Promise<any | null> {
  const key = fiberKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ apiKey: key, ...body }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function money(n: number | null | undefined): string | undefined {
  if (!n || n <= 0) return undefined;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${Math.round(n / 1e6)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n}`;
}

function cleanTitle(headline: string | undefined, fallback?: string): string {
  if (!headline) return fallback ?? "";
  // Take the first segment before " at Company", a pipe, or a middot.
  const first = headline.split(/\s+at\s+|\s*[|·•]\s*/i)[0].trim();
  return first || fallback || headline;
}

// Fiber "consensus" numeric fields are often {gte,lte} ranges.
function rangeStr(x: any): string | undefined {
  if (x == null) return undefined;
  if (typeof x === "number") return x.toLocaleString();
  const gte = x.gte ?? x.value ?? x.min;
  const lte = x.lte ?? x.max;
  if (gte == null) return undefined;
  if (lte == null || lte === gte) return `~${Number(gte).toLocaleString()}`;
  return `${Number(gte).toLocaleString()}–${Number(lte).toLocaleString()}`;
}

function formatStage(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export type FiberPerson = {
  name: string;
  firstName: string;
  title: string;
  linkedin?: string;
  companyName?: string;
  headline?: string;
  profilePic?: string;
};

export async function fiberEmailToPerson(email: string): Promise<FiberPerson | null> {
  const j = await fiberPost("/email-to-person/single", { email });
  const p = j?.output?.data?.[0] ?? j?.output;
  if (!p || (!p.first_name && !p.name)) return null;
  const exp = (p.experiences ?? []).find((e: any) => e.is_current) ?? p.experiences?.[0];
  return {
    name: p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
    firstName: p.first_name ?? (p.name ?? "").split(" ")[0],
    title: cleanTitle(p.headline, exp?.title ?? p.current_job?.title),
    linkedin: p.url,
    companyName: exp?.company_name ?? p.current_job?.company_name,
    headline: p.headline,
    profilePic: p.profile_pic,
  };
}

export type FiberCompany = {
  companyName?: string;
  industry?: string;
  headcount?: string;
  funding?: string;
  revenue?: string;
  techStack?: string[];
  summary?: string;
  logoUrl?: string;
  signals?: string[];
};

export async function fiberCompany(domain: string): Promise<FiberCompany | null> {
  const j = await fiberPost("/kitchen-sink/company", {
    companyDomain: { value: domain },
  });
  const c = j?.output?.data?.[0] ?? j?.output;
  if (!c || (!c.preferred_name && !c.names)) return null;

  const rawStage = formatStage(c.funding_stage);
  const stage = rawStage && /unknown/i.test(rawStage) ? undefined : rawStage;
  const fundingTotal = money(c.total_funding_consensus);
  const funding =
    stage && fundingTotal
      ? `${stage} · ${fundingTotal} raised`
      : fundingTotal
        ? `${fundingTotal} raised`
        : stage || undefined;

  const headcount = rangeStr(c.employee_count_consensus);
  const revUsd = c.revenue_estimate?.value_usd ?? c.revenue_estimate;
  const revenue = revUsd ? `~${money(revUsd.gte ?? revUsd)} revenue` : undefined;

  const industry =
    (typeof c.li_industries?.[0] === "object" ? c.li_industries[0]?.name : c.li_industries?.[0]) ??
    (typeof c.standard_industries?.[0] === "object"
      ? c.standard_industries[0]?.name
      : c.standard_industries?.[0]);

  const techStack = (c.technologies_used ?? c.platforms ?? [])
    .map((t: any) => (typeof t === "object" ? t.name : t))
    .filter(Boolean)
    .slice(0, 5);

  const signals: string[] = [];
  const growth12 = c.historical_headcount?.growth?.["12m"]?.percent;
  if (typeof growth12 === "number" && growth12 > 0.05)
    signals.push(`+${Math.round(growth12 * 100)}% headcount in 12mo`);
  if (stage) signals.push(`${stage}${fundingTotal ? ` · ${fundingTotal} raised` : ""}`);
  if (Array.isArray(c.investors) && c.investors.length)
    signals.push(
      `Backed by ${c.investors
        .slice(0, 3)
        .map((i: any) => i?.name ?? i)
        .filter(Boolean)
        .join(", ")}`
    );

  return {
    companyName: c.preferred_name ?? c.names?.[0],
    industry,
    headcount,
    funding,
    revenue,
    techStack,
    summary: c.short_description ?? c.li_description ?? undefined,
    logoUrl: c.logo_url,
    signals: signals.length ? signals : undefined,
  };
}

export type FiberCommitteeMember = {
  name: string;
  title: string;
  email: string;
  role: "champion" | "economic_buyer" | "technical" | "user";
  persona: string;
  linkedin?: string;
  profilePic?: string;
};

function inferRole(title: string): FiberCommitteeMember["role"] {
  const t = title.toLowerCase();
  if (/cto|chief technology|engineer|infrastructure|security|architect|technical/.test(t))
    return "technical";
  if (/sales|marketing|growth|revops|revenue operations|demand|gtm/.test(t))
    return "champion";
  if (
    /cfo|chief financial|finance|cro|chief revenue|chief business|coo|chief operating|ceo|chief executive|founder|president|owner/.test(
      t
    )
  )
    return "economic_buyer";
  return "user";
}

function personaFor(role: string, headline: string): string {
  switch (role) {
    case "economic_buyer":
      return "Owns the budget and the number. Buys on ROI, payback, and rep productivity.";
    case "technical":
      return "Security and integration gatekeeper. Cares about SOC 2, data handling, and a clean API.";
    case "champion":
      return "Day-to-day buyer and user. Champions anything that lifts quota attainment and ramp time.";
    default:
      return headline || "Stakeholder in the buying committee.";
  }
}

export async function fiberCommittee(
  domain: string
): Promise<FiberCommitteeMember[] | null> {
  const j = await fiberPost("/people-search", {
    searchParams: {
      jobTitleV2: { anyOf: [{ type: "static-groups", groups: ["c-suite", "founder"] }] },
    },
    currentCompanies: [{ domain }],
    pageSize: 6,
  });
  const data: any[] = j?.output?.data ?? [];
  if (!data.length) return null;

  const members: FiberCommitteeMember[] = data
    .map((p) => {
      const name = p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      const title = cleanTitle(p.headline, p.current_job?.title);
      const first = (p.first_name ?? name.split(" ")[0] ?? "").toLowerCase();
      const role = inferRole(title || p.headline || "");
      return {
        name,
        title,
        email: first ? `${first}@${domain}` : "",
        role,
        persona: personaFor(role, p.headline ?? ""),
        linkedin: p.url,
        profilePic: p.profile_pic ?? undefined,
      };
    })
    .filter((m) => m.name && m.title);

  // Prefer a diverse committee (distinct roles first), cap at 4.
  const seenRole = new Set<string>();
  const diverse: FiberCommitteeMember[] = [];
  for (const m of members) {
    if (!seenRole.has(m.role)) {
      seenRole.add(m.role);
      diverse.push(m);
    }
  }
  for (const m of members) {
    if (diverse.length >= 4) break;
    if (!diverse.includes(m)) diverse.push(m);
  }
  return diverse.slice(0, 4);
}
