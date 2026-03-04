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

  // Book Pipeline (A0-A11)
  BookIntake = 'bookIntake',
  BookChildProfiler = 'bookChildProfiler',
  BookStoryArchitect = 'bookStoryArchitect',
  BookStoryWriter = 'bookStoryWriter',
  BookPsychReviewer = 'bookPsychReviewer',
  BookArtDirector = 'bookArtDirector',
  BookCharacterDesigner = 'bookCharacterDesigner',
  BookStyleVote = 'bookStyleVote',
  BookIllustrator = 'bookIllustrator',
  BookVisualQa = 'bookVisualQa',
  BookComposer = 'bookComposer',
  BookFinalQa = 'bookFinalQa',
  BookDelivery = 'bookDelivery',
  BookPipelineIndex = 'bookPipelineIndex',
}
