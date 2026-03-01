import { useState } from 'react';
import { Wifi } from 'lucide-react';
import { usePADashboardContext, TimePeriod } from '../../lib/hooks';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';

// ─── Chart Legend Component ───
function ChartLegend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 uppercase">
      <span className="inline-block size-2 rounded-sm rotate-45" style={{ backgroundColor: color }} />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Security Status Item ───
function SecurityStatusItem({ title, value, status, variant }: { title: string; value: string; status: string; variant: 'success' | 'warning' | 'destructive' }) {
  const variantClasses = {
    success: 'border-success bg-success/5 text-success ring-success/3',
    warning: 'border-warning bg-warning/5 text-warning ring-warning/3',
    destructive: 'border-destructive bg-destructive/5 text-destructive ring-destructive/3',
  };

  return (
    <div className={`border rounded-md ring-4 ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2 py-2 px-3 border-b border-current">
        <span className={`inline-block size-1.5 rounded-sm rotate-45 ${variant === 'success' ? 'bg-success' : variant === 'warning' ? 'bg-warning' : 'bg-destructive'}`} />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="py-3 px-3">
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-xs opacity-50">{status}</div>
      </div>
    </div>
  );
}

export function Home() {
  const data = usePADashboardContext();
  const [activeTab, setActiveTab] = useState<TimePeriod>('week');

  if (data.loading) {
    return (
      <div className="flex flex-col relative w-full gap-1 min-h-full">
        <div className="flex-1 flex flex-col gap-8 px-6 py-10 ring-2 ring-pop bg-background">
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-80 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // ─── Stat cards derived from context ───
  const dashboardStats = [
    {
      label: 'PA APPROVALS',
      value: `${data.approvalRate}%`,
      description: `${data.approvedCount} of ${data.approvedCount + data.deniedCount} decided`,
      intent: 'positive' as const,
      arrow: data.approvalRate >= 80 ? '↗' : data.approvalRate >= 60 ? '→' : '↘',
    },
    {
      label: 'AVG TURNAROUND',
      value: `${data.avgTurnaroundHours}h`,
      description: 'TIME TO DECISION',
      intent: 'positive' as const,
      arrow: data.avgTurnaroundHours <= 4 ? '↘' : '↗',
    },
    {
      label: 'PENDING REVIEWS',
      value: String(data.pendingCount),
      description: 'AWAITING DETERMINATION',
      intent: 'neutral' as const,
      tag: data.urgentPendingCount > 0 ? `${data.urgentPendingCount} urgent` : undefined,
    },
  ];

  const formatYAxisValue = (value: number) => {
    if (value === 0) return '';
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const currentData = data.chartData[activeTab];

  const chartConfig = {
    submitted: { label: 'Submitted', color: 'var(--chart-1)' },
    approved: { label: 'Approved', color: 'var(--chart-2)' },
    denied: { label: 'Denied', color: 'var(--chart-5)' },
  };

  return (
    <div className="flex flex-col relative w-full gap-1 min-h-full">
      {/* Page Content */}
      <div className="min-h-full flex-1 flex flex-col gap-8 md:gap-14 px-3 lg:px-6 py-6 md:py-10 ring-2 ring-pop bg-background">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardStats.map((stat, index) => (
            <div key={index} className="rounded-lg border border-border bg-card relative overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2.5 text-sm font-medium uppercase">
                  <span className="inline-block size-1.5 bg-primary rounded-sm rotate-45" />
                  {stat.label}
                </div>
              </div>
              {/* Card Content */}
              <div className="bg-accent flex-1 pt-2 md:pt-6 p-4 overflow-clip relative">
                <div className="flex items-center gap-2">
                  <span className="text-4xl md:text-5xl font-['Inter',sans-serif] font-bold tracking-tight">
                    {stat.value}
                  </span>
                  {stat.arrow && (
                    <span className="text-2xl md:text-3xl text-success font-bold leading-none">
                      {stat.arrow}
                    </span>
                  )}
                  {stat.tag && (
                    <span className="px-2 py-0.5 text-[9px] bg-primary text-primary-foreground rounded uppercase ml-1 font-bold">
                      {stat.tag}
                    </span>
                  )}
                </div>
                {stat.description && (
                  <p className="text-xs md:text-sm font-medium text-muted-foreground tracking-wide mt-1">
                    {stat.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chart Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            {/* Tab buttons */}
            <div className="flex items-center gap-0 rounded-md overflow-hidden border border-border">
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setActiveTab(period)}
                  className={`px-4 py-1.5 text-xs tracking-wider font-semibold transition-colors uppercase ${
                    activeTab === period
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6">
              {Object.entries(chartConfig).map(([key, value]) => (
                <ChartLegend key={key} label={value.label} color={value.color} />
              ))}
            </div>
          </div>

          <div className="bg-accent rounded-lg p-3">
            <div className="w-full h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentData} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <defs>
                    <linearGradient id="fillSubmitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillDenied" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={12}
                    strokeWidth={1.5}
                    className="uppercase text-sm fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={0}
                    tickCount={6}
                    className="text-sm fill-muted-foreground"
                    tickFormatter={formatYAxisValue}
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                      fontFamily: 'IBM Plex Mono',
                      backgroundColor: 'var(--card)',
                    }}
                  />
                  <Area
                    dataKey="submitted"
                    type="linear"
                    fill="url(#fillSubmitted)"
                    fillOpacity={0.4}
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    dataKey="approved"
                    type="linear"
                    fill="url(#fillApproved)"
                    fillOpacity={0.4}
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    dataKey="denied"
                    type="linear"
                    fill="url(#fillDenied)"
                    fillOpacity={0.4}
                    stroke="var(--chart-5)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Performance */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2.5 text-sm font-medium uppercase">
                <span className="inline-block size-1.5 bg-primary rounded-sm rotate-45" />
                TEAM PERFORMANCE
              </div>
              <span className="px-2 py-0.5 text-[9px] border border-warning text-warning rounded uppercase font-bold tracking-wider">
                THIS WEEK
              </span>
            </div>
            <div className="p-3 space-y-0.5">
              {data.teamPerformance.map((member) => (
                <div key={member.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${member.featured ? 'bg-accent' : ''}`}>
                  {/* Rank */}
                  <div className={`flex-none flex items-center justify-center rounded font-bold w-6 h-6 text-xs ${
                    member.featured ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {member.id}
                  </div>
                  {/* Name + Handle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-['Inter',sans-serif] font-bold tracking-tight truncate">
                        {member.name}
                      </span>
                      <span className="text-muted-foreground text-xs flex-none">{member.handle}</span>
                    </div>
                    {member.subtitle && (
                      <span className="text-xs text-muted-foreground italic">{member.subtitle}</span>
                    )}
                  </div>
                  {/* Cases Badge */}
                  <span className={`flex-none px-2 py-0.5 text-[9px] rounded font-bold whitespace-nowrap ${member.featured ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {member.cases} CASES
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2.5 text-sm font-medium uppercase">
                <span className="inline-block size-1.5 bg-success rounded-sm rotate-45" />
                SYSTEM STATUS
              </div>
              <span className="px-2 py-0.5 text-[9px] border border-success text-success rounded uppercase font-bold tracking-wider flex items-center gap-1">
                <Wifi className="size-3" />
                ONLINE
              </span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-4">
                {data.systemStatuses.map((item, index) => (
                  <SecurityStatusItem
                    key={index}
                    title={item.title}
                    value={item.value}
                    status={item.status}
                    variant={item.variant}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
