# Design fidelity ledger

Active concept references:

- `docs/design/concepts/public-homepage.png`
- `docs/design/concepts/project-builder.png`
- `docs/design/concepts/client-workspace.png`
- `docs/design/concepts/operations-center.png`

Production-render evidence:

- `docs/design/rendered-homepage.png` — Playwright Chromium, production server, 1536×1024.
- `docs/design/rendered-homepage-mobile.png` — Playwright Chromium, production server, 390×844.
- `docs/design/rendered-builder.png` — Playwright Chromium, production server, 1536×1024, Builder step 3.

## Comparison

| Point | Concept evidence | Render evidence | Result |
|---|---|---|---|
| Brand/palette | Obsidian, charcoal, metallic white/silver, cyan action, gold warning | Same locked CSS tokens and usage | Matched |
| First viewport | Quiet header, three-line headline, two CTAs, configuration preview, next section visible | Same hierarchy and copy at native width | Matched after headline and header fixes |
| Container model | Open bands, thin rails, one product frame; no bento grid | Open sections, registry rows, thin-border preview | Matched |
| Builder anatomy | Six-step progress, included list, add-ons, persistent summary, back/continue | Same anatomy with exact canonical capabilities | Matched |
| Typography | Heavy display headline; compact mono system labels; deliberate control sizing | Explicit display/mono/control styles across pages | Matched |
| Responsive behavior | Collapsed mobile navigation and single-column continuation | Working drawer button, hidden header CTA, no horizontal overflow at 390px | Matched |
| Interaction state | Cyan active/selected/focus states and dependency-aware choices | Finder selection, add-on dependency/conflict handling, visible focus outline | Matched |
| Commercial warning | Gold only for approval/release constraints | Quote-required and approval gates use restrained gold | Matched |

## Intentional content corrections

The generated homepage concept invented service names such as AI Solution Development, Cloud Deployment, and Maintenance & Support. Those labels were rejected. The implementation uses only the owner-specified 12 offers across 10 categories. The generated concept also added a search control that was not in the approved route requirements; it was omitted rather than shipping an inert control.

The concept compresses the entire homepage into one image. The implementation preserves the first-viewport composition and next-section preview while allowing readable, accessible scrolling for the complete canonical registry.

## Above-the-fold copy diff

Allowed and present: `NOTREAL ENGINE`, `ENGINE//OS`, `Services`, `Solutions`, `How it works`, `Labs`, `Pricing`, `Digital engineering, configured around your business.`, the supplied support sentence, `Start a project`, and `Find my solution`.

Intentional additions: `Sign in` is required by the authentication route set; code-native configuration status labels communicate real product state. No invented claim, price, testimonial, customer logo, badge, or hero eyebrow was added.

## Verdict

The public homepage and Project Builder were inspected directly against the active concepts with `view_image` at the concept/native implementation size. After correcting desktop menu leakage, headline wrapping, mobile navigation state, and production screenshot artifacts, no fixable material visual mismatch remains. The implementation is faithful to the accepted design system while correcting concept content that contradicted the canonical business architecture.
