import type { MetaFunction } from 'react-router';
import { ContactPage } from '../pages/ContactPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = () =>
  buildPageMeta({ ns: 'contact', routePath: '/about/contact' });

export default function Contact() {
  return <ContactPage />;
}
