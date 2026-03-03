/* eslint-disable react-refresh/only-export-components -- context + hooks colocated by convention */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type PersonaId = 'cto' | 'cfo' | 'plumber' | 'marketer' | 'custom';

export interface Persona {
  id: PersonaId;
  name: string;
  description: string;
}

export const PERSONAS: Record<Exclude<PersonaId, 'custom'>, Persona> = {
  cto: {
    id: 'cto',
    name: 'CTO - Chief Technology Officer',
    description: `CTO at a mid-size tech company. 15+ years experience. Uses ChatGPT Plus, Claude Pro, GitHub Copilot daily. Creates technical docs and code reviews. Wants to learn advanced prompt engineering.`,
  },
  cfo: {
    id: 'cfo',
    name: 'CFO - Chief Financial Officer',
    description: `CFO at a manufacturing company. 20 years finance experience. Just started using ChatGPT for financial analysis. Creates financial reports and presentations.`,
  },
  plumber: {
    id: 'plumber',
    name: 'Hydraulik / Plumber',
    description: `Self-employed plumber. 10 years experience. Not tech-savvy, never used AI. Creates quotes and invoices. Speaks Polish primarily.`,
  },
  marketer: {
    id: 'marketer',
    name: 'Marketing Manager',
    description: `Marketing Manager at e-commerce startup. Uses Jasper AI, ChatGPT, Midjourney regularly. Creates ad copy and content. Expert in digital marketing.`,
  },
};

interface AutoFillContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  personaId: PersonaId;
  setPersonaId: (id: PersonaId) => void;
  customPersona: string;
  setCustomPersona: (description: string) => void;
  getActivePersonaDescription: () => string;
}

const AutoFillContext = createContext<AutoFillContextValue | null>(null);

export function AutoFillProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [personaId, setPersonaId] = useState<PersonaId>('cto');
  const [customPersona, setCustomPersona] = useState('');

  const getActivePersonaDescription = useCallback(() => {
    if (personaId === 'custom') {
      return customPersona;
    }
    return PERSONAS[personaId]?.description || PERSONAS.cto.description;
  }, [personaId, customPersona]);

  return (
    <AutoFillContext.Provider
      value={{
        enabled,
        setEnabled,
        personaId,
        setPersonaId,
        customPersona,
        setCustomPersona,
        getActivePersonaDescription,
      }}
    >
      {children}
    </AutoFillContext.Provider>
  );
}

export function useAutoFill() {
  const context = useContext(AutoFillContext);
  if (!context) {
    throw new Error('useAutoFill must be used within AutoFillProvider');
  }
  return context;
}

// Safe hook that returns null if not in provider (for ChatStep)
export function useAutoFillSafe() {
  return useContext(AutoFillContext);
}
