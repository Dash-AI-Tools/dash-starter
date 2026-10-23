import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { STATIONS, STATION_KEY_NAMES, stationColor, type StationId } from '@/lib/stations'

/**
 * The catalog key of the name of a station, such as `stationBillingName`.
 */
function stationName(id: StationId): TranslationKey {
  return `station${STATION_KEY_NAMES[id]}Name` as TranslationKey
}

/**
 * The frame of the sign-in and sign-up pages: the form on the left, with the
 * placeholder of the logo above it, and the stations of the product on the
 * right. The right column disappears below `lg`, so the form keeps the whole
 * width of a phone.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useI18n()

  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-14">
        <Link to="/" aria-label={t('appName')} className="w-fit rounded-lg outline-offset-4">
          {/* Replace this box with the logo of the product. */}
          <span className="flex h-10 min-w-32 items-center justify-center rounded-lg border border-dashed border-border px-4 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t('logoPlaceholder')}
          </span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </div>

      <aside
        aria-labelledby="auth-feature-title"
        className="relative hidden overflow-hidden border-l bg-muted/30 p-12 lg:flex lg:flex-col lg:justify-center xl:p-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative max-w-lg">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            {t('loginFeatureEyebrow')}
          </p>
          <h2
            id="auth-feature-title"
            className="mt-5 font-heading text-4xl font-bold tracking-[-0.02em] text-balance xl:text-5xl"
          >
            {t('heroTitle')}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {t('heroSubtitle')}
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {STATIONS.map(({ id, icon: Icon }) => (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border bg-background/70 p-3"
              >
                <span
                  aria-hidden
                  style={{ '--tile': stationColor(id) } as CSSProperties}
                  className="grid size-9 shrink-0 place-items-center rounded-lg border-[3px] border-(color:--tile) text-(color:--tile)"
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{t(stationName(id))}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}
