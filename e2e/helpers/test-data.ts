/**
 * Test data for E2E tests.
 * These are sample inputs that should work with the real LLM.
 */

// Sample prompt for verification step - should score well
export const SAMPLE_PROMPTS = {
  advanced: `You are a senior software architect. I need you to design a comprehensive
microservices migration strategy for our e-commerce platform.

Current state:
- Monolithic Ruby on Rails application
- PostgreSQL database with 50+ tables
- 2M monthly active users
- 99.9% uptime SLA requirement

Requirements:
1. Identify service boundaries using Domain-Driven Design
2. Propose data migration strategy (avoid big bang)
3. Define API contracts between services
4. Plan for rollback scenarios
5. Estimate team capacity needs

Output format: Technical RFC with diagrams described in text.`,

  intermediate: `Help me write a Python script that:
1. Reads a CSV file with customer data
2. Validates email formats
3. Removes duplicates based on email
4. Exports clean data to a new CSV

Include error handling for missing files and invalid data.`,

  beginner: `Write me an email to my boss asking for a day off next Friday.`,
};

// Default answers for chat intake (to quickly complete the flow)
export const DEFAULT_CHAT_ANSWERS = {
  // For free-text questions
  freeText: 'I work as a software developer and want to improve my AI prompting skills.',

  // For role/job title questions
  role: 'Software Developer',

  // For experience questions
  experience: '5-10 years',

  // For tools questions (multi-select - pick first available)
  tools: ['ChatGPT', 'Claude'],

  // For goals questions
  goals: 'Better at writing technical prompts for code generation and documentation.',

  // For time commitment
  timeCommitment: '2-3 hours per week',

  // For Likert scale (1-5)
  likertDefault: 3,
};

// Persona definitions for more realistic test flows
export const TEST_PERSONAS = {
  developer: {
    role: 'Software Developer',
    tools: ['ChatGPT', 'GitHub Copilot', 'Claude'],
    goals: 'Code generation, documentation, debugging assistance',
    experience: '5-10 years',
    promptSample: SAMPLE_PROMPTS.advanced,
  },
  marketer: {
    role: 'Marketing Manager',
    tools: ['ChatGPT', 'Jasper'],
    goals: 'Content creation, campaign ideas, copywriting',
    experience: '3-5 years',
    promptSample: SAMPLE_PROMPTS.intermediate,
  },
  beginner: {
    role: 'Office Assistant',
    tools: [],
    goals: 'Learn basics of AI tools',
    experience: '0-1 years',
    promptSample: SAMPLE_PROMPTS.beginner,
  },
};
