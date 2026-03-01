import { useState, useEffect } from 'react';
import { PARequest } from '../../lib/types';
import { api } from '../../lib/api';
import { PARequestCard } from '../components/PARequestCard';
import { StatusTimeline } from '../components/StatusTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ClipboardList } from 'lucide-react';
import PageLayout from '../components/page-layout';

type TabKey = 'all' | 'pending' | 'approved' | 'denied' | 'info_needed';

export function PARequests() {
  const [requests, setRequests] = useState<PARequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PARequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  useEffect(() => {
    api.getPARequests().then((data) => {
      setRequests(data);
      setLoading(false);
    });
  }, []);

  const handleRequestClick = (request: PARequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const filteredRequests: Record<TabKey, PARequest[]> = {
    all: requests,
    pending: requests.filter(r => ['pending', 'checking_eligibility', 'generating_request', 'submitting'].includes(r.status)),
    approved: requests.filter(r => r.status === 'approved'),
    denied: requests.filter(r => r.status === 'denied'),
    info_needed: requests.filter(r => r.status === 'more_info_needed'),
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'ALL' },
    { key: 'pending', label: 'PENDING' },
    { key: 'approved', label: 'APPROVED' },
    { key: 'denied', label: 'DENIED' },
    { key: 'info_needed', label: 'INFO NEEDED' },
  ];

  const items = filteredRequests[activeTab];

  return (
    <PageLayout header={{ title: 'PA Requests', description: 'Track authorization requests', icon: ClipboardList }}>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
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
                {tab.label} ({filteredRequests[tab.key].length})
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs tracking-wider">
              NO REQUESTS IN THIS CATEGORY
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((request) => (
                <PARequestCard
                  key={request.id}
                  request={request}
                  onClick={() => handleRequestClick(request)}
                />
              ))}
            </div>
          )}

          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="tracking-wider">PA Request Details</DialogTitle>
              </DialogHeader>
              {selectedRequest && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block size-1.5 bg-primary rounded-sm rotate-45" />
                      <span className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">PATIENT INFORMATION</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground text-[10px] tracking-wider uppercase">Patient:</span>
                        <p className="font-semibold tracking-wider">{selectedRequest.patientName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] tracking-wider uppercase">Procedure:</span>
                        <p className="font-semibold tracking-wider">{selectedRequest.procedureName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] tracking-wider uppercase">Code:</span>
                        <p className="font-semibold tracking-wider">{selectedRequest.procedureCode}</p>
                      </div>
                      {selectedRequest.approvalCode && (
                        <div>
                          <span className="text-muted-foreground text-[10px] tracking-wider uppercase">Auth Code:</span>
                          <p className="font-semibold text-success tracking-wider">{selectedRequest.approvalCode}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-block size-1.5 bg-primary rounded-sm rotate-45" />
                      <span className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">STATUS TIMELINE</span>
                    </div>
                    <StatusTimeline request={selectedRequest} />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </PageLayout>
  );
}
