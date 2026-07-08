import React from 'react';
import { Plus, MessageSquare, Trash2, Pin, Search } from 'lucide-react';
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
  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 h-full border-r bg-muted/30 flex flex-col">
      <div className="p-4 flex flex-col gap-4">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <Plus size={16} />
          New Chat
        </Button>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 text-muted-foreground" size={14} />
          <input
            placeholder="Search chats..."
            className="w-full bg-background border rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {pinnedMessages.length > 0 && (
          <div className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Pin size={12} /> Pinned
            </h3>
            <div className="space-y-1">
              {pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer truncate text-muted-foreground"
                  onClick={() => onSelect(msg.conversation_id as any)}
                >
                  {msg.content.substring(0, 30)}...
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">History</h3>
        <div className="space-y-1">
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                activeId === c.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onClick={() => onSelect(c.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate text-sm">{c.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t text-xs text-muted-foreground text-center">
        ByteBuddy v1.0
      </div>
    </div>
  );
};
