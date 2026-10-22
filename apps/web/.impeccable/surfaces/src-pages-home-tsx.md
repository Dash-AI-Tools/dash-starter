---
version: 1
slug: "src-pages-home-tsx"
primary_target: "src/pages/Home.tsx"
related_targets: ["src/pages/PricingPage.tsx"]
---

# Landing (Home)

Scope: public landing at `/`, first proof of the Dash AI visual world; pricing, public layout and the dashboard inherit it in a quieter register.
Visitor mode: Persuade.
Audience: founders and developers evaluating a starter for an AI SaaS. Action: copy `npx create-dash-starter` or create an account. Proof: real captures of the running stack (sign-in, members, billing, chat, API keys, a delivered email), no invented customers or metrics.
Constraints: rebrand by tokens only; WCAG 2.1 AA; light and dark first-class; shadcn/Base UI stack kept; every string in EN and ES. Must not feel toy-like or corporate-cold.

## Direction contract

THESIS: One calm line runs from idea to launch; each capability is a station, named in both languages, followed by the running screen that proves it. Refuses the category default of dark glow hero, terminal block and bento grid.

OWN-WORLD: Off-white enamel ground, dark slate ink, muted grey secondary. One deep-teal line is the spine. Each station owns one muted colour everywhere (Auth teal, Orgs ochre, Billing slate blue, AI moss, MCP plum, Email clay). Authored filled pictograms (Wyman-style silhouettes) in square tiles with thick station-coloured borders on the public site; the dashboard sidebar wears the station colours on its tiles but keeps one distinct icon per destination, because several destinations share a station. Proof captures framed with a station-tinted hairline and soft drop. The install command is a dark platform sign in both themes. Dark theme: night-platform slate ground, station colours lifted.

STORY: Visitor sees the line, understands every station is built, reads each proof, believes it runs, copies the command or creates an account.

FIRST VIEWPORT: Left column: bilingual headline (current locale large, the other locale secondary with its own lang), one-line summary, install command sign with a copy action, primary "Create your account" and secondary "See the pricing", then the route map titled "Line 1 – From idea to launch". Right: the teal spine with the Auth station and its proof; Organizations enters at the fold. Adaptations: no kicker above the headline (craft floor bans eyebrows; the route map carries "Line 1"); the secondary action is pricing because there is no hosted demo to ride; Organizations precedes Billing because the line follows the order a product is set up.

FORM: Mexico City Metro wayfinding fused with claim-and-proof marketing, user steer over re-roll round 1; seed key a498e8fc (confirmed from the roll output of concept-seed). Signature interaction: scrolling travels the line station by station; the line paints up to the active station, its tile fills and its proof rises to full opacity. Station names hold their size at every breakpoint (the headline scales with the viewport); on phones the alternate-language name drops to its own line and the route map becomes a labelled 3x2 grid.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- The AI proof shows the stub provider; a capture with a configured model answering through a tool needs a provider key.
- Proof captures are regenerated with `e2e/scripts/capture-proofs.ts`; provenance must be re-embedded after each run.
