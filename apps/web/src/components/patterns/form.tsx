import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState, type ReactNode } from 'react'
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldError,
  type FieldPath,
  type FieldValues,
  type SubmitHandler,
} from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError as FieldErrorMessage,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toApiFailure } from '@/lib/api-error'
import { cn } from '@/lib/utils'

/**
 * The shape of a form field: a label, an input and the optional help and
 * error messages.
 */
export type FormFieldConfig<T extends FieldValues> = {
  /** The name of the field in the form values. */
  name: FieldPath<T>
  /** The label of the field. */
  label: ReactNode
  /** The help text shown under the field. */
  description?: ReactNode
  /** The type of the input. */
  type?: 'text' | 'email' | 'password' | 'number'
  /** The placeholder of the input. */
  placeholder?: string
  /** Rendered instead of the default input, for example a select. */
  children?: ReactNode
}

/**
 * A form bound to a zod schema. The server errors of a 422 response are mapped
 * to the fields they belong to, and the submit button is disabled while the
 * request is pending.
 */
export function Form<T extends FieldValues>({
  schema,
  fields,
  onSubmit,
  submitLabel,
  pendingLabel,
  defaultValues,
  children,
  className,
  /** Called when the request fails with an error that is not a field error. */
  onError,
}: {
  /** The zod schema validating the form values. */
  schema: z.ZodType<T, T>
  /** The fields of the form. */
  fields: FormFieldConfig<T>[]
  /** Called with the valid values when the form is submitted. */
  onSubmit: SubmitHandler<T>
  /** The label of the submit button. */
  submitLabel: ReactNode
  /** The label of the submit button while the request is pending. */
  pendingLabel?: ReactNode
  /** The values the form starts with. */
  defaultValues?: DefaultValues<T>
  /** Extra content rendered under the fields. */
  children?: ReactNode
  className?: string
  onError?: (message: string) => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  /**
   * The ids of the fields are unique per form, so two forms of the same page
   * can use a field with the same name without breaking the label of the other.
   */
  const formId = useId().replaceAll(':', '')
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues,
  })
  const {
    formState: { errors, isSubmitting },
    register,
    setError,
    handleSubmit,
  } = methods

  const submit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      await onSubmit(values)
    } catch (error) {
      const failure = toApiFailure(error)

      if (failure.kind === 'validation') {
        for (const [field, message] of Object.entries(failure.error.fieldErrors)) {
          setError(field as FieldPath<T>, { type: 'server', message })
        }
        return
      }

      const message = failure.error.message || 'Something went wrong'
      setServerError(message)
      onError?.(message)
    }
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={submit} className={cn('space-y-4', className)} noValidate>
        {fields.map((field) => (
          <Field key={field.name} data-invalid={errors[field.name] ? 'true' : undefined}>
            <FieldLabel htmlFor={`${formId}-${field.name}`}>{field.label}</FieldLabel>
            <FieldContent>
              {field.children ?? (
                <Input
                  id={`${formId}-${field.name}`}
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  aria-invalid={errors[field.name] ? 'true' : undefined}
                  {...register(field.name)}
                />
              )}
              {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
              <FieldErrorMessage errors={[errors[field.name] as FieldError | undefined]} />
            </FieldContent>
          </Field>
        ))}

        {children}

        {serverError ? (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (pendingLabel ?? submitLabel) : submitLabel}
        </Button>
      </form>
    </FormProvider>
  )
}
