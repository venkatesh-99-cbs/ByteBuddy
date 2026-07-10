import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, ServerCog, X } from 'lucide-react';
import { Button } from '../ui/button';
import type { ConversationSettings, ProviderModel } from '../../types';
import { cn } from '../../lib/utils';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversationSettings;
  onUpdate: (settings: Partial<ConversationSettings>) => void;
  ollamaModels: ProviderModel[];
  openRouterModels: ProviderModel[];
  ollamaError?: string;
  openRouterError?: string;
  isRefreshingModels?: boolean;
  onRefreshModels: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  ollamaModels,
  openRouterModels,
  ollamaError,
  openRouterError,
  isRefreshingModels = false,
  onRefreshModels,
}) => {
  if (!isOpen) return null;

  const models = settings.provider === 'ollama' ? ollamaModels : openRouterModels;
  const currentError = settings.provider === 'ollama' ? ollamaError : openRouterError;
  const hasModels = models.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Conversation settings</h2>
            <p className="text-xs text-muted-foreground mt-1">Provider, model, and response behavior</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-7">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">AI provider</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={onRefreshModels}
                disabled={isRefreshingModels}
              >
                <RefreshCw size={13} className={cn(isRefreshingModels && "animate-spin")} />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={settings.provider === 'ollama' ? 'default' : 'outline'}
                className="justify-start gap-2 h-11"
                onClick={() => onUpdate({ provider: 'ollama', model: '' })}
              >
                <ServerCog size={16} />
                Ollama
              </Button>
              <Button
                variant={settings.provider === 'openrouter' ? 'default' : 'outline'}
                className="justify-start gap-2 h-11"
                onClick={() => onUpdate({ provider: 'openrouter', model: '' })}
              >
                <ServerCog size={16} />
                OpenRouter
              </Button>
            </div>

            <div className={cn(
              "rounded-md border px-3 py-2.5 text-sm flex gap-2",
              currentError
                ? "bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100"
                : "bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/25 dark:border-emerald-800 dark:text-emerald-100"
            )}>
              {currentError ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
              <div>
                <p className="font-medium">
                  {currentError ? `${settings.provider} needs attention` : `${settings.provider} ready`}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  {currentError || `${models.length} ${models.length === 1 ? 'model' : 'models'} detected`}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Model</h3>
            <select
              className="w-full h-10 bg-background border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring disabled:bg-muted"
              value={settings.model ?? ''}
              onChange={(e) => onUpdate({ model: e.target.value })}
              disabled={!hasModels}
            >
              <option value="">{hasModels ? 'Auto-select best available' : 'No models detected'}</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {settings.provider === 'ollama' && !hasModels && (
              <p className="text-xs text-muted-foreground">
                Install a local model with `ollama pull llama3.1`, then refresh.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Temperature</h3>
              <span className="text-xs font-mono">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              className="w-full"
              value={settings.temperature}
              onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
            />
          </section>

          <section className="space-y-4">
             <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Max tokens</h3>
              <span className="text-xs font-mono">{settings.max_tokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              className="w-full"
              value={settings.max_tokens}
              onChange={(e) => onUpdate({ max_tokens: parseInt(e.target.value) })}
            />
          </section>
        </div>
      </div>
    </div>
  );
};
