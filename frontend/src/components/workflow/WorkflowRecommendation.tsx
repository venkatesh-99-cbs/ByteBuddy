import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import type { WorkflowStage } from '../../types';

interface WorkflowRecommendationProps {
  recommendation: {
    stage: WorkflowStage | null;
    label: string;
    icon: string;
    description: string;
  };
  onContinue: () => void;
  onDismiss: () => void;
}

export const WorkflowRecommendation: React.FC<WorkflowRecommendationProps> = ({ 
  recommendation, 
  onContinue, 
  onDismiss 
}) => {
  return (
    <div className="my-6 mx-4 md:mx-8 max-w-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border border-primary/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles size={14} />
          Recommended Next Step
        </div>
        
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-background border shadow-sm flex items-center justify-center text-2xl shrink-0">
            {recommendation.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{recommendation.label}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {recommendation.description}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {recommendation.stage && (
            <Button onClick={onContinue} className="gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
              Continue to {recommendation.label}
              <ArrowRight size={16} />
            </Button>
          )}
          <Button variant="outline" onClick={onDismiss} className="bg-background">
            Choose Another Mode
          </Button>
        </div>
      </div>
    </div>
  );
};
