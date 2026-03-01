import { useState, useEffect } from 'react';
import { Patient } from '../../lib/types';
import { api } from '../../lib/api';
import { PatientList } from '../components/PatientList';
import { ChartUploader } from '../components/ChartUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Users } from 'lucide-react';
import PageLayout from '../components/page-layout';

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [uploaderOpen, setUploaderOpen] = useState(false);

  useEffect(() => {
    api.getPatients().then((data) => {
      setPatients(data);
      setLoading(false);
    });
  }, []);

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setUploaderOpen(true);
  };

  const handleUploadComplete = (chartUrl: string) => {
    if (selectedPatient) {
      setPatients(prev => 
        prev.map(p => p.id === selectedPatient.id ? { ...p, chartUrl } : p)
      );
      setSelectedPatient({ ...selectedPatient, chartUrl });
    }
    setUploaderOpen(false);
  };

  return (
    <PageLayout header={{ title: 'Patients', description: 'Manage patient records', icon: Users }}>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <PatientList patients={patients} onPatientClick={handlePatientClick} />
          <Dialog open={uploaderOpen} onOpenChange={setUploaderOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="tracking-wider">Upload Chart</DialogTitle>
              </DialogHeader>
              {selectedPatient && (
                <ChartUploader
                  patientId={selectedPatient.id}
                  patientName={selectedPatient.name}
                  existingChartUrl={selectedPatient.chartUrl}
                  onUploadComplete={handleUploadComplete}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </PageLayout>
  );
}
