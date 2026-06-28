import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Clears the signed-in user's accounts and all related data (a clean slate for
// their own pipeline). Scoped per user — never touches other tenants or auth.
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
