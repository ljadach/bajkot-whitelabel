export function defaultProfileXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<profile version="1.0">',
    '  <tools />',
    '  <role />',
    '  <seniority />',
    '  <experience />',
    '  <artifacts />',
    '  <goals />',
    '  <needs />',
    '  <timeCommitment />',
    '  <learningStyle />',
    '  <negativePreferences />',
    '  <skillsSelfReport />',
    '  <constraints />',
    '</profile>',
    '',
  ].join('\n');
}

export function deriveProfileStateFromXml(profileXml: string): string | undefined {
  const xml = typeof profileXml === 'string' ? profileXml : '';
  if (!xml.trim()) return undefined;

  const state: Record<string, any> = {};
  const tools = extractMany(xml, 'tool');
  if (tools.length) state.tools = tools;

  const role = extractFirst(xml, 'role');
  if (role) state.role = role;
  const seniority = extractFirst(xml, 'seniority');
  if (seniority) state.seniority = seniority;
  const experience = extractFirst(xml, 'experience');
  if (experience) state.experience = experience;

  const artifacts = extractMany(xml, 'artifact');
  if (artifacts.length) state.artifacts = artifacts;
  const goals = extractMany(xml, 'goal');
  if (goals.length) state.goals = goals;
  const needs = extractMany(xml, 'need');
  if (needs.length) state.needs = needs;

  const timeCommitment = extractFirst(xml, 'timeCommitment');
  if (timeCommitment) state.timeCommitment = timeCommitment;
  const learningStyle = extractFirst(xml, 'learningStyle');
  if (learningStyle) state.learningStyle = learningStyle;

  const negativePreferences = extractMany(xml, 'preference');
  if (negativePreferences.length) state.negativePreferences = negativePreferences;

  const constraintsAttrs = extractAttrs(xml, 'constraints');
  if (constraintsAttrs) {
    state.constraints = {};
    if (typeof constraintsAttrs.time_per_week === 'string' && constraintsAttrs.time_per_week.trim()) state.constraints.time_per_week = constraintsAttrs.time_per_week.trim();
    if (typeof constraintsAttrs.language === 'string' && constraintsAttrs.language.trim()) state.constraints.language = constraintsAttrs.language.trim();
    if (Object.keys(state.constraints).length === 0) delete state.constraints;
  }

  const skillsAttrs = extractAttrs(xml, 'skillsSelfReport');
  if (skillsAttrs) {
    const s: Record<string, number> = {};
    const keys = ['prompting', 'evaluation', 'contextWindow', 'safety'] as const;
    for (const key of keys) {
      const n = numberOrUndefined(skillsAttrs[key]);
      if (typeof n === 'number') s[key] = n;
    }
    if (Object.keys(s).length) state.skillsSelfReport = s;
  }

  try {
    return JSON.stringify(state);
  } catch {
    return undefined;
  }
}

export function extractFirst(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(re);
  if (!match) return undefined;
  return decodeEntities(stripCdata(match[1] ?? '').trim());
}

function extractMany(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  for (const match of xml.matchAll(re)) {
    const value = decodeEntities(stripCdata(match[1] ?? '').trim());
    if (value) out.push(value);
  }
  return out;
}

function extractAttrs(xml: string, tag: string): Record<string, string> | undefined {
  const re = new RegExp(`<${tag}([^>]*)\\/?>`, 'i');
  const match = xml.match(re);
  if (!match) return undefined;
  const raw = match[1] ?? '';
  const attrs: Record<string, string> = {};
  const attrRe = /([A-Za-z0-9_:-]+)\s*=\s*"([^"]*)"/g;
  for (const a of raw.matchAll(attrRe)) {
    const key = a[1];
    const value = decodeEntities(a[2] ?? '');
    if (key) attrs[key] = value;
  }
  return Object.keys(attrs).length ? attrs : undefined;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function numberOrUndefined(value: any): number | undefined {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return typeof n === 'number' && !isNaN(n) ? n : undefined;
}

/**
 * Build a compact plain-text summary of the learner profile (~200-400 chars).
 * Used where full XML is too verbose (exercise generation, preselection catalogs).
 */
export function buildProfileSummary(profileXml: string | undefined): string {
  if (!profileXml) return '';
  const xml = profileXml;

  const parts: string[] = [];

  const role = extractFirst(xml, 'role');
  const seniority = extractFirst(xml, 'seniority');
  if (role || seniority) {
    parts.push(`Role: ${[seniority, role].filter(Boolean).join(' ')}`);
  }

  const experience = extractFirst(xml, 'experience');
  if (experience) parts.push(`Experience: ${experience}`);

  const tools = extractMany(xml, 'tool');
  if (tools.length) {
    parts.push(`Tools: ${tools.join(', ')}`);
  }

  const artifacts = extractMany(xml, 'artifact');
  if (artifacts.length) {
    parts.push(`Artifacts: ${artifacts.join(', ')}`);
  }

  const skillsAttrs = extractAttrs(xml, 'skillsSelfReport');
  if (skillsAttrs) {
    const skills = Object.entries(skillsAttrs)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}=${v}/5`)
      .join(', ');
    if (skills) parts.push(`Skills: ${skills}`);
  }

  const goals = extractMany(xml, 'goal');
  if (goals.length) {
    parts.push(`Goals: ${goals.join('; ')}`);
  }

  const needs = extractMany(xml, 'need');
  if (needs.length) {
    parts.push(`Needs: ${needs.join('; ')}`);
  }

  const negPrefs = extractMany(xml, 'preference');
  if (negPrefs.length) {
    parts.push(`Exclude: ${negPrefs.join('; ')}`);
  }

  const timeCommitment = extractFirst(xml, 'timeCommitment');
  if (timeCommitment) parts.push(`Time: ${timeCommitment}`);

  const learningStyle = extractFirst(xml, 'learningStyle');
  if (learningStyle) parts.push(`Style: ${learningStyle}`);

  return parts.join(' | ');
}

/**
 * Extract structured hints from profile XML for playbook MODULE_HINTS_JSON.
 * Returns JSON string with negative preferences, top needs, and primary tools.
 */
export function buildModuleHints(profileXml: string | undefined): string {
  if (!profileXml) return '';

  const hints: Record<string, string[]> = {};

  const negPrefs = extractMany(profileXml, 'preference');
  if (negPrefs.length) hints.excludeTopics = negPrefs;

  const needs = extractMany(profileXml, 'need');
  if (needs.length) hints.prioritizeNeeds = needs;

  const tools = extractToolNames(profileXml);
  if (tools.length) hints.toolFocus = tools;

  if (Object.keys(hints).length === 0) return '';
  return JSON.stringify(hints);
}

function extractToolNames(xml: string): string[] {
  const re = /<tool\s+name="([^"]+)"/gi;
  const out: string[] = [];
  for (const match of xml.matchAll(re)) {
    const name = match[1]?.trim();
    if (name) out.push(name);
  }
  return out;
}

/**
 * Returns list of required fields that are still empty/missing in the profile XML.
 * Required: tools, role, seniority, artifacts, needs, skillsSelfReport OR performance, constraints
 * Recommended: negativePreferences
 */
export function getMissingRequiredFields(profileXml: string): { required: string[]; recommended: string[] } {
  const xml = typeof profileXml === 'string' ? profileXml : '';
  const required: string[] = [];
  const recommended: string[] = [];

  // Check array fields (need at least one item)
  if (extractMany(xml, 'tool').length === 0) required.push('tools');
  if (extractMany(xml, 'artifact').length === 0) required.push('artifacts');
  if (extractMany(xml, 'need').length === 0) required.push('needs');

  // Check scalar fields
  if (!extractFirst(xml, 'role')) required.push('role');
  if (!extractFirst(xml, 'seniority')) required.push('seniority');

  // Check skillsSelfReport (at least one attribute filled)
  const skillsAttrs = extractAttrs(xml, 'skillsSelfReport');
  const hasSkills = skillsAttrs && Object.values(skillsAttrs).some((v) => v && v.trim());
  if (!hasSkills) required.push('skillsSelfReport');

  // Check constraints (at least time_per_week or language)
  const constraintsAttrs = extractAttrs(xml, 'constraints');
  const hasConstraints = constraintsAttrs && Object.values(constraintsAttrs).some((v) => v && v.trim());
  if (!hasConstraints) required.push('constraints');

  // Recommended fields
  if (extractMany(xml, 'preference').length === 0) recommended.push('negativePreferences');
  if (!extractFirst(xml, 'learningStyle')) recommended.push('learningStyle');
  if (!extractFirst(xml, 'timeCommitment')) recommended.push('timeCommitment');

  return { required, recommended };
}
