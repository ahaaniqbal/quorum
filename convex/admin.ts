import { internalMutation, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Clears the signed-in user's accounts and all related data (a clean slate for
// their own pipeline). Scoped per user; never touches other tenants or auth.
export const resetDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { deleted: 0 };

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let deleted = 0;
    const del = async (id: any) => {
      await ctx.db.delete(id);
      deleted++;
    };

    for (const acc of accounts) {
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_account", (q) => q.eq("accountId", acc._id))
        .collect();
      for (const cv of conversations) {
        const lines = await ctx.db
          .query("transcriptLines")
          .withIndex("by_conversation", (q) => q.eq("conversationId", cv._id))
          .collect();
        for (const l of lines) await del(l._id);
        await del(cv._id);
      }
      for (const table of ["contacts", "events", "actions", "drafts"] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_account", (q) => q.eq("accountId", acc._id))
          .collect();
        for (const r of rows) await del(r._id);
      }
      await del(acc._id);
    }
    return { deleted };
  },
});

function isTinyHeadcount(headcount: string | undefined): boolean {
  const nums = headcount?.match(/\d[\d,]*/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  return nums.length > 0 && Math.max(...nums) <= 10;
}

function withoutProfilePic(enrichment: any): any {
  if (!enrichment) return undefined;
  const { profilePic, ...rest } = enrichment;
  void profilePic;
  return Object.keys(rest).length ? rest : undefined;
}

export const repairSyntheticCommittees = internalMutation({
  args: { domain: v.optional(v.string()) },
  handler: async (ctx, { domain }) => {
    const targetDomain = domain?.trim().toLowerCase();
    const accounts = targetDomain
      ? await ctx.db
          .query("accounts")
          .withIndex("by_domain", (q) => q.eq("domain", targetDomain))
          .collect()
      : await ctx.db.query("accounts").collect();
    const syntheticNames = new Set(["Jordan Avery", "Priya Nair", "Marcus Lin"]);
    const syntheticEmailLocal = new Set(["jordan", "priya", "marcus"]);

    let repaired = 0;
    let deletedContacts = 0;

    for (const account of accounts) {
      if (targetDomain && account.domain !== targetDomain) continue;
      const contacts = await ctx.db
        .query("contacts")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      const tiny = isTinyHeadcount(account.enrichment?.headcount);

      for (const contact of contacts) {
        const local = contact.email?.split("@")[0]?.toLowerCase();
        const synthetic =
          !contact.isPrimary &&
          (syntheticNames.has(contact.name) || Boolean(local && syntheticEmailLocal.has(local)));

        if (synthetic) {
          const drafts = await ctx.db
            .query("drafts")
            .withIndex("by_account", (q) => q.eq("accountId", account._id))
            .collect();
          for (const draft of drafts) {
            if (draft.contactId === contact._id) await ctx.db.delete(draft._id);
          }
          await ctx.db.delete(contact._id);
          deletedContacts++;
          continue;
        }

        if (
          contact.isPrimary &&
          tiny &&
          /head of revenue|sales|growth|marketing|business development/i.test(contact.title ?? "")
        ) {
          await ctx.db.patch(contact._id, {
            title: "Founder",
            enrichment: withoutProfilePic(contact.enrichment),
          });
          repaired++;
        }
      }

      const events = await ctx.db
        .query("events")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      for (const event of events) {
        if (
          /Jordan Avery|Priya Nair|Marcus Lin|Outreach sent to .*committee|Buying committee mapped|Committee graph built|Next move/i.test(
            event.label
          )
        ) {
          await ctx.db.delete(event._id);
        }
      }

      if (tiny) {
        await ctx.db.patch(account._id, {
          status: "active",
          graph: {
            stakeholders: [],
            relationships: [],
            gaps: ["No verified buying committee beyond the known primary contact."],
          },
          moves: {
            deal_status: "needs_primary_qualification",
            deal_risk: "unknown",
            top_move: {
              name: "Known primary contact",
              action: "Qualify the founder or primary contact before mapping a wider committee.",
              channel: "email",
              urgency: "today",
            },
            moves: [],
          },
        });
      }
    }

    return { repaired, deletedContacts };
  },
});
