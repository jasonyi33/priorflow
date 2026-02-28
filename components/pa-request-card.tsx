"use client";

import { useState } from "react";
import type { PARequest } from "@/lib/data/types";
import { PAStatusBadge } from "./pa-status-badge";
import { StatusTimeline } from "./status-timeline";
import { getPatientByMrn } from "@/lib/data/fixtures";

export function PARequestCard({ request }: { request: PARequest }) {
  const [expanded, setExpanded] = useState(false);
  const patient = getPatientByMrn(request.mrn);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-card-foreground">
              {request.medication_or_procedure}
            </h3>
            <p className="text-sm text-muted-foreground">
              {patient?.patient.name || request.mrn} &middot; {request.portal === "covermymeds" ? "CoverMyMeds" : request.portal === "claimmd" ? "Claim.MD" : request.portal.charAt(0).toUpperCase() + request.portal.slice(1)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PAStatusBadge status={request.status} />
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{request.fields_filled.length} fields filled</span>
          {request.gaps_detected.length > 0 && (
            <span className="text-amber-600 font-medium">
              {request.gaps_detected.length} gap{request.gaps_detected.length > 1 ? "s" : ""} detected
            </span>
          )}
          {request.submission_id && (
            <span className="font-mono">{request.submission_id}</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Timeline</h4>
              <StatusTimeline
                status={request.status}
                createdAt={request.created_at}
                updatedAt={request.updated_at}
              />
            </div>

            <div className="flex flex-col gap-4">
              {request.justification_summary && (
                <div>
                  <h4 className="text-sm font-semibold text-card-foreground mb-2">Clinical Justification</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted rounded-lg p-3">
                    {request.justification_summary}
                  </p>
                </div>
              )}

              {request.gaps_detected.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-card-foreground mb-2">Gaps Detected</h4>
                  <div className="flex flex-col gap-1.5">
                    {request.gaps_detected.map((gap) => (
                      <div key={gap} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                        {gap.replace(/_/g, " ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-2">Fields Filled ({request.fields_filled.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {request.fields_filled.slice(0, 8).map((field) => (
                    <span key={field} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {field.replace(/_/g, " ")}
                    </span>
                  ))}
                  {request.fields_filled.length > 8 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                      +{request.fields_filled.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
