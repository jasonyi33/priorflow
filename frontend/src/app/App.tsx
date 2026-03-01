import { RouterProvider } from 'react-router';
import { ConvexProvider } from 'convex/react';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { convexClient } from '../lib/convex';

export default function App() {
  const content = (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );

  if (convexClient) {
    return (
      <ConvexProvider client={convexClient}>
        {content}
      </ConvexProvider>
    );
  }

  return content;
}
