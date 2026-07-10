import axios from 'axios';
import type { Conversation, Message, ConversationSettings, ProviderModel } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const conversationService = {
  create: (title?: string) => api.post<Conversation>('/conversations', { title }).then(r => r.data),
  getAll: () => api.get<Conversation[]>('/conversations').then(r => r.data),
  delete: (id: number) => api.delete(`/conversations/${id}`).then(r => r.data),
  rename: (id: number, title: string) => api.patch<Conversation>(`/conversations/${id}`, { title }).then(r => r.data),
  getMessages: (id: number) => api.get<Message[]>(`/conversations/${id}/messages`).then(r => r.data),
  sendMessage: (id: number, content: string) => api.post<Message>(`/conversations/${id}/messages`, { content }).then(r => r.data),
  regenerateMessage: (conversationId: number, messageId: number) =>
    api.post<Message>(`/conversations/${conversationId}/messages/${messageId}/regenerate`).then(r => r.data),
  pinMessage: (id: number, pin: boolean) => api.post(`/messages/${id}/pin`, { pin }).then(r => r.data),
  getPinned: () => api.get<Message[]>('/conversations/pinned').then(r => r.data),
  generateSummary: (id: number) => api.post<{ summary: string }>(`/conversations/${id}/summary`).then(r => r.data),
  getSettings: (id: number) => api.get<ConversationSettings>(`/conversations/${id}/settings`).then(r => r.data),
  updateSettings: (id: number, settings: Partial<ConversationSettings>) => api.patch<ConversationSettings>(`/conversations/${id}/settings`, settings).then(r => r.data),
};

export const providerService = {
  listModels: (name: string) => api.get<ProviderModel[]>(`/providers/${name}/models`).then(r => r.data),
  testConnection: (name: string, apiKey?: string) => api.post<{ success: boolean; error?: string }>(`/providers/${name}/test`, { api_key: apiKey }).then(r => r.data),
};
