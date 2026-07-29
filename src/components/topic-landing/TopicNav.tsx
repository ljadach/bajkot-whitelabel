import { Link, useLocation } from 'react-router';
import { BrandLogo } from '../BrandLogo';
import { useWizardInView } from '../../hooks/useWizardInView';

const HOME_ANCHORS = [
  { hash: 'jak-to-dziala', label: 'Jak to działa' },
  { hash: 'dlaczego-dziala', label: 'Dlaczego działa' },
  { hash: 'nasza-historia', label: 'Nasza historia' },
  { hash: 'opinie', label: 'Opinie' },
  { hash: 'faq', label: 'FAQ' },
];

const CENNIK_PATH = '/cennik';

const CTA_CLASS =
  'bg-magic-500 hover:bg-magic-600 text-white px-5 py-2 rounded-full font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm md:text-base shrink-0 no-underline transition';

export function TopicNav() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isCatalog = location.pathname === '/katalog';
  const isCennik = location.pathname === CENNIK_PATH;

  // Hide the "Stwórz Bajkę" CTA once the user has scrolled the wizard into
  // view — the same button is right below them, so the nav copy is redundant.
  // Pages without a #kreator anchor (HP, /katalog) keep the CTA visible.
  const hideCta = useWizardInView([location.pathname]);

  return (
    <nav className="w-full py-4 px-6 fixed top-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center gap-6">
        <Link to="/" className="shrink-0 no-underline">
          <BrandLogo />
        </Link>
        <ul className="hidden lg:flex items-center gap-6 text-sm font-semibold text-calm-800">
          {HOME_ANCHORS.map((anchor) => (
            <li key={anchor.hash}>
              {isHome ? (
                <a href={`#${anchor.hash}`} className="hover:text-magic-500 transition-colors">
                  {anchor.label}
                </a>
              ) : (
                <Link to={`/#${anchor.hash}`} className="hover:text-magic-500 transition-colors">
                  {anchor.label}
                </Link>
              )}
            </li>
          ))}
          <li>
            <Link
              to={CENNIK_PATH}
              className={`transition-colors ${
                isCennik ? 'text-magic-500' : 'hover:text-magic-500'
              }`}
            >
              Cennik
            </Link>
          </li>
        </ul>
        {!isCatalog &&
          !hideCta &&
          (isHome || isCennik ? (
            <Link to="/katalog" className={CTA_CLASS}>
              Stwórz Bajkę
            </Link>
          ) : (
            <a href="#kreator" className={CTA_CLASS}>
              Stwórz Bajkę
            </a>
          ))}
      </div>
    </nav>
  );
}
