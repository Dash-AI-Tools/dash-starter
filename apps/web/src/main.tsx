import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { I18nProvider } from './lib/i18n'
import { AppProviders } from './providers/app-providers'
import { ThemeProvider } from './providers/theme-provider'
import Home from './pages/Home'

type Loader = () => Promise<{ default: React.ComponentType }>
const page = (load: Loader) => ({
  lazy: async () => ({ Component: (await load()).default }),
})

const routes = [
  { path: '/', element: <Home /> },
  { path: '/login', ...page(() => import('./pages/LoginPage')) },
  { path: '/signup', ...page(() => import('./pages/SignupPage')) },
  {
    path: '/',
    ...page(() => import('./layouts/AppLayout')),
    children: [],
  },
]

// The showcase is a development tool: it is only reachable in dev builds or
// when the build was made with VITE_ENABLE_SHOWCASE=true. The condition is
// inlined here on purpose, so the bundler can drop the whole branch (and the
// page it imports) from a production build.
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_SHOWCASE === 'true') {
  routes.push({
    path: '/app/:orgSlug/dev/components',
    ...page(() => import('./pages/ShowcasePage')),
  })
}

routes.push({ path: '*', ...page(() => import('./pages/NotFoundPage')) })

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)
