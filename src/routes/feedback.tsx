import type { MetaFunction } from 'react-router';
import { FeedbackPage } from '../pages/FeedbackPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = () => buildPageMeta({ ns: 'feedback', routePath: '/opinie' });

export default function Feedback() {
  return <FeedbackPage />;
}
