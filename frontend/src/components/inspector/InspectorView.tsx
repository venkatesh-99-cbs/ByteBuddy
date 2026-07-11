import React, { useState } from 'react';
import { Brain, FileSearch, MessageSquare, PenLine, Send } from 'lucide-react';
import { UploadZone } from './UploadZone';
import { AnalysisPipeline } from './AnalysisPipeline';
import { AnalysisDashboard } from './AnalysisDashboard';
import { FindingsList } from './FindingsList';
import { useInspector } from '../../hooks/useInspector';
import { MessageItem } from '../chat/MessageItem';
import { Button } from '../ui/button';
import type { Message } from '../../types';

interface InspectorViewProps {
  conversationId: number;
  provider: string;
  messages: Message[];
  isGenerating: boolean;
  typingMessageId: number | null;
  latestAssistantMessageId?: number;
  regenerateMessageId?: number;
  onSendMessage: (content: string) => void;
  onPinMessage: (id: number, pin: boolean) => void;
  onRegenerateMessage: (messageId: number) => void;
  onTypingProgress: () => void;
  onTypingComplete: (messageId: number) => void;
}

export const InspectorView: React.FC<InspectorViewProps> = ({
  conversationId,
  provider,
  messages,
  isGenerating,
  typingMessageId,
  latestAssistantMessageId,
  regenerateMessageId,
  onSendMessage,
  onPinMessage,
  onRegenerateMessage,
  onTypingProgress,
  onTypingComplete,
}) => {
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
  const [question, setQuestion] = useState('');

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

  const inspectorMessages = messages.filter((message) => message.workflow_stage === 'inspector');

  const handleQuestionSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isGenerating) return;
    onSendMessage(trimmed);
    setQuestion('');
  };

  const suggestedQuestions = [
    'What should I fix first?',
    'Create a remediation plan',
    'Explain the highest risk issue',
    'Generate tests for these findings',
  ];

  const InspectorChat = () => (
    <aside className="w-full xl:w-[420px] border-t xl:border-t-0 xl:border-l bg-background flex flex-col min-h-[420px] xl:min-h-0">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <h3 className="font-semibold text-sm">Ask about this inspection</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          ByteBuddy uses this report, findings, and uploaded files as context.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {inspectorMessages.length === 0 ? (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <h4 className="text-sm font-medium">Useful follow-up tasks</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedQuestions.map((item) => (
                  <Button
                    key={item}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 text-xs rounded-full"
                    onClick={() => {
                      setQuestion('');
                      onSendMessage(item);
                    }}
                    disabled={isGenerating}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          inspectorMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onPin={onPinMessage}
              onRegenerate={onRegenerateMessage}
              canRegenerate={message.id === latestAssistantMessageId && !isGenerating}
              isRegenerating={regenerateMessageId === message.id}
              animateTyping={message.id === typingMessageId && message.role === 'assistant'}
              onTypingProgress={onTypingProgress}
              onTypingComplete={() => onTypingComplete(message.id)}
            />
          ))
        )}

        {isGenerating && (
          <div className="px-4 py-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Inspecting context</p>
                <span className="text-[11px] rounded-full bg-primary/10 text-primary px-2 py-0.5">Code Inspector</span>
              </div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileSearch size={13} className="text-primary" />
                  Reading report and findings
                </div>
                <div className="flex items-center gap-2">
                  <Brain size={13} className="text-primary animate-pulse" />
                  Prioritizing risks and next actions
                </div>
                <div className="flex items-center gap-2">
                  <PenLine size={13} className="text-primary" />
                  Drafting a practical response
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleQuestionSubmit} className="p-3 border-t bg-background">
        <div className="relative rounded-xl border bg-card focus-within:ring-2 focus-within:ring-primary/20">
          <textarea
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleQuestionSubmit();
              }
            }}
            placeholder="Ask for fixes, priorities, tests, refactors..."
            className="w-full resize-none bg-transparent px-3 py-3 pr-12 text-sm outline-none"
            disabled={isGenerating}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
            disabled={!question.trim() || isGenerating}
            aria-label="Ask inspector"
          >
            <Send size={14} />
          </Button>
        </div>
      </form>
    </aside>
  );

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
    <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden bg-muted/10">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
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
                onUpdateStatus={(id, status) => updateFinding({ findingId: id, status })}
              />
            )}
          </div>
        </div>
      </div>
      <InspectorChat />
    </div>
  );
};
