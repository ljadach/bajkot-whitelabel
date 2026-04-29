import { Link, useLocation } from 'react-router';

const HOME_ANCHORS = [
  { hash: 'jak-to-dziala', label: 'Jak to działa' },
  { hash: 'dlaczego-dziala', label: 'Dlaczego działa' },
  { hash: 'nasza-historia', label: 'Nasza historia' },
  { hash: 'opinie', label: 'Opinie' },
  { hash: 'faq', label: 'FAQ' },
];

const CTA_CLASS =
  'bg-magic-500 hover:bg-magic-600 text-white px-5 py-2 rounded-full font-bold transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm md:text-base shrink-0 no-underline';

export function TopicNav() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isCatalog = location.pathname === '/katalog';

  return (
    <nav className="w-full py-4 px-6 fixed top-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0 no-underline">
          <i className="fa-solid fa-book-open text-calm-500 text-2xl" />
          <span className="font-extrabold text-xl text-calm-900 tracking-tight">Bajkoterapia</span>
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
        </ul>
        {!isCatalog &&
          (isHome ? (
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
