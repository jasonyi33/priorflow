import type { PAStatus } from "@/lib/data/types";

const statusConfig: Record<PAStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  submitted: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  denied: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  more_info_needed: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

export function PAStatusBadge({ status }: { status: PAStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
