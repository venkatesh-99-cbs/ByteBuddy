import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import type { ConversationSettings, ProviderModel } from '../../types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversationSettings;
  onUpdate: (settings: Partial<ConversationSettings>) => void;
  ollamaModels: ProviderModel[];
  openRouterModels: ProviderModel[];
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  ollamaModels,
  openRouterModels,
}) => {
  if (!isOpen) return null;

  const explanationModes = ['Beginner', 'Student', 'Junior Developer', 'Senior Developer', 'Tech Lead'];
  const models = settings.provider === 'ollama' ? ollamaModels : openRouterModels;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Conversation Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">AI Provider</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={settings.provider === 'ollama' ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => onUpdate({ provider: 'ollama' })}
              >
                Ollama
              </Button>
              <Button
                variant={settings.provider === 'openrouter' ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => onUpdate({ provider: 'openrouter' })}
              >
                OpenRouter
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Model</h3>
            <select
              className="w-full bg-background border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={settings.model}
              onChange={(e) => onUpdate({ model: e.target.value })}
            >
              <option value="">Select a model...</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Explanation Mode</h3>
            <div className="flex flex-wrap gap-2">
              {explanationModes.map(mode => (
                <Button
                  key={mode}
                  variant={settings.explanation_mode === mode ? 'secondary' : 'outline'}
                  size="sm"
                  className={settings.explanation_mode === mode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                  onClick={() => onUpdate({ explanation_mode: mode })}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Temperature</h3>
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
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Max Tokens</h3>
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
