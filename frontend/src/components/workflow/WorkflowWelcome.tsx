import React from 'react';
import { Play } from 'lucide-react';
import { Button } from '../ui/button';
import type { WorkflowStage } from '../../types';

interface WorkflowWelcomeProps {
  stages: any[];
  onSelectStage: (stage: WorkflowStage) => void;
}

export const WorkflowWelcome: React.FC<WorkflowWelcomeProps> = ({ stages, onSelectStage }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 text-primary-foreground shadow-xl shadow-primary/20 rotate-3 transition-transform hover:rotate-6">
        <span className="text-4xl">🚀</span>
      </div>
      
      <h2 className="text-3xl font-bold tracking-tight mb-2">Build with ByteBuddy</h2>
      <p className="text-muted-foreground max-w-lg mb-10 text-[15px] leading-relaxed">
        Your AI-powered Software Engineering Companion. Let's take your idea from planning to production-ready code.
      </p>

      <div className="w-full text-left bg-card border rounded-xl shadow-sm p-5 md:p-6">
        <h3 className="text-sm font-semibold mb-4 text-foreground/80 flex items-center gap-2">
          Select a starting point
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stages.slice(0, 6).map((stage) => (
            <button
              key={stage.id}
              onClick={() => onSelectStage(stage.id)}
              className="group flex flex-col items-start p-4 rounded-lg border bg-muted/30 hover:bg-muted/80 hover:border-primary/30 transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                <Play size={14} className="text-primary" />
              </div>
              <span className="text-2xl mb-2 bg-background p-1.5 rounded-md shadow-sm border border-black/5 dark:border-white/5 group-hover:scale-110 transition-transform">{stage.icon}</span>
              <span className="font-semibold text-[13px]">{stage.label}</span>
            </button>
          ))}
        </div>
        
        <div className="mt-6 pt-5 border-t text-center">
          <Button 
            onClick={() => onSelectStage('planning')}
            size="lg" 
            className="w-full sm:w-auto font-medium gap-2 rounded-full px-8"
          >
            Start New Project Flow
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
