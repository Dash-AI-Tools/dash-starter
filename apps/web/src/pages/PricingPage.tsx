import { Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@dash/ui'
import { usePlans, type Plan, type PlanInterval } from '@/lib/billing'
import { useI18n } from '@/lib/i18n'
import { useCurrentUser } from '@/lib/session'
import { usePublicPageMeta } from '@/lib/use-page-meta'

/**
 * The price of a plan for an interval, when the catalog has one.
 */
function priceOf(plan: Plan, interval: PlanInterval) {
  return plan.prices.find((price) => price.interval === interval) ?? null
}

/**
 * The percentage a yearly price saves against twelve monthly payments.
 *
 * A plan without both prices, or a yearly price that is not cheaper, has no
 * saving to announce.
 */
function savingsOf(plan: Plan): number | null {
  const month = priceOf(plan, 'month')
  const year = priceOf(plan, 'year')
  if (!month || !year) return null

  const yearly = month.amountCents * 12
  if (yearly <= 0 || year.amountCents >= yearly) return null

  return Math.round(((yearly - year.amountCents) / yearly) * 100)
}

/**
 * The pricing page: the catalog of plans, read from the database.
 *
 * A visitor that chooses a plan without an account is sent to the sign-up,
 * and the plan travels to the setup of the workspace, so the checkout starts
 * with the plan they chose.
 */
export default function PricingPage() {
  const { t, formatCurrency } = useI18n()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: plans = [], isPending, isError } = usePlans()
  const [interval, setInterval] = useState<PlanInterval>('month')

  usePublicPageMeta({
    title: t('pricingPageTitle'),
    description: t('pricingPageSubtitle'),
  })

  /**
   * A signed-in visitor already has an account: the plan is changed from the
   * billing settings of the organization, not from here.
   */
  function choose(plan: Plan) {
    if (user) {
      navigate('/app')
      return
    }

    const query = plan.isDefaultFree ? '' : `?plan=${plan.key}&interval=${interval}`
    navigate(`/signup${query}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t('pricingPageTitle')}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t('pricingPageSubtitle')}</p>

      <div
        role="group"
        aria-label={t('pricingInterval')}
        className="mt-8 inline-flex items-center gap-2 rounded-lg border p-1"
      >
        <Button
          type="button"
          size="sm"
          variant={interval === 'month' ? 'secondary' : 'ghost'}
          aria-pressed={interval === 'month'}
          onClick={() => setInterval('month')}
        >
          {t('intervalMonthly')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={interval === 'year' ? 'secondary' : 'ghost'}
          aria-pressed={interval === 'year'}
          onClick={() => setInterval('year')}
        >
          {t('intervalYearly')}
        </Button>
      </div>

      {isPending ? <p className="mt-8 text-sm text-muted-foreground">{t('loading')}</p> : null}

      {isError ? <p className="mt-8 text-sm text-destructive">{t('unknownError')}</p> : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = priceOf(plan, interval)
          const savings = interval === 'year' ? savingsOf(plan) : null

          return (
            <Card key={plan.key} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {plan.isDefaultFree ? <Badge variant="secondary">{t('free')}</Badge> : null}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div>
                  <p className="text-3xl font-semibold">
                    {!price
                      ? t('pricingUnavailable')
                      : price.amountCents === 0
                        ? t('free')
                        : formatCurrency(price.amountCents, price.currency)}
                  </p>
                  {price && price.amountCents > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {interval === 'year' ? t('perYear') : t('perMonth')}
                    </p>
                  ) : null}
                </div>

                {savings ? (
                  <Badge variant="outline">{t('yearlySavings', { percent: savings })}</Badge>
                ) : null}

                <div>
                  <p className="text-sm font-medium">{t('pricingFeatures')}</p>
                  <ul className="mt-2 space-y-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!price}
                  onClick={() => choose(plan)}
                >
                  {t('pricingChoose', { plan: plan.name })}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
