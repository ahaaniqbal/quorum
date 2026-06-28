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

// For anonymous (guest) users, create a sensible default profile so they skip
// onboarding and the AI rep has a coherent product to pitch. No-op otherwise.
export const ensureGuestProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;
    // Only auto-provision for anonymous guests; real signups go through onboarding.
    if (!(user as any)?.isAnonymous) return null;
    return await ctx.db.insert("profiles", {
      userId,
      name: "Alex Rivera",
      companyName: "Quorum",
      product:
        "an AI account executive that works the entire buying committee and never forgets context",
      valueProp:
        "Speed-to-lead in seconds, automatic multi-threading, and real actions across your stack",
      icp: "B2B SaaS revenue teams running an outbound + inbound motion",
      onboarded: true,
    });
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
