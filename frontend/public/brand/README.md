# NumisRoma Identity Mark

## Exports

- `numisroma-wordmark.svg`: primary horizontal logo for navigation, mastheads, and archival labels.
- `numisroma-monogram.svg`: transparent standalone `NR` mark for seals, watermarks, stamps, and app surfaces.
- `numisroma-favicon.svg`: rounded-square icon on the sand field, without a circular monogram rim.
- `numisroma-transition.svg`: optional looping presentation asset in which the wordmark contracts into the monogram.
- `numisroma-social-monogram-borderless.svg` / `numisroma-social-monogram-borderless.png`: square social avatar with the `NR` monogram on sand and no enclosing border.

All visible lettering is drawn as SVG paths. The borderless social SVG is the approved master for the `NR` geometry; website variants inline those paths for reliable browser rendering. The files do not load fonts, bitmaps, filters, gradients, or raster effects.

## Typography Specification

The wordmark is set in outlined `Cormorant Garamond Regular`, the same classical display family already used by the site. Its mixed-case construction provides slender capitals, refined editorial lowercase forms, fine serifs, and open counters. `Numis` and `Roma` retain the dignity of engraved coin legends without the density of all-capitals lettering.

For supporting brand typography in the product:

| Use | Typeface | Weight | Tracking | Treatment |
| --- | --- | --- | --- | --- |
| Logo wordmark | Cormorant Garamond | 400 outlined | Tracked optical setting | Mixed case, split-color |
| Display headings | Cormorant Garamond | 600 | `0.01em` | Title case, ink |
| Editorial labels | Cormorant Garamond | 500 | `0.14em` | Uppercase, secondary warm text |
| Interface copy | Inter | 400 / 500 | Normal | Quiet and highly legible |
| Values / catalogue metadata | JetBrains Mono | 400 | `0.02em` | Sparingly used |

Recommended wordmark clear space is the cap-stem width of its initial `N` on all sides. Use it at no less than `160px` wide digitally; below that threshold prefer the monogram.

## Color

| Purpose | Hex |
| --- | --- |
| Ink / `Numis` / monogram `N` | `#2e2820` |
| Secondary warm text | `#5a5040` |
| Muted Roman gold / `Roma` / monogram `R` | `#b8843a` |
| Deep gold accent | `#9a6e2e` |
| Sand favicon field | `#fdf8f0` |
| Soft warm surface | `#faf4ea` |

## Production Usage

- Navbar: use the wordmark on sand or soft warm surfaces; its transparent canvas keeps it compatible with both.
- Global site shell: pair the monogram with the wordmark in navigation and footer so each standard page carries both marks.
- Home-page hero: use the circular monogram as a small institutional seal beside the numismatic descriptor, never larger than the surrounding title rhythm.
- Auth and exported archive pages: pair the monogram above or beside the wordmark/archive title, using generous clear space.
- Favicon and app icon: use `numisroma-favicon.svg`; preserve its rounded field while keeping the monogram itself unframed.
- Social avatar: use `numisroma-social-monogram-borderless.png`; it intentionally omits the circular rim.
- Embossing, blind debossing, wax seals, or watermarking: use the circular monogram and convert both colored paths and its rim to a single ink/foil color; preserve its open counters and slim serifs.
- Dark backgrounds: render the ink paths as `#fdf8f0` and retain gold as `#b8843a`, or use a single warm ivory foil treatment.
- Animation: use only as an introduction or brand reveal, not continuously in primary navigation. Reduced-motion users receive the stationary monogram state.
