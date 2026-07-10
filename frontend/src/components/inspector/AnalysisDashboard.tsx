import React from 'react';
import { Activity, ShieldAlert, Zap, BookOpen, Clock, FileCode, CheckCircle2, Bot } from 'lucide-react';
import type { InspectionReport } from '../../types';
import { cn } from '../../lib/utils';

interface AnalysisDashboardProps {
  report: InspectionReport;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ report }) => {
  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-muted-foreground bg-muted';
    if (score >= 90) return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950';
    if (score >= 70) return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950';
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950';
  };

  const getHealthGrade = (score?: number) => {
    if (score === undefined) return '?';
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const MetricCard = ({ icon, label, score, suffix = '%' }: any) => (
    <div className="bg-card border rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted text-muted-foreground">{icon}</div>
        <span className="font-medium text-sm text-foreground/80">{label}</span>
      </div>
      <div className={cn("px-3 py-1 rounded-full font-bold text-sm", getScoreColor(score))}>
        {score !== undefined ? `${score}${suffix}` : 'N/A'}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-transparent border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="shrink-0 relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted" />
            <circle 
              cx="64" 
              cy="64" 
              r="56" 
              stroke="currentColor" 
              strokeWidth="8" 
              fill="transparent"
              strokeDasharray={351.8}
              strokeDashoffset={351.8 - (351.8 * (report.overall_health || 0)) / 100}
              className={cn(
                "transition-all duration-1000 ease-out",
                report.overall_health! >= 90 ? "text-emerald-500" : report.overall_health! >= 70 ? "text-amber-500" : "text-red-500"
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black">{getHealthGrade(report.overall_health)}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Grade</span>
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold mb-2">Code Health Report</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed max-w-2xl">
            {report.summary}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md border shadow-sm">
              <FileCode size={14} /> {report.files_scanned} files scanned
            </span>
            <span className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md border shadow-sm">
              <Clock size={14} /> {report.analysis_duration}s analysis
            </span>
            <span className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md border shadow-sm uppercase">
              <Bot size={14} /> {report.ai_model}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<ShieldAlert size={18} />} label="Security" score={report.security_score} />
        <MetricCard icon={<Activity size={18} />} label="Performance" score={report.performance_score} />
        <MetricCard icon={<Zap size={18} />} label="Maintainability" score={report.maintainability_score} />
        <MetricCard icon={<BookOpen size={18} />} label="Readability" score={report.readability_score} />
      </div>

      {/* Improvements Roadmap */}
      {report.improvements && report.improvements.length > 0 && (
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-primary" size={20} />
            Recommended Improvements Roadmap
          </h3>
          <div className="space-y-3">
            {report.improvements.map((improvement, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-transparent hover:border-border transition-colors">
                <div className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{improvement}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
