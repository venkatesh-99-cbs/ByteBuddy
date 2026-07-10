import React, { useState, useRef, useEffect } from 'react';
import { Braces, Send } from 'lucide-react';
import { Button } from '../ui/button';

interface MessageComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  explanationMode: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ onSend, isLoading, explanationMode }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    const handler = (e: any) => {
      onSend(e.detail);
    };
    window.addEventListener('suggestion-click', handler);
    return () => window.removeEventListener('suggestion-click', handler);
  }, [onSend]);

  return (
    <div className="p-4 border-t bg-background/95 backdrop-blur">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative border rounded-lg bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring/10 focus-within:border-ring transition-shadow overflow-hidden">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ByteBuddy anything..."
              className="w-full resize-none bg-transparent px-4 pt-4 pb-14 pr-14 focus:outline-none text-sm min-h-[96px] leading-6"
              disabled={isLoading}
            />
            <div className="absolute left-3 bottom-3">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                <Braces size={12} />
                {explanationMode}
              </div>
            </div>
            <div className="absolute right-3 bottom-3">
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-md"
                aria-label="Send message"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-center text-muted-foreground">
            ByteBuddy can make mistakes. Verify important information.
          </p>
        </form>
      </div>
    </div>
  );
};
