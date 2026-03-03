import { z } from 'zod';
import { v } from 'convex/values';

// Shared Zod schema for learner profile (single source of truth)
export const profileSchema = z.object({
  tools: z.array(z.string()).default([]),
  role: z.string().optional(),
  seniority: z.string().optional(),
  experience: z.string().optional(),
  artifacts: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  needs: z.array(z.string()).default([]),
  timeCommitment: z.string().optional(),
  learningStyle: z.string().optional(),
  negativePreferences: z.array(z.string()).default([]),
  skillsSelfReport: z
    .object({
      prompting: z.number().optional(),
      evaluation: z.number().optional(),
      contextWindow: z.number().optional(),
      safety: z.number().optional(),
    })
    .optional(),
  constraints: z
    .object({
      time_per_week: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

export type Profile = z.infer<typeof profileSchema>;

export const skillVerificationSchema = z.object({
  performanceScore: z.number(),
  selfAssessment: z.number(),
  promptText: z.string().optional(),
  level: z.string().optional(),
  feedback: z.string().optional(),
  completedAt: z.number().optional(),
  inputType: z.string().optional(), // 'prompt' | 'skill'
});

export type SkillVerification = z.infer<typeof skillVerificationSchema>;

// Convex validators mirroring the Zod schema
export const profileValidator = v.object({
  tools: v.optional(v.array(v.string())),
  role: v.optional(v.string()),
  seniority: v.optional(v.string()),
  experience: v.optional(v.string()),
  artifacts: v.optional(v.array(v.string())),
  goals: v.optional(v.array(v.string())),
  needs: v.optional(v.array(v.string())),
  timeCommitment: v.optional(v.string()),
  learningStyle: v.optional(v.string()),
  negativePreferences: v.optional(v.array(v.string())),
  skillsSelfReport: v.optional(
    v.object({
      prompting: v.optional(v.number()),
      evaluation: v.optional(v.number()),
      contextWindow: v.optional(v.number()),
      safety: v.optional(v.number()),
    })
  ),
  constraints: v.optional(
    v.object({
      time_per_week: v.optional(v.string()),
      language: v.optional(v.string()),
    })
  ),
});

export const skillVerificationValidator = v.object({
  performanceScore: v.number(),
  selfAssessment: v.number(),
  promptText: v.optional(v.string()),
  level: v.optional(v.string()),
  feedback: v.optional(v.string()),
  completedAt: v.optional(v.number()),
  inputType: v.optional(v.string()), // 'prompt' | 'skill'
});

// Consistency checks (replacement for previous XML validation)
export function evaluateProfileConsistency(profile: Profile, skill?: SkillVerification) {
  const missing: string[] = [];
  const conflicts: string[] = [];

  if (!profile.tools || profile.tools.length === 0) missing.push('tools');
  if (!profile.role) missing.push('role');
  if (!profile.artifacts || profile.artifacts.length === 0) missing.push('artifacts');
  if (!profile.needs || profile.needs.length === 0) missing.push('needs');
  const hasSelfReport = !!profile.skillsSelfReport;
  const hasPerf = !!skill;
  if (!hasSelfReport && !hasPerf) missing.push('skills.self_report or performance');
  if (!profile.constraints || (!profile.constraints.time_per_week && !profile.timeCommitment)) {
    missing.push('constraints.time_per_week');
  }

  if (hasSelfReport && hasPerf && skill) {
    const sr = ((profile.skillsSelfReport?.prompting ?? 0) + (profile.skillsSelfReport?.evaluation ?? 0) + (profile.skillsSelfReport?.contextWindow ?? 0) + (profile.skillsSelfReport?.safety ?? 0)) / 4;
    const srNorm = (sr - 1) / 4;
    const diff = Math.abs(srNorm - skill.performanceScore);
    if (diff > 0.3) {
      conflicts.push(`Confidence gap: self-report ${srNorm.toFixed(2)} vs performance ${skill.performanceScore.toFixed(2)}`);
    }
  }

  if (profile.tools?.some((t) => /pro|team|enterprise/i.test(t)) && skill && skill.performanceScore < 0.4) {
    conflicts.push('Pro/Team tool but low performance (<0.4) — verify actual usage.');
  }

  if (skill && skill.performanceScore < 0.4) {
    conflicts.push('Performance score < 0.4 — add bridge/quick-win content before advanced items.');
  }

  return { missing, conflicts, complete: missing.length === 0 };
}
