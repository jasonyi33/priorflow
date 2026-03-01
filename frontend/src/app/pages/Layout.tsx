import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  FileCheck, 
  ClipboardList, 
  Activity, 
  Lock,
  Menu,
  X,
  ChevronRight,
  Settings,
  LogOut,
  CircleCheck,
  Clock,
  TrendingUp,
  Bot,
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { AnimatePresence, motion } from 'motion/react';
import TVNoise from '../components/tv-noise';
import { PriorFlowLogo, PriorFlowMark } from '../components/priorflow-logo';
import { usePADashboard, PADashboardContext } from '../../lib/hooks';

// ─── NAVIGATION DATA ───
const navigation = [
  { name: 'DASHBOARD', href: '/', icon: LayoutDashboard },
  { name: 'PATIENTS', href: '/patients', icon: Users },
  { name: 'ELIGIBILITY', href: '/eligibility', icon: FileCheck },
  { name: 'PA REQUESTS', href: '/pa-requests', icon: ClipboardList },
  { name: 'AGENT ACTIVITY', href: '/agent-activity', icon: Activity },
  { name: 'MOCK PORTAL', href: '/mock-portal', icon: Lock, locked: true },
];

// ─── NOTIFICATION DATA ───
interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

const initialNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'PA APPROVED',
    message: 'Prior auth for Jane Doe (Humira) approved by Aetna.',
    timestamp: '2025-02-28T13:39:00Z',
    type: 'success',
    read: false,
    priority: 'medium',
  },
  {
    id: 'notif-2',
    title: 'ELIGIBILITY VERIFIED',
    message: 'Coverage confirmed for John Smith - United Healthcare.',
    timestamp: '2025-02-28T13:35:00Z',
    type: 'info',
    read: false,
    priority: 'low',
  },
  {
    id: 'notif-3',
    title: 'AGENT COMPLETED',
    message: 'Eligibility check bot finished for patient MRN-00421.',
    timestamp: '2025-02-28T12:15:00Z',
    type: 'info',
    read: true,
    priority: 'medium',
  },
  {
    id: 'notif-4',
    title: 'INFO REQUEST',
    message: 'Aetna requesting additional clinical notes for PA #4821.',
    timestamp: '2025-02-28T11:45:00Z',
    type: 'warning',
    read: true,
    priority: 'high',
  },
];

// ─── WIDGET DATA ───
function getTimezoneAbbr(): string {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' });
  const parts = formatter.formatToParts(new Date());
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  return tzPart?.value ?? 'UTC';
}

const widgetData = {
  location: 'PriorFlow HQ',
  timezone: getTimezoneAbbr(),
};

// ─── CHAT DATA ───
const chatContacts = [
  { id: 'alpha', name: 'AGENT ALPHA', handle: '@ALPHA', lastMessage: 'PA #4821 SUBMITTED TO AETNA', time: '4:00 PM', unread: 1, online: true },
  { id: 'rivera', name: 'DR. RIVERA', handle: '@MRIVERA', lastMessage: 'NEED CHART REVIEW FOR DOE, JANE', time: 'Yesterday', unread: 0, online: false },
  { id: 'beta', name: 'AGENT BETA', handle: '@BETA', lastMessage: 'RUN ELIGIBILITY CHECK', time: 'Yesterday', unread: 0, online: true },
];

// ─── HELPERS ───
function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function getTypeColor(type: Notification['type']) {
  switch (type) {
    case 'success': return 'bg-green-500';
    case 'warning': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-blue-500';
  }
}

function getPriorityBadge(priority: Notification['priority']) {
  switch (priority) {
    case 'high':
      return <span className="px-1.5 py-0.5 text-[9px] bg-destructive/10 text-destructive rounded tracking-wider font-semibold border border-destructive/20">HIGH</span>;
    case 'medium':
      return <span className="px-1.5 py-0.5 text-[9px] bg-secondary text-secondary-foreground rounded tracking-wider font-semibold border border-border">MED</span>;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════

export function Layout() {
  const location = useLocation();
  const dashboardData = usePADashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications = showAllNotifications
    ? notifications
    : notifications.slice(0, 3);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  // ─── Format helpers ───
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });

  const formatDate = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const restOfDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return { dayOfWeek, restOfDate };
  };

  const dateInfo = formatDate(currentTime);

  // ─── Sidebar stats derived from dashboard data ───
  const sidebarStats = [
    { label: 'APPROVED', value: String(dashboardData.approvedCount), icon: CircleCheck, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'PENDING', value: String(dashboardData.pendingCount), icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'APPROVAL', value: `${dashboardData.approvalRate}%`, icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'AGENTS', value: `${dashboardData.activeAgents}/${dashboardData.totalAgentSlots}`, icon: Bot, color: 'text-success', bgColor: 'bg-success/10' },
  ];

  // ═══════════════════════════════════════════════
  // SIDEBAR CONTENT
  // ═══════════════════════════════════════════════
  const SidebarContent = () => (
    <div className="flex h-full flex-col p-3 gap-3">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-1 pt-1 pb-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <PriorFlowLogo className="size-6" />
        </div>
        <span className="text-lg font-['Inter',sans-serif] font-bold tracking-tight">PriorFlow</span>
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          NAVIGATION
        </p>
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={closeSidebar}
              className={cn(
                'group/nav relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] tracking-wider transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                item.locked && 'pointer-events-none opacity-40'
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.name}</span>
              {item.locked && <Lock className="size-3 opacity-50" />}
              {isActive && <ChevronRight className="size-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Quick Stats — derived from live data */}
      <div className="mt-1">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          TODAY
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {dashboardData.loading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="rounded-md border border-border/40 bg-muted/50 p-2.5 h-16 animate-pulse" />
              ))
            : sidebarStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-md border border-border/60 bg-accent/50 p-2.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn('size-6 rounded flex items-center justify-center', stat.bgColor)}>
                        <Icon className={cn('size-3.5', stat.color)} />
                      </div>
                      <span className="text-lg font-['Inter',sans-serif] font-bold tracking-tight leading-none">
                        {stat.value}
                      </span>
                    </div>
                    <span className="text-[9px] tracking-wider text-muted-foreground/60 uppercase">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-1">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          QUICK ACTIONS
        </p>
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <ClipboardList className="size-4" />
            <span className="flex-1 text-left">NEW PA REQUEST</span>
            <span className="text-[9px] text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded tracking-wider">⌘N</span>
          </button>
          <button className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <FileCheck className="size-4" />
            <span className="flex-1 text-left">CHECK ELIGIBILITY</span>
            <span className="text-[9px] text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded tracking-wider">⌘E</span>
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* System Status — derived from live data */}
      <div className={cn(
        'rounded-md border px-2.5 py-2 flex items-center gap-2',
        dashboardData.loading
          ? 'border-border bg-muted/50'
          : dashboardData.apiUptime >= 99
            ? 'border-success/20 bg-success/5'
            : 'border-warning/20 bg-warning/5'
      )}>
        {!dashboardData.loading && (
          <>
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-success" />
            </span>
            <span className="text-[10px] tracking-wider text-success uppercase font-semibold flex-1">
              ALL SYSTEMS ONLINE
            </span>
            <span className="text-[9px] text-muted-foreground/50">{dashboardData.apiUptime}%</span>
          </>
        )}
        {dashboardData.loading && (
          <span className="text-[10px] text-muted-foreground/50 tracking-wider">LOADING...</span>
        )}
      </div>

      {/* User Section */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors"
        >
          <div className="relative shrink-0">
            <div className="size-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-[10px] font-bold">SC</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-success rounded-full border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-semibold tracking-wide truncate">DR. S. CHEN</div>
            <div className="text-[10px] text-muted-foreground/50 truncate">s.chen@priorflow.io</div>
          </div>
          <ChevronRight className={cn(
            'size-3.5 text-muted-foreground/40 transition-transform duration-200',
            userMenuOpen && 'rotate-90'
          )} />
        </button>

        {/* User dropdown */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-border bg-card shadow-lg overflow-hidden z-10">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
              <Settings className="size-3.5" />
              SETTINGS
            </button>
            <div className="border-t border-border" />
            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] tracking-wider text-destructive/70 hover:bg-destructive/5 hover:text-destructive transition-colors">
              <LogOut className="size-3.5" />
              SIGN OUT
            </button>
          </div>
        )}
      </div>

      {/* Version */}
      <div className="px-2.5 pb-1 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground/30 tracking-wider">PRIORFLOW v2.4.1</span>
        <span className="text-[9px] text-muted-foreground/30 tracking-wider">HIPAA</span>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // WIDGET (Right Panel Top)
  // ═══════════════════════════════════════════════
  const WidgetSection = () => (
    <div className="w-full aspect-[2] relative overflow-hidden rounded-lg border border-border bg-card">
      <TVNoise opacity={0.3} intensity={0.2} speed={40} />
      <div className="bg-accent/30 flex-1 flex flex-col justify-between text-sm font-medium uppercase relative z-20 p-4 h-full">
        <div className="flex justify-between items-center">
          <span className="opacity-50">{dateInfo.dayOfWeek}</span>
          <span>{dateInfo.restOfDate}</span>
        </div>
        <div className="text-center">
          <div className="text-5xl font-['Inter',sans-serif] font-bold tracking-tight" suppressHydrationWarning>
            {formatTime(currentTime)}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="opacity-50">{dashboardData.queueDepth} queued</span>
          <span>{widgetData.location}</span>
          <span className="px-2 py-0.5 text-xs bg-accent rounded font-medium">
            {widgetData.timezone}
          </span>
        </div>

        {/* Background grid pattern */}
        <div className="absolute inset-0 -z-[1] opacity-[0.08]" style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }} />
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // NOTIFICATION ITEM
  // ═══════════════════════════════════════════════
  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div
      className={cn(
        'group p-3 rounded-lg border transition-all duration-200 hover:shadow-sm',
        !notification.read && 'cursor-pointer',
        notification.read
          ? 'bg-card/50 border-border/30'
          : 'bg-card border-border shadow-sm'
      )}
      onClick={() => { if (!notification.read) markAsRead(notification.id); }}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', getTypeColor(notification.type))} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h4 className={cn('text-sm font-medium truncate', !notification.read && 'font-semibold')}>
                {notification.title}
              </h4>
              {getPriorityBadge(notification.priority)}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-destructive"
            >
              clear
            </button>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <span className="text-xs text-muted-foreground/60 mt-1 block">
            {formatTimestamp(notification.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // NOTIFICATIONS SECTION
  // ═══════════════════════════════════════════════
  const NotificationsSection = () => (
    <div className="flex-1 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2.5 text-sm font-medium uppercase">
          {unreadCount > 0 ? (
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {unreadCount}
            </span>
          ) : (
            <span className="inline-block size-1.5 bg-primary rounded-sm rotate-45" />
          )}
          Notifications
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground/50 hover:text-foreground uppercase tracking-wider transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 bg-accent p-1.5 overflow-auto">
        <div className="space-y-2">
          <AnimatePresence initial={false} mode="popLayout">
            {displayedNotifications.map((notification) => (
              <motion.div
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                key={notification.id}
              >
                <NotificationItem notification={notification} />
              </motion.div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            )}

            {notifications.length > 3 && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full"
              >
                <button
                  onClick={() => setShowAllNotifications(!showAllNotifications)}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider font-medium transition-colors"
                >
                  {showAllNotifications ? 'Show Less' : `Show All (${notifications.length})`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // CHAT SECTION
  // ═══════════════════════════════════════════════
  const totalChatUnread = chatContacts.reduce((sum, c) => sum + c.unread, 0);

  const ChatSection = () => (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Chat Header / Toggle */}
      <button
        onClick={() => setChatExpanded(!chatExpanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 transition-colors',
          chatExpanded ? 'border-b border-border' : '',
          'hover:bg-accent/50'
        )}
      >
        {totalChatUnread > 0 && (
          <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
            {totalChatUnread}
          </span>
        )}
        <span className="flex-1 text-left text-sm font-medium uppercase tracking-wider">
          {totalChatUnread > 0
            ? `New Message${totalChatUnread > 1 ? 's' : ''}`
            : 'Messages'}
        </span>
        <X
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            !chatExpanded && 'rotate-45'
          )}
        />
      </button>

      {/* Chat Contacts — CSS transition (no AnimatePresence flicker) */}
      <div
        className={cn(
          'transition-[max-height,opacity] duration-300 ease-out overflow-hidden',
          chatExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="bg-accent p-2 space-y-2">
          {chatContacts.map((contact) => (
            <div
              key={contact.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                contact.unread > 0
                  ? 'bg-card border-border shadow-sm'
                  : 'bg-card/50 border-border/30 hover:bg-card hover:border-border'
              )}
            >
              {/* Avatar with online indicator */}
              <div className="relative shrink-0">
                <div className="size-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary leading-tight text-center tracking-wider">
                    {contact.name
                      .split(' ')
                      .filter((w) => w.length > 1)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')}
                  </span>
                </div>
                {contact.online && (
                  <span className="absolute -bottom-0.5 -left-0.5 size-2.5 bg-green-500 rounded-full border-2 border-card" />
                )}
              </div>

              {/* Name + Message */}
              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span
                    className={cn(
                      'text-sm tracking-wide truncate',
                      contact.unread > 0 ? 'font-bold' : 'font-medium'
                    )}
                  >
                    {contact.name}
                  </span>
                  <span className="text-xs text-muted-foreground/50 shrink-0 whitespace-nowrap">
                    {contact.time}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate leading-relaxed">
                  {contact.lastMessage}
                </p>
              </div>

              {/* Unread badge */}
              {contact.unread > 0 && (
                <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 mt-1">
                  {contact.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // RIGHT PANEL
  // ═══════════════════════════════════════════════
  const RightPanel = () => (
    <div className="flex flex-col h-full gap-gap py-sides min-h-screen max-h-screen sticky top-0 overflow-clip">
      <WidgetSection />
      <NotificationsSection />
      <ChatSection />
    </div>
  );

  // ═══════════════════════════════════════════════
  // MAIN LAYOUT
  // ═══════════════════════════════════════════════
  return (
    <PADashboardContext.Provider value={dashboardData}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-gap lg:px-sides">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
            onClick={closeSidebar}
          />
        )}

        {/* Left Sidebar - Desktop */}
        <aside className="hidden lg:block col-span-2 top-0 relative">
          <div className="sticky top-0 py-sides min-h-screen max-h-screen overflow-auto rounded-lg border border-border bg-card">
            <SidebarContent />
          </div>
        </aside>

        {/* Left Sidebar - Mobile */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <SidebarContent />
          <button
            className="absolute top-4 right-3 text-muted-foreground hover:text-foreground"
            onClick={closeSidebar}
          >
            <X className="size-4" />
          </button>
        </aside>

        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-12 border-b border-border px-4 gap-3 bg-card">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <PriorFlowMark className="size-5 text-primary" />
            <span className="text-xs font-semibold tracking-wider font-['Inter',sans-serif]">PriorFlow</span>
          </div>
        </header>

        {/* Main content */}
        <div className="col-span-1 lg:col-span-7 pt-12 lg:pt-0">
          <Outlet />
        </div>

        {/* Right Panel - Desktop only */}
        <div className="col-span-3 hidden lg:block">
          <RightPanel />
        </div>
      </div>
    </PADashboardContext.Provider>
  );
}
