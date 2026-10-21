/**
 * Escapes the characters that would break the HTML of an email.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * The shell shared by the transactional emails: a readable HTML body and the
 * plain-text alternative. The branded layout lands with the rest of the
 * email catalog.
 */
export function emailLayout({
  title,
  paragraphs,
  cta,
  footer,
}: {
  /** Headline of the email. */
  title: string
  /** Body paragraphs, in order. */
  paragraphs: string[]
  /** The call to action and the link it points to. */
  cta: { label: string; url: string }
  /** Small print shown at the end. */
  footer: string
}): { html: string; text: string } {
  const html = [
    `<h1>${escapeHtml(title)}</h1>`,
    ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
    `<p><a href="${escapeHtml(cta.url)}">${escapeHtml(cta.label)}</a></p>`,
    `<p>${escapeHtml(footer)}</p>`,
  ].join('\n')

  const text = [title, '', ...paragraphs, '', `${cta.label}: ${cta.url}`, '', footer].join('\n')

  return { html, text }
}
