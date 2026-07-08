import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Pin, User, Bot } from 'lucide-react';
import type { Message } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface MessageItemProps {
  message: Message;
  onPin: (id: number, pin: boolean) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onPin }) => {
  const isAssistant = message.role === 'assistant';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={cn(
      "py-8 flex gap-6 px-4 md:px-8",
      isAssistant ? "bg-muted/30" : "bg-background"
    )}>
      <div className="shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center",
          isAssistant ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}>
          {isAssistant ? <Bot size={18} /> : <User size={18} />}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">
            {isAssistant ? "ByteBuddy" : "You"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => onPin(message.id, !message.is_pinned)}
            >
              <Pin size={14} className={message.is_pinned ? "fill-current" : ""} />
            </Button>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <div className="relative group my-4">
                    <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 bg-muted/80 backdrop-blur"
                        onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                      >
                        <Copy size={12} className="mr-1" /> Copy
                      </Button>
                    </div>
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg !m-0"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={cn("bg-muted px-1.5 py-0.5 rounded text-xs font-mono", className)} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {isAssistant && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-8 rounded-full border-primary/20 hover:border-primary/50"
                onClick={() => {
                   // This will be handled by the parent to send a new message
                   const event = new CustomEvent('suggestion-click', { detail: suggestion });
                   window.dispatchEvent(event);
                }}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
