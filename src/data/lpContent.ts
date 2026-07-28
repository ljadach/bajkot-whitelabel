/**
 * Shared (problem-independent) content for the LP v4 layout.
 * Per c3z decision (2026-07-28): print photos, promo video, sample book and
 * reviews stay shared across all topics — no per-problem variants planned.
 */
import { GENERATION_MINUTES, DELIVERY_DAYS_TEXT } from '../lib/pricing';

/**
 * "Wpisz imię" demo stays hidden until the storyOpenings copy is reviewed
 * (spec-lp-v4-rollout.md). Lives here — outside the component — so the flag
 * doesn't force TopicNameDemo (and its 68 KB of story data) into the bundle.
 */
export const SHOW_NAME_DEMO = false;

export interface GalleryPhoto {
  src: string;
  caption: string;
}

export const PRINT_GALLERY: GalleryPhoto[] = [
  { src: '/lp/druk-okladka.webp', caption: 'Okładka wydrukowanej książki' },
  { src: '/lp/druk-w-rekach.webp', caption: 'Książka prosto z paczki' },
  { src: '/lp/druk-rozkladowka.webp', caption: 'Rozkładówka: ilustracja i tekst' },
  { src: '/lp/druk-portret.webp', caption: 'Portret bohaterki w środku książki' },
];

export const SAMPLE_BOOK = {
  title: 'Zosia i Rycerz Biały Uśmiech',
  cover: '/lp/zosia-cover.webp',
  pdf: '/lp/przyklad-bajka.pdf',
  pages: 26,
  chapters: 5,
};

export const PROMO_VIDEO = {
  src: '/lp/promo-ola.mp4',
  poster: '/lp/promo-poster.webp',
};

export const SCIENCE_QUOTE = {
  text: 'Bajki terapeutyczne są wykorzystywane zarówno w terapii pedagogicznej, jak i w celach profilaktycznych, aby nakierować dziecko na właściwe wzorce postaw. W zakres celu bajek terapeutycznych wchodzą więc szeroko pojęte: relaksacja, socjalizacja, kompensacja i odciążenie.',
  cite: 'Wnyk, 2004, s. 57–58, cyt. za: Sufa, Janas, 2018, s. 419',
  url: 'https://czasopismoippis.uken.krakow.pl/wp-content/uploads/2015/01/Beata-SUFA-Maria-JANAS.pdf',
};

/** Shared third science card — matches the real book structure (named hero + guide). */
export const HERO_SCIENCE_CARD = {
  icon: 'fa-solid fa-child-reaching',
  title: 'Bohater z imieniem',
  description:
    'Bohater bajki nosi imię Twojego dziecka i mierzy się z tą samą trudnością. A mądry przewodnik pokazuje mu, jak wygrać.',
};

export const REVIEWS = [
  {
    text: 'Cena jak za zwykłą książkę z księgarni, a bajka napisana na konkretny problem mojej córki. To w ogóle nieporównywalne.',
    who: 'Magda, mama 5-letniej Lenki',
  },
  {
    text: 'Zamówiłem druk i wysłałem na urodziny chrześniaka. Mama przysłała filmik, jak chłopiec zobaczył siebie na okładce — bezcenne.',
    who: 'Piotr, ojciec chrzestny',
  },
];

export const TRUSTPILOT_URL = 'https://pl.trustpilot.com/review/bajkoterapia.org';

export const LP_FAQ: { q: string; a: string }[] = [
  {
    q: 'Czy mogę zobaczyć przykładową bajkę przed zamówieniem?',
    a: 'Tak — obejrzyj przykładową bajkę w sekcji wyżej, bez podawania maila. A podgląd bajki swojego dziecka i tak przeczytasz przed zapłatą.',
  },
  {
    q: 'Ile stron ma bajka?',
    a: 'Kilkanaście stron: 4–6 rozdziałów z kolorowymi ilustracjami. Długość dopasowujemy do wieku dziecka.',
  },
  {
    q: 'Kiedy dojdzie drukowana wersja?',
    a: `PDF dostajesz od razu po opłaceniu. Drukowana książka dociera kurierem w ${DELIVERY_DAYS_TEXT} — wysyłka po Polsce w cenie.`,
  },
  {
    q: 'Ile trwa przygotowanie bajki?',
    a: `Około ${GENERATION_MINUTES} minut. Stronę z postępem możesz mieć otwartą, a bajka poczeka gotowa, aż wrócisz.`,
  },
  {
    q: 'Czym jest wersja z audiobookiem?',
    a: 'To ta sama bajka, nagrana jako plik audio czytany przez lektora — do słuchania przed snem, w aucie albo u babci. Dostajesz ją razem z PDF-em.',
  },
  {
    q: 'Kto pisze bajkę?',
    a: 'Bajkę pisze AI według schematu bajek terapeutycznych: bohater zaczyna bezpiecznie, spotyka wyzwanie, dostaje mądrego przewodnika i wygrywa. Każdą historię sprawdzamy, a Ty czytasz ją przed dzieckiem.',
  },
  {
    q: 'A jeśli bajka mi się nie spodoba?',
    a: 'Nie płacisz — i tyle. Podgląd bajki czytasz przed zakupem, więc dokładnie wiesz, za co płacisz. Bajka to treść cyfrowa tworzona na indywidualne zamówienie i dostarczana od razu — dlatego po zakupie nie ma już zwrotów, ale przed zakupem masz pełny wgląd.',
  },
];

export const SAFETY_POINTS: { title: string; body: string }[] = [
  {
    title: 'Czytasz przed dzieckiem.',
    body: 'Bajka najpierw trafia do Ciebie — dziecko zobaczy ją dopiero, gdy uznasz, że jest w porządku.',
  },
  {
    title: 'Sprawdzamy każdą bajkę.',
    body: 'Zanim ją dostaniesz, sprawdza ją osobny recenzent AI: zero straszenia, zero moralizowania. A ostatnie słowo i tak masz Ty.',
  },
  {
    title: 'Łagodni „przeciwnicy”.',
    body: 'Przeciwnicy w bajkach są śmieszni, nie straszni. Dziecko ma się śmiać i kibicować, nie bać.',
  },
];

export const SPREAD_IMAGE = '/lp/spread.webp';
