/** Route builders for paths interpolated outside routes.ts — one place to
 * update if the URL shape ever changes. */
export const topicPath = (slug: string) => `/problem/${slug}`;
export const topicOrderPath = (slug: string) => `${topicPath(slug)}/zamow`;
