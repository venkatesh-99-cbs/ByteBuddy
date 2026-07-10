import React, { useCallback, useState } from 'react';
import { UploadCloud, FileCode, FolderArchive } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface UploadZoneProps {
  onUpload: (files: FileList | null, zipFile?: File) => void;
  isUploading: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, isUploading }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      if (files.length === 1 && files[0].name.endsWith('.zip')) {
        onUpload(null, files[0]);
      } else {
        onUpload(files);
      }
    }
  }, [onUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const handleZipInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(null, e.target.files[0]);
    }
  };

  return (
    <div className="p-6">
      <div 
        className={cn(
          "w-full max-w-3xl mx-auto rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center transition-all duration-200 text-center",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.01]" 
            : "border-border bg-muted/20 hover:bg-muted/40",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
          <UploadCloud size={32} />
        </div>
        <h3 className="text-xl font-semibold mb-2">Drag & drop your codebase</h3>
        <p className="text-muted-foreground mb-8 max-w-md">
          Upload individual files, multiple files, or a ZIP archive containing your project. Maximum file size per file is 500KB.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <input 
              type="file" 
              multiple 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleFileInput}
              disabled={isUploading}
            />
            <Button variant="outline" className="w-full gap-2 bg-background pointer-events-none">
              <FileCode size={16} />
              Select Files
            </Button>
          </div>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".zip,application/zip" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleZipInput}
              disabled={isUploading}
            />
            <Button variant="default" className="w-full gap-2 pointer-events-none">
              <FolderArchive size={16} />
              Upload ZIP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
