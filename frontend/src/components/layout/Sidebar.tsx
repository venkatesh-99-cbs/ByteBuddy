import React, { useEffect, useState } from 'react';
import { Bot, MessageSquare, Pin, Plus, Search, Trash2, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import type { Conversation, Message } from '../../types';
import { cn } from '../../lib/utils';

interface SidebarProps {
  conversations: Conversation[];
  pinnedMessages: Message[];
  activeId?: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  pinnedMessages,
  activeId,
  onSelect,
  onNew,
  onDelete,
  searchQuery,
  onSearchChange,
}) => {
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [relativeTimeUpdated, setRelativeTimeUpdated] = useState(0);

  // Re-calculate relative times every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setRelativeTimeUpdated(prev => prev + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Group conversations by time when they change or time updates
  useEffect(() => {
    if (conversations.length === 0) {
      setGrouped({});
      return;
    }

    const timeCategories: Record<string, Conversation[]> = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      'Older': [],
    };

    const getTimeCategory = (lastMessageAt: string | undefined, updatedAt: string | undefined) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const timestamp = lastMessageAt || updatedAt;
      if (!timestamp) return 'Older';

      const date = new Date(timestamp);
      const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const daysAgo = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysAgo === 0) return 'Today';
      if (daysAgo === 1) return 'Yesterday';
      if (daysAgo <= 7) return 'Previous 7 Days';
      if (daysAgo <= 30) return 'Previous 30 Days';
      return 'Older';
    };

    const getRelativeTime = (timestamp: string | undefined) => {
      if (!timestamp) return 'Unknown';

      const now = new Date();
      const date = new Date(timestamp);
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.floor(seconds / 3600);
      if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
      const days = Math.floor(seconds / 86400);
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      const weeks = Math.floor(days / 7);
      if (weeks < 4) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      const months = Math.floor(days / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    };

    // Sort by last message time and group
    const sorted = [...conversations].sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.last_message_at || b.updated_at || b.created_at).getTime();
      return timeB - timeA;
    });

    sorted.forEach(conv => {
      const category = getTimeCategory(conv.last_message_at, conv.updated_at);
      timeCategories[category].push({
        ...conv,
        relative_time: getRelativeTime(conv.last_message_at || conv.updated_at),
      });
    });

    // Remove empty categories
    const filtered = Object.fromEntries(
      Object.entries(timeCategories).filter(([_, convs]) => convs.length > 0)
    );

    setGrouped(filtered);
  }, [conversations, relativeTimeUpdated]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredConversations = conversations.filter((conversation) => {
    if (!normalizedQuery) return true;
    return [conversation.title, conversation.summary]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery));
  });

  const filteredGrouped: Record<string, any[]> = {};
  Object.entries(grouped).forEach(([category, convs]) => {
    const filtered = convs.filter(conv =>
      filteredConversations.some(fc => fc.id === conv.id)
    );
    if (filtered.length > 0) {
      filteredGrouped[category] = filtered;
    }
  });

  const categoryOrder = [
    'Today',
    'Yesterday',
    'Previous 7 Days',
    'Previous 30 Days',
    'Older',
  ];

  return (
    <aside className="hidden md:flex w-[292px] h-full border-r bg-muted/45 flex-col shrink-0">
      <div className="p-4 border-b bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Bot size={19} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight">ByteBuddy</h1>
            <p className="text-xs text-muted-foreground">Developer AI workspace</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input
            placeholder="Search history"
            className="w-full h-9 bg-muted/40 border rounded-md pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Button onClick={onNew} className="w-full justify-start gap-2 mt-3" variant="default">
          <Plus size={16} />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {pinnedMessages.length > 0 && (
          <section className="mb-5">
            <h3 className="px-2 text-[11px] font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
              <Pin size={12} /> Pinned
            </h3>
            <div className="space-y-1.5">
              {pinnedMessages.map((msg) => (
                <button
                  key={msg.id}
                  className="w-full text-left px-3 py-2 rounded-md bg-background border hover:border-primary/30 hover:bg-primary/[0.03] dark:hover:bg-primary/10 transition-colors"
                  onClick={() => onSelect(msg.conversation_id)}
                >
                  <p className="text-xs font-medium text-foreground truncate">{msg.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pinned response</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="px-2 mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase">Chat history</h3>
            <span className="text-[11px] text-muted-foreground">{filteredConversations.length}</span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-3 py-8 text-center border border-dashed rounded-lg bg-background">
              <Search size={18} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No chats found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryOrder.map((category) => {
                const convs = filteredGrouped[category];
                if (!convs || convs.length === 0) return null;

                return (
                  <div key={category}>
                    <h4 className="px-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock size={11} />
                      {category}
                    </h4>
                    <div className="space-y-1.5">
                      {convs.map((conversation) => (
                        <div
                          key={conversation.id}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "group w-full text-left px-3 py-2.5 rounded-md border transition-colors",
                            activeId === conversation.id
                              ? "bg-background border-primary/25 shadow-sm"
                              : "bg-transparent border-transparent hover:bg-background hover:border-border"
                          )}
                          onClick={() => onSelect(conversation.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onSelect(conversation.id);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={cn(
                              "mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                              activeId === conversation.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              <MessageSquare size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">{conversation.title}</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(conversation.id);
                                  }}
                                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
                                  aria-label={`Delete ${conversation.title}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              {conversation.summary ? (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{conversation.summary}</p>
                              ) : (
                                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock size={11} />
                                  {conversation.relative_time || 'Unknown'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="p-4 border-t bg-background">
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Workspace</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {conversations.length} saved {conversations.length === 1 ? 'chat' : 'chats'}
          </p>
        </div>
      </div>
    </aside>
  );
};
