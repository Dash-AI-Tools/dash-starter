import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/patterns/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { redirectTo, useBilling, usePlans } from '@/lib/billing'
import type { PlanInterval } from '@/lib/billing'
import { useI18n } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

/**
 * The states in which the organization pays for a plan.
 */
const SUBSCRIBED = ['active', 'trialing', 'past_due', 'unpaid']

/**
 * The label of every status of a subscription, as the catalog names it.
 */
const STATUS_KEYS: Record<string, TranslationKey> = {
  inactive: 'statusInactive',
  active: 'statusActive',
  trialing: 'statusTrialing',
  past_due: 'statusPastDue',
  unpaid: 'statusUnpaid',
  paused: 'statusPaused',
  canceled: 'statusCanceled',
  expired: 'statusExpired',
}

/**
 * A meter of the usage of the organization against the limits of its plan.
 */
function Meter({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number
}) {
  const { t } = useI18n()

  /**
   * A limit of `-1` means that the feature is not limited.
   */
  const unlimited = limit < 0
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {unlimited ? t('usageUnlimited') : t('usageOf', { used, limit })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={unlimited ? undefined : used}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : limit}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

/**
 * The billing of an organization: the plan, the state of the subscription, the
 * usage against the limits of the plan and the actions that change it.
 */
export function BillingSettings({ orgSlug }: { orgSlug: string }) {
  const { t, formatDate, formatCurrency } = useI18n()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const returning = searchParams.get('checkout') === 'success'
  const { data: billing, isPending, isError } = useBilling(orgSlug)
  const { data: plans = [] } = usePlans()

  const [changing, setChanging] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [interval, setPlanInterval] = useState<PlanInterval>('month')

  const subscription = billing?.subscription ?? null
  const subscribed = !!subscription && SUBSCRIBED.includes(subscription.status)

  /**
   * The payment provider has not confirmed the subscription yet: the page says
   * so and refreshes on its own until the webhook arrives.
   */
  const processing = returning && !subscribed

  useEffect(() => {
    if (!processing) return

    const timer = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['billing', orgSlug] })
    }, 5000)

    return () => window.clearInterval(timer)
  }, [processing, orgSlug, queryClient])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['billing', orgSlug] })
  }

  const checkout = useMutation({
    mutationFn: async (input: { plan: string; interval: PlanInterval }) => {
      const response = await client.api.billing.checkout({
        params: { orgSlug },
        body: input,
      })
      return response.checkoutUrl
    },
    onSuccess: (url) => redirectTo(url),
    onError: (error) => toast.error(messageOf(error)),
  })

  const changePlan = useMutation({
    mutationFn: async (input: { plan: string; interval: PlanInterval }) => {
      await client.api.billing.changePlan({ params: { orgSlug }, body: input })
    },
    onSuccess: async () => {
      toast.success(t('planChanged'))
      setChanging(false)
      await refresh()
    },
    onError: (error) => toast.error(messageOf(error)),
  })

  const cancel = useMutation({
    mutationFn: async () => {
      await client.api.billing.cancel({ params: { orgSlug }, body: { mode: 'scheduled' } })
    },
    onSuccess: async () => {
      toast.success(t('canceled'))
      setCancelling(false)
      await refresh()
    },
    onError: (error) => toast.error(messageOf(error)),
  })

  const portal = useMutation({
    mutationFn: async () => {
      const response = await client.api.billing.portal({ params: { orgSlug } })
      return response.portalUrl
    },
    onSuccess: (url) => redirectTo(url),
    onError: (error) => toast.error(messageOf(error)),
  })

  /**
   * The message of a failed request, in the language of the organization.
   */
  function messageOf(error: unknown) {
    const failure = toApiFailure(error)
    const validation = failure.error.errors[0]?.message
    return validation || failure.error.message || t('unknownError')
  }

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('loading')}</p>
  }

  if (isError || !billing) {
    return <p className="p-6 text-sm text-destructive">{t('unknownError')}</p>
  }

  const entitlements = billing.plan.entitlements
  const status = subscription?.status ?? 'inactive'
  const amount = subscription?.amountCents ?? null
  const currency = subscription?.currency ?? 'USD'
  const period = subscription?.currentPeriodEnd ?? null

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('billingTitle')} description={t('billingSubtitle')} />

      {processing ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('processing')}</CardTitle>
            <CardDescription>{t('processingBody')}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {subscription?.status === 'past_due' || subscription?.status === 'unpaid' ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {t('billingPastDueBanner')}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('currentPlan')}</CardTitle>
            <CardDescription>{billing.plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">{billing.plan.name}</span>
              <Badge variant="secondary">{t(STATUS_KEYS[status] ?? 'statusInactive')}</Badge>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t('status')}</dt>
              <dd>{t(STATUS_KEYS[status] ?? 'statusInactive')}</dd>

              {subscription?.interval ? (
                <>
                  <dt className="text-muted-foreground">
                    {subscription.interval === 'year' ? t('intervalYearly') : t('intervalMonthly')}
                  </dt>
                  <dd>
                    {amount === null
                      ? t('free')
                      : `${formatCurrency(amount, currency)}${
                          subscription.interval === 'year' ? t('perYear') : t('perMonth')
                        }`}
                  </dd>
                </>
              ) : null}

              {period ? (
                <>
                  <dt className="text-muted-foreground">
                    {subscription?.cancelAtPeriodEnd ? t('endsOn') : t('renewsOn')}
                  </dt>
                  <dd>{formatDate(period)}</dd>
                </>
              ) : null}

              <dt className="text-muted-foreground">{t('usageSeats')}</dt>
              <dd>{t('seatsIncluded', { count: entitlements.seats })}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('usage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Meter
              label={t('usageSeats')}
              used={billing.usage.seats}
              limit={entitlements.seats}
            />
            <Meter
              label={t('usageAiCredits')}
              used={billing.usage.aiCredits}
              limit={entitlements.aiCredits}
            />
            {entitlements.mcpEnabled ? (
              <Meter
                label={t('usageMcpCalls')}
                used={billing.usage.mcpCalls}
                limit={entitlements.mcpCalls}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-wrap gap-2">
        {subscription ? (
          <Button type="button" variant="outline" onClick={() => portal.mutate()}>
            {t('manageInvoices')}
          </Button>
        ) : null}

        <Button type="button" onClick={() => setChanging(true)}>
          {t('changePlan')}
        </Button>

        {subscribed ? (
          <Button type="button" variant="destructive" onClick={() => setCancelling(true)}>
            {t('cancelSubscription')}
          </Button>
        ) : null}
      </section>

      <Dialog open={changing} onOpenChange={setChanging}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('changePlan')}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={interval === 'month' ? 'default' : 'outline'}
              onClick={() => setPlanInterval('month')}
            >
              {t('intervalMonthly')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={interval === 'year' ? 'default' : 'outline'}
              onClick={() => setPlanInterval('year')}
            >
              {t('intervalYearly')}
            </Button>
          </div>

          <div className="space-y-3">
            {plans
              .filter((plan) => !(plan.isDefaultFree && subscribed))
              .map((plan) => {
                const price = plan.prices.find((entry) => entry.interval === interval)
                const current = plan.key === billing.plan.key

                return (
                  <div key={plan.key} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.name}</span>
                      {current ? <Badge variant="secondary">{t('currentPlanBadge')}</Badge> : null}
                    </div>

                    <p className="text-sm text-muted-foreground">{plan.description}</p>

                    <p className="text-sm">
                      {!price ? (
                        t('intervalUnavailable')
                      ) : price.amountCents === 0 ? (
                        t('free')
                      ) : (
                        `${formatCurrency(price.amountCents, price.currency)}${
                          interval === 'year' ? t('perYear') : t('perMonth')
                        }`
                      )}
                    </p>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`${t('selectPlan')} ${plan.name}`}
                      disabled={!price || current}
                      onClick={() => {
                        const input = { plan: plan.key, interval }
                        if (subscribed) {
                          changePlan.mutate(input)
                        } else {
                          checkout.mutate(input)
                        }
                      }}
                    >
                      {t('selectPlan')}
                    </Button>
                  </div>
                )
              })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChanging(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelling} onOpenChange={setCancelling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cancelSubscription')}</DialogTitle>
            <DialogDescription>{t('cancelConfirm')}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelling(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={() => cancel.mutate()}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
