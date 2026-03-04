export type PromptConfig = {
  name: string;
  type: 'text' | 'chat';
  fallback: string;
};

export enum PromptTemplate {
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
