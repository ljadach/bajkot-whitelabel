import { useState } from 'react';
import { PrivacyModal } from '../PrivacyModal';

export function TopicFooter() {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <footer className="bg-calm-900 text-calm-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          <div>
            <a
              href="/"
              className="flex items-center gap-2 text-white font-extrabold text-xl mb-4 no-underline"
            >
              <i className="fa-solid fa-book-open text-magic-400" />
              <span>Bajkoterapia</span>
            </a>
            <p className="text-sm leading-relaxed text-calm-200/80">
              Spersonalizowane bajki terapeutyczne dla dzieci. Oparte na badaniach naukowych,
              tworzone z miłością.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3">Kontakt</h4>
            <p className="text-sm leading-relaxed">
              Trustee Interactive
              <br />
              Plac Inwalidów 10
              <br />
              01-552 Warszawa
            </p>
            <p className="text-sm mt-2">
              <a
                href="mailto:info@bajkoterapia.org"
                className="hover:text-magic-400 transition-colors"
              >
                info@bajkoterapia.org
              </a>
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3">Informacje prawne</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-magic-400 transition-colors">
                  Regulamin
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="hover:text-magic-400 transition-colors text-left"
                >
                  Polityka Prywatności
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="hover:text-magic-400 transition-colors text-left"
                >
                  RODO
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-calm-800 pt-6 text-center text-sm text-calm-200/60">
          &copy; 2026 Bajkoterapia by Trustee Interactive. Wszelkie prawa zastrzeżone.
        </div>
      </div>

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </footer>
  );
}
