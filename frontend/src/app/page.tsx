import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">PriorFlow</h1>
          <p className="text-sm text-gray-500">
            AI Prior Authorization Agent
          </p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <NavCard
            href="/patients"
            title="Patients"
            description="View and upload patient charts"
          />
          <NavCard
            href="/eligibility"
            title="Eligibility"
            description="Check insurance coverage and PA requirements"
          />
          <NavCard
            href="/pa-requests"
            title="PA Requests"
            description="Track prior authorization submissions"
          />
          <NavCard
            href="/agent-activity"
            title="Agent Activity"
            description="Monitor AI agent runs in real-time"
          />
        </div>
      </nav>

      {/* Summary Dashboard — Dev 4 builds this out */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">Dashboard</p>
          <p className="text-sm">
            Summary metrics will appear here — active PAs, pending
            eligibility checks, recent alerts.
          </p>
          <p className="text-sm mt-4 text-gray-400">
            Dev 4: Build this out in Phase 2-3
          </p>
        </div>
      </main>
    </div>
  );
}

function NavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-500 hover:shadow-sm transition-all"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
