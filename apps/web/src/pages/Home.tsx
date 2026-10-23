import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, Copy, Flag } from 'lucide-react'
import { Button } from '@dash/ui'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { STATIONS, STATION_KEY_NAMES, stationColor, type StationId } from '@/lib/stations'
import { usePublicPageMeta } from '@/lib/use-page-meta'
import { cn } from '@/lib/utils'

/**
 * The command that creates a new product from the template.
 */
const INSTALL_COMMAND =
  'curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash'

const FAQ = [
  { q: 'faq1Q', a: 'faq1A' },
  { q: 'faq2Q', a: 'faq2A' },
  { q: 'faq3Q', a: 'faq3A' },
  { q: 'faq4Q', a: 'faq4A' },
] as const

/**
 * A catalog key of a station, such as `stationBillingName`.
 */
function stationKey(id: StationId, field: 'Name' | 'Alt' | 'Title' | 'Body' | 'Proof') {
  return `station${STATION_KEY_NAMES[id]}${field}` as TranslationKey
}

/**
 * The station the visitor is reading: the one crossing the middle of the
 * screen. The line is painted up to it, so scrolling travels the line.
 */
function useActiveStation(ids: StationId[]) {
  const [active, setActive] = useState<StationId>(ids[0])
  const refs = useRef(new Map<StationId, HTMLElement>())

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive((entry.target as HTMLElement).dataset.station as StationId)
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )

    for (const element of refs.current.values()) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  function register(id: StationId) {
    return (element: HTMLElement | null) => {
      if (element) refs.current.set(id, element)
      else refs.current.delete(id)
    }
  }

  return { active, register }
}

/**
 * The square sign of a station: its pictogram inside a frame of its colour,
 * filled when the visitor is at that station.
 */
function StationTile({
  id,
  lit,
  size = 'md',
}: {
  id: StationId
  lit: boolean
  size?: 'sm' | 'md'
}) {
  const station = STATIONS.find((entry) => entry.id === id)
  if (!station) return null
  const Icon = station.icon

  return (
    <span
      aria-hidden
      style={{ '--tile': stationColor(id) } as CSSProperties}
      className={cn(
        'grid shrink-0 place-items-center border-(color:--tile) bg-background text-(color:--tile)',
        'transition-[background-color,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        size === 'md' ? 'size-12 rounded-[0.7rem] border-[5px]' : 'size-8 rounded-md border-[3px]',
        lit && 'bg-(--tile) text-background'
      )}
    >
      <Icon className={size === 'md' ? 'size-6' : 'size-4'} />
    </span>
  )
}

/**
 * The command that creates a project, with a button that copies it.
 */
function InstallCommand() {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      role="group"
      aria-label={t('heroCommandLabel')}
      className="flex w-full max-w-xl items-stretch overflow-hidden rounded-xl bg-command text-command-foreground ring-1 ring-command-foreground/10 shadow-[0_14px_30px_-18px_color-mix(in_oklch,var(--command)_80%,transparent)]"
    >
      <code className="flex min-w-0 flex-1 items-center overflow-x-auto px-5 py-4 font-mono text-[0.95rem] whitespace-nowrap sm:text-base">
        <span aria-hidden className="mr-3 text-line select-none">
          $
        </span>
        {INSTALL_COMMAND}
      </code>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 items-center gap-2 border-l border-command-foreground/15 px-4 text-sm font-medium transition-colors hover:bg-command-foreground/10 focus-visible:bg-command-foreground/10 focus-visible:outline-none"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        <span className="sr-only sm:not-sr-only">
          {copied ? t('commandCopied') : t('commandCopy')}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? t('commandCopied') : ''}
      </span>
    </div>
  )
}

/**
 * The map of the line, as a sign on the platform: every station in order,
 * the one the visitor is at lit up.
 */
function RouteMap({ active }: { active: StationId }) {
  const { t } = useI18n()
  const activeIndex = STATIONS.findIndex((station) => station.id === active)

  return (
    <nav aria-labelledby="route-title" className="w-full max-w-xl">
      <h2 id="route-title" className="text-sm font-semibold text-muted-foreground">
        {t('routeTitle')}
      </h2>
      <ol className="relative mt-4 grid grid-cols-3 gap-y-4 sm:flex sm:justify-between">
        <span
          aria-hidden
          className="absolute top-4 right-4 left-4 hidden h-1.5 -translate-y-1/2 rounded-full bg-border sm:block"
        />
        <span
          aria-hidden
          className="absolute top-4 left-4 hidden h-1.5 -translate-y-1/2 sm:block rounded-full bg-line transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ width: `calc((100% - 2rem) * ${activeIndex / (STATIONS.length - 1)})` }}
        />
        {STATIONS.map(({ id }, index) => (
          <li key={id} className="relative">
            <a
              href={`#station-${id}`}
              aria-current={id === active ? 'location' : undefined}
              className="group flex flex-col items-center gap-2 rounded-md outline-offset-4"
            >
              <StationTile id={id} lit={index <= activeIndex} size="sm" />
              <span
                className={cn(
                  'text-xs font-medium text-muted-foreground transition-colors',
                  id === active && 'text-foreground',
                  'group-hover:text-foreground'
                )}
              >
                {t(stationKey(id, 'Name'))}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * The screen behind a station, captured from the running demo in the
 * language and the theme of the visitor. Phones get a tighter crop, so the
 * interface stays legible at their width.
 */
function Proof({ id, active, eager }: { id: StationId; active: boolean; eager: boolean }) {
  const { t, locale } = useI18n()
  const alt = t(stationKey(id, 'Proof'))
  const loading = eager ? 'eager' : 'lazy'

  function capture(theme: 'light' | 'dark', className: string) {
    const base = `/proofs/${id}-${locale}-${theme}`

    return (
      <picture className={className}>
        <source media="(max-width: 639px)" srcSet={`${base}-sm.jpg`} width={720} height={840} />
        <img
          src={`${base}.jpg`}
          alt={alt}
          width={1280}
          height={960}
          loading={loading}
          decoding="async"
          className="block h-auto w-full"
        />
      </picture>
    )
  }

  return (
    <figure style={{ '--tile': stationColor(id) } as CSSProperties} className="mt-6 max-w-2xl">
      {/* Only the capture dims while the visitor is at another station: the
          caption keeps full contrast. */}
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-[color-mix(in_oklch,var(--tile)_40%,var(--border))] bg-card shadow-[0_22px_44px_-28px_color-mix(in_oklch,var(--foreground)_55%,transparent)]',
          'transition-[opacity,translate,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          active ? 'opacity-100' : 'translate-y-3 opacity-55 saturate-[0.4]'
        )}
      >
        {capture('light', 'block dark:hidden')}
        {capture('dark', 'hidden dark:block')}
      </div>
      <figcaption className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="size-2 rounded-[2px] bg-(--tile)" />
        {t('proofCaption')}
      </figcaption>
    </figure>
  )
}

/**
 * The landing page: the product as one line from idea to launch. Every
 * capability is a station, named in both languages and followed by the
 * running screen that proves it.
 */
export default function Home() {
  const { t } = useI18n()
  const { active, register } = useActiveStation(STATIONS.map((station) => station.id))
  const activeIndex = STATIONS.findIndex((station) => station.id === active)
  const altLang = t('altLang')

  usePublicPageMeta({
    title: t('metaTitle'),
    description: t('metaDescription'),
    ogTitle: t('ogTitle'),
    ogDescription: t('ogDescription'),
  })

  return (
    <>
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-16 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-8">
        <section
          aria-labelledby="hero-title"
          className="flex flex-col gap-7 pt-14 pb-12 lg:sticky lg:top-0 lg:h-svh lg:justify-center lg:py-0"
        >
          <div>
            <h1
              id="hero-title"
              className="text-[clamp(2.5rem,4.6vw,4.25rem)] leading-[1.02] font-bold tracking-[-0.03em]"
            >
              {t('heroTitle')}
            </h1>
            <p
              lang={altLang}
              className="mt-4 font-heading text-[clamp(1.25rem,2vw,1.75rem)] leading-tight font-medium text-muted-foreground"
            >
              {t('heroTitleAlt')}
            </p>
          </div>

          <p className="max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
            {t('heroSubtitle')}
          </p>

          <InstallCommand />

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-11 rounded-xl px-5 text-[0.95rem]">
                {t('heroPrimary')}
                <ArrowRight />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="h-11 rounded-xl px-5 text-[0.95rem]">
                {t('heroSecondary')}
              </Button>
            </Link>
          </div>

          <RouteMap active={active} />
        </section>

        <ol className="relative pb-8 lg:pt-[18vh]">
          {STATIONS.map(({ id }, index) => {
            const travelled = index <= activeIndex
            const nameKey = stationKey(id, 'Name')

            return (
              <li
                key={id}
                id={`station-${id}`}
                data-station={id}
                ref={register(id)}
                aria-labelledby={`station-${id}-name`}
                className="relative grid scroll-mt-24 grid-cols-[3rem_minmax(0,1fr)] gap-x-5 pb-20 sm:gap-x-7"
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-0 bottom-0 left-[1.3rem] w-[0.4rem] rounded-full transition-colors duration-700 motion-reduce:transition-none',
                    travelled ? 'bg-line' : 'bg-border'
                  )}
                />
                <div className="relative">
                  <StationTile id={id} lit={travelled} />
                </div>

                <div className="min-w-0 pt-1">
                  <h2 id={`station-${id}-name`} className="text-[1.75rem] leading-none font-bold">
                    {t(nameKey)}{' '}
                    <span
                      lang={altLang}
                      className="mt-1 block text-lg font-medium text-muted-foreground sm:mt-0 sm:ml-1 sm:inline"
                    >
                      {t(stationKey(id, 'Alt'))}
                    </span>
                  </h2>
                  <p className="mt-3 font-heading text-lg font-semibold">
                    {t(stationKey(id, 'Title'))}
                  </p>
                  <p className="mt-1 max-w-[60ch] text-muted-foreground">
                    {t(stationKey(id, 'Body'))}
                  </p>
                  <Proof id={id} active={id === active} eager={index < 2} />
                </div>
              </li>
            )
          })}

          <li className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 sm:gap-x-7">
            <span
              aria-hidden
              className="absolute top-0 left-[1.3rem] h-6 w-[0.4rem] rounded-full bg-line"
            />
            <span
              aria-hidden
              className="relative mt-6 grid size-12 place-items-center rounded-full bg-line text-background ring-8 ring-background"
            >
              <Flag className="size-5" strokeWidth={2.75} />
            </span>
            <div className="mt-6 min-w-0 rounded-2xl border bg-card p-7 sm:p-9">
              <h2 className="text-[1.75rem] leading-tight font-bold">{t('terminalTitle')}</h2>
              <p className="mt-3 max-w-[52ch] text-muted-foreground">{t('terminalBody')}</p>
              <div className="mt-6 border-t pt-6">
                <p className="font-heading text-lg font-semibold">{t('pricingTitle')}</p>
                <p className="mt-1 text-muted-foreground">{t('pricingSubtitle')}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/signup">
                    <Button size="lg" className="h-11 rounded-xl px-5 text-[0.95rem]">
                      {t('ctaButton')}
                      <ArrowRight />
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-11 rounded-xl px-5 text-[0.95rem]"
                    >
                      {t('pricingTeaserCta')}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </li>
        </ol>
      </div>

      <section aria-labelledby="faq-title" className="mt-16 border-t bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16 lg:px-8">
          <h2 id="faq-title" className="text-3xl font-bold tracking-[-0.02em]">
            {t('faqTitle')}
          </h2>
          <dl className="divide-y border-y">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="py-5">
                <dt className="font-heading text-lg font-semibold">{t(q)}</dt>
                <dd className="mt-1.5 max-w-[62ch] text-muted-foreground">{t(a)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  )
}
