import type { MetaFunction } from 'react-router';
import { TopicPicker } from '../components/TopicPicker';
import { pageTitle } from '../lib/theme';

export const meta: MetaFunction = ({ location }) => [
  { title: pageTitle(location.pathname, 'Stwórz spersonalizowaną bajkę') },
];

export default function StartPage() {
  return <TopicPicker />;
}
