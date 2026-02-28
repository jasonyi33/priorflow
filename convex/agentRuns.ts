import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => ctx.db.query("agentRuns").collect(),
});

export const getByRunId = query({
  args: { runId: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("agentRuns").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).first(),
});

export const getByMrn = query({
  args: { mrn: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("agentRuns").withIndex("by_mrn", (q) => q.eq("mrn", args.mrn)).collect(),
});

export const create = mutation({
  args: {
    runId: v.optional(v.string()),
    agentType: v.string(),
    mrn: v.string(),
    portal: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    stepsTaken: v.number(),
    maxSteps: v.number(),
    success: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
    gifPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("agentRuns", args),
});

export const complete = mutation({
  args: {
    id: v.id("agentRuns"),
    completedAt: v.number(),
    stepsTaken: v.number(),
    success: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
    gifPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Agent run not found");
    await ctx.db.patch(args.id, {
      completedAt: args.completedAt,
      stepsTaken: args.stepsTaken,
      success: args.success,
      errorMessage: args.errorMessage,
      gifPath: args.gifPath,
    });
    return { ...existing, ...args };
  },
});
