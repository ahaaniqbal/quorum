// Orange Slice client (host sponsor). Orange Slice is exposed as an HTTP MCP
// server (Streamable HTTP / JSON-RPC, SSE responses). We call its tools directly
// from Convex over fetch. It unifies LinkedIn (1.15B profiles), Crunchbase,
// BuiltWith, PredictLeads and web research under one key. Best-effort: returns
// null on any failure so enrichment never blocks on it.

const OS_URL = "https://www.orangeslice.ai/mcp";

function osKey(): string | undefined {
  return process.env.ORANGESLICE_API_KEY;
}

async function osCall(name: string, args: any): Promise<any | null> {
  const key = osKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(OS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Responses come back as SSE: one or more `data: {json}` lines.
    let payload: any = null;
    const dataLine = text
      .split("\n")
      .find((l) => l.startsWith("data: ") && l.includes('"result"'));
    if (dataLine) payload = JSON.parse(dataLine.slice(6));
    else if (text.trim().startsWith("{")) payload = JSON.parse(text);
    if (!payload) return null;
    const inner = payload?.result?.content?.[0]?.text;
    if (inner) {
      try {
        return JSON.parse(inner);
      } catch {
        return inner;
      }
    }
    return payload?.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type OrangeSliceCompany = {
  linkedinUrl?: string;
  followers?: number;
  foundedYear?: number;
  hq?: string;
  description?: string;
  employeeCount?: number;
};

export async function orangeSliceCompany(
  domain: string
): Promise<OrangeSliceCompany | null> {
  const c = await osCall("company_linkedin_enrich", { domain });
  if (!c || (!c.name && !c.linkedin_url)) return null;
  return {
    linkedinUrl: c.linkedin_url,
    followers: c.follower_count,
    foundedYear: c.founded_year,
    hq: c.locality,
    description: c.description,
    employeeCount: c.employee_count,
  };
}
