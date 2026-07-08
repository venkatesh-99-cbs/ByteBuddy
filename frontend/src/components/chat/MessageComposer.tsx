import React, { useState, useRef, useEffect } from 'react';
import { Send, Hash } from 'lucide-react';
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
    <div className="p-4 border-t bg-background">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="flex items-center gap-2 mb-2 px-1">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-medium text-primary">
                <Hash size={10} />
                {explanationMode}
             </div>
          </div>
          <div className="relative border rounded-xl bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring transition-shadow overflow-hidden">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ByteBuddy anything..."
              className="w-full resize-none bg-transparent px-4 py-4 pr-14 focus:outline-none text-sm min-h-[56px]"
              disabled={isLoading}
            />
            <div className="absolute right-3 bottom-3">
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-8 w-8 rounded-lg"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-center text-muted-foreground">
            ByteBuddy can make mistakes. Verify important information.
          </p>
        </form>
      </div>
    </div>
  );
};
