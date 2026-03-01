import { useState, useEffect } from 'react';
import { AgentRun } from '../../lib/types';
import { api } from '../../lib/api';
import { AgentActivityFeed } from '../components/AgentActivityFeed';
import { Activity, RefreshCw } from 'lucide-react';
import PageLayout from '../components/page-layout';

type TabKey = 'all' | 'running' | 'completed' | 'failed';

export function AgentActivity() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const loadRuns = async () => {
    const data = await api.getAgentRuns();
    setRuns(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRuns();
  };

  const filteredRuns: Record<TabKey, AgentRun[]> = {
    all: runs,
    running: runs.filter(r => r.status === 'running'),
    completed: runs.filter(r => r.status === 'completed'),
    failed: runs.filter(r => r.status === 'failed'),
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'ALL' },
    { key: 'running', label: 'RUNNING' },
    { key: 'completed', label: 'COMPLETED' },
    { key: 'failed', label: 'FAILED' },
  ];

  return (
    <PageLayout header={{ title: 'Agent Activity', description: 'Real-time agent runs', icon: Activity }}>
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex items-center gap-0 rounded-md overflow-hidden border border-border w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-[10px] tracking-[0.15em] font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label} ({filteredRuns[tab.key].length})
                </button>
              ))}
            </div>

            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 bg-card border border-border rounded-md text-[10px] tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>

          <AgentActivityFeed runs={filteredRuns[activeTab]} />
        </>
      )}
    </PageLayout>
  );
}
