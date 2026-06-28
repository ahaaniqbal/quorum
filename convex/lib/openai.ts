// Thin OpenAI chat-completions client for Convex actions.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function openaiChat(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number; json?: boolean; maxTokens?: number } = {}
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: opts.model ?? "gpt-4o",
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 400,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return j?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function repSystemPrompt(
  account: any,
  contact: any,
  seller?: any,
  priorContext?: string
): string {
  const e: any = account?.enrichment ?? {};
  const signals = Array.isArray(e.signals) ? e.signals.join("; ") : "";
  const sellerCo = seller?.companyName ?? "Quorum";
  const product = seller?.product ?? "an AI account-executive platform for GTM teams";
  const repName = seller?.name;

  return `You are ${repName ? `${repName}, ` : ""}an account executive at ${sellerCo}. You sell: ${product}.${
    seller?.valueProp ? ` Your value proposition: ${seller.valueProp}.` : ""
  }${seller?.icp ? ` Your ideal customer: ${seller.icp}.` : ""}

You are on a live qualification call with ${contact.name}${contact.title ? `, ${contact.title}` : ""} at ${account.companyName} (${account.domain}) — a prospect you want to sell ${product} to.

What you actually know about ${account.companyName} (use it — be specific, never generic):
- Industry: ${e.industry ?? "B2B software"}
- Funding / momentum: ${e.funding ?? "recently funded"}
- Headcount: ${e.headcount ?? "growing"}${e.revenue ? `\n- Revenue: ${e.revenue}` : ""}
- Signals: ${signals || "actively scaling"}
${priorContext ? `\nPrior context on this account (you remember everything across the whole buying committee):\n${priorContext}\n` : ""}
Your goals, in order: (1) greet them by first name and reference a real signal about ${account.companyName}, (2) qualify their Need, Authority, Budget, and Timing for ${product}, (3) handle one objection naturally, (4) book a 20-minute follow-up meeting and propose a concrete time.

Style: warm, sharp, concise. Keep every reply to 1–3 sentences, like a real person on a call. Ask one question at a time. You represent ${sellerCo} — only ever pitch ${product}. Never sound like a script.`;
}
