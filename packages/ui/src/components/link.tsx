import { cn } from "@crm/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

/**
 * A text link. Colour is inherited from whatever it sits in, because these
 * live inside sentences that have already chosen one — the variant only
 * decides whether the underline is always there or arrives on hover.
 *
 * A link shaped like a control is a `Button` with `asChild`, not this.
 */
const linkVariants = cva(
	"rounded-xs underline-offset-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
	{
		variants: {
			variant: {
				inline: "underline hover:text-foreground",
				quiet: "hover:underline",
			},
		},
		defaultVariants: {
			variant: "inline",
		},
	},
);

function Link({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"a"> &
	VariantProps<typeof linkVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "a";

	return (
		<Comp
			data-slot="link"
			data-variant={variant}
			className={cn(linkVariants({ variant, className }))}
			{...props}
		/>
	);
}

export { Link, linkVariants };
