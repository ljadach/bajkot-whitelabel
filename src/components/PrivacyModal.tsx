interface PrivacyModalProps {
  onClose: () => void;
}

export function PrivacyModal({ onClose }: PrivacyModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-3xl px-8 py-5 border-b border-calm-100 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-calm-900">Polityka Prywatności / RODO</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="w-10 h-10 rounded-full bg-calm-50 hover:bg-calm-100 flex items-center justify-center text-calm-800 transition-colors"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">1. Administrator danych</h3>
            <p>
              Administratorem danych osobowych jest Trustee Interactive z siedzibą przy Placu
              Inwalidów 10, 01-552 Warszawa. Kontakt z administratorem:{' '}
              <a href="mailto:info@bajkoterapia.org" className="text-calm-500 underline">
                info@bajkoterapia.org
              </a>
              .
            </p>
          </div>

          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">2. Jakie dane zbieramy</h3>
            <p>
              W ramach korzystania z serwisu Bajkoterapia możemy zbierać następujące dane osobowe:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Imię dziecka</li>
              <li>Wiek dziecka</li>
              <li>Opis wyzwania / problemu</li>
              <li>Adres e-mail rodzica / opiekuna</li>
              <li>Adres dostawy (w przypadku zamówienia druku)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">3. Cel przetwarzania danych</h3>
            <p>Dane osobowe przetwarzane są wyłącznie w celu:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Realizacji zamówienia — przygotowania spersonalizowanej bajki terapeutycznej</li>
              <li>Dostarczenia produktu (PDF lub druk)</li>
              <li>Kontaktu w sprawie zamówienia</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">4. Podstawa prawna</h3>
            <p>Dane przetwarzamy na podstawie:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Art. 6 ust. 1 lit. b RODO</strong> — przetwarzanie jest niezbędne do
                wykonania umowy (realizacja zamówienia)
              </li>
              <li>
                <strong>Art. 6 ust. 1 lit. a RODO</strong> — zgoda użytkownika (w przypadku działań
                marketingowych)
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">
              5. Okres przechowywania danych
            </h3>
            <p>
              Dane osobowe przechowujemy przez okres niezbędny do realizacji zamówienia, a następnie
              przez okres 5 lat w celu wypełnienia obowiązków podatkowych i rachunkowych. Dane
              dziecka (imię, wiek, opis) nie są przechowywane dłużej niż to konieczne do
              wygenerowania produktu.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">6. Prawa użytkownika</h3>
            <p>Zgodnie z RODO przysługują Państwu następujące prawa:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Prawo dostępu do swoich danych</li>
              <li>Prawo do sprostowania danych</li>
              <li>Prawo do usunięcia danych („prawo do bycia zapomnianym")</li>
              <li>Prawo do ograniczenia przetwarzania</li>
              <li>Prawo do przenoszenia danych</li>
              <li>Prawo do sprzeciwu wobec przetwarzania</li>
            </ul>
            <p className="mt-2">
              W celu realizacji powyższych praw prosimy o kontakt:{' '}
              <a href="mailto:info@bajkoterapia.org" className="text-calm-500 underline">
                info@bajkoterapia.org
              </a>
              .
            </p>
          </div>

          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">7. Bezpieczeństwo danych</h3>
            <p>
              Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony danych
              osobowych przed nieuprawnionym dostępem, utratą lub zniszczeniem.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-calm-900 text-base mb-2">8. Prawo do skargi</h3>
            <p>
              Mają Państwo prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych
              (PUODO), ul. Stawki 2, 00-193 Warszawa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
