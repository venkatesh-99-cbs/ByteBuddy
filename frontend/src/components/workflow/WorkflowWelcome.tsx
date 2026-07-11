import React from 'react';
import { ArrowRight, Bot, GitBranch, MessageCircle } from 'lucide-react';
import type { WorkflowStage } from '../../types';

interface WorkflowWelcomeProps {
  stages: any[];
  onSelectStage: (stage: WorkflowStage) => void;
}

export const WorkflowWelcome: React.FC<WorkflowWelcomeProps> = ({ onSelectStage }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 text-primary-foreground shadow-xl shadow-primary/20">
        <Bot size={40} />
      </div>

      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">ByteBuddy</h2>
      <p className="text-muted-foreground max-w-xl mb-10 text-[15px] leading-relaxed">
        Start a quick AI chat or launch a guided project flow that moves from planning through architecture, coding, inspection, testing, and documentation.
      </p>

      <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <button
          onClick={() => onSelectStage('normal')}
          className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <MessageCircle size={22} />
          </div>
          <h3 className="text-lg font-semibold">Normal Chat</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Ask questions, debug ideas, summarize content, or get direct help without SDLC structure.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
            Start chat <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <button
          onClick={() => onSelectStage('planning')}
          className="group rounded-2xl border bg-card p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <GitBranch size={22} />
          </div>
          <h3 className="text-lg font-semibold">Project Flow</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Build a complete application step by step with a continuous SDLC progress bar.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
            Start project flow <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>
    </div>
  );
};
