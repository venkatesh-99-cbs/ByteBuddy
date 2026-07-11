import React, { useState } from 'react';
import { Check, Copy, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';

interface SummaryModalProps {
  summary?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ summary, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !summary) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-background shadow-2xl overflow-hidden">
        <div className="p-5 border-b flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Conversation summary</h2>
              <p className="text-xs text-muted-foreground mt-1">Generated from the current chat context.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close summary">
            <X size={18} />
          </Button>
        </div>
        <div className="p-5">
          <div className="max-h-[45vh] overflow-y-auto rounded-xl border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {summary}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
