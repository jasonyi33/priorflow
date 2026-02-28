import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => ctx.db.query("alerts").collect(),
});

export const getByMrn = query({
  args: { mrn: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("alerts").withIndex("by_mrn", (q) => q.eq("mrn", args.mrn)).collect(),
});

export const create = mutation({
  args: {
    patientName: v.string(),
    mrn: v.string(),
    eventType: v.string(),
    portal: v.string(),
    details: v.string(),
    sentAt: v.number(),
    emailSent: v.boolean(),
  },
  handler: async (ctx, args) => ctx.db.insert("alerts", args),
});
