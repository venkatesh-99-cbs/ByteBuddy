import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, Check, Copy, Pin, RotateCcw, User } from 'lucide-react';
import type { Message } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface MessageItemProps {
  message: Message;
  onPin: (id: number, pin: boolean) => void;
  onRegenerate?: (id: number) => void;
  canRegenerate?: boolean;
  isRegenerating?: boolean;
  animateTyping?: boolean;
  onTypingProgress?: () => void;
  onTypingComplete?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onPin,
  onRegenerate,
  canRegenerate = false,
  isRegenerating = false,
  animateTyping = false,
  onTypingProgress,
  onTypingComplete,
}) => {
  const isAssistant = message.role === 'assistant';
  const [displayedContent, setDisplayedContent] = useState(message.content);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<'message' | 'code' | null>(null);
  const typingProgressRef = useRef(onTypingProgress);
  const typingCompleteRef = useRef(onTypingComplete);

  useEffect(() => {
    typingProgressRef.current = onTypingProgress;
    typingCompleteRef.current = onTypingComplete;
  }, [onTypingProgress, onTypingComplete]);

  useEffect(() => {
    if (!animateTyping || !isAssistant) {
      setDisplayedContent(message.content);
      setIsTyping(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedContent(message.content);
      setIsTyping(false);
      typingCompleteRef.current?.();
      return;
    }

    let index = 0;
    const chunkSize = Math.max(1, Math.ceil(message.content.length / 220));
    setDisplayedContent('');
    setIsTyping(true);

    const timer = window.setInterval(() => {
      index = Math.min(message.content.length, index + chunkSize);
      setDisplayedContent(message.content.slice(0, index));
      typingProgressRef.current?.();

      if (index >= message.content.length) {
        window.clearInterval(timer);
        setIsTyping(false);
        typingCompleteRef.current?.();
      }
    }, 16);

    return () => window.clearInterval(timer);
  }, [animateTyping, isAssistant, message.content, message.id]);

  const copyToClipboard = async (text: string, target: 'message' | 'code') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 1400);
    } catch {
      setCopiedTarget(null);
    }
  };

  return (
    <div className={cn(
      "py-6 px-4 md:px-8 flex",
      !isAssistant ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[94%] md:max-w-[86%] xl:max-w-[78%] gap-3",
        !isAssistant ? "flex-row-reverse" : "flex-row"
      )}>
        <div className="shrink-0 mt-1">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isAssistant ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
          )}>
            {isAssistant ? <Bot size={16} /> : <User size={16} />}
          </div>
        </div>

        <div className={cn(
          "group/message flex flex-col gap-1.5 min-w-0",
          !isAssistant ? "items-end" : "items-start"
        )}>
          <div className={cn(
            "flex items-center gap-2 text-[11px] text-muted-foreground px-1",
            !isAssistant ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="font-medium text-foreground/80">{isAssistant ? 'ByteBuddy' : 'You'}</span>
            <span>{new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}</span>
            {isAssistant && message.workflow_stage && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-semibold text-[9px] tracking-wider">
                {message.workflow_stage.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className={cn(
            "relative rounded-2xl px-5 py-3.5 shadow-sm overflow-hidden",
            !isAssistant 
              ? "bg-primary text-primary-foreground rounded-tr-sm" 
              : "bg-card border rounded-tl-sm text-card-foreground"
          )}>
            <div className={cn(
              "prose max-w-none text-[14.5px] leading-relaxed break-words prose-headings:tracking-tight prose-li:my-0.5",
              !isAssistant ? "prose-invert text-primary-foreground/95 prose-p:my-1" : "prose-slate dark:prose-invert prose-p:my-2 prose-pre:p-0 prose-pre:bg-transparent prose-strong:text-foreground"
            )}>
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const code = String(children).replace(/\n$/, '');
                    return !inline && match ? (
                      <div className="relative group my-4 overflow-hidden rounded-lg border bg-[#101318]">
                        <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                          <span className="text-[10px] uppercase font-medium text-white/50">{match[1]}</span>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-white/10 text-white hover:bg-white/20"
                            onClick={() => copyToClipboard(code, 'code')}
                          >
                            {copiedTarget === 'code' ? <Check size={10} className="mr-1" /> : <Copy size={10} className="mr-1" />}
                            {copiedTarget === 'code' ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '12px 16px', borderRadius: 0, background: 'transparent', fontSize: '13px' }}
                          {...props}
                        >
                          {code}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={cn("px-1.5 py-0.5 rounded-md text-[13px] font-mono", !isAssistant ? "bg-primary-foreground/20" : "bg-muted")} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {displayedContent}
              </ReactMarkdown>
              {isTyping && (
                <span className="inline-block h-3 w-1.5 ml-1 translate-y-0.5 bg-current animate-pulse opacity-70" />
              )}
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-1 px-1 opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100 transition-opacity",
            !isAssistant ? "justify-end" : "justify-start",
            message.is_pinned && "sm:opacity-100"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 rounded-md text-[11px] gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(message.content, 'message')}
              title="Copy message"
            >
              {copiedTarget === 'message' ? <Check size={12} /> : <Copy size={12} />}
              {copiedTarget === 'message' ? 'Copied' : 'Copy'}
            </Button>
            {isAssistant && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 rounded-md text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => onRegenerate?.(message.id)}
                disabled={!canRegenerate || isTyping || isRegenerating}
                title="Retry response"
              >
                <RotateCcw size={12} className={cn(isRegenerating && "animate-spin")} />
                Retry
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 rounded-md text-[11px] gap-1 text-muted-foreground hover:text-foreground",
                message.is_pinned && "text-primary"
              )}
              onClick={() => onPin(message.id, !message.is_pinned)}
              title={message.is_pinned ? 'Unpin message' : 'Pin message'}
            >
              <Pin size={12} className={message.is_pinned ? "fill-current" : ""} />
              {message.is_pinned ? 'Pinned' : 'Pin'}
            </Button>
          </div>

          {isAssistant && !isTyping && message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 max-w-full">
              {message.suggestions.map((suggestion, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 px-3 rounded-full border-border hover:bg-muted/50 bg-background text-muted-foreground whitespace-normal text-left max-w-full h-auto py-1.5"
                  onClick={() => {
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
    </div>
  );
};
