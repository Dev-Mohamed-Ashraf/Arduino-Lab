import { ApiError } from '@arduino-lab/contracts';
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // A rejected request is a decision, not a glitch; only network-level
          // failures are worth retrying.
          if (error instanceof ApiError && error.status !== 0) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
