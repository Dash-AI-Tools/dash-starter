import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import '@dash/ui/styles.css'
import PublicLayout from './layouts/PublicLayout'
import { I18nProvider } from './lib/i18n'
import { ConsentProvider } from './providers/consent-provider'
import { AppProviders } from './providers/app-providers'
import { ThemeProvider } from './providers/theme-provider'
import { PaletteProvider } from './providers/palette-provider'
import { DEMO_MODE } from './lib/demo-mode'
import { applyPalette, resolveInitialPalette } from './lib/palettes'
import { featureRoutes } from './features'
import Home from './pages/Home'
import NotFoundPage, { NotFoundContent } from './pages/NotFoundPage'

type Loader = () => Promise<{ default: React.ComponentType }>
const page = (load: Loader) => ({
  lazy: async () => ({ Component: (await load()).default }),
})

const routes: RouteObject[] = [
  {
    /**
     * The public site: the landing page, the pricing and the legal pages
     * share the header and the footer.
     */
    element: <PublicLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'pricing', ...page(() => import('./pages/PricingPage')) },
      { path: 'terms', ...page(() => import('./pages/TermsPage')) },
      { path: 'privacy', ...page(() => import('./pages/PrivacyPage')) },
    ],
  },
  { path: '/login', ...page(() => import('./pages/LoginPage')) },
  { path: '/signup', ...page(() => import('./pages/SignupPage')) },
  { path: '/verify-email', ...page(() => import('./pages/VerifyEmailPage')) },
  { path: '/forgot-password', ...page(() => import('./pages/ForgotPasswordPage')) },
  { path: '/reset-password', ...page(() => import('./pages/ResetPasswordPage')) },
  { path: '/invitations/:token/accept', ...page(() => import('./pages/AcceptInvitationPage')) },
  { path: '/onboarding', ...page(() => import('./pages/OnboardingPage')) },
  { path: '/app', ...page(() => import('./pages/AppIndexPage')) },
  {
    path: '/app/:orgSlug',
    ...page(() => import('./layouts/AppLayout')),
    children: [
      { index: true, ...page(() => import('./pages/DashboardPage')) },
      { path: 'chat', ...page(() => import('./pages/ChatPage')) },
      { path: 'members', ...page(() => import('./pages/MembersPage')) },
      {
        path: 'members/import',
        ...page(() => import('./pages/ImportMembersPage')),
      },
      {
        path: 'settings',
        ...page(() => import('./pages/OrganizationSettingsPage')),
      },
      {
        path: 'settings/billing',
        ...page(() => import('./pages/BillingPage')),
      },
      {
        path: 'settings/api-keys',
        ...page(() => import('./pages/ApiKeysPage')),
      },
      { path: 'profile', ...page(() => import('./pages/ProfilePage')) },
      ...featureRoutes,
      {
        path: '*',
        element: <NotFoundContent />,
      },
    ],
  },
]

// showcase:start
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
// showcase:end

routes.push({ path: '*', element: <NotFoundPage /> })

const router = createBrowserRouter(routes)

// The palette is set on the root before the first render, so the page never
// paints in another palette first.
applyPalette(resolveInitialPalette(DEMO_MODE))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ConsentProvider>
        <ThemeProvider>
          <AppProviders>
            <PaletteProvider>
              <RouterProvider router={router} />
            </PaletteProvider>
          </AppProviders>
        </ThemeProvider>
      </ConsentProvider>
    </I18nProvider>
  </StrictMode>
)
