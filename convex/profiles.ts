import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return { user, profile };
  },
});

export const saveProfile = mutation({
  args: {
    name: v.string(),
    companyName: v.string(),
    product: v.string(),
    valueProp: v.optional(v.string()),
    icp: v.optional(v.string()),
    onboarded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        companyName: args.companyName,
        product: args.product,
        valueProp: args.valueProp,
        icp: args.icp,
        ...(args.onboarded !== undefined ? { onboarded: args.onboarded } : {}),
      });
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      userId,
      name: args.name,
      companyName: args.companyName,
      product: args.product,
      valueProp: args.valueProp,
      icp: args.icp,
      onboarded: args.onboarded ?? false,
    });
  },
});
