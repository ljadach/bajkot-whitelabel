import type { ReactNode } from 'react';

// Key phrases to emphasize (EN, DE, PL) - order matters: longer phrases first
const EMPHASIS_PATTERNS = [
  // Time/format - bite-sized learning (full phrases)
  /five-minute,?\s+high-impact\s+bursts?/gi,
  /five-minute\s+sessions?/gi,
  /five-minute\s+briefings?/gi,
  /fünfminütige\S*\s+Einheiten/gi,
  /fünfminütige\S*\s+Sitzungen/gi,
  /fünfminütige\S*\s+Briefings?/gi,
  /pięciominutow\S+\s+sesj\S+/gi,
  /pięciominutow\S+\s+briefing\S*/gi,

  // Learning approach (full phrases)
  /learning in bites/gi,
  /Lernen in Häppchen/gi,
  /nauki w pigułce/gi,
  /nauka w pigułce/gi,
  /high-bandwidth\s+AI\s+training/gi,
  /High-Bandwidth\s+KI-Training/gi,
  /wysokiej\s+jakości\s+szkoleni\w+\s+AI/gi,
  /adaptive\s+learning/gi,
  /adaptives\s+Lernen/gi,
  /adaptacyjne\s+uczenie/gi,

  // Personalization (full phrases)
  /personalize\s+the\s+learning\s+journey/gi,
  /personalize\s+the\s+journey/gi,
  /personalisieren\s+die\s+Lernreise/gi,
  /personalizować\s+ścieżkę\s+nauki/gi,
  /tailored\s+path\s+to\s+mastery/gi,
  /tailor\s+the\s+path/gi,
  /maßgeschneiderter?\s+Weg\s+zur\s+Meisterschaft/gi,
  /maßgeschneidert\S*\s+Lernpfad\S*/gi,
  /dostosowany\s+do\s+potrzeb/gi,
  /dostosowana\s+ścieżka/gi,

  // AI terms (full phrases)
  /AI\s+learning\s+stays?\s+fresh/gi,
  /AI\s+learning/gi,
  /AI\s+upskilling/gi,
  /AI\s+development/gi,
  /AI-Bewusstsein\s+zu\s+AI-Kompetenz/gi,
  /AI-Kompetenz/gi,
  /KI-Lernen/gi,
  /KI-Upskilling/gi,
  /KI-Entwicklung/gi,
  /KI-Kompetenz/gi,
  /rozwój\s+AI/gi,
  /nauka\s+AI/gi,
  /uczenie\s+AI/gi,
  /kompetencj\S+\s+AI/gi,
  /biegłości\s+w\s+AI/gi,
  /biegłość\s+w\s+AI/gi,

  // Bullet labels (PL/EN/DE)
  /Dla pracownika:/gi,
  /Dla organizacji:/gi,
  /For the employee:/gi,
  /For the organisation:/gi,
  /Für den Mitarbeiter:/gi,
  /Für die Organisation:/gi,

  // Target audience
  /edukator\S*/gi,
  /Pädagog\S*/gi,
  /educator\S*/gi,

  // Skills and mastery
  /map,?\s+measure,?\s+and\s+master/gi,
  /erfassen,?\s+messen\s+und\s+meistern/gi,
  /zmierzyć\s+i\s+opanować/gi,
  /master\s+the\s+skills/gi,
  /beherrschen\s+die\s+Fähigkeiten/gi,
  /opanować\s+umiejętności/gi,
  /umiejętności\s+AI/gi,

  // Competency/skills gap
  /competency\s+gap/gi,
  /competency\s+debt/gi,
  /Kompetenzlücke/gi,
  /Kompetenzschulden/gi,
  /luk\S+\s+kompetencyjn\S*/gi,
  /dług\S*\s+kompetencyjn\S*/gi,

  // Internal documentation / your data
  /your\s+internal\s+documentation/gi,
  /Ihre\S*\s+intern\S+\s+Dokumentation/gi,
  /wewnętrzn\S+\s+dokumentacj\S+/gi,

  // LLMs - key technology
  /\bLLMs?\b/g,

  // Generative AI
  /generative\s+AI/gi,
  /generative\s+KI/gi,
  /generatywn\S+\s+AI/gi,

  // Intelligence revolution/evolution
  /intelligence\s+revolution/gi,
  /Intelligenz-Revolution/gi,
  /rewolucj\S+\s+sztucznej\s+inteligencji/gi,
  /ewolucj\S+\s+sztucznej\s+inteligencji/gi,
];

export function emphasizeText(text: string, className = 'font-semibold text-neutral-800'): ReactNode[] {
  // Build a combined pattern
  const combinedPattern = new RegExp(`(${EMPHASIS_PATTERNS.map((p) => p.source).join('|')})`, 'gi');

  const parts = text.split(combinedPattern);

  return parts.map((part, index) => {
    // Check if this part matches any emphasis pattern
    const isEmphasis = EMPHASIS_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0; // Reset regex state
      return pattern.test(part);
    });

    if (isEmphasis && part.trim()) {
      return (
        <strong key={index} className={className}>
          {part}
        </strong>
      );
    }
    return part;
  });
}
