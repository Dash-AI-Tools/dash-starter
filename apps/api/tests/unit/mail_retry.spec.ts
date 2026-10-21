import { test } from '@japa/runner'
import RetryTransport from '#mails/retry_transport'
import type { MailTransportContract, NodeMailerMessage } from '@adonisjs/mail/types'

/**
 * A transport that fails the first times it is called and records the
 * attempts.
 */
function flakyTransport(failures: number) {
  const state = { attempts: 0 }

  const transport: MailTransportContract = {
    async send() {
      state.attempts++

      if (state.attempts <= failures) {
        throw new Error('the provider is not available')
      }

      return { messageId: `message-${state.attempts}` } as never
    },
  }

  return { state, transport }
}

const message = { subject: 'A message', to: [{ address: 'ada@example.com', name: 'Ada' }] }

test.group('Retry transport', () => {
  test('sends the message again when the provider fails', async ({ assert }) => {
    const { state, transport } = flakyTransport(2)
    const retry = new RetryTransport(transport, { delay: 1 })

    const response = await retry.send(message as NodeMailerMessage)

    assert.equal(state.attempts, 3)
    assert.equal(response.messageId, 'message-3')
  })

  test('gives up after three attempts', async ({ assert }) => {
    const { state, transport } = flakyTransport(3)
    const retry = new RetryTransport(transport, { delay: 1 })

    await assert.rejects(() => retry.send(message as NodeMailerMessage))

    assert.equal(state.attempts, 3)
  })
})
