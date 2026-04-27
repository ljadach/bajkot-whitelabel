import { useLocation } from 'react-router';

const HOME_ANCHORS = [
  { href: '#jak-to-dziala', label: 'Jak to działa' },
  { href: '#dlaczego-dziala', label: 'Dlaczego działa' },
  { href: '#nasza-historia', label: 'Nasza historia' },
  { href: '#opinie', label: 'Opinie' },
  { href: '#faq', label: 'FAQ' },
];

export function TopicNav() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <nav className="w-full py-4 px-6 fixed top-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center gap-6">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <i className="fa-solid fa-book-open text-calm-500 text-2xl" />
          <span className="font-extrabold text-xl text-calm-900 tracking-tight">Bajkoterapia</span>
        </a>
        {isHome && (
          <ul className="hidden lg:flex items-center gap-6 text-sm font-semibold text-calm-800">
            {HOME_ANCHORS.map((anchor) => (
              <li key={anchor.href}>
                <a href={anchor.href} className="hover:text-magic-500 transition-colors">
                  {anchor.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <a
          href={isHome ? '#tematy' : '#kreator'}
          className="bg-magic-500 hover:bg-magic-600 text-white px-5 py-2 rounded-full font-bold transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm md:text-base shrink-0"
        >
          Stwórz Bajkę
        </a>
      </div>
    </nav>
  );
}
