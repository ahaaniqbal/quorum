import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const assertAccountAccess = internalQuery({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");

    const userId = await getAuthUserId(ctx);
    // Owner-only write gate: demo/sample accounts (no userId) are read-only; an
    // owned account is mutable only by its owner. Reads use accountVisible, so
    // everyone can still view the public demo accounts.
    if (!account.userId || account.userId !== userId) {
      throw new Error(account.userId ? "Not authorized" : "Sample accounts are read-only");
    }

    return { userId, account };
  },
});
