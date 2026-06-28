// Curated, realistic enrichment for known demo domains so the live demo always
// looks impressive even if every external API is down. Generic domains fall
// back to a derived company profile + Clearbit logo.

export type CommitteeMember = {
  name: string;
  title: string;
  email: string;
  role: "champion" | "economic_buyer" | "technical" | "user";
  persona: string;
  linkedin?: string;
  profilePic?: string;
};

export type SeedCompany = {
  companyName: string;
  industry: string;
  headcount: string;
  funding: string;
  revenue?: string;
  techStack: string[];
  signals: string[];
  brandColors: string[];
  summary: string;
  // Real, verified decision-makers (via getleads) for the demo committee map.
  committee?: CommitteeMember[];
};

export const KNOWN_COMPANIES: Record<string, SeedCompany> = {
  "ramp.com": {
    companyName: "Ramp",
    industry: "Fintech / Spend Management",
    headcount: "1,000–1,500",
    funding: "Series D · $748M raised",
    revenue: "~$300M ARR",
    techStack: ["React", "TypeScript", "Go", "AWS", "Snowflake"],
    signals: ["Raised $150M at $13B (Apr 2026)", "Hiring 40+ in GTM", "Launched Treasury"],
    brandColors: ["#E2FB6C", "#1A1A1A"],
    summary:
      "Ramp is a fast-scaling fintech automating finance ops. Recent mega-round and aggressive GTM hiring signal budget and urgency for tooling that compounds rep efficiency.",
    committee: [
      {
        name: "Colin Kennedy",
        title: "Chief Business Officer",
        email: "ckennedy@ramp.com",
        role: "economic_buyer",
        persona:
          "Owns the GTM budget and revenue number. Cares about pipeline efficiency, rep productivity, and payback period. Ex-Stripe, ex-Amex — speaks ROI.",
        linkedin: "https://www.linkedin.com/in/colinkennedypartnerships",
      },
      {
        name: "Karim Atiyeh",
        title: "Co-founder & CTO",
        email: "karim@ramp.com",
        role: "technical",
        persona:
          "Security and integration gatekeeper. Will ask about SOC 2, data residency, and a clean API before any tool touches customer data.",
        linkedin: "https://www.linkedin.com/in/karimatiyeh",
      },
      {
        name: "Jacob Söderstjerna",
        title: "Chief of Staff",
        email: "jsoderstjerna@ramp.com",
        role: "user",
        persona:
          "Operational owner who drives rollout. Cares about change management, onboarding effort, and time-to-value across the rep team.",
        linkedin: "https://www.linkedin.com/in/jacob-söderstjerna-74789342",
      },
    ],
  },
  "linear.app": {
    companyName: "Linear",
    industry: "Developer Tools / Project Management",
    headcount: "60–90",
    funding: "Series B · $52M raised",
    techStack: ["React", "TypeScript", "GraphQL", "Postgres"],
    signals: ["Series B led by Accel", "Expanding enterprise motion", "Hiring first RevOps"],
    brandColors: ["#5E6AD2", "#0F0F0F"],
    summary:
      "Linear is moving upmarket into enterprise and just hired its first RevOps leader — a textbook moment for multi-threaded, committee-aware selling.",
    committee: [
      {
        name: "Cristina Cordova",
        title: "Chief Operating Officer",
        email: "cristina@linear.app",
        role: "economic_buyer",
        persona:
          "Leads GTM and Operations — owns the revenue tooling budget. Ex-Stripe, ex-Notion. Decides fast when the ROI and the craft are both there.",
        linkedin: "https://www.linkedin.com/in/cristinajcordova",
      },
      {
        name: "Casey Bertenthal",
        title: "Head of Sales",
        email: "casey@linear.app",
        role: "champion",
        persona:
          "The day-to-day buyer and user of a sales tool. Will champion anything that lifts rep quota attainment and shortens ramp time.",
        linkedin: "https://www.linkedin.com/in/casey-bertenthal",
      },
      {
        name: "Tom Moor",
        title: "Head of Engineering",
        email: "tom@linear.app",
        role: "technical",
        persona:
          "Evaluates integration surface and reliability. Wants a tool that doesn't add operational drag or risk to the stack.",
        linkedin: "https://www.linkedin.com/in/tom-moor-b6213b1ba",
      },
    ],
  },
  "notion.so": {
    companyName: "Notion",
    industry: "Productivity Software",
    headcount: "600–800",
    funding: "Series C · $343M raised",
    revenue: "~$250M ARR",
    techStack: ["React", "TypeScript", "Node", "AWS"],
    signals: ["Shipping Notion AI", "Enterprise tier launch", "Scaling sales team 3x"],
    brandColors: ["#000000", "#FFFFFF"],
    summary:
      "Notion is scaling its enterprise GTM 3x while shipping AI — a large, fast-moving buying committee with clear budget authority.",
  },
  "vercel.com": {
    companyName: "Vercel",
    industry: "Cloud / Developer Infrastructure",
    headcount: "500–700",
    funding: "Series E · $563M raised",
    techStack: ["Next.js", "React", "TypeScript", "Go", "AWS"],
    signals: ["Series E at $3.25B", "v0 + AI push", "Enterprise logos accelerating"],
    brandColors: ["#000000", "#FFFFFF"],
    summary:
      "Vercel is doubling down on enterprise after its Series E. Strong technical buying committee — VP Eng and platform leads drive decisions alongside the economic buyer.",
  },
  "convex.dev": {
    companyName: "Convex",
    industry: "Developer Tools / Backend Platform",
    headcount: "30–50",
    funding: "Series A · $26M raised",
    techStack: ["Rust", "React", "TypeScript"],
    signals: ["Growing reactive-backend adoption", "Hackathon-driven growth", "Hiring DevRel"],
    brandColors: ["#EE342F", "#F3B01C"],
    summary:
      "Convex is a reactive backend platform growing through developer love. Founder-led GTM moving toward a structured committee motion.",
  },
};

export function parseDomain(email: string): string {
  const at = email.indexOf("@");
  if (at === -1) return email.trim().toLowerCase();
  return email.slice(at + 1).trim().toLowerCase();
}

export function titleizeDomain(domain: string): string {
  const core = domain.split(".")[0] ?? domain;
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export function fallbackCompany(domain: string): SeedCompany {
  return {
    companyName: titleizeDomain(domain),
    industry: "B2B Software",
    headcount: "50–200",
    funding: "Venture-backed",
    techStack: ["React", "TypeScript", "AWS"],
    signals: ["Active hiring", "Recent product launch", "Expanding GTM"],
    brandColors: ["#5B47EB", "#0F0F0F"],
    summary: `${titleizeDomain(domain)} is a growing B2B software company with an active buying committee.`,
  };
}

export function logoForDomain(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}

// Synthesize a plausible buying committee for companies without curated data.
// Roles map to a real B2B committee for a GTM/RevOps tool sale.
export function generateCommittee(domain: string, companyName: string): CommitteeMember[] {
  const handle = (first: string) => `${first.toLowerCase()}@${domain}`;
  return [
    {
      name: "Jordan Avery",
      title: "VP of Revenue Operations",
      email: handle("jordan"),
      role: "economic_buyer",
      persona:
        "Owns the GTM tech budget and the number. Buys on pipeline efficiency, rep productivity, and payback period.",
    },
    {
      name: "Priya Nair",
      title: "Chief Financial Officer",
      email: handle("priya"),
      role: "user",
      persona:
        "Signs off on spend. Cares about measurable ROI, contract terms, and whether this consolidates other line items.",
    },
    {
      name: "Marcus Lin",
      title: "VP of Engineering",
      email: handle("marcus"),
      role: "technical",
      persona:
        "Security and integration reviewer. Asks about SOC 2, data handling, and how cleanly it fits the existing stack.",
    },
  ];
}

export function committeeForDomain(domain: string, companyName: string): CommitteeMember[] {
  return KNOWN_COMPANIES[domain]?.committee ?? generateCommittee(domain, companyName);
}

// Plausible primary-contact name derived from the local part of an email.
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "there";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "There";
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
