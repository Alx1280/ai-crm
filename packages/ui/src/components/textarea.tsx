import { cn } from "@crm/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const textareaVariants = cva(
	"flex field-sizing-content w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 md:text-xs dark:bg-muted dark:shadow-[inset_0_1px_1px_rgb(0_0_0/0.30)] dark:disabled:bg-muted",
	{
		variants: {
			size: { default: "min-h-16", sm: "min-h-8" },
		},
		defaultVariants: { size: "default" },
	},
);

function Textarea({
	className,
	size,
	...props
}: Omit<React.ComponentProps<"textarea">, "size"> &
	VariantProps<typeof textareaVariants>) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(textareaVariants({ size }), className)}
			{...props}
		/>
	);
}

export { Textarea, textareaVariants };
