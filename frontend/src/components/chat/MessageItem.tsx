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
      "py-7 px-4 md:px-8 border-b border-border/60",
      isAssistant ? "bg-muted/25" : "bg-background/80"
    )}>
      <div className="max-w-4xl mx-auto flex gap-4 md:gap-5">
        <div className="shrink-0">
          <div className={cn(
            "w-9 h-9 rounded-md flex items-center justify-center border",
            isAssistant ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground"
          )}>
            {isAssistant ? <Bot size={18} /> : <User size={18} />}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <span className="text-sm font-semibold">
                {isAssistant ? "ByteBuddy" : "You"}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={() => copyToClipboard(message.content, 'message')}
                aria-label="Copy message"
              >
                {copiedTarget === 'message' ? <Check size={14} /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copiedTarget === 'message' ? 'Copied' : 'Copy'}</span>
              </Button>
              {isAssistant && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
                  onClick={() => onRegenerate?.(message.id)}
                  disabled={!canRegenerate || isTyping || isRegenerating}
                  aria-label="Regenerate response"
                  title={canRegenerate ? 'Regenerate response' : 'Only the latest assistant response can be regenerated'}
                >
                  <RotateCcw size={14} className={cn(isRegenerating && "animate-spin")} />
                  <span className="hidden sm:inline">{isRegenerating ? 'Retrying' : 'Retry'}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => onPin(message.id, !message.is_pinned)}
                aria-label={message.is_pinned ? "Unpin message" : "Pin message"}
              >
                <Pin size={14} className={message.is_pinned ? "fill-current" : ""} />
              </Button>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none text-[15px] leading-7 prose-p:my-3 prose-li:my-1 prose-headings:tracking-normal prose-pre:p-0 prose-pre:bg-transparent">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  return !inline && match ? (
                    <div className="relative group my-4 overflow-hidden rounded-lg border bg-[#101318]">
                      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                        <span className="text-[11px] uppercase text-white/50">{match[1]}</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2 bg-white/10 text-white hover:bg-white/15"
                          onClick={() => copyToClipboard(code, 'code')}
                        >
                          {copiedTarget === 'code' ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                          {copiedTarget === 'code' ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
                        {...props}
                      >
                        {code}
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
              {displayedContent}
            </ReactMarkdown>
            {isTyping && (
              <span className="inline-block h-4 w-2 translate-y-0.5 bg-primary animate-pulse" aria-label="ByteBuddy is typing" />
            )}
          </div>

          {isAssistant && !isTyping && message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 rounded-full border-primary/20 hover:border-primary/50 bg-background"
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
