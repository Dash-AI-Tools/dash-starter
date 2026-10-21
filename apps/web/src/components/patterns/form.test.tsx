import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { API_BASE_URL, client } from '@/lib/api'
import { server } from '@/test/server'

const SIGNUP = `${API_BASE_URL}/api/v1/auth/signup`

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'The password is too short'),
})

type Values = z.infer<typeof schema>

function renderForm(onSubmit: (values: Values) => Promise<void>) {
  return render(
    <Form
      schema={schema}
      fields={[
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'password', label: 'Password', type: 'password' },
      ]}
      onSubmit={onSubmit}
      submitLabel="Create account"
    />
  )
}

describe('Form', () => {
  it('shows the schema error of a field on submit', async () => {
    const user = userEvent.setup()
    renderForm(async () => {})

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    })
  })

  it('maps the errors of a 422 response to the matching fields', async () => {
    server.use(
      http.post(SIGNUP, () =>
        HttpResponse.json(
          {
            code: 'E_VALIDATION_ERROR',
            errors: [
              { field: 'email', code: 'email', message: 'Introduce un correo electrónico válido' },
            ],
          },
          { status: 422 }
        )
      )
    )

    const user = userEvent.setup()
    renderForm(async (values) => {
      await client.api.auth.session.store({
        body: {
          ...values,
          fullName: 'Ada Lovelace',
          passwordConfirmation: values.password,
          terms: true,
        },
      })
    })

    await user.type(screen.getByLabelText('Email'), 'a@b.co')
    await user.type(screen.getByLabelText('Password'), 'supersecret')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(screen.getByText('Introduce un correo electrónico válido')).toBeInTheDocument()
    })
  })

  it('disables the submit button while the request is pending', async () => {
    const user = userEvent.setup()
    let resolve: () => void = () => {}

    renderForm(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )

    await user.type(screen.getByLabelText('Email'), 'a@b.co')
    await user.type(screen.getByLabelText('Password'), 'supersecret')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const button = screen.getByRole('button', { name: 'Create account' })
    await waitFor(() => expect(button).toBeDisabled())

    resolve()
    await waitFor(() => expect(button).not.toBeDisabled())
  })
})
