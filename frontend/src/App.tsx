import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationService, providerService } from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { TopToolbar } from './components/layout/TopToolbar';
import { MessageItem } from './components/chat/MessageItem';
import { MessageComposer } from './components/chat/MessageComposer';
import { SettingsDrawer } from './components/chat/SettingsDrawer';
import type { ConversationSettings } from './types';
import { Loader2, PlusCircle, Bot } from 'lucide-react';
import { Button } from './components/ui/button';

function App() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const { data: ollamaModels = [] } = useQuery({
    queryKey: ['models', 'ollama'],
    queryFn: () => providerService.listModels('ollama')
  });

  const { data: openRouterModels = [] } = useQuery({
    queryKey: ['models', 'openrouter'],
    queryFn: () => providerService.listModels('openrouter')
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
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

  const activeConversation = conversations.find(c => c.id === activeId);

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
          onSettingsOpen={() => setIsSettingsOpen(true)}
          onSummaryGenerate={() => summaryMutation.mutate()}
        />

        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          {activeId ? (
            <div className="flex flex-col">
              {messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onPin={(id, pin) => pinMutation.mutate({ id, pin })}
                />
              ))}

              {messageMutation.isPending && (
                <div className="py-8 flex gap-6 px-4 md:px-8 bg-muted/30">
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              )}

              {activeConversation?.summary && (
                <div className="m-8 p-4 bg-primary/5 border border-primary/10 rounded-lg">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Conversation Summary</h4>
                  <p className="text-sm text-muted-foreground italic">"{activeConversation.summary}"</p>
                </div>
              )}

              {messages.length === 0 && !messageMutation.isPending && (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[60vh]">
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 text-primary">
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
               <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mb-6 text-primary-foreground shadow-xl">
                    <Bot size={40} />
               </div>
               <h2 className="text-3xl font-bold tracking-tight">Welcome to ByteBuddy</h2>
               <p className="text-muted-foreground max-w-md mt-4">
                  Your intelligent developer companion for building, learning, and debugging smarter.
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
            isLoading={messageMutation.isPending}
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
          />
        )}
      </main>
    </div>
  );
}

export default App;
