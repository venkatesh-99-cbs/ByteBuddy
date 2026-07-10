import React from 'react';
import { Moon, Settings, Sparkles, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import type { ConversationSettings, WorkflowStage } from '../../types';
import { cn } from '../../lib/utils';
import { WorkflowModeSelector } from '../workflow/WorkflowModeSelector';

interface TopToolbarProps {
  title: string;
  settings?: ConversationSettings | null;
  providerHealthy?: boolean;
  onSettingsOpen: () => void;
  onSummaryGenerate: () => void;
  canSummarize: boolean;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  stages?: any[];
  currentStage?: WorkflowStage;
  onStageSelect?: (stage: WorkflowStage) => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  title,
  settings,
  providerHealthy = true,
  onSettingsOpen,
  onSummaryGenerate,
  canSummarize,
  theme,
  onThemeToggle,
  stages,
  currentStage,
  onStageSelect,
}) => {
  const modelLabel = settings?.model || 'Auto model';

  return (
    <div className="h-16 border-b bg-background/90 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="min-w-0">
        <h2 className="font-semibold text-sm md:text-base truncate max-w-[220px] md:max-w-xl">{title}</h2>
        {settings && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn(
              "h-2 w-2 rounded-full",
              providerHealthy ? "bg-emerald-500" : "bg-amber-500"
            )} />
            <span className="capitalize">{settings.provider}</span>
            <span>/</span>
            <span className="truncate max-w-[160px] md:max-w-xs">{modelLabel}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {stages && currentStage && onStageSelect && (
          <>
            <WorkflowModeSelector 
              stages={stages} 
              currentStage={currentStage} 
              onSelect={onStageSelect} 
            />
            <div className="w-[1px] h-4 bg-border mx-1" />
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs h-8"
          onClick={onSummaryGenerate}
          disabled={!canSummarize}
        >
          <Sparkles size={14} className="text-primary" />
          <span className="hidden sm:inline">Summarize</span>
        </Button>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onThemeToggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSettingsOpen} aria-label="Open settings">
          <Settings size={16} />
        </Button>
      </div>
    </div>
  );
};
