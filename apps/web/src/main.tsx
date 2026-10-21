import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { I18nProvider } from './lib/i18n'
import Home from './pages/Home'

type Loader = () => Promise<{ default: React.ComponentType }>
const page = (load: Loader) => ({
  lazy: async () => ({ Component: (await load()).default }),
})

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', ...page(() => import('./pages/LoginPage')) },
  { path: '/signup', ...page(() => import('./pages/SignupPage')) },
  {
    path: '/',
    ...page(() => import('./layouts/AppLayout')),
    children: [],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </StrictMode>,
)
