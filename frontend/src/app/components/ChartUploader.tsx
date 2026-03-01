import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

interface ChartUploaderProps {
  patientId: string;
  patientName: string;
  existingChartUrl?: string;
  onUploadComplete?: (chartUrl: string) => void;
}

export function ChartUploader({ 
  patientId, 
  patientName, 
  existingChartUrl,
  onUploadComplete 
}: ChartUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && !selectedFile.type.startsWith('image/')) {
        toast.error('Please select a PDF or image file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await api.uploadChart(patientId, file);
      if (result.success) {
        toast.success(`Chart uploaded successfully for ${patientName}`);
        onUploadComplete?.(result.chartUrl);
        setFile(null);
      }
    } catch (error) {
      toast.error('Failed to upload chart');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block size-2 bg-emerald-500 rounded-sm" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase">UPLOAD PATIENT CHART</span>
      </div>
      <p className="text-[11px] text-muted-foreground tracking-wider">
        Upload medical charts for {patientName}
      </p>

      {existingChartUrl && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <FileText className="size-4 text-emerald-600" />
          <span className="text-[11px] tracking-wider flex-1">Chart already uploaded</span>
          <a 
            href={existingChartUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-emerald-600 tracking-wider font-semibold hover:underline"
          >
            VIEW
          </a>
        </div>
      )}

      <div className="space-y-3">
        <div 
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-emerald-500/30 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="size-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground tracking-wider">
            Click to select a file or drag and drop
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 tracking-wider">
            PDF or image files only
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-primary/[0.03] border border-border rounded-lg">
            <FileText className="size-3.5 text-primary" />
            <span className="text-[11px] flex-1 truncate tracking-wider">{file.name}</span>
            <button
              onClick={handleClearFile}
              disabled={uploading}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full py-2.5 bg-emerald-500 text-white rounded-md text-[11px] tracking-[0.15em] font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              UPLOADING...
            </>
          ) : (
            <>
              <Upload className="size-3.5" />
              UPLOAD CHART
            </>
          )}
        </button>
      </div>
    </div>
  );
}