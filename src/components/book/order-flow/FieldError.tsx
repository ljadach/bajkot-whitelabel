/** Inline per-field validation UI shared by the wizard and checkout forms. */

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-600 font-medium mt-2">
      <i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true" />
      {message}
    </p>
  );
}
