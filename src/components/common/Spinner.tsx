import { cn } from '../../lib/utils';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
type SpinnerVariant = 'default' | 'light' | 'dark';

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const variantClasses: Record<SpinnerVariant, { circle: string; path: string }> = {
  default: {
    circle: 'stroke-current opacity-25',
    path: 'fill-current opacity-75',
  },
  light: {
    circle: 'stroke-white/25',
    path: 'fill-white',
  },
  dark: {
    circle: 'stroke-gray-900/25',
    path: 'fill-gray-900',
  },
};

export function Spinner({ size = 'sm', variant = 'default', className }: SpinnerProps) {
  const colors = variantClasses[variant];

  return (
    <svg
      className={cn('animate-spin', sizeClasses[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className={colors.circle}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className={colors.path}
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
