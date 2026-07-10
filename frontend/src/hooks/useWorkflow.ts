import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '../services/api';
import type { WorkflowState } from '../types';

export function useWorkflow(conversationId?: number) {
  const queryClient = useQueryClient();

  const { data: stages = [] } = useQuery({
    queryKey: ['workflow', 'stages'],
    queryFn: workflowService.getStages,
    staleTime: Infinity,
  });

  const { data: workflow, isLoading: isWorkflowLoading } = useQuery({
    queryKey: ['workflow', conversationId],
    queryFn: () => conversationId ? workflowService.getState(conversationId) : Promise.resolve(null),
    enabled: !!conversationId,
  });

  const { data: artifacts = [] } = useQuery({
    queryKey: ['workflow', 'artifacts', conversationId],
    queryFn: () => conversationId ? workflowService.getArtifacts(conversationId) : Promise.resolve([]),
    enabled: !!conversationId,
  });

  const updateStateMutation = useMutation({
    mutationFn: (data: Partial<WorkflowState> & { mark_complete?: string }) => 
      workflowService.updateState(conversationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', conversationId] });
    },
  });

  const completeStageMutation = useMutation({
    mutationFn: () => workflowService.completeStage(conversationId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', conversationId] });
      // Event can be dispatched to show a toast or auto-navigate
      const event = new CustomEvent('workflow-stage-completed', { detail: data.recommendation });
      window.dispatchEvent(event);
    },
  });

  return {
    stages,
    workflow,
    isWorkflowLoading,
    artifacts,
    updateState: updateStateMutation.mutate,
    updateStateAsync: updateStateMutation.mutateAsync,
    isUpdating: updateStateMutation.isPending,
    completeStage: completeStageMutation.mutate,
    completeStageAsync: completeStageMutation.mutateAsync,
    isCompleting: completeStageMutation.isPending,
  };
}
