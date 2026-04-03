import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData } from 'react-router';
import { getTopicBySlug, type Topic } from '../data/topics';
import { TopicLayout } from '../components/topic-landing';

export function loader({ params }: LoaderFunctionArgs) {
  const topic = getTopicBySlug(params.slug ?? '');
  if (!topic) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response('Not Found', { status: 404 });
  }
  return { topic };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.topic) return [{ title: 'Bajkoterapia' }];
  const { topic } = data;
  const canonicalUrl = `https://bajkoterapia.org/problem/${topic.slug}`;

  return [
    { title: topic.title },
    { name: 'description', content: topic.metaDescription },
    { property: 'og:title', content: topic.title },
    { property: 'og:description', content: topic.metaDescription },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:locale', content: 'pl_PL' },
    { name: 'twitter:title', content: topic.title },
    { name: 'twitter:description', content: topic.metaDescription },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
  ];
};

export default function TopicPage() {
  const { topic } = useLoaderData<{ topic: Topic }>();
  return <TopicLayout topic={topic} />;
}
