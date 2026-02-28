import type { PAStatus } from "@/lib/data/types";

interface TimelineEvent {
  label: string;
  time: string;
  status: "completed" | "active" | "upcoming";
}

function buildTimeline(paStatus: PAStatus, createdAt: string, updatedAt: string): TimelineEvent[] {
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const events: TimelineEvent[] = [
    { label: "Eligibility Checked", time: fmt(new Date(created.getTime() - 30 * 60000)), status: "completed" },
    { label: "PA Submitted", time: fmt(created), status: "completed" },
  ];

  if (paStatus === "pending") {
    events.push({ label: "Awaiting Determination", time: "Pending", status: "active" });
    events.push({ label: "Determination", time: "--", status: "upcoming" });
  } else if (paStatus === "submitted") {
    events.push({ label: "Under Review", time: "In progress", status: "active" });
    events.push({ label: "Determination", time: "--", status: "upcoming" });
  } else if (paStatus === "approved") {
    events.push({ label: "Under Review", time: "", status: "completed" });
    events.push({ label: "Approved", time: fmt(updated), status: "completed" });
  } else if (paStatus === "denied") {
    events.push({ label: "Under Review", time: "", status: "completed" });
    events.push({ label: "Denied", time: fmt(updated), status: "completed" });
  } else if (paStatus === "more_info_needed") {
    events.push({ label: "More Info Needed", time: fmt(updated), status: "active" });
    events.push({ label: "Resubmission", time: "--", status: "upcoming" });
  } else {
    events.push({ label: "Cancelled", time: fmt(updated), status: "completed" });
  }

  return events;
}

const dotColors: Record<string, string> = {
  completed: "bg-emerald-500",
  active: "bg-primary",
  upcoming: "bg-border",
};

const lineColors: Record<string, string> = {
  completed: "bg-emerald-500",
  active: "bg-border",
  upcoming: "bg-border",
};

export function StatusTimeline({
  status,
  createdAt,
  updatedAt,
}: {
  status: PAStatus;
  createdAt: string;
  updatedAt: string;
}) {
  const events = buildTimeline(status, createdAt, updatedAt);

  return (
    <div className="flex flex-col gap-0">
      {events.map((event, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${dotColors[event.status]} ${event.status === "active" ? "ring-4 ring-primary/20" : ""}`} />
            {i < events.length - 1 && (
              <div className={`w-0.5 h-8 ${lineColors[event.status]}`} />
            )}
          </div>
          <div className="pb-4">
            <p className={`text-sm font-medium ${event.status === "upcoming" ? "text-muted-foreground" : "text-card-foreground"}`}>
              {event.label}
            </p>
            {event.time && (
              <p className="text-xs text-muted-foreground">{event.time}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
