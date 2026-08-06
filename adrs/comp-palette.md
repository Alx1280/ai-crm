# Put the CRM on Comp's colours

The CRM currently looks like unstyled shadcn: pure-neutral greys, near-black on
every primary action, square corners everywhere. That's a fine default and it is
nobody's brand. Comp's is flat white and `#006B4F`, and the CRM is the product
people see, so it may as well look like it came from the same company as the
site.

The thing that made me notice was the settings page. A failed Gmail sync renders
a red alert with a near-black "Resolve" button, and it reads as far more alarming
than "an API needs enabling in your Google Cloud project". Once I started pulling
on that I found a handful of things that were wrong regardless of palette:
`--radius` was `0.625rem` in `:root` and `0.75rem` in `.dark`, so a control
quietly changed shape when you switched theme. Focus rings were 1px, 2px and 3px
depending on which component you were looking at. The modal scrim is `bg-black/10`,
which over a near-black page is invisible, so dialogs in dark mode have nothing
separating them from the page underneath. And the deal-stage chart ramp is an
amber-to-orange sequence that has no relationship to anything else in the product.

What I'd do: repoint both themes onto flat white, untinted neutrals and the brand
green, with `--primary` and `--destructive` holding the same value in both themes
so the brand colour isn't secretly two colours. Radius down to 5px and identical
across themes. Fills reserved for exactly two things — the action you want and the
one you can't undo — so everything else is a chip and a rep's eye lands on *go* or
*stop*. Keep the greys genuinely neutral rather than tinted: there's no scene to
tint them toward, and a tinted grey without a reason reads as indecision.

What it breaks: anything that hardcodes a colour or reaches for `--primary`
meaning "the dark ink colour" rather than "the accent". I hit three of those —
the logo in the header, the active state in the icon rail, and the Resolve button
— all of which turned green the moment the token changed, without opting in. It's
also a wide diff by nature, since it's a token change plus every component that
was pinned to `rounded-none`. Happy to split the two genuine bug fixes out of it
(the theme radius mismatch and the invisible scrim) if the palette itself is not
something you want.
