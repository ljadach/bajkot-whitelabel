/**
 * Polish child-name declension — small table + last-letter heuristics.
 *
 * Used by the PDF composer to render constructions like "dla {name}",
 * "stworzone z miłością dla {name}", which require the genitive case.
 * For names we don't recognise we fall through to a heuristic; if even
 * that fails (e.g. a non-Polish name), `null` is returned so the caller
 * can pick a phrasing that avoids the inflected slot.
 *
 * Scope: nominative → genitive only. The other cases (dative/vocative)
 * can be added the day they're actually needed; right now only genitive
 * shows up in user-facing copy.
 */

/**
 * Hand-curated nominative → genitive map for the ~80 most common Polish
 * given names. Lower-cased keys; recapitalised on output to match input
 * casing.
 */
const GENITIVE: Record<string, string> = {
  // ── Male ───────────────────────────────────────────
  adam: 'adama',
  adrian: 'adriana',
  aleksander: 'aleksandra',
  alex: 'alexa',
  antek: 'antka',
  antoni: 'antoniego',
  bartek: 'bartka',
  bartłomiej: 'bartłomieja',
  borys: 'borysa',
  brunon: 'brunona',
  daniel: 'daniela',
  dawid: 'dawida',
  dominik: 'dominika',
  filip: 'filipa',
  franciszek: 'franciszka',
  franek: 'franka',
  gabriel: 'gabriela',
  gustaw: 'gustawa',
  hubert: 'huberta',
  igor: 'igora',
  ignacy: 'ignacego',
  jakub: 'jakuba',
  jan: 'jana',
  janek: 'janka',
  jaś: 'jasia',
  jeremi: 'jeremiego',
  jerzy: 'jerzego',
  jonasz: 'jonasza',
  kacper: 'kacpra',
  kamil: 'kamila',
  karol: 'karola',
  kazimierz: 'kazimierza',
  krzysztof: 'krzysztofa',
  kuba: 'kuby',
  leon: 'leona',
  łukasz: 'łukasza',
  maciej: 'macieja',
  maciek: 'maćka',
  marcel: 'marcela',
  marcin: 'marcina',
  marek: 'marka',
  mateusz: 'mateusza',
  michał: 'michała',
  mikołaj: 'mikołaja',
  miłosz: 'miłosza',
  nikodem: 'nikodema',
  oliwier: 'oliwiera',
  oskar: 'oskara',
  patryk: 'patryka',
  paweł: 'pawła',
  piotr: 'piotra',
  rafał: 'rafała',
  robert: 'roberta',
  sebastian: 'sebastiana',
  stanisław: 'stanisława',
  staś: 'stasia',
  szymon: 'szymona',
  tadeusz: 'tadeusza',
  tobiasz: 'tobiasza',
  tomasz: 'tomasza',
  tomek: 'tomka',
  tymon: 'tymona',
  wiktor: 'wiktora',
  wojciech: 'wojciecha',
  wojtek: 'wojtka',
  zbigniew: 'zbigniewa',

  // ── Female ─────────────────────────────────────────
  agata: 'agaty',
  agnieszka: 'agnieszki',
  aleksandra: 'aleksandry',
  alicja: 'alicji',
  amelia: 'amelii',
  anastazja: 'anastazji',
  ania: 'ani',
  anna: 'anny',
  antonina: 'antoniny',
  barbara: 'barbary',
  basia: 'basi',
  bianka: 'bianki',
  dominika: 'dominiki',
  dorota: 'doroty',
  emilia: 'emilii',
  ewa: 'ewy',
  gabriela: 'gabrieli',
  hania: 'hani',
  helena: 'heleny',
  ida: 'idy',
  iga: 'igi',
  inga: 'ingi',
  joanna: 'joanny',
  julia: 'julii',
  kalina: 'kaliny',
  karolina: 'karoliny',
  kasia: 'kasi',
  katarzyna: 'katarzyny',
  klara: 'klary',
  laura: 'laury',
  lena: 'leny',
  liliana: 'liliany',
  maja: 'mai',
  magda: 'magdy',
  magdalena: 'magdaleny',
  małgorzata: 'małgorzaty',
  maria: 'marii',
  marta: 'marty',
  martyna: 'martyny',
  marysia: 'marysi',
  mia: 'mii',
  michalina: 'michaliny',
  mila: 'mili',
  monika: 'moniki',
  natalia: 'natalii',
  nina: 'niny',
  ola: 'oli',
  oliwia: 'oliwii',
  paulina: 'pauliny',
  pola: 'poli',
  sara: 'sary',
  weronika: 'weroniki',
  wiktoria: 'wiktorii',
  zofia: 'zofii',
  zosia: 'zosi',
  zuzanna: 'zuzanny',
};

/** Match the casing of `template` onto `lower` (single token, no spaces). */
function recase(lower: string, template: string): string {
  if (!template) return lower;
  // If the original has any uppercase, capitalise first letter of result.
  if (template[0] === template[0].toUpperCase()) {
    return lower[0].toUpperCase() + lower.slice(1);
  }
  return lower;
}

const SOFT_BEFORE_A = /(?:ci|si|zi|ni|dzi|cj|j)a$/;
const HARD_CONSONANT_ENDING = /(?:[bcdfghjklmnprstwxz]|cz|sz|rz|ch|dz|dź|dż)$/;

/**
 * Heuristic genitive form for names not in the lookup table. Returns
 * `null` when the heuristic isn't confident enough (e.g. a 1-character
 * input or a foreign-shape ending like -y); the caller should fall back
 * to a phrasing that doesn't require the genitive in that case.
 */
function heuristicGenitive(lower: string): string | null {
  if (lower.length < 2) return null;

  // -ek → drop 'e' + 'a'  (Marek→Marka, Tomek→Tomka)
  if (lower.endsWith('ek')) return lower.slice(0, -2) + 'ka';

  // -ia / -ja → -ii / -ji  (Julia→Julii, Aja→Aji)
  if (lower.endsWith('ia') || lower.endsWith('ja')) return lower.slice(0, -1) + 'i';

  // Soft -nia / -sia / -cia / -zia / -dzia → -ni / -si / ...
  if (SOFT_BEFORE_A.test(lower)) return lower.slice(0, -1);

  // -a → -y  (Anna→Anny, Marta→Marty, Klara→Klary)
  if (lower.endsWith('a')) return lower.slice(0, -1) + 'y';

  // -ś (Maciek-style soft) → -sia. Catch standalone soft endings.
  if (lower.endsWith('ś')) return lower.slice(0, -1) + 'sia';

  // -i / -y adjective-style → +ego  (Antoni→Antoniego). Skip for foreign
  // names that happen to end in 'y' but aren't Polish (Tony, Bobby) — we
  // can't reliably tell, so be conservative and bail.
  if (lower.endsWith('i') && lower.length >= 4) return lower + 'ego';

  // Hard consonant ending → +a  (Adam→Adama, Karol→Karola, Wiktor→Wiktora)
  if (HARD_CONSONANT_ENDING.test(lower)) return lower + 'a';

  return null;
}

/**
 * Return the genitive form of a Polish given name, or `null` if we
 * couldn't produce one with reasonable confidence.
 *
 * @param name Nominative form as supplied by the parent.
 */
export function genitiveOf(name: string | undefined | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const tableHit = GENITIVE[lower];
  if (tableHit) return recase(tableHit, trimmed);
  const heuristic = heuristicGenitive(lower);
  return heuristic ? recase(heuristic, trimmed) : null;
}

/**
 * Build a "dla {name}" string with the genitive applied. Returns `null`
 * when the name is unrecognised so the caller can swap to a phrasing
 * that doesn't need the inflected form.
 */
export function dlaName(name: string | undefined | null): string | null {
  const g = genitiveOf(name);
  return g ? `dla ${g}` : null;
}
