import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationService, providerService } from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { MessageItem } from './components/chat/MessageItem';
import { MessageComposer } from './components/chat/MessageComposer';
import { SettingsDrawer } from './components/chat/SettingsDrawer';
import { ApiKeyModal } from './components/chat/ApiKeyModal';
import { SummaryModal } from './components/chat/SummaryModal';
import { WorkflowProgressBar } from './components/workflow/WorkflowProgressBar';
import { WorkflowWelcome } from './components/workflow/WorkflowWelcome';
import { WorkflowRecommendation } from './components/workflow/WorkflowRecommendation';
import { InspectorView } from './components/inspector/InspectorView';
import { useWorkflow } from './hooks/useWorkflow';
import type { ConversationSettings, WorkflowStage } from './types';
import { AlertCircle, Brain, FileSearch, PenLine } from 'lucide-react';

const getErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') return undefined;
  const maybeAxiosError = error as { response?: { data?: { error?: string } }; message?: string };
  return maybeAxiosError.response?.data?.error || maybeAxiosError.message;
};

function App() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [summaryText, setSummaryText] = useState('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isApiKeyPromptOpen, setIsApiKeyPromptOpen] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();
  const [apiKeyPromptSkipped, setApiKeyPromptSkipped] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('bytebuddy-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const { stages, workflow, isWorkflowLoading, updateState } = useWorkflow(activeId);

  // Queries
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationService.getAll
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => activeId ? conversationService.getMessages(activeId) : Promise.resolve([]),
    enabled: !!activeId
  });

  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ['pinned-messages'],
    queryFn: conversationService.getPinned
  });

  const { data: settings } = useQuery({
    queryKey: ['settings', activeId],
    queryFn: () => activeId ? conversationService.getSettings(activeId) : Promise.resolve(null),
    enabled: !!activeId
  });

  const {
    data: ollamaModels = [],
    error: ollamaModelsError,
    isFetching: isFetchingOllamaModels,
    refetch: refetchOllamaModels,
  } = useQuery({
    queryKey: ['models', 'ollama'],
    queryFn: () => providerService.listModels('ollama'),
    retry: 0,
  });

  const { data: openRouterKeyStatus } = useQuery({
    queryKey: ['providers', 'openrouter', 'key-status'],
    queryFn: providerService.getOpenRouterKeyStatus,
    retry: 0,
  });

  const {
    data: openRouterModels = [],
    error: openRouterModelsError,
    isFetching: isFetchingOpenRouterModels,
    refetch: refetchOpenRouterModels,
  } = useQuery({
    queryKey: ['models', 'openrouter'],
    queryFn: () => providerService.listModels('openrouter'),
    retry: 0,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (workflow_stage?: string) => conversationService.create(undefined, workflow_stage),
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveId(newConv.id);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: conversationService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (conversations.length > 1) {
          setActiveId(conversations[0].id === activeId ? conversations[1].id : conversations[0].id);
      } else {
          setActiveId(undefined);
      }
    }
  });

  const messageMutation = useMutation({
    mutationFn: ({ id, content, files }: { id: number, content: string, files?: File[] }) => conversationService.sendMessage(id, content, files),
    onSuccess: (assistantMessage) => {
      setTypingMessageId(assistantMessage.id);
      queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const regenerateMutation = useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: number, messageId: number }) =>
      conversationService.regenerateMessage(conversationId, messageId),
    onSuccess: (assistantMessage) => {
      setTypingMessageId(assistantMessage.id);
      queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['pinned-messages'] });
    }
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pin }: { id: number, pin: boolean }) => conversationService.pinMessage(id, pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
      queryClient.invalidateQueries({ queryKey: ['pinned-messages'] });
    }
  });

  const settingsMutation = useMutation({
    mutationFn: (newSettings: Partial<ConversationSettings>) => conversationService.updateSettings(activeId!, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', activeId] });
    }
  });

  const summaryMutation = useMutation({
    mutationFn: () => conversationService.generateSummary(activeId!),
    onSuccess: (data) => {
      setSummaryText(data.summary);
      setIsSummaryOpen(true);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const saveOpenRouterKeyMutation = useMutation({
    mutationFn: providerService.saveOpenRouterKey,
    onMutate: () => setApiKeyError(undefined),
    onSuccess: () => {
      setIsApiKeyPromptOpen(false);
      setApiKeyPromptSkipped(false);
      queryClient.invalidateQueries({ queryKey: ['providers', 'openrouter', 'key-status'] });
      queryClient.invalidateQueries({ queryKey: ['models', 'openrouter'] });
    },
    onError: (error) => {
      setApiKeyError(getErrorMessage(error) || 'Failed to save API key.');
    }
  });

  // Handlers
  const handleSendMessage = (content: string, files?: File[]) => {
    if (activeId) {
      messageMutation.mutate({ id: activeId, content, files });
    }
  };

  const handleStageSelect = (stage: WorkflowStage) => {
    if (activeId) {
      updateState({ current_stage: stage });
    } else {
      createMutation.mutate(stage);
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      setRecommendation(e.detail);
    };
    window.addEventListener('workflow-stage-completed', handler);
    return () => window.removeEventListener('workflow-stage-completed', handler);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messageMutation.isPending]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('bytebuddy-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (openRouterKeyStatus && !openRouterKeyStatus.configured && !apiKeyPromptSkipped) {
      setIsApiKeyPromptOpen(true);
    }
  }, [openRouterKeyStatus, apiKeyPromptSkipped]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const activeProviderHealthy = useMemo(() => {
    if (!settings) return true;
    if (settings.provider === 'ollama') return !ollamaModelsError && ollamaModels.length > 0;
    if (settings.provider === 'openrouter') return !openRouterModelsError;
    return true;
  }, [settings, ollamaModelsError, ollamaModels.length, openRouterModelsError]);

  const activeProviderError =
    settings?.provider === 'ollama'
      ? getErrorMessage(ollamaModelsError)
      : getErrorMessage(openRouterModelsError);
  
  const latestAssistantMessageId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;
  const isSendingInActiveChat = messageMutation.isPending && messageMutation.variables?.id === activeId;
  const isRegeneratingInActiveChat = regenerateMutation.isPending && regenerateMutation.variables?.conversationId === activeId;
  const activeGenerationError =
    (messageMutation.variables?.id === activeId ? messageMutation.error : null) ||
    (regenerateMutation.variables?.conversationId === activeId ? regenerateMutation.error : null);
  const isGenerating = isSendingInActiveChat || isRegeneratingInActiveChat;
  const currentStageLabel = stages.find((stage) => stage.id === workflow?.current_stage)?.label || 'Normal Chat';

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <Sidebar
        conversations={conversations}
        pinnedMessages={pinnedMessages}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={() => setActiveId(undefined)}
        onDelete={(id) => deleteMutation.mutate(id)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        {activeProviderError && activeId && (
          <div className="border-b bg-amber-50 px-4 md:px-6 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Provider connection needs attention</p>
              <p className="text-xs opacity-80 mt-0.5">{activeProviderError}</p>
            </div>
          </div>
        )}

        {activeGenerationError && (
          <div className="border-b bg-destructive/10 px-4 md:px-6 py-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Response failed</p>
              <p className="text-xs opacity-80 mt-0.5">{getErrorMessage(activeGenerationError) || 'Please check your provider settings and try again.'}</p>
            </div>
          </div>
        )}

        {activeId && workflow && !isWorkflowLoading && workflow.current_stage !== 'normal' && (
          <WorkflowProgressBar 
            stages={stages} 
            workflow={workflow} 
            onStageSelect={handleStageSelect} 
          />
        )}

        {activeId && workflow?.current_stage === 'inspector' ? (
          <InspectorView 
            conversationId={activeId} 
            provider={settings?.model || 'AI Model'} 
            messages={messages}
            isGenerating={isGenerating}
            typingMessageId={typingMessageId}
            latestAssistantMessageId={latestAssistantMessageId}
            regenerateMessageId={regenerateMutation.variables?.messageId}
            onSendMessage={handleSendMessage}
            onPinMessage={(id, pin) => pinMutation.mutate({ id, pin })}
            onRegenerateMessage={(messageId) => regenerateMutation.mutate({ conversationId: activeId, messageId })}
            onTypingProgress={scrollToBottom}
            onTypingComplete={(messageId) => setTypingMessageId((current) => current === messageId ? null : current)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.42)_100%)]" ref={scrollRef}>
            {activeId ? (
              <div className="flex flex-col min-h-full">
                {recommendation && (
                  <WorkflowRecommendation 
                    recommendation={recommendation}
                    onContinue={() => {
                      updateState({ current_stage: recommendation.stage });
                      setRecommendation(null);
                    }}
                    onDismiss={() => setRecommendation(null)}
                  />
                )}
              
                {messages.filter(m => !workflow || !m.workflow_stage || m.workflow_stage === workflow.current_stage).map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    onPin={(id, pin) => pinMutation.mutate({ id, pin })}
                    onRegenerate={(messageId) => activeId && regenerateMutation.mutate({ conversationId: activeId, messageId })}
                    canRegenerate={
                      msg.id === latestAssistantMessageId &&
                      !messageMutation.isPending &&
                      !regenerateMutation.isPending
                    }
                    isRegenerating={isRegeneratingInActiveChat && regenerateMutation.variables?.messageId === msg.id}
                    animateTyping={msg.id === typingMessageId && msg.role === 'assistant'}
                    onTypingProgress={scrollToBottom}
                    onTypingComplete={() => setTypingMessageId((current) => current === msg.id ? null : current)}
                  />
                ))}

                {isGenerating && (
                  <div className="py-6 px-4 md:px-8 flex justify-start">
                    <div className="flex max-w-[85%] md:max-w-[75%] gap-3 flex-row">
                      <div className="shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center">
                          <Brain size={16} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0 items-start">
                        <div className="relative group rounded-2xl px-5 py-4 shadow-sm overflow-hidden bg-card border rounded-tl-sm w-[280px]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">ByteBuddy is working</p>
                            <span className="text-[11px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
                              {currentStageLabel}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <FileSearch size={13} className="text-primary" />
                              Reading context and recent messages
                            </div>
                            <div className="flex items-center gap-2">
                              <Brain size={13} className="text-primary animate-pulse" />
                              Reasoning through the best response
                            </div>
                            <div className="flex items-center gap-2">
                              <PenLine size={13} className="text-primary" />
                              Preparing a structured answer
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <WorkflowWelcome 
                stages={stages} 
                onSelectStage={handleStageSelect} 
              />
            )}
          </div>
        )}

        {activeId && workflow?.current_stage !== 'inspector' && (
          <MessageComposer
            onSend={handleSendMessage}
            isLoading={isGenerating}
            currentStage={workflow?.current_stage}
            stages={stages}
            onStageSelect={handleStageSelect}
            settings={settings}
            onSettingsUpdate={(s) => settingsMutation.mutate(s)}
            ollamaModels={ollamaModels}
            openRouterModels={openRouterModels}
            providerHealthy={activeProviderHealthy}
            openRouterKeyConfigured={!!openRouterKeyStatus?.configured}
            onOpenApiKeyPrompt={() => setIsApiKeyPromptOpen(true)}
            onSettingsOpen={() => setIsSettingsOpen(true)}
            onSummaryGenerate={() => summaryMutation.mutate()}
            canSummarize={!!activeId && messages.length > 0 && !summaryMutation.isPending}
            theme={theme}
            onThemeToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          />
        )}

        {settings && (
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onUpdate={(s) => settingsMutation.mutate(s)}
            ollamaModels={ollamaModels}
            openRouterModels={openRouterModels}
            ollamaError={getErrorMessage(ollamaModelsError)}
            openRouterError={getErrorMessage(openRouterModelsError)}
            isRefreshingModels={isFetchingOllamaModels || isFetchingOpenRouterModels}
            onRefreshModels={() => {
              refetchOllamaModels();
              refetchOpenRouterModels();
            }}
            openRouterKeyConfigured={!!openRouterKeyStatus?.configured}
            onOpenApiKeyPrompt={() => setIsApiKeyPromptOpen(true)}
          />
        )}
        <SummaryModal
          isOpen={isSummaryOpen}
          summary={summaryText}
          onClose={() => setIsSummaryOpen(false)}
        />
        <ApiKeyModal
          isOpen={isApiKeyPromptOpen}
          isSaving={saveOpenRouterKeyMutation.isPending}
          error={apiKeyError}
          canSkip
          onSkip={() => {
            setApiKeyPromptSkipped(true);
            setIsApiKeyPromptOpen(false);
          }}
          onSave={(apiKey) => saveOpenRouterKeyMutation.mutate(apiKey)}
        />
      </main>
    </div>
  );
}

export default App;
