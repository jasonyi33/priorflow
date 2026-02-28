/**
 * Agent Activity page — real-time feed of AI agent runs.
 *
 * Dev 4: Build out in Phase 1-2:
 * - AgentActivityFeed with real-time Convex subscription on agentRuns table
 * - Show: agent type, patient, portal, status, steps taken, duration
 * - Auto-scrolling feed that updates as agents start/complete
 * - Click-through to see agent GIF recordings
 */

export default function AgentActivityPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Agent Activity</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">Agent Run Feed</p>
        <p className="text-sm">
          Dev 4: Build AgentActivityFeed component here.
          Data source: Convex real-time subscription on agentRuns table.
        </p>
      </div>
    </div>
  );
}
