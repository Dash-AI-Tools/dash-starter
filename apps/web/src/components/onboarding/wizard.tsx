import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Controller, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form'
import { useSearchParams } from 'react-router'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { redirectTo } from '@/lib/billing'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import type { Onboarding, OnboardingStep } from '@/lib/onboarding'

/**
 * The steps of the setup, in the order they happen.
 */
const STEPS: { step: OnboardingStep; label: TranslationKey }[] = [
  { step: 'details', label: 'stepDetails' },
  { step: 'use-case', label: 'stepUseCase' },
  { step: 'invites', label: 'stepInvites' },
  { step: 'plan', label: 'stepPlan' },
]

/**
 * The values of the form of the details of the organization.
 */
type DetailsValues = {
  name: string
  slug: string
  defaultLocale: 'en' | 'es'
}

/**
 * The values of the form of the use case of the organization.
 */
type UseCaseValues = {
  teamSize: '1' | '2' | '3' | '4'
  useCase: 'content' | 'support' | 'data' | 'assistant'
}

/**
 * A plan the user can pick in the plan step.
 */
type Plan = {
  key: string
  name: string
  interval: 'month' | 'year'
}

/**
 * The name a plan is shown with. The catalog of the plans arrives with the
 * billing group, so the key of the plan is used until then.
 */
function planName(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * A group of options of a form, as a list of radio buttons.
 */
function ChoiceField<T extends FieldValues>({
  name,
  label,
  options,
}: {
  name: FieldPath<T>
  label: string
  options: { value: string; label: string }[]
}) {
  const { control } = useFormContext<T>()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <RadioGroup
          aria-label={label}
          value={String(field.value)}
          onValueChange={(value) => field.onChange(value)}
        >
          {options.map((option) => (
            <Field key={option.value} orientation="horizontal">
              <RadioGroupItem id={`${name}-${option.value}`} value={option.value} />
              <FieldLabel htmlFor={`${name}-${option.value}`}>{option.label}</FieldLabel>
            </Field>
          ))}
        </RadioGroup>
      )}
    />
  )
}

/**
 * The language of the organization, bound to the form.
 */
function LocaleField({ label }: { label: string }) {
  const { t } = useI18n()
  const { control } = useFormContext<DetailsValues>()

  return (
    <Controller
      control={control}
      name="defaultLocale"
      render={({ field }) => (
        <select
          id="defaultLocale"
          aria-label={label}
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="en">{t('english')}</option>
          <option value="es">{t('spanish')}</option>
        </select>
      )}
    />
  )
}

/**
 * The invitations that wait for the answer of the visitor. They are offered
 * before the organization is created, so the visitor can join a team instead.
 */
function PendingInvitations({ invitations }: { invitations: Onboarding['invitations'] }) {
  const { t } = useI18n()
  const [accepting, setAccepting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roleLabel = (role: string) =>
    role === 'owner' ? t('roleOwner') : role === 'admin' ? t('roleAdmin') : t('roleMember')

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t('pendingInvitesTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('pendingInvitesBody')}</p>
      </div>

      <ul className="space-y-2">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invitation.organization.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabel(invitation.role)}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={accepting !== null}
              onClick={async () => {
                setAccepting(invitation.id)
                setError(null)

                try {
                  await client.api.onboarding.acceptInvitation({
                    params: { id: invitation.id },
                  })
                } catch (failure) {
                  setError(toApiFailure(failure).error.message || t('unknownError'))
                  setAccepting(null)
                }
              }}
            >
              {t('accept')}
            </Button>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * The first step: the details of the organization that is about to be
 * created.
 */
function DetailsStep({
  onboarding,
  onDone,
}: {
  onboarding: Onboarding
  onDone: (state: Onboarding) => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('required')),
        slug: z
          .string()
          .refine(
            (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
            t('slugHint')
          ),
        defaultLocale: z.enum(['en', 'es']),
      }),
    [t]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detailsTitle')}</CardTitle>
        <CardDescription>{t('detailsBody')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {onboarding.invitations.length > 0 ? (
          <PendingInvitations invitations={onboarding.invitations} />
        ) : null}

        <Form<DetailsValues>
          schema={schema}
          defaultValues={{ name: '', slug: '', defaultLocale: 'en' }}
          fields={[
            { name: 'name', label: t('name') },
            { name: 'slug', label: t('slug'), description: t('slugHint') },
            {
              name: 'defaultLocale',
              label: t('defaultLocale'),
              description: t('defaultLocaleHint'),
              children: <LocaleField label={t('defaultLocale')} />,
            },
          ]}
          submitLabel={t('createSubmit')}
          onSubmit={async (values) => {
            await client.api.organization.store({
              body: {
                name: values.name,
                slug: values.slug || undefined,
                defaultLocale: values.defaultLocale,
              },
            })

            /**
             * The organization is created, so the list of the organizations
             * of the visitor is one short.
             */
            await queryClient.invalidateQueries({ queryKey: ['organizations'] })

            const state = await client.api.onboarding.show({})
            onDone(state.onboarding)
          }}
        />
      </CardContent>
    </Card>
  )
}

/**
 * The second step: the size of the team and what the organization will use
 * the product for.
 */
function UseCaseStep({ onDone }: { onDone: (state: Onboarding) => void }) {
  const { t } = useI18n()

  const schema = useMemo(
    () =>
      z.object({
        teamSize: z.enum(['1', '2', '3', '4']),
        useCase: z.enum(['content', 'support', 'data', 'assistant']),
      }),
    []
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('useCaseTitle')}</CardTitle>
        <CardDescription>{t('useCaseBody')}</CardDescription>
      </CardHeader>

      <CardContent>
        <Form<UseCaseValues>
          schema={schema}
          defaultValues={{ teamSize: '1', useCase: 'content' }}
          fields={[
            {
              name: 'teamSize',
              label: t('teamSize'),
              children: (
                <ChoiceField
                  name="teamSize"
                  label={t('teamSize')}
                  options={[
                    { value: '1', label: t('teamSize1') },
                    { value: '2', label: t('teamSize2') },
                    { value: '3', label: t('teamSize3') },
                    { value: '4', label: t('teamSize4') },
                  ]}
                />
              ),
            },
            {
              name: 'useCase',
              label: t('primaryUseCase'),
              children: (
                <ChoiceField
                  name="useCase"
                  label={t('primaryUseCase')}
                  options={[
                    { value: 'content', label: t('primaryUseCase1') },
                    { value: 'support', label: t('primaryUseCase2') },
                    { value: 'data', label: t('primaryUseCase3') },
                    { value: 'assistant', label: t('primaryUseCase4') },
                  ]}
                />
              ),
            },
          ]}
          submitLabel={t('continue')}
          onSubmit={async (values) => {
            const response = await client.api.onboarding.useCase({ body: values })
            onDone(response.onboarding)
          }}
        />
      </CardContent>
    </Card>
  )
}

/**
 * The third step: the invitations of the team. The step can be skipped.
 */
function InvitesStep({ onDone }: { onDone: (state: Onboarding) => void }) {
  const { t } = useI18n()
  const [emails, setEmails] = useState<string[]>([''])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (list: string[]) => {
    setPending(true)
    setError(null)

    try {
      const response = await client.api.onboarding.invites({
        body: {
          emails: list.map((email) => email.trim()).filter((email) => email !== ''),
        },
      })

      onDone(response.onboarding)
    } catch (failure) {
      setError(toApiFailure(failure).error.message || t('unknownError'))
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('invitesTitle')}</CardTitle>
        <CardDescription>{t('invitesBody')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {emails.map((email, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              aria-label={t('inviteEmail')}
              type="email"
              placeholder={t('inviteEmailPlaceholder')}
              value={email}
              onChange={(event) =>
                setEmails(
                  emails.map((value, position) => (position === index ? event.target.value : value))
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={t('remove')}
              onClick={() => setEmails(emails.filter((_, position) => position !== index))}
            >
              {t('remove')}
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={() => setEmails([...emails, ''])}>
          {t('inviteAddAnother')}
        </Button>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={() => send(emails)}>
            {t('invitesSend')}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => send([])}>
            {t('invitesSkip')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * The fourth step: the plan of the organization. The free plan is always
 * there, and the plan chosen in the pricing page comes preselected.
 */
function PlanStep({ onDone }: { onDone: (state: Onboarding) => void }) {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preselected = params.get('plan')
  const interval = params.get('interval') === 'year' ? ('year' as const) : ('month' as const)

  const plans = useMemo<Plan[]>(() => {
    const list: Plan[] = [{ key: 'free', name: t('free'), interval: 'month' }]

    if (preselected && !list.some((plan) => plan.key === preselected)) {
      list.push({ key: preselected, name: planName(preselected), interval })
    }

    return list
  }, [preselected, interval, t])

  const [selected, setSelected] = useState(preselected ?? 'free')
  const chosen = plans.find((plan) => plan.key === selected) ?? plans[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('planTitle')}</CardTitle>
        <CardDescription>{t('planBody')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {preselected ? (
          <p className="text-sm text-muted-foreground">
            {t('planPreselected', { plan: planName(preselected) })}
          </p>
        ) : null}

        <RadioGroup
          aria-label={t('planTitle')}
          value={selected}
          onValueChange={(value) => setSelected(value ?? 'free')}
        >
          {plans.map((plan) => (
            <Field key={plan.key} orientation="horizontal">
              <RadioGroupItem id={`plan-${plan.key}`} value={plan.key} />
              <FieldLabel htmlFor={`plan-${plan.key}`}>
                {plan.name}
                <span className="text-xs text-muted-foreground">
                  {plan.interval === 'year' ? t('intervalYearly') : t('intervalMonthly')}
                </span>
              </FieldLabel>
            </Field>
          ))}
        </RadioGroup>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true)
            setError(null)

            try {
              const response = await client.api.onboarding.plan({
                body: { plan: chosen.key, interval: chosen.interval },
              })

              onDone(response.onboarding)
            } catch (failure) {
              setError(toApiFailure(failure).error.message || t('unknownError'))
              setPending(false)
            }
          }}
        >
          {chosen.key === 'free' ? t('planFree') : t('planCheckout', { plan: chosen.name })}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * The last screen: the organization is ready and the visitor lands on its
 * dashboard.
 *
 * A paid plan goes to the payment provider from here: the checkout is opened
 * before the setup is closed, so a refused payment leaves the setup open and
 * the visitor can try again.
 */
function CompleteStep({
  onboarding,
  onDone,
}: {
  onboarding: Onboarding
  onDone: (state: Onboarding) => void
}) {
  const { t } = useI18n()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = onboarding.plan
  const slug = onboarding.organization?.slug
  const paid = !!plan && plan.key !== 'free'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('welcomeTitle')}</CardTitle>
        <CardDescription>{t('welcomeBody')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {paid ? (
          <p className="text-sm text-muted-foreground">
            {t('planCheckoutHint', { plan: planName(plan.key) })}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true)
            setError(null)

            try {
              let checkoutUrl: string | null = null

              if (paid && slug) {
                const checkout = await client.api.billing.checkout({
                  params: { orgSlug: slug },
                  body: {
                    plan: plan.key,
                    interval: plan.interval === 'year' ? ('year' as const) : ('month' as const),
                  },
                })

                checkoutUrl = checkout.checkoutUrl
              }

              const response = await client.api.onboarding.complete({})

              /**
               * The visitor leaves the application to pay, so the wizard is
               * not moved: the setup is already closed in the server.
               */
              if (checkoutUrl) {
                redirectTo(checkoutUrl)
                return
              }

              onDone(response.onboarding)
            } catch (failure) {
              setError(toApiFailure(failure).error.message || t('unknownError'))
              setPending(false)
            }
          }}
        >
          {pending ? t('completing') : t('complete')}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * The setup of the organization of the visitor. The step the wizard shows is
 * the one the API answers with, so the visitor comes back to the step he left.
 */
export default function OnboardingWizard({ onboarding }: { onboarding: Onboarding }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  /**
   * Shows the state the API just answered with, so the wizard moves to the
   * next step without asking the API again.
   */
  const onDone = (state: Onboarding) => {
    queryClient.setQueryData(['onboarding'], state)
  }

  const current = STEPS.findIndex((entry) => entry.step === onboarding.step)

  return (
    <div className="space-y-4">
      {current >= 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('stepOf', { current: current + 1, total: STEPS.length })}
        </p>
      ) : null}

      {onboarding.step !== 'details' && onboarding.step !== 'complete' ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t('resumeTitle')}</span> {t('resumeBody')}
        </p>
      ) : null}

      {onboarding.step === 'details' ? (
        <DetailsStep onboarding={onboarding} onDone={onDone} />
      ) : null}
      {onboarding.step === 'use-case' ? <UseCaseStep onDone={onDone} /> : null}
      {onboarding.step === 'invites' ? <InvitesStep onDone={onDone} /> : null}
      {onboarding.step === 'plan' ? <PlanStep onDone={onDone} /> : null}
      {onboarding.step === 'complete' ? (
        <CompleteStep onboarding={onboarding} onDone={onDone} />
      ) : null}
    </div>
  )
}
