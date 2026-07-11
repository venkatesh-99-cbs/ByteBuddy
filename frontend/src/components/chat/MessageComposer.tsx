import React, { useState, useRef, useEffect } from 'react';
import { Bot, Check, ChevronDown, Cpu, FileText, Image, KeyRound, Moon, Paperclip, Send, Settings, Sparkles, Sun, X } from 'lucide-react';
import { Button } from '../ui/button';
import type { ConversationSettings, ProviderModel, WorkflowStage } from '../../types';
import { WorkflowModeSelector } from '../workflow/WorkflowModeSelector';
import { cn } from '../../lib/utils';

interface MessageComposerProps {
  onSend: (message: string, files?: File[]) => void;
  isLoading: boolean;
  currentStage?: WorkflowStage;
  stages?: any[];
  onStageSelect?: (stage: WorkflowStage) => void;
  settings?: ConversationSettings | null;
  onSettingsUpdate?: (settings: Partial<ConversationSettings>) => void;
  ollamaModels?: ProviderModel[];
  openRouterModels?: ProviderModel[];
  providerHealthy?: boolean;
  openRouterKeyConfigured?: boolean;
  onOpenApiKeyPrompt?: () => void;
  onSettingsOpen?: () => void;
  onSummaryGenerate?: () => void;
  canSummarize?: boolean;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  isLoading,
  currentStage = 'normal',
  stages = [],
  onStageSelect,
  settings,
  onSettingsUpdate,
  ollamaModels = [],
  openRouterModels = [],
  providerHealthy = true,
  openRouterKeyConfigured = false,
  onOpenApiKeyPrompt,
  onSettingsOpen,
  onSummaryGenerate,
  canSummarize = false,
  theme = 'dark',
  onThemeToggle,
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [providerOpen, setProviderOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      onSend(input.trim() || 'Please review the attached files.', attachments);
      setInput('');
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    const handler = (e: any) => {
      onSend(e.detail);
    };
    window.addEventListener('suggestion-click', handler);
    return () => window.removeEventListener('suggestion-click', handler);
  }, [onSend]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) {
        setProviderOpen(false);
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const placeholder = currentStage === 'normal' ? "Ask ByteBuddy anything..." :
                      currentStage === 'planning' ? "Describe your software project idea..." : 
                      currentStage === 'coding' ? "Ask for a specific feature implementation..." :
                      currentStage === 'inspector' ? "Upload or paste code to inspect..." :
                      "Ask ByteBuddy anything...";
  const models = settings?.provider === 'openrouter' ? openRouterModels : ollamaModels;
  const selectedModelName = models.find((model) => model.id === settings?.model)?.name || settings?.model || 'Auto model';
  const canConfigure = Boolean(settings && onSettingsUpdate);
  const formatBytes = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-3 sm:p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative border rounded-2xl bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-visible">
            {attachments.length > 0 && (
              <div className="px-3 pt-3 flex flex-wrap gap-2">
                {attachments.map((file, index) => {
                  const isImage = file.type.startsWith('image/');
                  return (
                    <div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-xl border bg-muted/35 px-2.5 py-1.5 text-xs">
                      {isImage ? <Image size={14} className="text-primary shrink-0" /> : <FileText size={14} className="text-primary shrink-0" />}
                      <span className="truncate max-w-[180px] sm:max-w-[260px]">{file.name}</span>
                      <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        className="rounded-md p-0.5 hover:bg-background"
                        onClick={() => {
                          setAttachments((current) => current.filter((_, i) => i !== index));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-20 sm:pb-16 pr-14 focus:outline-none text-[15px] min-h-[112px] leading-relaxed"
              disabled={isLoading}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.json,.csv,.log,.py,.js,.jsx,.ts,.tsx,.html,.css,.sql,.java,.go,.rs,.rb,.php,.xml,.yaml,.yml"
              className="hidden"
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                setAttachments((current) => [...current, ...selected].slice(0, 8));
              }}
            />
            <div className="absolute left-3 right-16 bottom-3 flex flex-wrap items-center gap-1.5 sm:gap-2 pr-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 bg-background"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Attach files or images"
              >
                <Paperclip size={15} />
              </Button>
              {stages.length > 0 && onStageSelect && (
                <WorkflowModeSelector
                  stages={stages}
                  currentStage={currentStage}
                  onSelect={onStageSelect}
                  disabled={isLoading}
                />
              )}

              {settings && (
                <div className="relative" ref={providerRef}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-background hover:bg-muted/50"
                    onClick={() => setProviderOpen((open) => !open)}
                    disabled={!canConfigure || isLoading}
                  >
                    {settings.provider === 'openrouter' ? <Bot size={14} /> : <Cpu size={14} />}
                    <span className="capitalize">{settings.provider}</span>
                    <span className={cn("h-1.5 w-1.5 rounded-full", providerHealthy ? "bg-emerald-500" : "bg-amber-500")} />
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </Button>

                  {providerOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-[280px] bg-popover rounded-xl border shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150">
                      <div className="p-2 text-[11px] font-semibold text-muted-foreground uppercase bg-muted/30 border-b">
                        AI provider
                      </div>
                      <div className="p-2 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={settings.provider === 'ollama' ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => onSettingsUpdate?.({ provider: 'ollama', model: '' })}
                          >
                            <Cpu size={14} /> Ollama
                          </Button>
                          <Button
                            type="button"
                            variant={settings.provider === 'openrouter' ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => onSettingsUpdate?.({ provider: 'openrouter', model: '' })}
                          >
                            <Bot size={14} /> OpenRouter
                          </Button>
                        </div>
                        {settings.provider === 'openrouter' && !openRouterKeyConfigured && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full gap-1.5"
                            onClick={onOpenApiKeyPrompt}
                          >
                            <KeyRound size={14} /> Add API key
                          </Button>
                        )}
                        <p className="text-[11px] text-muted-foreground truncate">
                          Active: {selectedModelName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {settings && (
                <div className="relative" ref={modelRef}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 max-w-[190px] gap-1.5 text-xs bg-background hover:bg-muted/50"
                    onClick={() => setModelOpen((open) => !open)}
                    disabled={!canConfigure || isLoading}
                  >
                    <Bot size={14} />
                    <span className="truncate">{selectedModelName}</span>
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", modelOpen && "rotate-180")} />
                  </Button>

                  {modelOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-[340px] max-w-[80vw] bg-popover rounded-xl border shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150">
                      <div className="p-2 text-[11px] font-semibold text-muted-foreground uppercase bg-muted/30 border-b">
                        {settings.provider} models
                      </div>
                      <div className="p-1 max-h-[280px] overflow-y-auto">
                        <button
                          type="button"
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left hover:bg-muted",
                            !settings.model && "bg-primary/10 text-primary font-medium"
                          )}
                          onClick={() => {
                            onSettingsUpdate?.({ model: '' });
                            setModelOpen(false);
                          }}
                        >
                          <span className="flex-1">Auto-select best available</span>
                          {!settings.model && <Check size={14} />}
                        </button>
                        {models.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-muted-foreground">
                            No models detected. Refresh from settings or check provider connection.
                          </div>
                        ) : models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left hover:bg-muted",
                              settings.model === model.id && "bg-primary/10 text-primary font-medium"
                            )}
                            onClick={() => {
                              onSettingsUpdate?.({ model: model.id });
                              setModelOpen(false);
                            }}
                          >
                            <span className="flex-1 truncate">{model.name}</span>
                            {settings.model === model.id && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onSummaryGenerate}
                disabled={!canSummarize}
                title="Summarize"
              >
                <Sparkles size={15} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onThemeToggle}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onSettingsOpen}
                title="Settings"
              >
                <Settings size={15} />
              </Button>
            </div>
            <div className="absolute right-3 bottom-3">
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
                aria-label="Send message"
              >
                <Send size={16} className="ml-0.5" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
