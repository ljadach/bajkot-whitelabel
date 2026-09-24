import type { LoaderFunctionArgs, MetaFunction, ShouldRevalidateFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { getTopicBySlug, type Topic } from '../../convex/lib/topics';
import { ClientOnly } from '../components/ClientOnly';
import { OrderFlow } from '../components/book/order-flow/OrderFlow';
import { pageTitle } from '../lib/theme';

export function loader({ params }: LoaderFunctionArgs) {
  const topic = getTopicBySlug(params.slug ?? '');
  if (!topic) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response('Not Found', { status: 404 });
  }
  return { topic };
}

// The topic only changes with the slug — not on ?krok= steps.
export function shouldRevalidate({
  currentParams,
  nextParams,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  return currentParams.slug !== nextParams.slug ? defaultShouldRevalidate : false;
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => [
  {
    title: pageTitle(
      location.pathname,
      data?.topic ? `Zamów bajkę: ${data.topic.catalog.shortTitle}` : undefined,
    ),
  },
];

/**
 * Order form for one topic (/zamow/:slug). Client-only: the form talks to
 * Convex and keeps its draft in sessionStorage.
 */
export default function OrderPage() {
  const { topic } = useLoaderData<{ topic: Topic }>();
  return (
    <div className="min-h-screen antialiased">
      <ClientOnly
        fallback={
          <section className="pt-28 pb-20 px-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-8 h-8 spinner mx-auto" />
            </div>
          </section>
        }
      >
        <OrderFlow topic={topic} />
      </ClientOnly>
    </div>
  );
}
