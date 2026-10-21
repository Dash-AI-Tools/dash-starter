import { useMemo } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
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
  const setCurrentUser = useSetCurrentUser()

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
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('signUpTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('signUpSubtitle')}</p>

      <Form
        className="mt-8"
        schema={schema}
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
          navigate(response.redirectTo ?? '/onboarding', { replace: true })
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
    </div>
  )
}
