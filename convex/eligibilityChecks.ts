import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => ctx.db.query("eligibilityChecks").collect(),
});

export const getByMrn = query({
  args: { mrn: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("eligibilityChecks").withIndex("by_mrn", (q) => q.eq("mrn", args.mrn)).collect(),
});

export const create = mutation({
  args: {
    mrn: v.string(),
    portal: v.string(),
    payer: v.string(),
    coverageActive: v.boolean(),
    copay: v.optional(v.string()),
    deductible: v.optional(v.string()),
    outOfPocketMax: v.optional(v.string()),
    paRequired: v.boolean(),
    paRequiredReason: v.optional(v.string()),
    rawResponse: v.optional(v.string()),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert("eligibilityChecks", args),
});

export const upsert = mutation({
  args: {
    mrn: v.string(),
    portal: v.string(),
    payer: v.string(),
    coverageActive: v.boolean(),
    copay: v.optional(v.string()),
    deductible: v.optional(v.string()),
    outOfPocketMax: v.optional(v.string()),
    paRequired: v.boolean(),
    paRequiredReason: v.optional(v.string()),
    rawResponse: v.optional(v.string()),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eligibilityChecks")
      .withIndex("by_mrn_portal", (q) => q.eq("mrn", args.mrn).eq("portal", args.portal))
      .first();
    if (existing) {
      await ctx.db.replace(existing._id, args);
      return existing._id;
    }
    return ctx.db.insert("eligibilityChecks", args);
  },
});
