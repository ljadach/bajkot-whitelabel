/**
 * Build a deterministic English portrait prompt for a child character, derived
 * from the concrete order fields (hair, eyes, skin, outfit, age, gender). Used
 * by A6 character designer and A7 illustrator so the style-vote reference and
 * in-book illustrations render the SAME child — not whatever fantasy A1 may
 * have hallucinated into characterProfile.descriptionEn.
 */

const HAIR_COLORS_EN: Record<string, string> = {
  blond: 'blond',
  jasny_braz: 'light brown',
  braz: 'brown',
  ciemny_braz: 'dark brown',
  czarny: 'black',
  rudy: 'ginger red',
};

const HAIR_STYLES_EN: Record<string, string> = {
  krotkie_proste: 'short straight',
  krotkie_falowane: 'short slightly wavy',
  srednie_proste: 'medium-length straight',
  srednie_falowane: 'medium-length wavy',
  dlugie_proste: 'long straight',
  dlugie_krecone: 'long curly',
  koki: 'styled in two buns',
  kucyk: 'tied in a ponytail',
};

const EYE_COLORS_EN: Record<string, string> = {
  niebieskie: 'blue',
  zielone: 'green',
  brazowe: 'brown',
  piwne: 'hazel',
  szare: 'gray',
};

const SKIN_TONES_EN: Record<string, string> = {
  jasna: 'fair',
  smietankowa: 'cream-toned',
  srednia: 'olive',
  ciemna: 'dark',
};

const OUTFITS_EN: Record<string, string> = {
  bluza_dinozaur: 'a yellow hoodie with a cartoon dinosaur print',
  bluza_jednorozec: 'a pink hoodie with a cartoon unicorn print',
  bluza_rakieta: 'a blue hoodie with a rocket print',
  bluza_kwiaty: 'a purple hoodie with a floral print',
  koszulka_serce: 'a white t-shirt with a red heart',
  koszulka_auto: 'a red t-shirt with a cartoon car',
  pizama_gwiazdy: 'blue pyjamas with a star pattern',
  pizama_misie: 'pink pyjamas with a teddy-bear pattern',
  sukienka_motyle: 'a yellow dress with a butterfly pattern',
  ogrodniczki: 'denim dungarees',
};

function ageLook(ageBracket: '3-5' | '6-8' | '9+', ageNumber?: number): string {
  if (typeof ageNumber === 'number' && ageNumber >= 3 && ageNumber <= 16) {
    return `${ageNumber}-year-old`;
  }
  if (ageBracket === '3-5') return '4-year-old';
  if (ageBracket === '6-8') return '7-year-old';
  return '10-year-old';
}

export interface ChildPortraitInput {
  gender: 'boy' | 'girl';
  ageBracket: '3-5' | '6-8' | '9+';
  ageNumber?: number;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  outfit: string;
  glasses: boolean;
}

/**
 * Build a one-sentence English description of the child as they appear in the
 * book. Always resolves — unknown enum keys fall back to a plain English gloss
 * of the key so Gemini still sees something coherent.
 */
export function buildChildPortrait(input: ChildPortraitInput): string {
  const age = ageLook(input.ageBracket, input.ageNumber);
  const kind = input.gender === 'boy' ? 'boy' : 'girl';
  const hairColor = HAIR_COLORS_EN[input.hairColor] ?? input.hairColor.replace(/_/g, ' ');
  const hairStyle = HAIR_STYLES_EN[input.hairStyle] ?? input.hairStyle.replace(/_/g, ' ');
  const eyes = EYE_COLORS_EN[input.eyeColor] ?? input.eyeColor.replace(/_/g, ' ');
  const skin = SKIN_TONES_EN[input.skinTone] ?? input.skinTone.replace(/_/g, ' ');
  const outfit = OUTFITS_EN[input.outfit] ?? input.outfit.replace(/_/g, ' ');
  const glasses = input.glasses ? ', wearing round glasses' : '';

  return `a friendly ${age} ${kind}, ${hairColor} ${hairStyle} hair, ${eyes} eyes, ${skin} skin, wearing ${outfit}${glasses}, rounded soft features, warm expression`;
}
