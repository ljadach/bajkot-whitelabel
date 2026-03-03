import { useMemo, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAutoFillSafe, PERSONAS, PersonaId } from './AutoFillContext';

export function DebugTabApp() {
  const user = useQuery(api.auth.loggedInUser);
  const profile = useQuery(api.profiles.getCurrentProfile);
  const resetProfileMutation = useMutation(api.profiles.resetProfile);
  const autoFill = useAutoFillSafe();

  const clearGeneratedMaterials = useMutation(api.profiles.clearGeneratedMaterials);
  const dumpCourse = useAction(api.admin.debugContent.dumpCourseForUser);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [isXmlExpanded, setIsXmlExpanded] = useState(false);
  const [formattedXml, setFormattedXml] = useState<string | null>(null);
  const [isFormattingXml, setIsFormattingXml] = useState(false);
  const [showCustomPersona, setShowCustomPersona] = useState(false);
  const [isAutoFillExpanded, setIsAutoFillExpanded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetProfile = async () => {
    if (!confirm('Reset profile? This will clear all chat history and progress.')) return;
    setIsResetting(true);
    try {
      await resetProfileMutation();
      window.location.reload();
    } catch (e) {
      console.error('Reset failed:', e);
      alert('Reset failed: ' + (e as Error).message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportCourse = async () => {
    setIsExporting(true);
    try {
      const content = await dumpCourse();
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course-dump-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed: ' + (e as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegenerateMaterials = async () => {
    if (!confirm('Regenerate all materials? This will clear tip, outline, handbooks, and exercises, then regenerate them.')) return;
    setIsRegenerating(true);
    try {
      await clearGeneratedMaterials();
      // Navigate to /plan — PlanStep's useEffects will auto-regenerate everything
      window.location.href = '/plan';
    } catch (e) {
      console.error('Regeneration failed:', e);
      alert('Regeneration failed: ' + (e as Error).message);
      setIsRegenerating(false);
    }
  };

  const missingFields = useMemo(() => {
    const xml = typeof profile?.profileXml === 'string' ? profile.profileXml : '';
    return getMissingRequiredFields(xml);
  }, [profile?.profileXml]);

  return (
    <div className="space-y-4 text-sm">
      {/* Auto-Fill Chat */}
      {autoFill && (
        <div className={`rounded-lg border p-3 ${autoFill.enabled ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
          {/* Header with expand button and active badge */}
          <div className="flex items-center justify-between">
            <button onClick={() => setIsAutoFillExpanded(!isAutoFillExpanded)} className="flex items-center gap-2 font-semibold hover:text-gray-700 transition-colors">
              <svg className={`w-4 h-4 transition-transform ${isAutoFillExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span>Auto-Fill Chat</span>
            </button>
            {autoFill.enabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Active
              </span>
            )}
          </div>

          {/* Expanded form */}
          {isAutoFillExpanded && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-gray-600">When activated on /chat, responses will be auto-generated based on the selected persona after 0.2s of inactivity.</p>

              {/* Persona selector */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Persona</label>
                <select
                  value={autoFill.personaId}
                  onChange={(e) => {
                    const id = e.target.value as PersonaId;
                    autoFill.setPersonaId(id);
                    setShowCustomPersona(id === 'custom');
                  }}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {Object.values(PERSONAS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="custom">Custom persona...</option>
                </select>
              </div>

              {/* Persona description preview */}
              {autoFill.personaId !== 'custom' && autoFill.personaId in PERSONAS && <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">{PERSONAS[autoFill.personaId].description}</div>}

              {/* Custom persona input */}
              {(autoFill.personaId === 'custom' || showCustomPersona) && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Custom Persona Description</label>
                  <textarea
                    value={autoFill.customPersona}
                    onChange={(e) => autoFill.setCustomPersona(e.target.value)}
                    placeholder="Describe the persona in detail: role, experience, AI tools used, what they create, learning goals, time available, language preferences..."
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    rows={4}
                  />
                </div>
              )}

              {/* Activate / Deactivate button */}
              <button onClick={() => autoFill.setEnabled(!autoFill.enabled)} className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${autoFill.enabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                {autoFill.enabled ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clerk User ID */}
      {user?.clerkUserId && (
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="mb-1 font-semibold">Clerk User ID</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-50 px-2 py-1 text-xs text-gray-800 select-all break-all">{user.clerkUserId}</code>
            <button onClick={() => void navigator.clipboard.writeText(user.clerkUserId)} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:border-gray-500 hover:bg-gray-50">
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Reset Profile */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-red-700">Reset Profile</div>
            <p className="text-xs text-red-600">Clear all chat history, progress, and start fresh</p>
          </div>
          <button data-testid="reset-profile-button" onClick={() => void handleResetProfile()} disabled={isResetting} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {isResetting ? 'Resetting...' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Regenerate Materials */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-amber-700">Regenerate Materials</div>
            <p className="text-xs text-amber-600">Re-generate tip, outline, handbooks &amp; exercises</p>
          </div>
          <button onClick={() => void handleRegenerateMaterials()} disabled={isRegenerating} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {isRegenerating ? 'Clearing...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Export Course */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-blue-700">Export Course</div>
            <p className="text-xs text-blue-600">Download all generated content as .md file</p>
          </div>
          <button onClick={() => void handleExportCourse()} disabled={isExporting} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Missing Fields Indicator */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 font-semibold">Profile Completeness</div>
        {missingFields.required.length === 0 ? (
          <div className="text-green-600 font-medium">All required fields filled</div>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="text-red-600 font-medium">Missing required ({missingFields.required.length}):</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {missingFields.required.map((field) => (
                  <span key={field} className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    {field}
                  </span>
                ))}
              </div>
            </div>
            {missingFields.recommended.length > 0 && (
              <div>
                <span className="text-amber-600 text-sm">Missing recommended:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {missingFields.recommended.map((field) => (
                    <span key={field} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <XmlBox
        title="Profile XML"
        xml={typeof profile?.profileXml === 'string' ? profile.profileXml : ''}
        formattedXml={formattedXml}
        isFormatting={isFormattingXml}
        onFormat={async () => {
          const xml = typeof profile?.profileXml === 'string' ? profile.profileXml : '';
          if (!xml.trim()) return;
          setIsFormattingXml(true);
          try {
            const next = await formatXmlWithPrettier(xml);
            setFormattedXml(next);
          } catch (e) {
            console.warn('Failed to format XML', e);
            setFormattedXml(null);
          } finally {
            setIsFormattingXml(false);
          }
        }}
        onExpand={() => setIsXmlExpanded(true)}
        onCopy={async () => {
          const xml = (formattedXml && formattedXml.trim()) || (typeof profile?.profileXml === 'string' ? profile.profileXml : '');
          if (!xml) return;
          try {
            await navigator.clipboard.writeText(xml);
          } catch (e) {
            console.warn('Clipboard copy failed', e);
          }
        }}
      />

      {/* Inferred AI Fluency */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-2 font-semibold">Inferred AI Fluency</div>
        {profile?.inferredAiFluency ? (
          <>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{profile.inferredAiFluency.score}</span>
                <span className="text-gray-500">/100</span>
              </div>
              <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${profile.inferredAiFluency.score}%`,
                    backgroundColor: profile.inferredAiFluency.score >= 80 ? '#22c55e' : profile.inferredAiFluency.score >= 60 ? '#f97316' : profile.inferredAiFluency.score >= 40 ? '#ff6b35' : '#ef4444',
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2">{profile.inferredAiFluency.justification}</p>
            {profile.inferredAiFluency.inferredAt && <p className="text-xs text-gray-400">Inferred at: {new Date(profile.inferredAiFluency.inferredAt).toLocaleString()}</p>}
          </>
        ) : (
          <p className="text-xs text-gray-400 italic">Not inferred yet (run verification step)</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DebugBox title="Assessment Report (present)" value={!!profile?.assessmentReport} />
        <DebugBox title="Plan Outline (pages)" value={outlineLen(profile?.planOutline)} />
        <DebugBox title="Plan Full (pages)" value={outlineLen(profile?.planFull)} />
      </div>

      {isXmlExpanded && (
        <XmlModal
          title="Profile XML"
          xml={(formattedXml && formattedXml.trim()) || (typeof profile?.profileXml === 'string' ? profile.profileXml : '')}
          onClose={() => setIsXmlExpanded(false)}
          onCopy={async () => {
            const xml = (formattedXml && formattedXml.trim()) || (typeof profile?.profileXml === 'string' ? profile.profileXml : '');
            if (!xml) return;
            try {
              await navigator.clipboard.writeText(xml);
            } catch (e) {
              console.warn('Clipboard copy failed', e);
            }
          }}
          onFormat={async () => {
            const xml = typeof profile?.profileXml === 'string' ? profile.profileXml : '';
            if (!xml.trim()) return;
            setIsFormattingXml(true);
            try {
              const next = await formatXmlWithPrettier(xml);
              setFormattedXml(next);
            } catch (e) {
              console.warn('Failed to format XML', e);
              setFormattedXml(null);
            } finally {
              setIsFormattingXml(false);
            }
          }}
          isFormatting={isFormattingXml}
        />
      )}
    </div>
  );
}

function DebugBox({ title, value }: { title: string; value: string | number | boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-1 font-semibold">{title}</div>
      <pre className="max-h-60 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-800">{pretty(value)}</pre>
    </div>
  );
}

function pretty(v: string | number | boolean): string {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function outlineLen(value?: string) {
  if (!value) return 0;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function XmlBox({ title, xml, formattedXml, isFormatting, onFormat, onExpand, onCopy }: { title: string; xml: string; formattedXml: string | null; isFormatting: boolean; onFormat: () => void | Promise<void>; onExpand: () => void; onCopy: () => void | Promise<void> }) {
  const display = (formattedXml && formattedXml.trim()) || xml || '';
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => void onCopy()} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:border-gray-500 hover:bg-gray-50">
            Copy
          </button>
          <button onClick={() => void onFormat()} disabled={isFormatting || !xml.trim()} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50">
            {isFormatting ? 'Formatting…' : 'Format'}
          </button>
          <button onClick={onExpand} disabled={!display.trim()} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50">
            Expand
          </button>
        </div>
      </div>
      <pre className="max-h-60 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-800">{display || '—'}</pre>
    </div>
  );
}

function XmlModal({ title, xml, onClose, onCopy, onFormat, isFormatting }: { title: string; xml: string; onClose: () => void; onCopy: () => void | Promise<void>; onFormat: () => void | Promise<void>; isFormatting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="font-semibold">{title}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => void onCopy()} className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:border-gray-500 hover:bg-gray-50">
              Copy
            </button>
            <button onClick={() => void onFormat()} disabled={isFormatting || !xml.trim()} className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50">
              {isFormatting ? 'Formatting…' : 'Format'}
            </button>
            <button onClick={onClose} className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white hover:bg-black">
              Close
            </button>
          </div>
        </div>
        <pre className="max-h-[70vh] overflow-auto bg-gray-50 p-4 text-xs text-gray-800">{xml || '—'}</pre>
      </div>
    </div>
  );
}

async function formatXmlWithPrettier(xml: string): Promise<string> {
  const [{ default: prettier }, { default: htmlPlugin }] = await Promise.all([import('prettier/standalone'), import('prettier/plugins/html')]);
  return prettier.format(xml, {
    parser: 'html',
    plugins: [htmlPlugin],
    htmlWhitespaceSensitivity: 'ignore',
    printWidth: 120,
  });
}

// Simple XML parsing helpers (client-side version)
function getMissingRequiredFields(profileXml: string): { required: string[]; recommended: string[] } {
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

function extractFirst(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(re);
  if (!match) return undefined;
  const value = (match[1] ?? '').trim();
  return value || undefined;
}

function extractMany(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  for (const match of xml.matchAll(re)) {
    const value = (match[1] ?? '').trim();
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
    const value = a[2] ?? '';
    if (key) attrs[key] = value;
  }
  return Object.keys(attrs).length ? attrs : undefined;
}
