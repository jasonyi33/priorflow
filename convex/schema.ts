/**
 * Convex database schema for PriorFlow.
 *
 * PROTECTED FILE — Only Dev 1 modifies.
 * Mirrors the Python models in shared/models.py.
 * Convex auto-generates TypeScript types from this schema.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  patients: defineTable({
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
    // Full chart JSON stored for agent consumption
    chartJson: v.string(),
  }).index("by_mrn", ["mrn"]),

  eligibilityChecks: defineTable({
    mrn: v.string(),
    portal: v.string(), // Portal enum value
    payer: v.string(),
    coverageActive: v.boolean(),
    copay: v.optional(v.string()),
    deductible: v.optional(v.string()),
    outOfPocketMax: v.optional(v.string()),
    paRequired: v.boolean(),
    paRequiredReason: v.optional(v.string()),
    rawResponse: v.optional(v.string()),
    checkedAt: v.number(), // Unix timestamp ms
  })
    .index("by_mrn", ["mrn"])
    .index("by_mrn_portal", ["mrn", "portal"]),

  paRequests: defineTable({
    mrn: v.string(),
    portal: v.string(), // Portal enum value
    medicationOrProcedure: v.string(),
    status: v.string(), // PAStatusEnum value
    fieldsFilled: v.array(v.string()),
    gapsDetected: v.array(v.string()),
    justificationSummary: v.optional(v.string()),
    submissionId: v.optional(v.string()),
    gifPath: v.optional(v.string()),
    createdAt: v.number(), // Unix timestamp ms
    updatedAt: v.number(), // Unix timestamp ms
  })
    .index("by_mrn", ["mrn"])
    .index("by_status", ["status"])
    .index("by_mrn_portal", ["mrn", "portal"]),

  agentRuns: defineTable({
    runId: v.optional(v.string()), // external run id used by API polling
    agentType: v.string(), // AgentType enum value
    mrn: v.string(),
    portal: v.string(), // Portal enum value
    startedAt: v.number(), // Unix timestamp ms
    completedAt: v.optional(v.number()),
    stepsTaken: v.number(),
    maxSteps: v.number(),
    success: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
    gifPath: v.optional(v.string()),
  })
    .index("by_run_id", ["runId"])
    .index("by_mrn", ["mrn"])
    .index("by_agent_type", ["agentType"])
    .index("by_started_at", ["startedAt"]),

  alerts: defineTable({
    patientName: v.string(),
    mrn: v.string(),
    eventType: v.string(), // "approved" | "denied" | "delayed" | "error" | "submitted"
    portal: v.string(),
    details: v.string(),
    sentAt: v.number(), // Unix timestamp ms
    emailSent: v.boolean(),
  })
    .index("by_mrn", ["mrn"])
    .index("by_event_type", ["eventType"]),
});
