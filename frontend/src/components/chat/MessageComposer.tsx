import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import type { WorkflowStage } from '../../types';

interface MessageComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  currentStage?: WorkflowStage;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ onSend, isLoading, currentStage = 'planning' }) => {
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

  const placeholder = currentStage === 'planning' ? "Describe your software project idea..." : 
                      currentStage === 'coding' ? "Ask for a specific feature implementation..." :
                      currentStage === 'inspector' ? "Upload or paste code to inspect..." :
                      "Ask ByteBuddy anything...";

  return (
    <div className="p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative border rounded-2xl bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-14 pr-14 focus:outline-none text-[15px] min-h-[96px] leading-relaxed"
              disabled={isLoading}
            />
            <div className="absolute left-3 bottom-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-[11px] font-semibold tracking-wide text-primary uppercase">
                <Zap size={12} className="fill-current" />
                {currentStage.replace('_', ' ')} mode
              </div>
            </div>
            <div className="absolute right-3 bottom-3">
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
                aria-label="Send message"
              >
                <Send size={16} className="ml-0.5" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
