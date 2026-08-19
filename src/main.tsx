import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { BrowserRouter } from 'react-router-dom'

import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    // No retries: a 403 from an admin-only endpoint is an answer, not a blip, and
    // retrying it three times just delays the message.
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        storageKey="trip-planner.theme"
        disableTransitionOnChange
      >
        <BrowserRouter>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
