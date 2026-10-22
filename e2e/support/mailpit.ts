/**
 * The catcher of the emails of the stack. The suite reads the messages of
 * Mailpit to follow the links the application sends by email.
 */
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8026'

/**
 * A message of the catcher, with the parts the suite reads.
 */
export type Mail = {
  ID: string
  Subject: string
  To: { Address: string }[]
  Text: string
  HTML: string
}

/**
 * How long the suite waits for an email before giving up.
 */
const TIMEOUT = 20000

/**
 * Waits for the email that the application sent to an address.
 *
 * The subject narrows the search: an address can receive more than one
 * message, and only one of them carries the link the flow needs.
 */
export async function waitForMail(address: string, subject?: string): Promise<Mail> {
  const deadline = Date.now() + TIMEOUT

  while (Date.now() < deadline) {
    const messages = await list()

    const found = messages.find(
      (message) =>
        message.To.some((to) => to.Address === address) &&
        (!subject || message.Subject.includes(subject))
    )

    if (found) {
      return await detail(found.ID)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(
    `No email arrived for ${address}${subject ? ` with the subject "${subject}"` : ''}`
  )
}

/**
 * The link the email carries: the first address of the body.
 */
export function linkOf(mail: Mail): string {
  const body = `${mail.Text}\n${mail.HTML}`
  const link = body.match(/https?:\/\/[^\s"'<>]+/)

  if (!link) {
    throw new Error(`The email "${mail.Subject}" carries no link`)
  }

  return link[0]
}

/**
 * The messages the catcher holds, the newest first.
 */
async function list(): Promise<Mail[]> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`)

  if (!response.ok) {
    throw new Error(`The catcher answered with the status ${response.status}`)
  }

  const body = (await response.json()) as { messages: Mail[] }

  return body.messages
}

/**
 * A message of the catcher, with its body.
 */
async function detail(id: string): Promise<Mail> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)

  if (!response.ok) {
    throw new Error(`The catcher answered with the status ${response.status}`)
  }

  return (await response.json()) as Mail
}
