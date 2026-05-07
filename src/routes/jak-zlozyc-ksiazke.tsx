import type { MetaDescriptor } from 'react-router';
import { FoldGuidePage } from '../pages/FoldGuidePage';

export function meta(): MetaDescriptor[] {
  const title = 'Jak złożyć bajkę w domu — bajkoterapia.org';
  const description =
    'Krok po kroku: jak wydrukować plik PDF i zmienić go w prawdziwą książeczkę A5. Druk jednostronny, fałdowanie, zszycie grzbietu.';
  const url = 'https://bajkoterapia.org/jak-zlozyc-ksiazke';
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:locale', content: 'pl_PL' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
  ];
}

export default function JakZlozycKsiazke() {
  return <FoldGuidePage />;
}
