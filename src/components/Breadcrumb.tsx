import { Link } from 'react-router';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const ChevronIcon = () => (
  <svg
    className="w-3 h-3 text-neutral-400 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
  </svg>
);

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;
  return (
    <nav className="max-w-content mx-auto px-4 sm:px-6 pb-2" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-xs text-neutral-400">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronIcon />}
            {item.href ? (
              <Link
                to={item.href}
                className={
                  index === 0
                    ? 'hover:text-neutral-600 transition-colors'
                    : 'text-neutral-500 hover:text-neutral-600 transition-colors'
                }
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-neutral-600 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
