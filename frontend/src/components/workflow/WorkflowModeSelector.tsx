import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs bg-background hover:bg-muted/50 border-dashed"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{current.icon}</span>
        <span className="hidden sm:inline font-medium">{current.label}</span>
        <ChevronDown size={14} className="text-muted-foreground ml-0.5" />
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 sm:left-0 sm:right-auto w-[240px] bg-popover rounded-md border shadow-md z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 text-[11px] font-semibold text-muted-foreground uppercase bg-muted/30 border-b">
            Workflow Stage
          </div>
          <div className="p-1 max-h-[300px] overflow-y-auto">
            {stages.map((stage) => (
              <button
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
                <span className="w-5 text-center">{stage.icon}</span>
                <span className="flex-1">{stage.label}</span>
                {stage.id === currentStage && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
