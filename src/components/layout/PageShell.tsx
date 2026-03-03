interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  dataAttributes?: Record<string, string>;
}

export function PageShell({ children, className = '', dataAttributes }: PageShellProps) {
  const dataProps = dataAttributes ? Object.fromEntries(Object.entries(dataAttributes).map(([key, value]) => [`data-${key}`, value])) : {};

  return (
    <div className={`min-h-[calc(100vh-56px)] bg-gradient-to-b from-white to-neutral-50 ${className}`} {...dataProps}>
      {children}
    </div>
  );
}
