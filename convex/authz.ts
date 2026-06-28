import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const assertAccountAccess = internalQuery({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");

    const userId = await getAuthUserId(ctx);
    if (account.userId && account.userId !== userId) {
      throw new Error("Not authorized");
    }

    return { userId, account };
  },
});
