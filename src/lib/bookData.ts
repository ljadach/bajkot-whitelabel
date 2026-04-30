/**
 * Shared data maps for the book pipeline order form.
 * Keys match the schema in convex/schema.ts (bookOrders table).
 */

export const PROBLEMS = {
  fear_of_dark: { title_pl: 'Lek przed ciemnoscia', category: 'fears' },
  fear_of_doctor: { title_pl: 'Lek przed lekarzem / szpitalem', category: 'fears' },
  fear_of_separation: { title_pl: 'Lek separacyjny', category: 'fears' },
  fear_of_monsters: { title_pl: 'Lek przed potworami', category: 'fears' },
  tantrums: { title_pl: 'Napady zlosci / regulacja emocji', category: 'emotions' },
  jealousy_sibling: { title_pl: 'Zazdrosc o rodzenstwo', category: 'emotions' },
  low_self_esteem: { title_pl: 'Niska samoocena', category: 'emotions' },
  shyness: { title_pl: 'Niesmialnosc', category: 'social' },
  sharing_difficulty: { title_pl: 'Trudnosci z dzieleniem sie', category: 'social' },
  bullying: { title_pl: 'Dokuczanie / przemoc rowiesnicza', category: 'social' },
  picky_eating: { title_pl: 'Niejadek / wybiorczosc pokarmowa', category: 'routine' },
  potty_training: { title_pl: 'Nauka korzystania z toalety', category: 'routine' },
  screen_addiction: { title_pl: 'Nadmierne przywiazanie do ekranow', category: 'routine' },
  new_sibling: { title_pl: 'Nowe rodzenstwo w rodzinie', category: 'change' },
  moving_house: { title_pl: 'Przeprowadzka', category: 'change' },
  parents_divorce: { title_pl: 'Rozwod lub rozstanie rodzicow', category: 'change' },
  tooth_brushing: { title_pl: 'Opor przed myciem zebow', category: 'routine' },
  sensory_sensitivity: { title_pl: 'Nadwrazliwosc sensoryczna', category: 'emotions' },
  general_resilience: { title_pl: 'Ogolne wsparcie emocjonalne', category: 'emotions' },
} as const;

export type ProblemId = keyof typeof PROBLEMS;

export const PROBLEM_CATEGORIES = {
  fears: 'Leki i obawy',
  emotions: 'Emocje i zachowanie',
  social: 'Relacje spoleczne',
  routine: 'Nawyki i codziennosc',
  change: 'Zmiany w zyciu',
} as const;

export type ProblemCategory = keyof typeof PROBLEM_CATEGORIES;

export const AGE_BRACKETS = ['3-5', '6-8', '9+'] as const;
export type AgeBracket = (typeof AGE_BRACKETS)[number];

export const GENDERS = ['boy', 'girl'] as const;
export type Gender = (typeof GENDERS)[number];

export const HAIR_COLORS = {
  blond: 'Blond',
  jasny_braz: 'Jasny braz',
  braz: 'Braz',
  ciemny_braz: 'Ciemny braz',
  czarny: 'Czarny',
  rudy: 'Rudy',
} as const;

export const HAIR_STYLES = {
  krotkie_proste: 'Krotkie proste',
  krotkie_falowane: 'Krotkie falowane',
  srednie_proste: 'Srednie proste',
  srednie_falowane: 'Srednie falowane',
  dlugie_proste: 'Dlugie proste',
  dlugie_krecone: 'Dlugie krecone',
  koki: 'Koki',
  kucyk: 'Kucyk',
} as const;

export const EYE_COLORS = {
  niebieskie: 'Niebieskie',
  zielone: 'Zielone',
  brazowe: 'Brazowe',
  piwne: 'Piwne',
  szare: 'Szare',
} as const;

export const SKIN_TONES = {
  jasna: 'Jasna',
  smietankowa: 'Smietankowa',
  srednia: 'Oliwkowa',
  ciemna: 'Ciemna',
} as const;

export const OUTFITS = {
  bluza_dinozaur: 'Zolta bluza z dinozaurem',
  bluza_jednorozec: 'Rozowa bluza z jednorozcem',
  bluza_rakieta: 'Niebieska bluza z rakieta',
  bluza_kwiaty: 'Fioletowa bluza w kwiatki',
  koszulka_serce: 'Biala koszulka z sercem',
  koszulka_auto: 'Czerwona koszulka z autkiem',
  pizama_gwiazdy: 'Niebieska pizama w gwiazdki',
  pizama_misie: 'Rozowa pizama z misiami',
  sukienka_motyle: 'Zolta sukienka w motyle',
  ogrodniczki: 'Jeansowe ogrodniczki',
} as const;

/** All pipeline statuses for display in progress UI.
 *
 * `label` is the parent-facing copy shown on the progress page — keep it
 * friendly and free of internal jargon. The `agent` field is for admin/CLI
 * tooling and is hidden from parents in the UI.
 */
export const PIPELINE_STEPS = [
  { status: 'intake', agent: 'A0', label: 'Zaczynamy przygodę' },
  { status: 'profiling', agent: 'A1', label: 'Poznajemy Twoje dziecko' },
  { status: 'story_planning', agent: 'A2', label: 'Układamy historię' },
  { status: 'story_writing', agent: 'A3', label: 'Piszemy bajkę' },
  { status: 'psych_review', agent: 'A4', label: 'Sprawdzamy emocje' },
  { status: 'art_direction', agent: 'A5', label: 'Dobieramy styl ilustracji' },
  { status: 'character_design', agent: 'A6', label: 'Tworzymy bohatera' },
  { status: 'style_vote', agent: 'A6b', label: 'Wybór stylu' },
  { status: 'illustrating', agent: 'A7', label: 'Rysujemy ilustracje' },
  { status: 'visual_qa', agent: 'A8', label: 'Dopinamy detale' },
  { status: 'awaiting_dedication', agent: 'A8', label: 'Czekamy na dedykację' },
  { status: 'composing_pdf', agent: 'A9', label: 'Zbieramy bajkę w PDF' },
  { status: 'final_qa', agent: 'A10', label: 'Ostatnie poprawki' },
  { status: 'delivering', agent: 'A11', label: 'Już wysyłamy' },
  { status: 'completed', agent: null, label: 'Gotowe!' },
] as const;

export type BookOrderStatus = (typeof PIPELINE_STEPS)[number]['status'] | 'failed';
