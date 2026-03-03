import { Link, useLocation } from 'react-router';
import type { IconName } from './LandingValueProps';

interface SubPageItem {
  slug: string;
  icon: IconName;
  title: string;
  description: string;
}

interface LandingSubPagesProps {
  title: string;
  items: SubPageItem[];
}

const subPageIcons: Partial<Record<IconName, JSX.Element>> = {
  briefcase: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  ),
  academic: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.355a3 3 0 0 1-3 0M3 9a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
};

export function LandingSubPages({ title, items }: LandingSubPagesProps) {
  const location = useLocation();
  const langMatch = location.pathname.match(/^\/(en|pl|de)(\/|$)/);
  const lang = langMatch ? langMatch[1] : 'en';

  return (
    <section className="py-10 bg-bg-subtle">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-6">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <Link key={item.slug} to={`/${lang}/${item.slug}`} className="usecase-card flex flex-col no-underline text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <div className="w-9 h-9 rounded-[10px] flex-shrink-0 bg-accent-subtle text-accent-dark flex items-center justify-center mb-3">{subPageIcons[item.icon]}</div>
              <span className="text-base font-semibold text-neutral-900 mb-1">{item.title}</span>
              <span className="text-[13px] text-neutral-600 leading-relaxed flex-1 mb-3">{item.description}</span>
              <span className="text-[13px] font-semibold text-accent-dark flex items-center gap-1">
                Learn more
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
