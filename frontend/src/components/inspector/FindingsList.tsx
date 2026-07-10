import React, { useState } from 'react';
import { FileText, Wrench, CheckCircle, Search } from 'lucide-react';
import type { InspectionFinding } from '../../types';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FindingsListProps {
  findings: InspectionFinding[];
  onGenerateFix: (id: number) => Promise<any>;
  onUpdateStatus: (id: number, status: string) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings, onGenerateFix, onUpdateStatus }) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fixingId, setFixingId] = useState<number | null>(null);

  const filtered = findings.filter(f => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && 
        !(f.file_path && f.file_path.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    return true;
  });

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'critical': return 'bg-red-500 text-white border-red-600';
      case 'high': return 'bg-orange-500 text-white border-orange-600';
      case 'medium': return 'bg-amber-400 text-amber-950 border-amber-500';
      case 'low': return 'bg-blue-400 text-white border-blue-500';
      default: return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600';
    }
  };

  const handleFix = async (id: number) => {
    setFixingId(id);
    try {
      await onGenerateFix(id);
      // Wait a moment before expanding to show the new fix
      setTimeout(() => setExpandedId(id), 500);
    } catch (e) {
      console.error(e);
    } finally {
      setFixingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Button 
            variant={filter === 'all' ? 'default' : 'ghost'} 
            size="sm" onClick={() => setFilter('all')}
            className="h-8 rounded-full text-xs"
          >
            All Findings
          </Button>
          <Button 
            variant={filter === 'open' ? 'default' : 'ghost'} 
            size="sm" onClick={() => setFilter('open')}
            className="h-8 rounded-full text-xs"
          >
            Open ({findings.filter(f => f.status === 'open').length})
          </Button>
          <Button 
            variant={filter === 'resolved' ? 'default' : 'ghost'} 
            size="sm" onClick={() => setFilter('resolved')}
            className="h-8 rounded-full text-xs"
          >
            Resolved ({findings.filter(f => f.status === 'resolved').length})
          </Button>
          
          <div className="w-px h-5 bg-border mx-1 shrink-0" />
          
          <select 
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 text-xs bg-transparent border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search findings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-muted/40 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-card border rounded-xl border-dashed">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-3 opacity-80" />
            <h3 className="text-lg font-medium">No findings match your criteria</h3>
            <p className="text-sm text-muted-foreground mt-1">Adjust filters or search query to see more results.</p>
          </div>
        ) : (
          filtered.map(finding => {
            const isExpanded = expandedId === finding.id;
            const isResolved = finding.status === 'resolved';

            return (
              <div 
                key={finding.id} 
                className={cn(
                  "bg-card border rounded-xl overflow-hidden shadow-sm transition-all duration-200",
                  isResolved && "opacity-70 grayscale-[0.3]"
                )}
              >
                {/* Header / Summary row */}
                <div 
                  className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                >
                  <div className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                    getSeverityColor(finding.severity)
                  )}>
                    {finding.severity}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("font-medium text-sm truncate", isResolved && "line-through text-muted-foreground")}>
                      {finding.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText size={12} /> 
                        {finding.file_path || 'Global'}
                        {finding.line_number && `:${finding.line_number}`}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="uppercase">{finding.category}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isResolved ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 px-2 py-1 rounded-md font-medium">
                        <CheckCircle size={14} /> Resolved
                      </span>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-8 gap-1.5 text-xs rounded-lg"
                        onClick={(e) => { e.stopPropagation(); handleFix(finding.id); }}
                        disabled={fixingId === finding.id}
                      >
                        {fixingId === finding.id ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-r-transparent animate-spin" />
                        ) : (
                          <Wrench size={14} />
                        )}
                        <span className="hidden sm:inline">Generate Fix</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-muted/10 p-4 sm:p-5 text-sm space-y-5 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <h5 className="font-semibold text-foreground/80 mb-1">Explanation</h5>
                      <p className="text-muted-foreground leading-relaxed">{finding.explanation}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {finding.root_cause && (
                        <div>
                          <h5 className="font-semibold text-foreground/80 mb-1">Root Cause</h5>
                          <p className="text-muted-foreground leading-relaxed text-sm">{finding.root_cause}</p>
                        </div>
                      )}
                      {finding.why_it_matters && (
                        <div>
                          <h5 className="font-semibold text-foreground/80 mb-1">Impact</h5>
                          <p className="text-muted-foreground leading-relaxed text-sm">{finding.why_it_matters}</p>
                        </div>
                      )}
                    </div>

                    {finding.suggested_fix && (
                      <div>
                        <h5 className="font-semibold text-foreground/80 mb-2">Suggested Fix</h5>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              code({ inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '13px' }}
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono text-primary" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {finding.suggested_fix}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-4 mt-4 border-t flex justify-end gap-2">
                      {isResolved ? (
                        <Button variant="outline" size="sm" onClick={() => onUpdateStatus(finding.id, 'open')}>
                          Reopen Issue
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onUpdateStatus(finding.id, 'resolved')}>
                          <CheckCircle size={14} /> Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
