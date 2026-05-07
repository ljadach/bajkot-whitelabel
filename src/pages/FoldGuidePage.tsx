import { PageShell } from '../components/layout/PageShell';
import { JsonLd } from '../components/JsonLd';

interface Step {
  n: number;
  title: string;
  body: string;
  detail?: string[];
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Wydrukuj plik PDF',
    body: 'Otwórz pobrany plik PDF i ustaw drukowanie zgodnie z parametrami książki broszurowej.',
    detail: [
      'Format papieru: A4',
      'Orientacja: pozioma (landscape)',
      'Druk: jednostronny — TYLKO na jednej stronie kartki',
      'Skalowanie: „Dopasuj do strony" / „Actual size" 100%',
      'Bez nagłówka i stopki drukarki (czasem trzeba odznaczyć w opcjach)',
    ],
  },
  {
    n: 2,
    title: 'Złóż każdą kartkę na pół',
    body: 'Każdą wydrukowaną kartkę złóż wzdłuż dłuższej krawędzi (poziomo na pół), zadrukowaną stroną na zewnątrz. Po złożeniu każda kartka zawiera dwa rozkładówki książki.',
    detail: [
      'Złóż dokładnie po środku — najlepiej z linijką lub gładkim brzegiem łyżeczki, żeby zagięcie było ostre',
      'Zadrukowana strona ma się pokazywać NA ZEWNĄTRZ (rozkładówka jest widoczna jak otworzysz kartkę)',
    ],
  },
  {
    n: 3,
    title: 'Ułóż w stos w kolejności',
    body: 'Numery stron pomogą Ci ułożyć książkę. Pierwsza kartka (z okładką po lewej i pustą stroną po prawej) idzie na wierzch — reszta po kolei pod nią.',
    detail: [
      'Sprawdzaj numery stron — kolejne kartki powinny pasować w sposób ciągły',
      'Wszystkie zagięcia z LEWEJ strony stosu — to będzie grzbiet książki',
    ],
  },
  {
    n: 4,
    title: 'Zszyj grzbiet',
    body: 'Wybierz metodę dopasowaną do tego, co masz w domu. Wszystkie działają — różnica jest tylko w wykończeniu.',
    detail: [
      'Zszywacz długoramienny (najlepiej): 2 zszywki w grzbiecie, równo rozmieszczone',
      'Igła i nici / wstążka: przewlecz przez 2–3 dziurki wykonane szpilką, zwiąż na supeł od zewnątrz',
      'Klej introligatorski: przyklej grzbiet i obciąż książką na noc',
      'Bez nic: grube spinacze biurowe na grzbiecie też się sprawdzą jako tymczasowe rozwiązanie',
    ],
  },
  {
    n: 5,
    title: 'Wyrównaj brzegi (opcjonalnie)',
    body: 'Jeśli kartki lekko się rozjeżdżają, możesz przyciąć prawą krawędź książki długą linijką i nożem do papieru. Da to czystą, równą krawędź jak w prawdziwej książce.',
  },
  {
    n: 6,
    title: 'Gotowe!',
    body: 'Twoja bajka jest gotowa do wspólnego czytania. Zostaw ją na noc obciążoną książkami — zagięcia się utrwalą i książka będzie się ładnie otwierać.',
  },
];

function StepCard({ step }: { step: Step }) {
  return (
    <div className="relative bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold text-lg">
          {step.n}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-2">{step.title}</h3>
          <p className="text-neutral-700 leading-relaxed mb-4">{step.body}</p>
          {step.detail && step.detail.length > 0 && (
            <ul className="space-y-2">
              {step.detail.map((d, i) => (
                <li
                  key={i}
                  className="text-sm text-neutral-600 leading-relaxed pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-neutral-400"
                >
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function FoldGuidePage() {
  return (
    <PageShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'Jak złożyć bajkę w domu',
          description:
            'Krok po kroku: jak wydrukować i złożyć spersonalizowaną bajkę z bajkoterapia.org w postaci broszury A5.',
          step: STEPS.map((s) => ({
            '@type': 'HowToStep',
            position: s.n,
            name: s.title,
            text: s.body,
          })),
        }}
      />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-8">
        <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
          Instrukcja
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-4">
          Jak złożyć bajkę w domu
        </h1>
        <p className="text-lg text-neutral-600 leading-relaxed">
          Twoja bajka przychodzi w formacie broszury — jednej kartki A4 zawierającej dwie strony
          książki na każdej stronie. Wystarczą zwykła drukarka i kilka minut, żeby zmienić plik PDF
          w prawdziwą książkę formatu A5.
        </p>
      </section>

      {/* Quick spec */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-10">
        <div className="bg-neutral-100 rounded-2xl p-6 sm:p-7 border border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900 mb-3">W skrócie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-neutral-500 mb-1">Papier</div>
              <div className="font-medium text-neutral-900">A4, biały</div>
            </div>
            <div>
              <div className="text-neutral-500 mb-1">Druk</div>
              <div className="font-medium text-neutral-900">jednostronny, poziomo</div>
            </div>
            <div>
              <div className="text-neutral-500 mb-1">Składanie</div>
              <div className="font-medium text-neutral-900">złóż na pół + zszyj</div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="space-y-5">
          {STEPS.map((s) => (
            <StepCard key={s.n} step={s} />
          ))}
        </div>
      </section>

      {/* Alternative — copy shop */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">
            Nie chce Ci się składać? Zleć drukarni
          </h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            Jeśli wolisz oszczędzić czas albo chcesz mieć profesjonalnie wykończony egzemplarz,
            możesz zlecić wydruk online — większość drukarni internetowych obsługuje broszury A5
            zszywane przy grzbiecie.
          </p>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li className="pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-amber-700">
              <strong>Printu.pl</strong>, <strong>printsome.pl</strong> lub lokalna drukarnia —
              wybierz „książeczka A5, druk jednostronny, zszywka grzbietowa"
            </li>
            <li className="pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-amber-700">
              Prześlij plik PDF, który dostałeś/aś na maila — drukarnia ułoży kartki zgodnie z
              numeracją
            </li>
            <li className="pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-amber-700">
              Koszt: zwykle 15–35 zł, czas realizacji 2–5 dni roboczych
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ / troubleshooting */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Najczęstsze pytania</h2>
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-neutral-900 mb-2">
              Wydrukowałem na pionowo zamiast poziomo — co teraz?
            </h3>
            <p className="text-neutral-700 leading-relaxed text-[15px]">
              Wyrzuć kartki i wydrukuj jeszcze raz w orientacji poziomej (landscape). PDF jest
              przygotowany pod konkretny format — pionowy druk skutkuje tym, że dwie strony książki
              będą za małe i obcięte.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 mb-2">Czy mogę drukować dwustronnie?</h3>
            <p className="text-neutral-700 leading-relaxed text-[15px]">
              Nie. Plik jest przygotowany pod druk jednostronny z fałdowaniem każdej kartki osobno.
              Druk dwustronny pomiesza kolejność stron.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 mb-2">Drukarka tnie marginesy</h3>
            <p className="text-neutral-700 leading-relaxed text-[15px]">
              W ustawieniach druku wybierz „Dopasuj do strony" lub „Skalowanie: brak". Jeśli to nie
              pomaga, sprawdź czy drukarka wspiera druk bez marginesów (borderless).
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 mb-2">
              Mam tylko zwykły zszywacz, nie sięga do środka kartki
            </h3>
            <p className="text-neutral-700 leading-relaxed text-[15px]">
              Rozłóż książkę płasko zadrukowaną stroną do dołu, zszyj od grzbietu (czyli od strony
              zagięcia) — zszywki będą widoczne wewnątrz, ale książka będzie trzymać. Albo użyj
              wstążki przewleczonej przez dziurki zrobione szpilką.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
