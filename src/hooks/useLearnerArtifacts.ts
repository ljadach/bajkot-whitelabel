import { useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface UseLearnerArtifactsOptions {
  courseDocumentId: Id<'courseDocuments'> | undefined;
}

interface LearnerArtifact {
  _id: Id<'learnerArtifacts'>;
  chapterNumber: number;
  toolId: string;
  content: string;
  score?: number;
  feedback?: string;
  updatedAt: number;
}

interface UseLearnerArtifactsResult {
  artifacts: LearnerArtifact[] | undefined;
  saveArtifact: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifactContent: (chapterNumber: number, toolId: string) => string | undefined;
  getArtifact: (chapterNumber: number, toolId: string) => LearnerArtifact | undefined;
}

/**
 * Hook for persisting learner tool artifacts via Convex backend.
 *
 * - Fetches all artifacts for the given courseDocument
 * - Provides saveArtifact(chapter, toolId, content) for upsert
 * - Provides getArtifactContent(chapter, toolId) for lookup from local cache
 */
export function useLearnerArtifacts({ courseDocumentId }: UseLearnerArtifactsOptions): UseLearnerArtifactsResult {
  const artifacts = useQuery(api.learnerArtifacts.getArtifacts, courseDocumentId ? { courseDocumentId } : 'skip');

  const saveMutation = useMutation(api.learnerArtifacts.saveArtifact);

  const saveArtifact = useCallback(
    (chapterNumber: number, toolId: string, content: string) => {
      if (!courseDocumentId) return;
      void saveMutation({ courseDocumentId, chapterNumber, toolId, content });
    },
    [courseDocumentId, saveMutation]
  );

  const getArtifact = useCallback(
    (chapterNumber: number, toolId: string): LearnerArtifact | undefined => {
      if (!artifacts) return undefined;
      return artifacts.find((a) => a.chapterNumber === chapterNumber && a.toolId === toolId);
    },
    [artifacts]
  );

  const getArtifactContent = useCallback(
    (chapterNumber: number, toolId: string): string | undefined => {
      return getArtifact(chapterNumber, toolId)?.content;
    },
    [getArtifact]
  );

  return { artifacts, saveArtifact, getArtifactContent, getArtifact };
}
