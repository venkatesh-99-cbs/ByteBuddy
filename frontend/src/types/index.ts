export interface Conversation {
  id: number;
  title: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  is_pinned: boolean;
  suggestions?: string[];
  created_at: string;
}

export interface ConversationSettings {
  provider: 'ollama' | 'openrouter';
  model: string;
  temperature: number;
  max_tokens: number;
  explanation_mode: string;
}

export interface ProviderModel {
  id: string;
  name: string;
}
