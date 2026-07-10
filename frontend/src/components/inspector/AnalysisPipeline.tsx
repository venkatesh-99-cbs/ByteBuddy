import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle, Code, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnalysisPipelineProps {
  filesCount: number;
  provider: string;
}

export const AnalysisPipeline: React.FC<AnalysisPipelineProps> = ({ filesCount, provider }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Simulate pipeline steps visually while backend processes
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 4000),
      setTimeout(() => setStep(3), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    { icon: <Code size={18} />, label: "Parsing syntax tree", desc: `Analyzing ${filesCount} files` },
    { icon: <Bot size={18} />, label: "AI Inspection", desc: `Running on ${provider}` },
    { icon: <ShieldAlert size={18} />, label: "Security scan", desc: "Checking OWASP Top 10" },
    { icon: <CheckCircle size={18} />, label: "Generating report", desc: "Compiling findings" },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-12 h-full max-w-2xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 text-primary shadow-inner">
        <Loader2 size={32} className="animate-spin" />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">Analyzing Codebase</h2>
      <p className="text-muted-foreground mb-10 text-center">
        Our AI engine is performing a deep inspection of your code. This may take a few moments depending on the size of your project.
      </p>

      <div className="w-full max-w-md space-y-4">
        {steps.map((s, i) => {
          const isActive = i === step;
          const isDone = i < step;
          const isPending = i > step;
          
          return (
            <div 
              key={i} 
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                isActive ? "bg-primary/5 border-primary/20 shadow-sm scale-[1.02]" : "bg-transparent",
                isPending && "opacity-40"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                isDone ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                isActive ? "bg-primary text-primary-foreground shadow-sm" :
                "bg-muted text-muted-foreground"
              )}>
                {isDone ? <CheckCircle size={18} /> : s.icon}
              </div>
              <div className="flex-1">
                <h4 className={cn("font-medium", isActive ? "text-primary" : "text-foreground")}>
                  {s.label}
                </h4>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              {isActive && (
                <div className="shrink-0 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
