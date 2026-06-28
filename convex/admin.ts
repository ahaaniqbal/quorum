import { mutation } from "./_generated/server";

// Wipes all demo data for a clean slate between demo runs. Public so it can be
// run from the CLI (`npx convex run admin:resetDemo`) or a hidden control.
export const resetDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "drafts",
      "actions",
      "events",
      "transcriptLines",
      "conversations",
      "contacts",
      "accounts",
    ] as const;
    let deleted = 0;
    for (const t of tables) {
      const rows = await ctx.db.query(t).collect();
      for (const r of rows) {
        await ctx.db.delete(r._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
