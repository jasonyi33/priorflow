import { useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  ClipboardList,
  Activity,
  Globe,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  LogOut,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../components/ui/utils';
import TVNoise from '../components/tv-noise';
import { PriorFlowLogo, PriorFlowMark } from '../components/priorflow-logo';
import { PADashboardContext, usePADashboard } from '../../lib/hooks';
import { buildLiveNotifications, getInitials, getPrimaryProvider } from '../../lib/dashboard';

const navigation = [
  { name: 'DASHBOARD', href: '/', icon: LayoutDashboard },
  { name: 'PATIENTS', href: '/patients', icon: Users },
  { name: 'ELIGIBILITY', href: '/eligibility', icon: FileCheck },
  { name: 'PA REQUESTS', href: '/pa-requests', icon: ClipboardList },
  { name: 'AGENT ACTIVITY', href: '/agent-activity', icon: Activity },
  { name: 'MOCK PORTAL', href: '/mock-portal', icon: Globe },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
}

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

function getTimezoneAbbr(): string {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' });
  const parts = formatter.formatToParts(new Date());
  const tzPart = parts.find((part) => part.type === 'timeZoneName');
  return tzPart?.value ?? 'UTC';
}

function getTypeColor(type: Notification['type']) {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
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

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardData = usePADashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/pa-requests');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        navigate('/eligibility');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const providerSummary = useMemo(
    () => getPrimaryProvider(dashboardData.patients),
    [dashboardData.patients]
  );

  const liveNotifications = useMemo(
    () => buildLiveNotifications({
      paRequests: dashboardData.paRequests,
      agentRuns: dashboardData.agentRuns,
      eligibilityResults: dashboardData.eligibilityResults,
    }),
    [dashboardData.agentRuns, dashboardData.eligibilityResults, dashboardData.paRequests]
  );

  const notifications = useMemo<Notification[]>(
    () =>
      liveNotifications
        .filter((notification) => !dismissedIds[notification.id])
        .map((notification) => ({
          ...notification,
          read: !!readIds[notification.id],
        })),
    [dismissedIds, liveNotifications, readIds]
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const displayedNotifications = showAllNotifications ? notifications : notifications.slice(0, 3);

  const closeSidebar = () => setSidebarOpen(false);
  const markAsRead = (id: string) => setReadIds((prev) => ({ ...prev, [id]: true }));
  const deleteNotification = (id: string) => setDismissedIds((prev) => ({ ...prev, [id]: true }));
  const clearAll = () => {
    const nextDismissed: Record<string, boolean> = {};
    for (const notification of liveNotifications) {
      nextDismissed[notification.id] = true;
    }
    setDismissedIds((prev) => ({ ...prev, ...nextDismissed }));
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });

  const formatDate = (date: Date) => ({
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
    restOfDate: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });

  const dateInfo = formatDate(currentTime);
  const shellTitle = providerSummary.providerName?.toUpperCase() || 'LIVE OPERATIONS';
  const shellSubtitle = providerSummary.practiceName || `${dashboardData.totalPatients} patients synced`;
  const shellInitials = getInitials(providerSummary.providerName || providerSummary.practiceName || 'PriorFlow');

  const SidebarContent = () => (
    <div className="flex h-full flex-col p-2 gap-2">
      <div className="flex items-center gap-2 px-1 pt-1 pb-1">
        <div className="flex items-center justify-center rounded-md px-1">
          <PriorFlowLogo className="h-5 w-auto" />
        </div>
        <span className="flex-1" />
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="flex items-center justify-center size-7 rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="size-3.5" />
        </button>
      </div>

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
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="size-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-1">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          QUICK ACTIONS
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => navigate('/pa-requests')}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <ClipboardList className="size-4" />
            <span className="flex-1 text-left">NEW PA REQUEST</span>
            <span className="text-[9px] text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded tracking-wider">⌘K</span>
          </button>
          <button
            onClick={() => navigate('/eligibility')}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <FileCheck className="size-4" />
            <span className="flex-1 text-left">CHECK ELIGIBILITY</span>
            <span className="text-[9px] text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded tracking-wider">⌘E</span>
          </button>
        </div>
      </div>

      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors"
        >
          <div className="relative shrink-0">
            <div className="size-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-[10px] font-bold">{shellInitials}</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-success rounded-full border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-semibold tracking-wide truncate">{shellTitle}</div>
            <div className="text-[10px] text-muted-foreground/50 truncate">{shellSubtitle}</div>
          </div>
          <ChevronRight
            className={cn(
              'size-3.5 text-muted-foreground/40 transition-transform duration-200',
              userMenuOpen && 'rotate-90'
            )}
          />
        </button>

        {userMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-border bg-card shadow-lg overflow-hidden z-10">
            <button
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <Settings className="size-3.5" />
              SETTINGS
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/signin');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] tracking-wider text-destructive/70 hover:bg-destructive/5 hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
              SIGN OUT
            </button>
          </div>
        )}
      </div>

      <div className="px-2 pb-1">
        <span className="text-[9px] text-muted-foreground/30 tracking-wider">
          PRIORFLOW v{__APP_VERSION__}
        </span>
      </div>
    </div>
  );

  const CollapsedSidebar = () => (
    <div className="flex flex-col items-center py-2 gap-1.5">
      <button
        onClick={() => setSidebarCollapsed(false)}
        title="Expand sidebar"
        className="flex items-center justify-center size-8 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors mb-1"
      >
        <PanelLeftOpen className="size-4" />
      </button>
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            title={item.name}
            className={cn(
              'flex items-center justify-center size-8 rounded-md transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <Icon className="size-4" />
          </Link>
        );
      })}
    </div>
  );

  const WidgetSection = () => (
    <div className="w-full aspect-[2] relative overflow-hidden rounded-lg border border-border bg-card">
      <TVNoise opacity={0.3} intensity={0.2} speed={40} />
      <div className="bg-accent/30 flex-1 flex flex-col justify-between relative z-20 px-3 pt-3 pb-6 h-full">
        <div className="flex justify-between items-center text-[10px] font-medium uppercase opacity-60">
          <span>{dateInfo.dayOfWeek}</span>
          <span>{dateInfo.restOfDate}</span>
        </div>
        <div className="text-center">
          <div className="text-5xl font-bold tracking-tight" suppressHydrationWarning>
            {formatTime(currentTime)}
          </div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-medium uppercase mt-3">
          <span className="opacity-50">{dashboardData.queueDepth} queued</span>
          <span className="opacity-50">
            {dashboardData.health.status === 'ok' ? 'API LIVE' : 'API OFFLINE'} · {getTimezoneAbbr()}
          </span>
        </div>
        <div
          className="absolute inset-0 -z-[1] opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
      </div>
    </div>
  );

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div
      className={cn(
        'group p-2.5 rounded-lg border transition-all duration-200 hover:shadow-sm',
        !notification.read && 'cursor-pointer',
        notification.read ? 'bg-card/50 border-border/30' : 'bg-card border-border shadow-sm'
      )}
      onClick={() => {
        if (!notification.read) {
          markAsRead(notification.id);
        }
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', getTypeColor(notification.type))} />
        <div className="flex-1 min-w-0">
          <h4 className={cn('text-sm leading-snug mb-1', !notification.read ? 'font-semibold' : 'font-medium')}>
            {notification.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
            {notification.message}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {getPriorityBadge(notification.priority)}
              <span className="text-[10px] text-muted-foreground/50">
                {formatTimestamp(notification.timestamp)}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNotification(notification.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-destructive"
            >
              clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const NotificationsSection = () => (
    <div className="flex-1 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
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
                <p className="text-sm text-muted-foreground">
                  {dashboardData.loading ? 'Loading notifications…' : 'No live events yet'}
                </p>
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

  const RightPanel = () => (
    <div className="flex flex-col h-screen sticky top-0 overflow-hidden px-3 py-sides gap-3">
      <WidgetSection />
      <NotificationsSection />
    </div>
  );

  return (
    <PADashboardContext.Provider value={dashboardData}>
      <div className="flex w-full min-h-screen">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={cn(
            'hidden lg:flex flex-col flex-none sticky top-0 h-screen bg-card border-r border-border overflow-hidden transition-[width] duration-200 ease-in-out',
            sidebarCollapsed ? 'w-14' : 'w-52'
          )}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {sidebarCollapsed ? <CollapsedSidebar /> : <SidebarContent />}
          </div>
        </aside>

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:hidden',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <SidebarContent />
          <button
            className="absolute top-4 right-3 text-muted-foreground hover:text-foreground"
            onClick={closeSidebar}
          >
            <X className="size-4" />
          </button>
        </aside>

        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-12 border-b border-border px-4 gap-3 bg-card">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <PriorFlowMark className="h-4 w-auto" />
          </div>
        </header>

        <div className="flex-1 min-w-0 pt-12 lg:pt-0">
          <Outlet />
        </div>

        <div className="hidden lg:block w-[300px] flex-none border-l border-border">
          <RightPanel />
        </div>
      </div>
    </PADashboardContext.Provider>
  );
}
