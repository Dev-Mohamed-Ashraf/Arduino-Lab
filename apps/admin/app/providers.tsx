'use client';

import { ThemeProvider, Toaster } from '@arduino-lab/ui';
import { AuthProvider, createQueryClient } from '@arduino-lab/web';
import { QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

import { appApi, tokenStore } from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider
          appApi={appApi}
          tokenStore={tokenStore}
          loginPath="/login"
          logoutPath="/login"
        >
          {children}
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
