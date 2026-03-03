export type PromptConfig = {
  name: string;
  type: 'text' | 'chat';
  fallback: string;
};

export enum PromptTemplate {
  ProfileXmlDefinition = 'profileXmlDefinition',
  IntakeXmlSystem = 'intakeXmlSystem',
  IntakeXmlStreamingSystem = 'intakeXmlStreamingSystem',
  IntakeXmlUser = 'intakeXmlUser',
  ScoreSystem = 'scoreSystem',
  AssessmentXmlSystem = 'assessmentXmlSystem',
  AssessmentXmlUser = 'assessmentXmlUser',
  PlaybookXmlSystem = 'playbookXmlSystem',
  PlaybookXmlUser = 'playbookXmlUser',
  HandbookSystem = 'handbookSystem',
  HandbookUser = 'handbookUser',
  HandbookSystemVideoEnhanced = 'handbookSystemVideoEnhanced',
  HandbookUserVideoEnhanced = 'handbookUserVideoEnhanced',
  PlaybookXmlSystemVideoEnhanced = 'playbookXmlSystemVideoEnhanced',
  PlaybookXmlUserVideoEnhanced = 'playbookXmlUserVideoEnhanced',
  InferAiFluencySystem = 'inferAiFluencySystem',
  InferAiFluencyUser = 'inferAiFluencyUser',
  QuickTipSystem = 'quickTipSystem',
  QuickTipUser = 'quickTipUser',
  VideoSegmentExtractionSystem = 'videoSegmentExtractionSystem',
  VideoSegmentExtractionUser = 'videoSegmentExtractionUser',
  VideoTeachingSegmentSystem = 'videoTeachingSegmentSystem',
  VideoTeachingSegmentUser = 'videoTeachingSegmentUser',
  ExerciseEvaluationSystem = 'exerciseEvaluationSystem',
  ExerciseEvaluationUser = 'exerciseEvaluationUser',
  ExerciseGenerationSystem = 'exerciseGenerationSystem',
  ExerciseGenerationUser = 'exerciseGenerationUser',
}
