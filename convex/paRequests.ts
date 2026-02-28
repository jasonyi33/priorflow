import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => ctx.db.query("paRequests").collect(),
});

export const getByMrn = query({
  args: { mrn: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("paRequests").withIndex("by_mrn", (q) => q.eq("mrn", args.mrn)).collect(),
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("paRequests").withIndex("by_status", (q) => q.eq("status", args.status)).collect(),
});

export const create = mutation({
  args: {
    mrn: v.string(),
    portal: v.string(),
    medicationOrProcedure: v.string(),
    status: v.string(),
    fieldsFilled: v.array(v.string()),
    gapsDetected: v.array(v.string()),
    justificationSummary: v.optional(v.string()),
    submissionId: v.optional(v.string()),
    gifPath: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert("paRequests", args),
});

export const updateStatus = mutation({
  args: {
    id: v.id("paRequests"),
    status: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("PA request not found");
    await ctx.db.patch(args.id, { status: args.status, updatedAt: args.updatedAt });
    return { ...existing, status: args.status, updatedAt: args.updatedAt };
  },
});
