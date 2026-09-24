import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import './lib/i18n';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL is not set (see .env.example)');
}
const convex = new ConvexReactClient(convexUrl);

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <ConvexProvider client={convex}>
        <HydratedRouter />
      </ConvexProvider>
    </StrictMode>,
  );
});
