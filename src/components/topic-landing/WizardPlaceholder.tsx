/** SSR fallback for the client-only inline wizard — shared by both layouts. */
export function WizardPlaceholder({ className = 'bg-gray-50' }: { className?: string }) {
  return (
    <section id="kreator" className={`py-24 px-6 ${className}`}>
      <div className="max-w-4xl mx-auto text-center">
        <div className="w-8 h-8 spinner mx-auto" />
      </div>
    </section>
  );
}
