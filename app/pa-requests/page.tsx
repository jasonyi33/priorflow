import { paRequests } from "@/lib/data/fixtures";
import { PARequestCard } from "@/components/pa-request-card";
import { PAStatusBadge } from "@/components/pa-status-badge";
import type { PAStatus } from "@/lib/data/types";

export default function PARequestsPage() {
  const statusCounts = paRequests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statuses: PAStatus[] = ["approved", "submitted", "pending", "denied", "more_info_needed", "cancelled"];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">PA Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track prior authorization submissions and their current status. Click a request to see details.
        </p>
      </div>

      {/* Status Overview */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {statuses.map((status) => (
          statusCounts[status] ? (
            <div
              key={status}
              className="flex items-center gap-2 bg-card rounded-lg border border-border px-4 py-2.5"
            >
              <PAStatusBadge status={status} />
              <span className="text-sm font-semibold text-card-foreground">{statusCounts[status]}</span>
            </div>
          ) : null
        ))}
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-4 py-2.5">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-sm font-semibold text-card-foreground">{paRequests.length}</span>
        </div>
      </div>

      {/* PA Request Cards */}
      <div className="flex flex-col gap-3">
        {paRequests.map((request) => (
          <PARequestCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}
