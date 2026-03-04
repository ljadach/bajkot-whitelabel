/**
 * Problems catalog and appearance options for the book pipeline.
 * Ported from trustee-book-pipeline/demo/src/data/problems.ts.
 *
 * Keys are used as IDs in bookOrders form fields (problemId, hairColor, etc.).
 * Polish labels are for the order form UI; English values are for LLM prompts.
 */

import type { OutfitDefinition, ProblemDefinition, StyleDefinition } from './bookTypes';

// ── Problem Categories ───────────────────────────

export const PROBLEM_CATEGORIES: Record<string, string> = {
  fears: 'Lęki i obawy',
  emotions: 'Emocje i zachowanie',
  social: 'Relacje społeczne',
  routine: 'Nawyki i codzienność',
  change: 'Zmiany w życiu',
};

// ── Problems ─────────────────────────────────────

export const PROBLEMS: Record<string, ProblemDefinition> = {
  // === fears ===
  fear_of_dark: {
    title_pl: 'Lęk przed ciemnością',
    context_pl:
      'Dziecko boi się braku kontroli. Pokaż, że ciemność kryje ciekawe rzeczy, nie straszne.',
    metaphor_pl: 'Latarka zmieniająca cienie w przyjazne zwierzęta. Strażnik Snów.',
    category: 'fears',
  },
  fear_of_doctor: {
    title_pl: 'Lęk przed lekarzem / szpitalem',
    context_pl:
      'Dziecko odczuwa lęk przed nieznanym środowiskiem medycznym i bólem. Pokaż lekarza jako sojusznika, a narzędzia jako magiczne pomocniki.',
    metaphor_pl:
      'Szpital to warsztat naprawczy superbohaterów, a stetoskop słucha historii serca. Doktor Iskierka.',
    category: 'fears',
  },
  fear_of_separation: {
    title_pl: 'Lęk separacyjny',
    context_pl:
      'Dziecko boi się rozłąki z opiekunem. Pokaż, że miłość nie znika gdy rodzic wychodzi — zawsze wraca.',
    metaphor_pl:
      'Niewidzialna nitka łącząca serca dziecka i rodzica, świecąca nawet przez ściany. Elfik Powrócik.',
    category: 'fears',
  },
  fear_of_monsters: {
    title_pl: 'Lęk przed potworami',
    context_pl:
      'Dziecko widzi zagrożenia w cieniach i dźwiękach. Pokaż, że potwory można oswoić — wyobraźnia działa w dwie strony.',
    metaphor_pl:
      'Potwory to zagubione, nieśmiałe stworzenia potrzebujące przyjaciela. Potworek Mrumś.',
    category: 'fears',
  },

  // === emotions ===
  tantrums: {
    title_pl: 'Napady złości / trudności z regulacją emocji',
    context_pl:
      'Dziecko nie umie jeszcze zarządzać silnymi emocjami. Pokaż, że złość to sygnał, nie wróg.',
    metaphor_pl: 'Wulkan emocji, który można oswoić oddechem. Smok Bąbelek.',
    category: 'emotions',
  },
  jealousy_sibling: {
    title_pl: 'Zazdrość o rodzeństwo',
    context_pl:
      'Dziecko czuje, że traci pozycję i miłość rodziców. Pokaż, że miłość się mnoży, nie dzieli.',
    metaphor_pl:
      'Serce rodzica to magiczny ogród — im więcej kwiatów, tym piękniejszy. Wróżka Dośćdlawszystkich.',
    category: 'emotions',
  },
  low_self_esteem: {
    title_pl: 'Niska samoocena',
    context_pl:
      'Dziecko nie wierzy w swoje możliwości. Pokaż mu unikalne talenty i siłę, którą już ma.',
    metaphor_pl: 'Magiczne lustro pokazujące ukryte supermoce dziecka. Kameleon Kolorusz.',
    category: 'emotions',
  },

  // === social ===
  shyness: {
    title_pl: 'Nieśmiałość',
    context_pl:
      'Dziecko chce uczestniczyć, ale boi się odrzucenia. Pokaż, że pierwszy krok jest najtrudniejszy — a potem robi się łatwiej.',
    metaphor_pl: 'Muszla, z której wychodzi perła dopiero gdy się otworzy. Ślimak Odważniak.',
    category: 'social',
  },
  sharing_difficulty: {
    title_pl: 'Trudności z dzieleniem się',
    context_pl:
      'Dziecko broni swoich rzeczy ze strachu przed utratą. Pokaż, że dzielenie się tworzy więcej radości, nie mniej.',
    metaphor_pl:
      'Magiczny plecak — im więcej z niego dajesz, tym więcej się w nim pojawia. Chomik Dzieluszek.',
    category: 'social',
  },
  bullying: {
    title_pl: 'Dokuczanie / bycie ofiarą przemocy rówieśniczej',
    context_pl:
      'Dziecko doświadcza wykluczenia lub agresji. Pokaż siłę w proszeniu o pomoc i budowaniu sojuszów.',
    metaphor_pl:
      'Tarcza odwagi, która rośnie gdy się o nią poprosisz — rycerze nigdy nie walczą sami. Rycerz Sojusz.',
    category: 'social',
  },

  // === routine ===
  picky_eating: {
    title_pl: 'Niejadek / wybiórczość pokarmowa',
    context_pl:
      'Dziecko odmawia jedzenia lub je bardzo wybiórczo. Pokaż jedzenie jako przygodę, nie obowiązek.',
    metaphor_pl: 'Magiczna kuchnia, gdzie każdy smak to nowa kraina. Kucharz Zdzichu.',
    category: 'routine',
  },
  potty_training: {
    title_pl: 'Nauka korzystania z nocnika / toalety',
    context_pl:
      'Dziecko opiera się lub boi nowego etapu. Pokaż nocnik jako „tron" przygody, nie obowiązek.',
    metaphor_pl: 'Magiczny tron, na którym siada każdy prawdziwy odkrywca. Żabka Plusik.',
    category: 'routine',
  },
  screen_addiction: {
    title_pl: 'Nadmierne przywiązanie do ekranów',
    context_pl:
      'Dziecko nie chce oderwać się od tabletu/TV. Pokaż, że prawdziwy świat jest ciekawszy niż ekran.',
    metaphor_pl: 'Ekran to okno — ale drzwi prowadzą do prawdziwych przygód. Motyl Wyłącznik.',
    category: 'routine',
  },

  // === change ===
  new_sibling: {
    title_pl: 'Nowe rodzeństwo w rodzinie',
    context_pl:
      'Dziecko mierzy się z nową rolą starszego brata/siostry. Pokaż, że to awans, nie degradacja.',
    metaphor_pl: 'Korona starszego rodzeństwa z magicznymi mocami opiekuna. Miś Starszak.',
    category: 'change',
  },
  moving_house: {
    title_pl: 'Przeprowadzka',
    context_pl:
      'Dziecko traci znane otoczenie i rutynę. Pokaż, że wspomnienia podróżują z nami, a nowe miejsce czeka na odkrycie.',
    metaphor_pl:
      'Magiczna walizka wspomnień, która otwiera portale do nowych przygód. Żółwik Domek.',
    category: 'change',
  },
};

// ── Appearance Maps ──────────────────────────────

export const HAIR_COLOR_MAP: Record<string, string> = {
  blond: 'blonde',
  jasny_braz: 'light brown',
  braz: 'brown',
  ciemny_braz: 'dark brown',
  czarny: 'black',
  rudy: 'red / ginger',
};

export const HAIR_STYLE_MAP: Record<string, string> = {
  krotkie_proste: 'short and straight',
  krotkie_falowane: 'short and slightly wavy',
  srednie_proste: 'medium-length and straight',
  srednie_falowane: 'medium-length and wavy',
  dlugie_proste: 'long and straight',
  dlugie_krecone: 'long and curly',
  koki: 'in pigtails',
  kucyk: 'in a ponytail',
};

export const EYE_COLOR_MAP: Record<string, string> = {
  niebieskie: 'blue',
  zielone: 'green',
  brazowe: 'brown',
  piwne: 'hazel',
  szare: 'gray',
};

export const SKIN_TONE_MAP: Record<string, string> = {
  jasna: 'light / fair skin',
  srednia: 'medium / olive skin',
  ciemna: 'dark brown skin',
  smietankowa: 'cream / peachy skin',
};

export const OUTFIT_MAP: Record<string, OutfitDefinition> = {
  bluza_dinozaur: {
    pl: 'żółta bluza z dinozaurem',
    en: 'yellow hoodie with green dinosaur print',
  },
  bluza_jednorozec: {
    pl: 'różowa bluza z jednorożcem',
    en: 'pink hoodie with unicorn print',
  },
  bluza_rakieta: {
    pl: 'niebieska bluza z rakietą',
    en: 'blue hoodie with rocket print',
  },
  bluza_kwiaty: {
    pl: 'fioletowa bluza w kwiatki',
    en: 'purple hoodie with flower pattern',
  },
  koszulka_serce: {
    pl: 'biała koszulka z sercem',
    en: 'white t-shirt with red heart print',
  },
  koszulka_auto: {
    pl: 'czerwona koszulka z autkiem',
    en: 'red t-shirt with toy car print',
  },
  pizama_gwiazdy: {
    pl: 'niebieska piżama w gwiazdki',
    en: 'blue pajamas with star pattern',
  },
  pizama_misie: {
    pl: 'różowa piżama z misiami',
    en: 'pink pajamas with teddy bear pattern',
  },
  sukienka_motyle: {
    pl: 'żółta sukienka w motyle',
    en: 'yellow dress with butterfly pattern',
  },
  ogrodniczki: {
    pl: 'jeansowe ogrodniczki',
    en: 'denim overalls with front pocket',
  },
};

// ── Art Style Definitions ────────────────────────

export const STYLE_A: StyleDefinition = {
  id: 'A',
  name_pl: 'Styl mieszany (Rocio Bonilla)',
  name_en: 'Mixed Media Illustration (Rocio Bonilla)',
  style:
    "Bold graphic mixed-media children's book illustration with thick black ink outlines and paper collage textures",
  modifiers:
    'THICK BLACK INK OUTLINES around every shape, heavy bold linework like a graphic novel, torn paper collage elements and craft paper textures, FLAT color fills with NO gradients, strictly limited palette of 3-4 strong saturated colors (red, yellow, teal, black), visible rough pencil sketching underneath the ink, white cream paper background showing through everywhere, characters have oversized heads and small round bodies with exaggerated cartoon expressions, big dot eyes, scrapbook cutout aesthetic, editorial illustration style, shapes are geometric and simplified, NO soft edges NO blending NO watercolor effects, everything has a hard defined edge, hand-stamped and hand-cut feel, kraft paper and newsprint collage pieces visible',
};

export const STYLE_B: StyleDefinition = {
  id: 'B',
  name_pl: 'Styl akwarelowy (Jona Jung)',
  name_en: 'Ecoline & Colored Pencil Illustration (Jona Jung)',
  style:
    'Soft dreamy fine-art watercolor painting with NO outlines and wet paint washes bleeding into paper',
  modifiers:
    'ABSOLUTELY NO OUTLINES no linework no ink lines, soft feathered edges where paint meets paper, wet-on-wet watercolor technique with visible paint drips and water blooms, FULL RICH SATURATED RAINBOW PALETTE with smooth gradient color transitions from warm to cool, dreamy ethereal atmosphere with soft focus misty backgrounds, characters gently blend into the painted background with lost edges, visible paper grain texture through transparent watercolor layers, paint pooling and granulation effects, delicate translucent color overlays, atmospheric perspective with pale distant washes, painterly and impressionistic, every surface looks WET and freshly painted, like a fine art watercolor gallery piece, luminous backlit glow through transparent pigments, NO hard edges NO black lines NO flat fills',
};
