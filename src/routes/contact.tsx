import type { MetaFunction } from 'react-router';
import { ContactPage } from '../pages/ContactPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = ({ location }) => buildPageMeta({ pathname: location.pathname, ns: 'contact', routePath: '/about/contact' });

export default function Contact() {
  return <ContactPage />;
}
