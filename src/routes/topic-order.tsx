import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData } from 'react-router';
import { getTopicBySlug, type Topic } from '../data/topics';
import { ClientOnly } from '../components/ClientOnly';
import { LandingOrderFlow } from '../components/book/order-flow/LandingOrderFlow';

export function loader({ params }: LoaderFunctionArgs) {
  const topic = getTopicBySlug(params.slug ?? '');
  if (!topic) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response('Not Found', { status: 404 });
  }
  return { topic };
}

// Order page is a funnel step, not a landing page — keep it out of the index.
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.topic) return [{ title: 'Bajkoterapia' }];
  return [
    { title: `Stwórz bajkę: ${data.topic.catalog.shortTitle} | Bajkoterapia` },
    { name: 'robots', content: 'noindex, follow' },
  ];
};

/**
 * Standalone landing order page (/problem/:slug/zamow) — the LP CTAs land
 * here instead of scrolling to an inline wizard. Being its own route gives
 * the flow real scroll-to-top on entry (root ScrollToTop) and a clean page
 * frame for the step progress header.
 */
export default function TopicOrderPage() {
  const { topic } = useLoaderData<{ topic: Topic }>();
  return (
    <div className="min-h-screen antialiased" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <ClientOnly
        fallback={
          <section className="pt-28 pb-20 px-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-8 h-8 spinner mx-auto" />
            </div>
          </section>
        }
      >
        <LandingOrderFlow topic={topic} />
      </ClientOnly>
    </div>
  );
}
