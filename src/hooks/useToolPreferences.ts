import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Doc } from '../../convex/_generated/dataModel';

export interface ToolPreferences {
  glossatorMargin: boolean;
  workbenchTabs: boolean;
  feynmanOracle: boolean;
  chapterProbes: boolean;
}

const DEFAULTS: ToolPreferences = {
  glossatorMargin: false,
  workbenchTabs: false,
  feynmanOracle: false,
  chapterProbes: false,
};

export function useToolPreferences(profile: Doc<'userProfiles'> | null | undefined) {
  const updateMutation = useMutation(api.profiles.updateToolPreferences);
  const preferences: ToolPreferences = profile?.toolPreferences ?? DEFAULTS;

  const toggleTool = (tool: keyof ToolPreferences) => {
    void updateMutation({
      toolPreferences: { ...preferences, [tool]: !preferences[tool] },
    });
  };

  return { preferences, toggleTool };
}
