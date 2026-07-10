import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectorService } from '../services/api';
import { useState } from 'react';

export function useInspector(conversationId?: number) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: report, isLoading: isReportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['inspector', 'report', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      try {
        return await inspectorService.getReport(conversationId);
      } catch (e: any) {
        if (e.response?.status === 404) return null;
        throw e;
      }
    },
    enabled: !!conversationId,
  });

  const uploadFilesMutation = useMutation({
    mutationFn: (formData: FormData) => {
      setUploadProgress(0);
      return inspectorService.uploadFiles(conversationId!, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspector', 'report', conversationId] });
    },
  });

  const pasteCodeMutation = useMutation({
    mutationFn: ({ code, filename, language }: { code: string, filename?: string, language?: string }) => 
      inspectorService.pasteCode(conversationId!, code, filename, language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspector', 'report', conversationId] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => inspectorService.analyze(conversationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspector', 'report', conversationId] });
    },
  });

  const generateFixMutation = useMutation({
    mutationFn: (findingId: number) => inspectorService.generateFix(conversationId!, findingId),
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ findingId, status }: { findingId: number, status: string }) => 
      inspectorService.updateFinding(conversationId!, findingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspector', 'report', conversationId] });
    },
  });

  return {
    report,
    isReportLoading,
    refetchReport,
    uploadFiles: uploadFilesMutation.mutateAsync,
    isUploading: uploadFilesMutation.isPending,
    uploadProgress,
    pasteCode: pasteCodeMutation.mutateAsync,
    isPasting: pasteCodeMutation.isPending,
    analyze: analyzeMutation.mutateAsync,
    isAnalyzing: analyzeMutation.isPending,
    generateFix: generateFixMutation.mutateAsync,
    isGeneratingFix: generateFixMutation.isPending,
    updateFinding: updateFindingMutation.mutate,
  };
}
