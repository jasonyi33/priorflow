import { useState } from 'react';
import { Patient } from '../../lib/types';
import { PatientCard } from './PatientCard';
import { Search } from 'lucide-react';

interface PatientListProps {
  patients: Patient[];
  onPatientClick?: (patient: Patient) => void;
}

export function PatientList({ patients, onPatientClick }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.insuranceProvider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          placeholder="Search patients by name, member ID, or insurance..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-md text-xs tracking-wider focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
        />
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-xs tracking-wider uppercase">
          No patients found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={onPatientClick ? () => onPatientClick(patient) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
