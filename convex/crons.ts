import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Auto-resolve style votes that have been pending for 15+ minutes.
// Defaults to Style A, matching trustee pipeline behavior.
crons.interval(
  'auto-resolve-style-votes',
  { minutes: 5 },
  internal.bookPipelineHelpers.autoResolveStyleVotes,
);

export default crons;
