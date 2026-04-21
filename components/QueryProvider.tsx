"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 4 * 60 * 1000, refetchInterval: 5 * 60 * 1000 } },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
