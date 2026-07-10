import React, { useState } from 'react';
import { UploadZone } from './UploadZone';
import { AnalysisPipeline } from './AnalysisPipeline';
import { AnalysisDashboard } from './AnalysisDashboard';
import { FindingsList } from './FindingsList';
import { useInspector } from '../../hooks/useInspector';

interface InspectorViewProps {
  conversationId: number;
  provider: string;
}

export const InspectorView: React.FC<InspectorViewProps> = ({ conversationId, provider }) => {
  const { 
    report, 
    uploadFiles, 
    isUploading, 
    analyze, 
    isAnalyzing, 
    generateFix, 
    updateFinding 
  } = useInspector(conversationId);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'findings'>('dashboard');

  const handleUpload = async (files: FileList | null, zipFile?: File) => {
    const formData = new FormData();
    if (zipFile) {
      formData.append('zip', zipFile);
    } else if (files) {
      Array.from(files).forEach(f => formData.append('files', f));
    }
    
    await uploadFiles(formData);
    await analyze();
  };

  // 1. Initial State - No report or pending report
  if (!report || report.status === 'pending') {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Code Inspector</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Upload your codebase for a comprehensive AI-powered analysis of bugs, security vulnerabilities, performance, and best practices.
            </p>
          </div>
          <UploadZone onUpload={handleUpload} isUploading={isUploading} />
        </div>
      </div>
    );
  }

  // 2. Analyzing State
  if (report.status === 'analyzing' || isAnalyzing) {
    return (
      <div className="flex-1 overflow-y-auto bg-background/50">
        <AnalysisPipeline filesCount={report.files_scanned || 1} provider={provider} />
      </div>
    );
  }

  // 3. Completed State
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/10">
      <div className="border-b bg-background px-6 pt-4">
        <h2 className="text-xl font-bold mb-4">Inspection Results</h2>
        <div className="flex gap-6 border-b border-transparent">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('findings')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'findings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All Findings 
            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px]">
              {report.findings?.length || 0}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' ? (
            <AnalysisDashboard report={report} />
          ) : (
            <FindingsList 
              findings={report.findings || []} 
              onGenerateFix={generateFix}
              onUpdateStatus={updateFinding}
            />
          )}
        </div>
      </div>
    </div>
  );
};
