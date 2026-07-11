import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  ClipboardList,
  Code2,
  Database,
  FileText,
  FlaskConical,
  Globe2,
  MessageCircle,
  Network,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { WorkflowStage } from '../../types';

interface WorkflowModeSelectorProps {
  stages: any[];
  currentStage: WorkflowStage;
  onSelect: (stage: WorkflowStage) => void;
  disabled?: boolean;
}

export const WorkflowModeSelector: React.FC<WorkflowModeSelectorProps> = ({ 
  stages, 
  currentStage, 
  onSelect,
  disabled 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const current = stages.find(s => s.id === currentStage) || stages[0];
  const iconMap: Record<string, React.ElementType> = {
    normal: MessageCircle,
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
  const CurrentIcon = iconMap[currentStage] || MessageCircle;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!current) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs bg-background hover:bg-muted/50 border-dashed"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <CurrentIcon size={14} />
        <span className="hidden sm:inline font-medium">{current.label}</span>
        <ChevronDown size={14} className={cn("text-muted-foreground ml-0.5 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-[260px] bg-popover rounded-xl border shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150">
          <div className="p-2 text-[11px] font-semibold text-muted-foreground uppercase bg-muted/30 border-b">
            Chat mode
          </div>
          <div className="p-1 max-h-[300px] overflow-y-auto">
            {stages.map((stage) => (
              (() => {
                const StageIcon = iconMap[stage.id] || MessageCircle;
                return (
              <button
                type="button"
                key={stage.id}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm transition-colors text-left",
                  stage.id === currentStage 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-muted text-foreground"
                )}
                onClick={() => {
                  onSelect(stage.id);
                  setIsOpen(false);
                }}
              >
                <StageIcon size={15} className="w-5 shrink-0" />
                <span className="flex-1">{stage.label}</span>
                {stage.id === currentStage && <Check size={14} className="shrink-0" />}
              </button>
                );
              })()
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
