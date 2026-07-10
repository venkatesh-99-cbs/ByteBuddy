import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationService, providerService } from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { TopToolbar } from './components/layout/TopToolbar';
import { MessageItem } from './components/chat/MessageItem';
import { MessageComposer } from './components/chat/MessageComposer';
import { SettingsDrawer } from './components/chat/SettingsDrawer';
import type { ConversationSettings } from './types';
import { AlertCircle, Code2, Loader2, PlusCircle } from 'lucide-react';
import { Button } from './components/ui/button';

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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('bytebuddy-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const scrollRef = useRef<HTMLDivElement>(null);

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
    mutationFn: conversationService.create,
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
    mutationFn: ({ id, content }: { id: number, content: string }) => conversationService.sendMessage(id, content),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Handlers
  const handleSendMessage = (content: string) => {
    if (activeId) {
      messageMutation.mutate({ id: activeId, content });
    } else {
      createMutation.mutate(undefined, {
        onSuccess: (newConv) => {
          messageMutation.mutate({ id: newConv.id, content });
        }
      });
    }
  };

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
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  const activeConversation = conversations.find(c => c.id === activeId);
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
  const activeGenerationError = messageMutation.error || regenerateMutation.error;
  const isGenerating = messageMutation.isPending || regenerateMutation.isPending;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        conversations={conversations}
        pinnedMessages={pinnedMessages}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={() => createMutation.mutate(undefined)}
        onDelete={(id) => deleteMutation.mutate(id)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <TopToolbar
          title={activeConversation?.title || "ByteBuddy Chat"}
          settings={settings}
          providerHealthy={activeProviderHealthy}
          onSettingsOpen={() => setIsSettingsOpen(true)}
          onSummaryGenerate={() => summaryMutation.mutate()}
          canSummarize={!!activeId && messages.length > 0 && !summaryMutation.isPending}
          theme={theme}
          onThemeToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        />

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

        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.42)_100%)]" ref={scrollRef}>
          {activeId ? (
            <div className="flex flex-col min-h-full">
              {messages.map((msg) => (
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
                  isRegenerating={regenerateMutation.isPending && regenerateMutation.variables?.messageId === msg.id}
                  animateTyping={msg.id === typingMessageId && msg.role === 'assistant'}
                  onTypingProgress={scrollToBottom}
                  onTypingComplete={() => setTypingMessageId((current) => current === msg.id ? null : current)}
                />
              ))}

              {isGenerating && (
                <div className="py-8 px-4 md:px-8 bg-muted/30">
                  <div className="max-w-4xl mx-auto flex gap-4 md:gap-5">
                    <div className="shrink-0">
                      <div className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                      <Loader2 size={18} className="animate-spin" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-2 bg-muted rounded w-3/4 animate-pulse" />
                      <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {activeConversation?.summary && (
                <div className="mx-4 md:mx-8 my-6 max-w-4xl md:self-center md:w-full p-4 bg-background border rounded-lg shadow-sm">
                  <h4 className="text-xs font-semibold uppercase text-primary mb-2">Conversation summary</h4>
                  <p className="text-sm text-muted-foreground italic">"{activeConversation.summary}"</p>
                </div>
              )}

              {messages.length === 0 && !messageMutation.isPending && (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 border flex items-center justify-center mb-4 text-primary">
                        <PlusCircle size={32} />
                    </div>
                    <h3 className="text-lg font-semibold">Start a new conversation</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                        ByteBuddy is ready to help with your code. Ask a question or share a snippet to begin.
                    </p>
                 </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
               <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6 text-primary-foreground shadow-xl">
                    <Code2 size={40} />
               </div>
               <h2 className="text-3xl font-bold tracking-tight">Welcome to ByteBuddy</h2>
               <p className="text-muted-foreground max-w-md mt-4">
                  A focused AI workspace for code questions, debugging, architecture notes, and saved chat history.
               </p>
               <Button className="mt-8 gap-2" size="lg" onClick={() => createMutation.mutate(undefined)}>
                  <PlusCircle size={18} />
                  New Conversation
               </Button>
            </div>
          )}
        </div>

        {activeId && (
          <MessageComposer
            onSend={handleSendMessage}
            isLoading={isGenerating}
            explanationMode={settings?.explanation_mode || 'Junior Developer'}
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
          />
        )}
      </main>
    </div>
  );
}

export default App;
