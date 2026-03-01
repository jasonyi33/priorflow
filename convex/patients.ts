import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => ctx.db.query("patients").collect(),
});

export const getByMrn = query({
  args: { mrn: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("patients").withIndex("by_mrn", (q) => q.eq("mrn", args.mrn)).first(),
});

export const create = mutation({
  args: {
    mrn: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dob: v.string(),
    insurance: v.object({
      payer: v.string(),
      memberId: v.string(),
      bin: v.string(),
      pcn: v.string(),
      rxGroup: v.string(),
      planName: v.optional(v.string()),
    }),
    diagnosis: v.object({
      icd10: v.string(),
      description: v.string(),
    }),
    medication: v.optional(
      v.object({
        name: v.string(),
        ndc: v.optional(v.string()),
        dose: v.string(),
        frequency: v.string(),
      })
    ),
    procedure: v.optional(
      v.object({
        cpt: v.string(),
        description: v.string(),
      })
    ),
    priorTherapies: v.array(v.string()),
    labs: v.any(),
    imaging: v.any(),
    provider: v.object({
      name: v.string(),
      npi: v.string(),
      practice: v.string(),
      phone: v.string(),
      fax: v.string(),
    }),
    chartJson: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_mrn", (q) => q.eq("mrn", args.mrn))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("patients", args);
  },
});

export const upsertByMrn = mutation({
  args: {
    mrn: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dob: v.string(),
    insurance: v.object({
      payer: v.string(),
      memberId: v.string(),
      bin: v.string(),
      pcn: v.string(),
      rxGroup: v.string(),
      planName: v.optional(v.string()),
    }),
    diagnosis: v.object({
      icd10: v.string(),
      description: v.string(),
    }),
    medication: v.optional(
      v.object({
        name: v.string(),
        ndc: v.optional(v.string()),
        dose: v.string(),
        frequency: v.string(),
      })
    ),
    procedure: v.optional(
      v.object({
        cpt: v.string(),
        description: v.string(),
      })
    ),
    priorTherapies: v.array(v.string()),
    labs: v.any(),
    imaging: v.any(),
    provider: v.object({
      name: v.string(),
      npi: v.string(),
      practice: v.string(),
      phone: v.string(),
      fax: v.string(),
    }),
    chartJson: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_mrn", (q) => q.eq("mrn", args.mrn))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("patients", args);
  },
});
