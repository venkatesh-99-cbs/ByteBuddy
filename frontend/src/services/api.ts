import axios from 'axios';
import type { 
  Conversation, Message, ConversationSettings, ProviderModel,
  WorkflowState, WorkflowArtifact, InspectionReport, InspectionFile, InspectionFinding 
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const conversationService = {
  create: (title?: string, workflow_stage?: string) => api.post<Conversation>('/conversations', { title, workflow_stage }).then(r => r.data),
  getAll: () => api.get<Conversation[]>('/conversations').then(r => r.data),
  delete: (id: number) => api.delete(`/conversations/${id}`).then(r => r.data),
  rename: (id: number, title: string) => api.patch<Conversation>(`/conversations/${id}`, { title }).then(r => r.data),
  getMessages: (id: number) => api.get<Message[]>(`/conversations/${id}/messages`).then(r => r.data),
  sendMessage: (id: number, content: string, files?: File[]) => {
    if (files?.length) {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach((file) => formData.append('files', file));
      return api.post<Message>(`/conversations/${id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    }
    return api.post<Message>(`/conversations/${id}/messages`, { content }).then(r => r.data);
  },
  regenerateMessage: (conversationId: number, messageId: number) =>
    api.post<Message>(`/conversations/${conversationId}/messages/${messageId}/regenerate`).then(r => r.data),
  pinMessage: (id: number, pin: boolean) => api.post(`/messages/${id}/pin`, { pin }).then(r => r.data),
  getPinned: () => api.get<Message[]>('/conversations/pinned').then(r => r.data),
  generateSummary: (id: number) => api.post<{ summary: string }>(`/conversations/${id}/summary`).then(r => r.data),
  getSettings: (id: number) => api.get<ConversationSettings>(`/conversations/${id}/settings`).then(r => r.data),
  updateSettings: (id: number, settings: Partial<ConversationSettings>) => api.patch<ConversationSettings>(`/conversations/${id}/settings`, settings).then(r => r.data),
};

export const workflowService = {
  getStages: () => api.get<any[]>('/workflow/stages').then(r => r.data),
  getState: (id: number) => api.get<WorkflowState>(`/conversations/${id}/workflow`).then(r => r.data),
  updateState: (id: number, data: Partial<WorkflowState> & { mark_complete?: string }) => 
    api.patch<WorkflowState>(`/conversations/${id}/workflow`, data).then(r => r.data),
  completeStage: (id: number) => api.post<{ workflow: WorkflowState, recommendation: any }>(`/conversations/${id}/workflow/complete-stage`).then(r => r.data),
  getArtifacts: (id: number, stage?: string) => api.get<WorkflowArtifact[]>(`/conversations/${id}/artifacts`, { params: { stage } }).then(r => r.data),
};

export const inspectorService = {
  uploadFiles: (id: number, formData: FormData) => api.post<{ report_id: number, files: any[], total_files: number }>(`/conversations/${id}/inspect/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  pasteCode: (id: number, code: string, filename?: string, language?: string) => 
    api.post<{ report_id: number, file: any }>(`/conversations/${id}/inspect/paste`, { code, filename, language }).then(r => r.data),
  analyze: (id: number) => api.post<InspectionReport>(`/conversations/${id}/inspect/analyze`).then(r => r.data),
  getReport: (id: number) => api.get<InspectionReport>(`/conversations/${id}/inspect/report`).then(r => r.data),
  getFiles: (id: number) => api.get<InspectionFile[]>(`/conversations/${id}/inspect/files`).then(r => r.data),
  getFileContent: (id: number, fileId: number) => api.get<InspectionFile>(`/conversations/${id}/inspect/files/${fileId}`).then(r => r.data),
  generateFix: (id: number, findingId: number) => api.post<{ fix: string }>(`/conversations/${id}/inspect/findings/${findingId}/fix`).then(r => r.data),
  updateFinding: (id: number, findingId: number, status: string) => 
    api.patch<InspectionFinding>(`/conversations/${id}/inspect/findings/${findingId}`, { status }).then(r => r.data),
};

export const providerService = {
  listModels: (name: string) => api.get<ProviderModel[]>(`/providers/${name}/models`).then(r => r.data),
  testConnection: (name: string, apiKey?: string) => api.post<{ success: boolean; error?: string }>(`/providers/${name}/test`, { api_key: apiKey }).then(r => r.data),
  getOpenRouterKeyStatus: () => api.get<{ configured: boolean }>('/providers/openrouter/key/status').then(r => r.data),
  saveOpenRouterKey: (apiKey: string) => api.post<{ configured: boolean }>('/providers/openrouter/key', { api_key: apiKey }).then(r => r.data),
};
