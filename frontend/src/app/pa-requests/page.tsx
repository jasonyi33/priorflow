/**
 * PA Requests page — track prior authorization submissions and statuses.
 *
 * Dev 4: Build out in Phase 2:
 * - PARequestList with status-colored badges (pending, submitted, approved, denied)
 * - PARequestDetail showing fields filled, gaps, justification
 * - "Submit PA" button that triggers POST /api/pa/submit
 * - Real-time status updates via Convex subscription on paRequests table
 * - StatusTimeline showing the lifecycle of a PA request
 */

export default function PARequestsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">PA Requests</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">Prior Authorization Requests</p>
        <p className="text-sm">
          Dev 4: Build PARequestList + PAStatusBadge + StatusTimeline here.
          Data source: GET /api/pa or Convex useQuery.
        </p>
      </div>
    </div>
  );
}
