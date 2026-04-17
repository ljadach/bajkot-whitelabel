/**
 * Map raw pipeline errors to parent-friendly Polish messages.
 * The raw string still lives in bookOrders.error for admin/debug.
 */
export function friendlyBookError(raw: string | undefined | null): string {
  if (!raw) return 'Wystąpił błąd podczas generowania bajki.';
  const r = raw.toLowerCase();

  if (r.includes('prohibited_content') || r.includes('blockreason')) {
    return 'Temat tej bajki został odrzucony przez filtr bezpieczeństwa naszego modelu AI. Spróbuj innego tematu — najlepiej działają tematy emocjonalne (np. lęki, nieśmiałość, zazdrość, poczucie własnej wartości). Jeśli zależy Ci akurat na tym temacie — napisz do nas, wygenerujemy ręcznie.';
  }

  if (r.includes('final qa blocked') && r.includes('child name')) {
    return 'Nasz model nie umiał poprawnie wpleść imienia dziecka w bajkę. Spróbuj ponownie.';
  }

  if (r.includes('final qa blocked')) {
    return 'Bajka nie przeszła finalnej kontroli jakości. Spróbuj ponownie — najczęściej drugie podejście działa.';
  }

  if (r.includes('invalid json') || r.includes('http 200') || r.includes('http 5')) {
    return 'Nasz silnik AI chwilowo nie odpowiedział poprawnie. Spróbuj ponownie za chwilę.';
  }

  if (r.includes('budget') || r.includes('rate limit') || r.includes('quota')) {
    return 'Aktualnie obsługujemy zbyt wiele zamówień naraz. Spróbuj ponownie za kilka minut.';
  }

  return 'Wystąpił nieoczekiwany błąd podczas generowania bajki. Spróbuj ponownie lub napisz do nas.';
}
