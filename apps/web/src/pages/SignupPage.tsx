import { useMemo } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { AuthShell } from '@/components/auth/auth-shell'
import { Form } from '@/components/patterns/form'
import { Checkbox, Field, FieldContent, FieldError, FieldLabel } from '@dash/ui'
import { client } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useSetCurrentUser } from '@/lib/session'

type SignupValues = {
  fullName: string
  email: string
  password: string
  passwordConfirmation: string
  terms: boolean
}

/**
 * The terms of service have to be accepted before the account is created.
 */
function TermsField() {
  const { t } = useI18n()
  const { control, formState } = useFormContext<SignupValues>()

  return (
    <Field data-invalid={formState.errors.terms ? 'true' : undefined}>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="terms"
          render={({ field }) => (
            <Checkbox
              id="terms"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              aria-invalid={formState.errors.terms ? 'true' : undefined}
            />
          )}
        />
        <FieldLabel htmlFor="terms">{t('acceptTerms')}</FieldLabel>
      </div>
      <FieldContent>
        <FieldError errors={[formState.errors.terms]} />
      </FieldContent>
    </Field>
  )
}

export default function SignupPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setCurrentUser = useSetCurrentUser()

  /**
   * An invitation arrives with the address it was sent to, so the visitor
   * does not have to type it again.
   */
  const email = params.get('email') ?? ''
  const invitation = params.get('invitation')

  /**
   * A plan chosen in the pricing page travels to the setup of the workspace,
   * so it comes preselected in the plan step.
   */
  const plan = params.get('plan')
  const interval = params.get('interval')
  const planQuery = plan
    ? `?plan=${encodeURIComponent(plan)}${interval ? `&interval=${encodeURIComponent(interval)}` : ''}`
    : ''

  const schema = useMemo(
    () =>
      z
        .object({
          fullName: z.string().min(1, t('required')),
          email: z.string().email(t('invalidEmail')),
          password: z.string().min(8, t('passwordTooShort')),
          passwordConfirmation: z.string().min(1, t('required')),
          terms: z.boolean().refine((accepted) => accepted, t('termsRequired')),
        })
        .refine((values) => values.password === values.passwordConfirmation, {
          message: t('passwordsDontMatch'),
          path: ['passwordConfirmation'],
        }),
    [t]
  )

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight">{t('signUpTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('signUpSubtitle')}</p>

      <Form
        className="mt-8"
        schema={schema}
        defaultValues={{ email }}
        fields={[
          { name: 'fullName', label: t('fullName') },
          { name: 'email', label: t('email'), type: 'email' },
          {
            name: 'password',
            label: t('password'),
            type: 'password',
            description: t('passwordHint'),
          },
          { name: 'passwordConfirmation', label: t('confirmPassword'), type: 'password' },
        ]}
        submitLabel={t('signUp')}
        onSubmit={async (values) => {
          /**
           * The schema only lets the form through when the terms are
           * accepted, so the flag always travels as `true`.
           */
          const response = await client.api.auth.session.store({
            body: { ...values, terms: true },
          })

          setCurrentUser(response.user)

          /**
           * A visitor that came from an invitation joins the organization
           * right away, instead of going through the onboarding.
           */
          navigate(
            invitation
              ? `/invitations/${invitation}/accept`
              : `${response.redirectTo ?? '/onboarding'}${planQuery}`,
            { replace: true }
          )
        }}
      >
        <TermsField />
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </AuthShell>
  )
}
