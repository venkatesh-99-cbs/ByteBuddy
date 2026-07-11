import React, { useRef, useEffect } from 'react';
import {
  Check,
  ClipboardList,
  Code2,
  Database,
  FileText,
  FlaskConical,
  Globe2,
  Network,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WorkflowState, WorkflowStage } from '../../types';

interface WorkflowProgressBarProps {
  stages: any[];
  workflow: WorkflowState;
  onStageSelect: (stage: WorkflowStage) => void;
}

export const WorkflowProgressBar: React.FC<WorkflowProgressBarProps> = ({ stages, workflow, onStageSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { current_stage, completed_stages } = workflow;
  const orderedStages = stages.filter((stage) => stage.id !== 'normal').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const iconMap: Record<string, React.ElementType> = {
    planning: ClipboardList,
    architecture: Network,
    database: Database,
    api_design: Globe2,
    coding: Code2,
    inspector: ScanSearch,
    security: ShieldCheck,
    testing: FlaskConical,
    documentation: FileText,
  };

  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [current_stage]);

  return (
    <div className="border-b bg-muted/20 overflow-hidden relative">
      <div 
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar px-4 py-2 text-sm"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {orderedStages.map((stage, index) => {
          const isCompleted = completed_stages.includes(stage.id);
          const isActive = current_stage === stage.id;
          const isPast = orderedStages.findIndex(s => s.id === current_stage) > index;
          const StageIcon = iconMap[stage.id] || ClipboardList;
          
          return (
            <React.Fragment key={stage.id}>
              <button
                data-active={isActive}
                onClick={() => onStageSelect(stage.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm font-medium scale-105" 
                    : isCompleted
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                      : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="shrink-0">
                  {isCompleted && !isActive ? (
                    <Check size={14} className="stroke-[3]" />
                  ) : (
                    <StageIcon size={14} />
                  )}
                </span>
                <span className={cn("text-[13px]", !isActive && !isCompleted && "opacity-80")}>
                  {stage.label}
                </span>
              </button>
              
              {index < orderedStages.length - 1 && (
                <div className={cn(
                  "h-[2px] w-6 shrink-0 transition-colors duration-300 rounded-full",
                  isCompleted || isPast ? "bg-emerald-500/40" : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Scroll gradients */}
      <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};
