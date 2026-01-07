import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/solid-router";

import { HydrationScript } from "solid-js/web";
import { Suspense } from "solid-js";

export const Route = createRootRouteWithContext()({
  head: () => ({}),
  shellComponent: RootComponent,
});

function RootComponent() {
  return (
    <html>
      <head>
        <HydrationScript />
      </head>
      <body>
        <HeadContent />
        <Suspense>
          <Outlet />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}
