# Design

## Visual Direction

Finance Planner uses a restrained product UI. It should feel quiet, capable, and trustworthy for repeated financial work. The product supports light and dark themes, following the system preference by default, with subtly tinted neutrals and one primary accent for selected navigation, primary actions, charts, and focus states.

## Color

- Strategy: restrained.
- Primary accent: dark green/deep teal, represented by `--primary`.
- Semantic colors: green for income/success, red for expense/destructive, blue for investment/info, amber for warning.
- Avoid one-note finance palettes such as navy/gold, crypto neon, or heavy purple-blue gradients.
- Dark theme should avoid pure black and use deep green-tinted surfaces.
- Future token work should prefer OKLCH-compatible values, but current HSL CSS variables may stay until a token extraction pass.

## Typography

- Use Inter as the product typeface.
- Keep product headings compact and functional.
- Do not use display fonts in labels, buttons, tables, or dashboard panels.
- Body/prose line length should stay near 65-75ch.

## Layout

- Desktop uses a fixed sidebar and sticky topbar.
- Mobile uses bottom navigation for primary routes.
- App pages should use predictable spacing and restrained density.
- Cards are allowed for KPIs, repeated entities, and framed tools, but page sections should not become nested card stacks.

## Components

- Use shadcn/ui as the component vocabulary.
- Buttons, inputs, selects, tables, dialogs, sheets, badges, skeletons, and empty states should remain visually consistent across modules.
- Loading states should prefer skeletons.
- Empty states should explain what appears there and give one clear action.

## Motion

- Motion is limited to state feedback and disclosure.
- Use short transitions around 150-250ms.
- Do not add decorative page-load choreography.

## UX Copy

- Interface language is Brazilian Portuguese.
- Copy should be concise and operational.
- Avoid instructional text that describes obvious UI mechanics.
