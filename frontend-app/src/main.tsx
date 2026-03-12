import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/app/AppShell';
import { bootstrapApp, queryClient } from '@/app/bootstrap';
import '@/styles/globals.css';

bootstrapApp();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  </React.StrictMode>,
);
