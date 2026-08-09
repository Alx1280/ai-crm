import Logo from "@crm/ui/components/logo";
import { cn } from "@crm/ui/lib/utils";

export function Wordmark({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"flex shrink-0 select-none items-center gap-[9px]",
				className,
			)}
		>
			<Logo className="size-[18px] shrink-0 text-foreground" />
			<span className="font-semibold text-[15px]/5 tracking-[-0.01em]">
				CRM
			</span>
		</span>
	);
}
