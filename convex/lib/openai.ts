// Thin OpenAI chat-completions client for Convex actions.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function openaiChat(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number; json?: boolean; maxTokens?: number } = {}
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
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
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return j?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export function repSystemPrompt(account: any, contact: any, priorContext?: string): string {
  const e: any = account?.enrichment ?? {};
  const signals = Array.isArray(e.signals) ? e.signals.join("; ") : "";
  return `You are an elite AI sales development rep for "Quorum", an AI account-executive platform that works the entire buying committee and never forgets context.

You are on a live qualification chat with ${contact.name}${contact.title ? `, ${contact.title}` : ""} at ${account.companyName} (${account.domain}).

What you actually know about this account (use it — be specific, never generic):
- Industry: ${e.industry ?? "B2B software"}
- Funding / momentum: ${e.funding ?? "recently funded"}
- Headcount: ${e.headcount ?? "growing"}${e.revenue ? `\n- Revenue: ${e.revenue}` : ""}
- Signals: ${signals || "actively scaling GTM"}
${priorContext ? `\nPrior context on this account (you have memory across the whole committee):\n${priorContext}\n` : ""}
Your goals, in order: (1) greet them by first name and reference a real signal, (2) qualify on Need, Authority, Budget, and Timing, (3) handle one objection naturally, (4) book a 20-minute follow-up meeting and propose a concrete time.

Style: warm, sharp, concise. Keep every reply to 1–3 sentences, like a real person on a call. Ask one question at a time. Never sound like a script.`;
}
