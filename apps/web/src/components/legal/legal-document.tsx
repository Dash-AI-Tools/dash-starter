import type { ReactNode } from 'react'

/**
 * A section of a legal document: a title and its body.
 */
export type LegalSection = {
  /** The title of the section. */
  title: string
  /** The body of the section. */
  body: string
}

/**
 * The shape of a legal page: the title, the notice about the placeholder
 * text and the sections that follow it.
 */
export type LegalDocumentProps = {
  /** The title of the document, shown as the only heading of the page. */
  title: string
  /** The notice that says the text is a template. */
  notice: string
  /** The version and the date of the document, shown under the title. */
  meta?: ReactNode
  /** The paragraph that opens the document. */
  intro?: string
  /** The sections of the document. */
  sections: LegalSection[]
  /** Anything that goes after the sections, such as the table of cookies. */
  children?: ReactNode
}

/**
 * The layout of the legal pages: the title, the notice about the placeholder
 * text and the sections of the document.
 */
export function LegalDocument({
  title,
  notice,
  meta,
  intro,
  sections,
  children,
}: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>

      {meta ? <div className="mt-2 text-sm text-muted-foreground">{meta}</div> : null}

      <p
        role="note"
        className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
      >
        {notice}
      </p>

      {intro ? <p className="mt-6 text-muted-foreground">{intro}</p> : null}

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
            <p className="mt-2 text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>

      {children}
    </article>
  )
}
