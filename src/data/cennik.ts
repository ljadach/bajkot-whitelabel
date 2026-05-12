export type CennikValueItem = {
  emoji: string;
  title: string;
  text: string;
};

export type CennikComparisonRow = {
  label: string;
  pdf: string;
  print: string;
};

export type CennikTestimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
  avatarBg: string;
  featured: boolean;
};

export type CennikFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const VALUE_ITEMS: readonly CennikValueItem[] = [
  {
    emoji: '🧒',
    title: 'Personalizacja bohatera',
    text: 'Imię, wiek, kolor oczu i włosów, ulubione zwierzątko — bohater wygląda i zachowuje się jak Twoje dziecko. To „efekt odniesienia do ja" w praktyce.',
  },
  {
    emoji: '🎯',
    title: 'Wybór z 35 tematów',
    text: 'Lęk przed ciemnością, adaptacja w przedszkolu, złość, dzielenie się, akceptacja porażki, śmierć bliskiego, rozwód rodziców i 28 innych — każdy temat ma własną strukturę.',
  },
  {
    emoji: '📐',
    title: 'Struktura terapeutyczna',
    text: '5-etapowa narracja: Bezpieczna Baza → Wyzwanie → Mądry Przewodnik → Rozwiązanie → Sukces. Model walidowany w pracach dr Marii Molickiej.',
  },
  {
    emoji: '🎨',
    title: 'Ilustracje w pełnym kolorze',
    text: '4–6 dużych, ręcznie projektowanych ilustracji w spójnym, łagodnym stylu. Bohater na każdej z nich rozpoznawalny jako Twoje dziecko.',
  },
  {
    emoji: '📏',
    title: 'Język dopasowany do wieku',
    text: 'Długość, słownictwo i proporcja tekstu do ilustracji automatycznie dostrajają się do wieku dziecka (2–12 lat).',
  },
  {
    emoji: '💬',
    title: 'Pytania do rozmowy',
    text: 'Na końcu bajki znajdziesz 5 pytań do dziecka — narzędzie, które potroi skuteczność czytania i pomoże przepracować emocje na żywo.',
  },
  {
    emoji: '📖',
    title: 'Strona dedykacyjna',
    text: '„Ta książka należy do…" z imieniem dziecka — drobiazg, który robi ogromne wrażenie i zostaje na lata.',
  },
  {
    emoji: '⚡',
    title: 'Realizacja w ~15 minut',
    text: 'Po zamówieniu otrzymujesz PDF na maila w kilkanaście minut. Wersję drukowaną wysyłamy w 3–5 dni roboczych kurierem.',
  },
  {
    emoji: '🛡️',
    title: 'Gwarancja zwrotu 14 dni',
    text: 'Jeśli bajka nie spełni Waszych oczekiwań, zwrócimy 100% wpłaconej kwoty. Bez pytań i tłumaczeń.',
  },
];

export const COMPARISON_ROWS: readonly CennikComparisonRow[] = [
  { label: 'Spersonalizowana bajka w PDF', pdf: 'check', print: 'check' },
  { label: 'Bohater z imieniem i wyglądem', pdf: 'check', print: 'check' },
  { label: '35 tematów do wyboru', pdf: 'check', print: 'check' },
  { label: 'Ilustracje w pełnym kolorze', pdf: 'check', print: 'check' },
  { label: 'Pytania do rozmowy z dzieckiem', pdf: 'check', print: 'check' },
  { label: 'Drukowana książeczka A5', pdf: 'minus', print: 'check' },
  { label: 'Wysyłka kurierska', pdf: 'minus', print: 'check' },
  { label: 'Eko-koperta prezentowa', pdf: 'minus', print: 'check' },
  { label: 'Czas realizacji', pdf: '~15 min', print: '3–5 dni' },
  { label: 'Gwarancja zwrotu 14 dni', pdf: 'check', print: 'check' },
];

export const PRICE_TESTIMONIALS: readonly CennikTestimonial[] = [
  {
    quote:
      '„Cena jak za zwykłą książkę z księgarni, a bajka spersonalizowana, na konkretny problem mojej córki. To w ogóle nieporównywalne."',
    name: 'Magda',
    role: 'mama 5-letniej Lenki',
    avatar: '👩',
    avatarBg: 'bg-pink-100',
    featured: false,
  },
  {
    quote:
      '„29 zł za bajkę dopasowaną do konkretnego problemu mojego dziecka? To kosztuje mniej niż jedna konsultacja u psychologa, a czytamy ją codziennie. Najlepsza inwestycja tego roku."',
    name: 'Karolina',
    role: 'mama dwójki dzieci',
    avatar: '👩‍👧‍👦',
    avatarBg: 'bg-calm-100',
    featured: true,
  },
  {
    quote:
      '„Zamówiłem druk za 49 zł i wysłałem na urodziny chrześniaka. Mama przysłała filmik, jak chłopiec zobaczył siebie na okładce — bezcenne."',
    name: 'Piotr',
    role: 'chrzestny ojciec',
    avatar: '👨',
    avatarBg: 'bg-calm-100',
    featured: false,
  },
];

export const FAQ_ITEMS: readonly CennikFaqItem[] = [
  {
    id: 'hidden-fees',
    question: 'Czy w cenie są jakieś ukryte opłaty?',
    answer:
      'Nie. Cena na stronie cennika to kwota końcowa, jaką zobaczysz w koszyku. Zawiera 23% VAT, koszty przygotowania bajki, ilustracji i — w przypadku pakietu z drukiem — wysyłki kurierskiej na terenie Polski.',
  },
  {
    id: 'payment-methods',
    question: 'Jakie metody płatności są dostępne?',
    answer:
      'Akceptujemy BLIK, karty Visa i Mastercard, szybkie przelewy bankowe (Przelewy24), Apple Pay, Google Pay i PayPal. Cała płatność jest szyfrowana protokołem SSL.',
  },
  {
    id: 'vat-invoice',
    question: 'Czy mogę otrzymać fakturę VAT na firmę?',
    answer:
      'Oczywiście. Podczas zamówienia możesz wpisać dane firmy — fakturę VAT wystawimy automatycznie i wyślemy na Twojego maila razem z bajką.',
  },
  {
    id: 'shipping-cost',
    question: 'Ile kosztuje wysyłka drukowanej książki?',
    answer:
      'Wysyłka kurierska po Polsce jest wliczona w cenę pakietu PDF + Druk (49 zł). Za granicę wysyłamy po indywidualnej wycenie — napisz do nas na info@bajkoterapia.org.',
  },
  {
    id: 'refund-policy',
    question: 'Co dokładnie obejmuje gwarancja zwrotu?',
    answer:
      'Gwarancja obejmuje 100% wpłaconej kwoty (łącznie z kosztami druku i wysyłki) w okresie 14 dni od daty zakupu. Wystarczy, że napiszesz do nas na info@bajkoterapia.org — w 5 dni roboczych zwracamy pełną kwotę na to samo źródło płatności. Drukowanej książki nie musisz odsyłać.',
  },
  {
    id: 'gift',
    question: 'Czy mogę kupić bajkę w prezencie dla kogoś innego?',
    answer:
      'Oczywiście. Przy zamówieniu pakietu PDF + Druk możesz podać dane swojej karty oraz adres dostawy bliskich — wyślemy fizyczną książeczkę w eko-kopercie z dedykacją od Ciebie prosto do obdarowanej rodziny.',
  },
  {
    id: 'professionals-discount',
    question: 'Czy oferujecie zniżki dla psychologów i przedszkoli?',
    answer:
      'Tak. Mamy specjalny program dla specjalistów (psychologów, terapeutów, pedagogów) i instytucji (przedszkola, świetlice, fundacje). Napisz do nas na info@bajkoterapia.org z krótkim opisem swojej działalności — przygotujemy dedykowaną ofertę.',
  },
];
