import React from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface TopToolbarProps {
  title: string;
  onSettingsOpen: () => void;
  onSummaryGenerate: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ title, onSettingsOpen, onSummaryGenerate }) => {
  return (
    <div className="h-14 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-sm truncate max-w-[200px] md:max-w-md">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2 text-xs h-8" onClick={onSummaryGenerate}>
          <Sparkles size={14} className="text-primary" />
          Summarize
        </Button>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSettingsOpen}>
          <Settings size={16} />
        </Button>
      </div>
    </div>
  );
};
