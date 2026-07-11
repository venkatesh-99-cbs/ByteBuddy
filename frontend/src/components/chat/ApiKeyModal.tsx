import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';

interface ApiKeyModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error?: string;
  canSkip?: boolean;
  onSave: (apiKey: string) => void;
  onSkip?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  isSaving,
  error,
  canSkip = false,
  onSave,
  onSkip,
}) => {
  const [apiKey, setApiKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-background shadow-2xl overflow-hidden">
        <div className="p-6 border-b">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <KeyRound size={22} />
          </div>
          <h2 className="text-xl font-semibold">Connect OpenRouter</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your OpenRouter API key to enable cloud models. The key is encrypted before it is stored in the app database.
          </p>
        </div>

        <form
          className="p-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(apiKey.trim());
          }}
        >
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full h-11 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>Use a stable backend SECRET_KEY. Changing it later prevents decrypting the saved API key.</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {canSkip && (
              <Button type="button" variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            )}
            <Button type="submit" disabled={!apiKey.trim() || isSaving} className="gap-2">
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              Save key
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
