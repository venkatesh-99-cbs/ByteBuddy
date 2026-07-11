export type WorkflowStage = 'normal' | 'planning' | 'architecture' | 'database' | 'api_design' | 'coding' | 'inspector' | 'security' | 'testing' | 'documentation';

export interface WorkflowState {
  id: number;
  conversation_id: number;
  current_stage: WorkflowStage;
  completed_stages: WorkflowStage[];
  project_name?: string;
  tech_stack?: any;
  is_completed: boolean;
  next_recommended?: WorkflowStage;
}

export interface WorkflowArtifact {
  id: number;
  conversation_id: number;
  stage: string;
  artifact_type: string;
  title?: string;
  content: string;
  created_at: string;
}

export interface InspectionFinding {
  id: number;
  report_id: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  file_path?: string;
  line_number?: number;
  explanation?: string;
  root_cause?: string;
  why_it_matters?: string;
  suggested_fix?: string;
  improved_code?: string;
  status: 'open' | 'resolved' | 'ignored';
  created_at: string;
}

export interface InspectionFile {
  id: number;
  report_id: number;
  file_path: string;
  language?: string;
  content?: string;
  size_bytes: number;
  issue_count: number;
  created_at: string;
}

export interface InspectionReport {
  id: number;
  conversation_id: number;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  overall_health?: number;
  security_score?: number;
  maintainability_score?: number;
  performance_score?: number;
  readability_score?: number;
  documentation_score?: number;
  files_scanned: number;
  languages: string[];
  analysis_duration?: number;
  ai_provider?: string;
  ai_model?: string;
  summary?: string;
  improvements: string[];
  created_at: string;
  findings_count: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  files?: InspectionFile[];
  findings?: InspectionFinding[];
}

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
  workflow_stage?: string;
  created_at: string;
}

export interface ConversationSettings {
  provider: 'ollama' | 'openrouter';
  model: string | null;
  temperature: number;
  max_tokens: number;
  workflow_mode: string;
}

export interface ProviderModel {
  id: string;
  name: string;
}
