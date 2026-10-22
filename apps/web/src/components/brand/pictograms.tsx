import type { SVGProps } from 'react'

/**
 * The pictograms of the stations, drawn like the signs of a metro: filled
 * silhouettes on one 24-unit grid, readable at the size of a tile. They take
 * the colour of the text, so a station tile paints them with its own colour.
 */
type PictogramProps = SVGProps<SVGSVGElement>

function Pictogram({ children, ...props }: PictogramProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden {...props}>
      {children}
    </svg>
  )
}

/** A keyhole: the door to the product. */
export function AuthPictogram(props: PictogramProps) {
  return (
    <Pictogram {...props}>
      <path d="M12 2.5a6 6 0 0 1 3.2 11.08l1.4 7.92H7.4l1.4-7.92A6 6 0 0 1 12 2.5Z" />
    </Pictogram>
  )
}

/** Three people: a team inside an organization. */
export function OrgsPictogram(props: PictogramProps) {
  return (
    <Pictogram {...props}>
      <circle cx="12" cy="6.5" r="3.4" />
      <circle cx="4.9" cy="9.2" r="2.6" />
      <circle cx="19.1" cy="9.2" r="2.6" />
      <path d="M6.3 21c0-3.9 2.55-7 5.7-7s5.7 3.1 5.7 7Z" />
      <path d="M1 20c0-3 1.75-5.3 4-5.3.95 0 1.8.4 2.5 1.05A8.6 8.6 0 0 0 5.2 20Z" />
      <path d="M23 20c0-3-1.75-5.3-4-5.3-.95 0-1.8.4-2.5 1.05A8.6 8.6 0 0 1 18.8 20Z" />
    </Pictogram>
  )
}

/** A card with its stripe: a payment. */
export function BillingPictogram(props: PictogramProps) {
  return (
    <Pictogram {...props}>
      <path d="M4.5 4.5h15a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17V7a2.5 2.5 0 0 1 2.5-2.5ZM2 8.5v3h20v-3ZM5 14.5v2h5.5v-2Z" />
    </Pictogram>
  )
}

/** A speech bubble with three dots: a conversation with the assistant. */
export function AiPictogram(props: PictogramProps) {
  return (
    <Pictogram {...props}>
      <path d="M4.5 3h15A2.5 2.5 0 0 1 22 5.5v10a2.5 2.5 0 0 1-2.5 2.5H12l-5.5 4.5V18h-2A2.5 2.5 0 0 1 2 15.5v-10A2.5 2.5 0 0 1 4.5 3ZM7.5 8.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM12 8.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM16.5 8.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z" />
    </Pictogram>
  )
}

/** A plug: an external agent connecting to the product. */
export function McpPictogram(props: PictogramProps) {
  return (
    <Pictogram {...props}>
      <path d="M7.5 1.5h2.75v5.5H7.5ZM13.75 1.5h2.75v5.5h-2.75Z" />
      <path d="M4.5 8h15v3.5a7.5 7.5 0 0 1-5.75 7.3V22.5h-3.5v-3.7A7.5 7.5 0 0 1 4.5 11.5Z" />
    </Pictogram>
  )
}

/** An envelope: an email on its way. */
export function EmailPictogram(props: PictogramProps) {
  return (
    <Pictogram {...props}>
      <path d="M4 4.5h16A2 2 0 0 1 22 6.5v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2ZM4.2 7.6v2.6L12 15.6l7.8-5.4V7.6L12 13Z" />
    </Pictogram>
  )
}
